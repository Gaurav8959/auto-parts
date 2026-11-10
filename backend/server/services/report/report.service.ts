import {
  InvoiceItemRepository,
  InvoicePaymentRepository,
  InvoiceRepository,
  PurchaseRepository,
} from "../../data-source/repository";
import { TInvoiceStatus } from "../../types/invoice.type";
import { TReportParams } from "../../types/report.type";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { endOfDay, startOfDay } from "../../utilities/date-time.utility";
import { splitTax } from "../../utilities/gst.utility";
import stockService from "../inventory/stock.service";
import { TShopScope } from "../../types/shop.type";

const range = (params: TReportParams) => ({
  from: startOfDay(params.from),
  to: endOfDay(params.to),
  status: TInvoiceStatus.ISSUED,
  shopId: params.shopId,
});

// "1 = 1" keeps the query valid when the admin is looking at every shop
const shopFilter = (alias: string, params: TReportParams) =>
  params.shopId ? `${alias}.shop_id = :shopId` : "1 = 1";

const sales = async (params: TReportParams) => {
  const args = range(params);

  const [totals, daily, topProducts, payments, purchases] = await Promise.all([
    InvoiceRepository.createQueryBuilder("invoice")
      .select("COUNT(invoice.id)", "invoiceCount")
      .addSelect("COALESCE(SUM(invoice.grandTotal), 0)", "sales")
      .addSelect("COALESCE(SUM(invoice.taxTotal), 0)", "tax")
      .addSelect("COALESCE(SUM(invoice.discountTotal), 0)", "discount")
      .addSelect("COALESCE(SUM(invoice.costTotal), 0)", "cost")
      .addSelect("COALESCE(SUM(invoice.grandTotal - invoice.paidAmount), 0)", "due")
      .where("invoice.status = :status")
      .andWhere("invoice.invoiceDate BETWEEN :from AND :to")
      .andWhere(shopFilter("invoice", params))
      .setParameters(args)
      .getRawOne(),
    InvoiceRepository.createQueryBuilder("invoice")
      .select(`DATE(CONVERT_TZ(invoice.invoiceDate, '+00:00', '+05:30'))`, "day")
      .addSelect("COUNT(invoice.id)", "invoiceCount")
      .addSelect("COALESCE(SUM(invoice.grandTotal), 0)", "sales")
      .addSelect("COALESCE(SUM(invoice.taxTotal), 0)", "tax")
      .addSelect("COALESCE(SUM(invoice.grandTotal - invoice.taxTotal - invoice.costTotal), 0)", "profit")
      .where("invoice.status = :status")
      .andWhere("invoice.invoiceDate BETWEEN :from AND :to")
      .andWhere(shopFilter("invoice", params))
      .setParameters(args)
      .groupBy("day")
      .orderBy("day", "ASC")
      .getRawMany(),
    InvoiceItemRepository.createQueryBuilder("item")
      .innerJoin("item.invoice", "invoice")
      .innerJoin("item.product", "product")
      .select("product.id", "productId")
      .addSelect("item.productName", "name")
      .addSelect("item.sku", "sku")
      .addSelect("SUM(item.quantity)", "quantity")
      .addSelect("SUM(item.lineTotal)", "sales")
      .addSelect("SUM(item.taxableAmount - item.quantity * item.unitCost)", "profit")
      .where("invoice.status = :status")
      .andWhere("invoice.invoiceDate BETWEEN :from AND :to")
      .andWhere(shopFilter("invoice", params))
      .setParameters(args)
      .groupBy("product.id")
      .addGroupBy("item.productName")
      .addGroupBy("item.sku")
      .orderBy("sales", "DESC")
      .limit(15)
      .getRawMany(),
    // money actually received and paid back in the period, whatever became of the invoice since:
    // a refund on cancelling is a negative payment on the day it was given, so this matches the cash drawer
    InvoicePaymentRepository.createQueryBuilder("payment")
      .innerJoin("payment.invoice", "invoice")
      .select("payment.paymentMode", "paymentMode")
      .addSelect("SUM(payment.amount)", "amount")
      .addSelect("SUM(CASE WHEN payment.amount < 0 THEN -payment.amount ELSE 0 END)", "refunded")
      .where("payment.paidAt BETWEEN :from AND :to")
      .andWhere(shopFilter("invoice", params))
      .setParameters(args)
      .groupBy("payment.paymentMode")
      .getRawMany(),
    PurchaseRepository.createQueryBuilder("purchase")
      .select("COUNT(purchase.id)", "count")
      .addSelect("COALESCE(SUM(purchase.grandTotal), 0)", "total")
      .where("purchase.purchaseDate BETWEEN :from AND :to")
      .andWhere(shopFilter("purchase", params))
      .setParameters(args)
      .getRawOne(),
  ]);

  // the admin's all-shops view also compares shops
  const byShop = params.shopId
    ? null
    : await InvoiceRepository.createQueryBuilder("invoice")
        .innerJoin("invoice.shop", "shop")
        .select("shop.id", "shopId")
        .addSelect("shop.name", "name")
        .addSelect("shop.code", "code")
        .addSelect("COUNT(invoice.id)", "invoiceCount")
        .addSelect("SUM(invoice.grandTotal)", "sales")
        .addSelect("SUM(invoice.taxTotal)", "tax")
        .addSelect("SUM(invoice.grandTotal - invoice.taxTotal - invoice.costTotal)", "profit")
        .addSelect("SUM(invoice.grandTotal - invoice.paidAmount)", "due")
        .where("invoice.status = :status")
        .andWhere("invoice.invoiceDate BETWEEN :from AND :to")
        .setParameters(args)
        .groupBy("shop.id")
        .addGroupBy("shop.name")
        .addGroupBy("shop.code")
        .orderBy("sales", "DESC")
        .getRawMany();

  const salesValue = Number(totals.sales);
  const taxValue = Number(totals.tax);
  const costValue = Number(totals.cost);

  return {
    summary: {
      invoiceCount: Number(totals.invoiceCount),
      sales: twoDecimalFloat(salesValue),
      tax: twoDecimalFloat(taxValue),
      discount: twoDecimalFloat(Number(totals.discount)),
      cost: twoDecimalFloat(costValue),
      // profit is measured on the pre-tax value; GST is not the shop's money
      profit: twoDecimalFloat(salesValue - taxValue - costValue),
      due: twoDecimalFloat(Number(totals.due)),
      purchaseCount: Number(purchases.count),
      purchaseTotal: twoDecimalFloat(Number(purchases.total)),
    },
    daily: daily.map((d) => ({
      day: d.day,
      invoiceCount: Number(d.invoiceCount),
      sales: twoDecimalFloat(Number(d.sales)),
      tax: twoDecimalFloat(Number(d.tax)),
      profit: twoDecimalFloat(Number(d.profit)),
    })),
    topProducts: topProducts.map((p) => ({
      ...p,
      productId: Number(p.productId),
      quantity: Number(p.quantity),
      sales: twoDecimalFloat(Number(p.sales)),
      profit: twoDecimalFloat(Number(p.profit)),
    })),
    byShop: byShop?.map((s) => ({
      shopId: Number(s.shopId),
      name: s.name,
      code: s.code,
      invoiceCount: Number(s.invoiceCount),
      sales: twoDecimalFloat(Number(s.sales)),
      tax: twoDecimalFloat(Number(s.tax)),
      profit: twoDecimalFloat(Number(s.profit)),
      due: twoDecimalFloat(Number(s.due)),
    })),
    payments: payments.map((p) => ({
      paymentMode: p.paymentMode,
      amount: twoDecimalFloat(Number(p.amount)),
      refunded: twoDecimalFloat(Number(p.refunded)),
    })),
  };
};

// Tax per rate, split by where the goods went: CGST + SGST within the shop's state, IGST to another state
const gst = async (params: TReportParams) => {
  const rows = await InvoiceItemRepository.createQueryBuilder("item")
    .innerJoin("item.invoice", "invoice")
    .select("item.taxPercent", "taxPercent")
    .addSelect("invoice.isInterState", "isInterState")
    .addSelect("SUM(item.taxableAmount)", "taxable")
    .addSelect("SUM(item.taxAmount)", "tax")
    .where("invoice.status = :status")
    .andWhere("invoice.invoiceDate BETWEEN :from AND :to")
    .andWhere(shopFilter("invoice", params))
    .setParameters(range(params))
    .groupBy("item.taxPercent")
    .addGroupBy("invoice.isInterState")
    .getRawMany();

  const byRate = new Map<number, { taxPercent: number; taxable: number; cgst: number; sgst: number; igst: number; tax: number }>();
  rows.forEach((r) => {
    const taxPercent = Number(r.taxPercent);
    const tax = twoDecimalFloat(Number(r.tax));
    const split = splitTax(tax, Number(r.isInterState) === 1);
    const row = byRate.get(taxPercent) || { taxPercent, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
    row.taxable = twoDecimalFloat(row.taxable + Number(r.taxable));
    row.cgst = twoDecimalFloat(row.cgst + split.cgst);
    row.sgst = twoDecimalFloat(row.sgst + split.sgst);
    row.igst = twoDecimalFloat(row.igst + split.igst);
    row.tax = twoDecimalFloat(row.tax + tax);
    byRate.set(taxPercent, row);
  });

  return [...byRate.values()].sort((a, b) => a.taxPercent - b.taxPercent);
};

const stock = async (shopId: TShopScope) => {
  const [summary, lowStock] = await Promise.all([stockService.summary(shopId), stockService.lowStock(shopId)]);
  return { summary, lowStock };
};

export default { sales, gst, stock };
