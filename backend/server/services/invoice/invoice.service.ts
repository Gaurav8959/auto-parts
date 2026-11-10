import moment from "moment-timezone";
import { Brackets, In } from "typeorm";
import { INVOICE_NUMBER_SEQ } from "../../constants/sequence.const";
import { AppDataSource } from "../../data-source/data-source";
import {
  CustomerRepository,
  InvoiceRepository,
  ShopRepository,
} from "../../data-source/repository";
import { Product } from "../../entities/catalog/product.entity";
import { InvoiceItem } from "../../entities/invoice/invoice-item.entity";
import { InvoicePayment } from "../../entities/invoice/invoice-payment.entity";
import { Invoice } from "../../entities/invoice/invoice.entity";
import { Customer } from "../../entities/party/customer.entity";
import { ForbiddenError } from "../../errors/forbidden.error";
import { StringError } from "../../errors/string.error";
import { TStockTransactionType } from "../../types/inventory.type";
import {
  TInvoice,
  TInvoiceCancel,
  TInvoiceCopy,
  TInvoiceEmailRequest,
  TInvoiceListParams,
  TInvoicePayment,
  TInvoicePaymentType,
  TInvoiceStatus,
} from "../../types/invoice.type";
import { TPermission } from "../../types/permission.type";
import ApiUtility from "../../utilities/api.utility";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { formatInr } from "../../utilities/amount-in-words.utility";
import { endOfDay, startOfDay } from "../../utilities/date-time.utility";
import { assertInScope } from "../../utilities/shop-scope.utility";
import { transactionWithRetry } from "../../utilities/transaction.utility";
import { TShopScope } from "../../types/shop.type";
import stockService from "../inventory/stock.service";
import { getPaymentStatus } from "../purchase/purchase.service";
import sequenceService from "../utility/sequence.service";
import { calculateInvoice } from "./invoice-calculator";
import { InvoiceEmail, TInvoiceEmailStatus } from "../../entities/invoice/invoice-email.entity";
import { invoicePdfDefinition } from "../../pdf/invoice-pdf.template";
import { generatePdf } from "../../pdf/pdf-generator";
import { sendMail } from "../../mailer/mailer";
import {
  defaultInvoiceMessage,
  defaultInvoiceSubject,
  invoiceEmailHtml,
} from "../../mailer/invoice-email.template";
import { SHOP_TIME_ZONE } from "../../utilities/date-time.utility";
import { InvoiceEmailRepository } from "../../data-source/repository";
import { placeOfSupplyFor } from "../../utilities/gst.utility";
import settingsService from "../settings/settings.service";

export const INVOICE_REFERENCE = "INVOICE";
const WALK_IN_CUSTOMER = "Walk-in Customer";

const list = async (params: TInvoiceListParams) => {
  const query = InvoiceRepository.createQueryBuilder("invoice")
    .leftJoin("invoice.createdBy", "createdBy")
    .leftJoin("invoice.shop", "shop")
    .addSelect(["createdBy.id", "createdBy.firstName", "createdBy.lastName", "shop.id", "shop.name", "shop.code"]);

  if (params.shopId) query.andWhere("shop.id = :shopId", { shopId: params.shopId });

  if (params.keyword) {
    const keyword = `%${params.keyword.trim()}%`;
    query.andWhere(
      new Brackets((qb) => {
        qb.where("invoice.invoiceNumber LIKE :keyword", { keyword })
          .orWhere("invoice.customerName LIKE :keyword", { keyword })
          .orWhere("invoice.customerPhone LIKE :keyword", { keyword })
          .orWhere("invoice.vehicleNumber LIKE :keyword", { keyword });
      })
    );
  }
  if (params.customerId) {
    query.andWhere("invoice.customer_id = :customerId", {
      customerId: params.customerId,
    });
  }
  if (params.paymentStatus) {
    query.andWhere("invoice.paymentStatus = :paymentStatus", {
      paymentStatus: params.paymentStatus,
    });
  }
  if (params.status) {
    query.andWhere("invoice.status = :status", { status: params.status });
  }
  // past the due date and still not fully paid
  if (params.overdue === "true") {
    query
      .andWhere("invoice.status = :issued", { issued: TInvoiceStatus.ISSUED })
      .andWhere("invoice.paidAmount < invoice.grandTotal")
      .andWhere("invoice.dueDate < :now", { now: startOfDay() });
  }
  if (params.from) {
    query.andWhere("invoice.invoiceDate >= :from", { from: startOfDay(params.from) });
  }
  if (params.to) {
    query.andWhere("invoice.invoiceDate <= :to", { to: endOfDay(params.to) });
  }

  const [response, total] = await query
    .orderBy("invoice.invoiceDate", "DESC")
    .addOrderBy("invoice.id", "DESC")
    .skip(ApiUtility.getOffset(params.limit, params.page))
    .take(params.limit)
    .getManyAndCount();

  return {
    response,
    pagination: ApiUtility.getPagination(total, params.limit, params.page)
      .pagination,
  };
};

const detail = async (id: number, shopId: TShopScope) => {
  const invoice = await InvoiceRepository.findOne({
    where: { id },
    relations: {
      shop: true,
      customer: true,
      items: { product: true },
      payments: { createdBy: true },
      createdBy: true,
      cancelledBy: true,
      emails: { createdBy: true },
    },
    order: { items: { id: "ASC" }, payments: { id: "ASC" }, emails: { id: "DESC" } },
  });
  if (!invoice) throw new StringError("Invoice not found.");
  assertInScope(invoice.shop.id, shopId, "Invoice");

  // logos aren't loaded with the shop (they're large); the invoice prints its shop's logo,
  // or the business logo when the shop has none
  const shop = await ShopRepository.findOne({ where: { id: invoice.shop.id }, select: { id: true, logo: true } });
  invoice.shop.logo = shop?.logo || (await settingsService.businessLogo());
  return invoice;
};

// Billed from one shop: its stock, its customers, its invoice numbering.
// Everything runs on the transaction's own connection; stock rows are locked in product order and the
// invoice number is taken last, so the shop's numbering lock is held only while the bill is written.
const create = async (params: TInvoice, userId: number, permissions: string[], shopId: number) => {
  const canDiscount = permissions.includes(TPermission.INVOICE_DISCOUNT);
  const shop = await ShopRepository.findOne({ where: { id: shopId } });

  let customer: Customer = null;
  if (params.customerId) {
    customer = await CustomerRepository.findOne({
      where: { id: params.customerId, shop: { id: shopId }, isDeleted: false },
    });
    if (!customer) throw new StringError("Customer not found in this shop.");
  }

  const id = await transactionWithRetry(async (manager) => {
    const found = await manager.getRepository(Product).find({
      where: { id: In(params.items.map((item) => item.productId)), isDeleted: false },
    });
    const productById = new Map(found.map((product) => [product.id, product]));

    const products = params.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new StringError("One of the products was not found.");
      if (!product.isActive) {
        throw new StringError(`"${product.name}" is inactive and cannot be billed.`);
      }

      const isDiscounted =
        (item.discountPercent || 0) > 0 || item.unitPrice < product.sellingPrice;
      if (isDiscounted && !canDiscount) {
        throw new ForbiddenError(
          `You are not allowed to give a discount on "${product.name}".`
        );
      }
      return product;
    });
    if ((params.extraDiscount || 0) > 0 && !canDiscount) {
      throw new ForbiddenError("You are not allowed to give a discount.");
    }

    let totals: ReturnType<typeof calculateInvoice>;
    try {
      totals = calculateInvoice(
        params.items.map((item, i) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          taxPercent: Number(products[i].taxPercent),
        })),
        params.extraDiscount || 0
      );
    } catch (e) {
      throw new StringError(e.message);
    }

    const paidAmount = twoDecimalFloat(params.paidAmount || 0);
    if (paidAmount > totals.grandTotal) {
      throw new StringError("Paid amount cannot be more than the invoice total.");
    }

    // cost of goods sold is this shop's average cost at the moment of sale, read from the locked rows
    const stockRows = await stockService.lockStockRows(manager, shopId, found);
    const unitCosts = products.map((p) => Number(stockRows.get(p.id)?.avgCost || p.purchasePrice || 0));
    const costTotal = twoDecimalFloat(
      params.items.reduce((sum, item, i) => sum + item.quantity * unitCosts[i], 0)
    );

    const { placeOfSupply, isInterState } = placeOfSupplyFor(shop.gstin, customer?.gstin, params.placeOfSupply);

    const invoiceNumber = await sequenceService.getNextNumber(
      manager,
      INVOICE_NUMBER_SEQ,
      shopId,
      shop.invoicePrefix
    );

    const invoice = await manager.getRepository(Invoice).save({
      invoiceNumber,
      shop: { id: shopId },
      invoiceDate: params.invoiceDate ? new Date(params.invoiceDate) : new Date(),
      customer: customer ? { id: customer.id } : null,
      customerName: customer?.name || params.customerName?.trim() || WALK_IN_CUSTOMER,
      customerPhone: customer?.phone || params.customerPhone,
      customerAddress: customer?.address,
      customerGstin: customer?.gstin,
      customerEmail: customer?.email || params.customerEmail?.trim() || null,
      // credit customers get a due date; a fully paid bill has nothing due
      dueDate:
        paidAmount < totals.grandTotal
          ? moment
              .tz(params.invoiceDate || new Date(), SHOP_TIME_ZONE)
              .add(params.paymentTermsDays || 0, "days")
              .endOf("day")
              .toDate()
          : null,
      vehicleNumber: params.vehicleNumber?.toUpperCase(),
      placeOfSupply,
      isInterState,
      subTotal: totals.subTotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount,
      costTotal,
      paymentStatus: getPaymentStatus(paidAmount, totals.grandTotal),
      status: TInvoiceStatus.ISSUED,
      notes: params.notes,
      items: totals.items.map((line, i) => ({
        product: { id: products[i].id },
        productName: products[i].name,
        sku: products[i].sku,
        partNumber: products[i].partNumber,
        hsnCode: products[i].hsnCode,
        unit: products[i].unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
        discountAmount: line.discountAmount,
        taxPercent: line.taxPercent,
        taxableAmount: line.taxableAmount,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
        unitCost: unitCosts[i],
      })) as any,
      payments: paidAmount
        ? ([
            {
              type: TInvoicePaymentType.PAYMENT,
              amount: paidAmount,
              paymentMode: params.paymentMode,
              paidAt: new Date(),
              createdBy: { id: userId },
              updatedBy: { id: userId },
            },
          ] as any)
        : [],
      createdBy: { id: userId },
      updatedBy: { id: userId },
    });

    // refuses to take any product below zero
    await stockService.applyMovements(
      manager,
      stockRows,
      productById,
      params.items.map((item) => ({
        shopId,
        productId: item.productId,
        type: TStockTransactionType.SALE,
        quantity: -item.quantity,
        referenceType: INVOICE_REFERENCE,
        referenceId: invoice.id,
        referenceNo: invoiceNumber,
        userId,
      }))
    );

    return invoice.id;
  });

  return detail(id, shopId);
};

const addPayment = async (id: number, params: TInvoicePayment, userId: number, shopId: TShopScope) => {
  await detail(id, shopId);
  await AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(Invoice);
    const invoice = await repo.findOne({
      where: { id },
      lock: { mode: "pessimistic_write" },
    });
    if (!invoice) throw new StringError("Invoice not found.");
    if (invoice.status === TInvoiceStatus.CANCELLED) {
      throw new StringError("This invoice is cancelled.");
    }

    const due = twoDecimalFloat(invoice.grandTotal - invoice.paidAmount);
    if (params.amount > due) {
      throw new StringError(`Only ${due} is due on this invoice.`);
    }

    await manager.getRepository(InvoicePayment).save({
      invoice: { id },
      type: TInvoicePaymentType.PAYMENT,
      amount: params.amount,
      paymentMode: params.paymentMode,
      note: params.note,
      paidAt: new Date(),
      createdBy: { id: userId },
      updatedBy: { id: userId },
    });

    const paidAmount = twoDecimalFloat(invoice.paidAmount + params.amount);
    await repo.update(id, {
      paidAmount,
      paymentStatus: getPaymentStatus(paidAmount, invoice.grandTotal),
      updatedBy: { id: userId },
    });
  });

  return detail(id, shopId);
};

// Cancelling puts every item back into stock. The invoice number stays used so the series has no gaps.
// Whatever the customer paid is recorded as refunded (a negative payment in the chosen mode), so the
// day's collections still match the cash drawer.
const cancel = async (id: number, params: TInvoiceCancel, userId: number, shopId: TShopScope) => {
  await detail(id, shopId);
  await transactionWithRetry(async (manager) => {
    const repo = manager.getRepository(Invoice);
    // lock the header row first, then load the lines (MySQL can't lock a subset of joined tables)
    const invoice = await repo.findOne({
      where: { id },
      relations: { shop: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!invoice) throw new StringError("Invoice not found.");
    invoice.items = await manager.getRepository(InvoiceItem).find({
      where: { invoice: { id } },
      relations: { product: true },
    });
    if (invoice.status === TInvoiceStatus.CANCELLED) {
      throw new StringError("This invoice is already cancelled.");
    }

    const refund = twoDecimalFloat(Number(invoice.paidAmount));
    if (refund > 0 && !params.refundMode) {
      throw new StringError(`${formatInr(refund)} was paid on this invoice. Choose how it was refunded.`);
    }

    await repo.update(id, {
      status: TInvoiceStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: { id: userId },
      cancelReason: params.reason,
      paidAmount: 0,
      paymentStatus: getPaymentStatus(0, invoice.grandTotal),
      updatedBy: { id: userId },
    });

    if (refund > 0) {
      await manager.getRepository(InvoicePayment).save({
        invoice: { id },
        type: TInvoicePaymentType.REFUND,
        amount: -refund,
        paymentMode: params.refundMode,
        note: "Refunded on cancellation",
        paidAt: new Date(),
        createdBy: { id: userId },
        updatedBy: { id: userId },
      });
    }

    const products = invoice.items.map((item) => item.product);
    const stockRows = await stockService.lockStockRows(manager, invoice.shop.id, products);
    await stockService.applyMovements(
      manager,
      stockRows,
      new Map(products.map((product) => [product.id, product])),
      invoice.items.map((item) => ({
        shopId: invoice.shop.id,
        productId: item.product.id,
        type: TStockTransactionType.SALE_CANCELLED,
        quantity: item.quantity,
        unitCost: item.unitCost,
        referenceType: INVOICE_REFERENCE,
        referenceId: invoice.id,
        referenceNo: invoice.invoiceNumber,
        note: params.reason,
        userId,
      }))
    );
  });

  return detail(id, shopId);
};

const pdf = async (id: number, shopId: TShopScope, copy: TInvoiceCopy = TInvoiceCopy.ORIGINAL) => {
  const invoice = await detail(id, shopId);
  const buffer = await generatePdf(await invoicePdfDefinition(invoice, copy));
  return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
};

// Emails the invoice as a PDF. Every attempt is logged on the invoice, sent or failed.
const sendEmail = async (id: number, params: TInvoiceEmailRequest, userId: number, shopId: TShopScope) => {
  const invoice = await detail(id, shopId);
  if (invoice.status === TInvoiceStatus.CANCELLED) {
    throw new StringError("A cancelled invoice can't be emailed.");
  }

  const subject = params.subject?.trim() || defaultInvoiceSubject(invoice);
  const message = params.message?.trim() || defaultInvoiceMessage(invoice);
  const file = await pdf(id, shopId, params.copy);
  const logo = invoice.shop.logo?.match(/^data:(image\/(?:png|jpe?g));base64,(.+)$/);

  const log = { invoice: { id }, toAddress: params.to, ccAddress: params.cc || null, subject, createdBy: { id: userId }, updatedBy: { id: userId } };
  try {
    await sendMail({
      to: params.to,
      cc: params.cc,
      replyTo: invoice.shop.email,
      fromName: invoice.shop.name,
      subject,
      html: invoiceEmailHtml(invoice, message),
      text: `${message}\n\nThe invoice is attached as a PDF.`,
      attachments: [
        { filename: file.filename, content: file.buffer, contentType: "application/pdf" },
        ...(logo ? [{ filename: "logo", content: Buffer.from(logo[2], "base64"), contentType: logo[1], cid: "shop-logo" } as any] : []),
      ],
    });
  } catch (error) {
    await InvoiceEmailRepository.save({ ...log, status: TInvoiceEmailStatus.FAILED, error: String(error.message || error).slice(0, 500) });
    if (error instanceof StringError) throw error;
    throw new StringError(`The email could not be sent: ${error.message}`);
  }

  await InvoiceEmailRepository.save({ ...log, status: TInvoiceEmailStatus.SENT });

  // remember the address for next time
  if (!invoice.customerEmail) await InvoiceRepository.update(id, { customerEmail: params.to });
  if (params.saveToCustomer && invoice.customer && !invoice.customer.email) {
    await CustomerRepository.update(invoice.customer.id, { email: params.to });
  }

  return detail(id, shopId);
};

export default { list, detail, create, addPayment, cancel, pdf, sendEmail };
