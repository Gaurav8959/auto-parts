import moment from "moment-timezone";
import {
  InvoiceRepository,
  PurchaseRepository,
  ShopRepository,
  ShopStockRepository,
} from "../../data-source/repository";
import { TInvoiceStatus } from "../../types/invoice.type";
import { TShopScope } from "../../types/shop.type";
import { twoDecimalFloat } from "../../utilities/common.utility";
import { SHOP_TIME_ZONE, startOfDay, startOfMonth } from "../../utilities/date-time.utility";
import stockService from "../inventory/stock.service";

const DAYS = 14;
const LOW_STOCK_ROWS = 8;

// Today's and this month's sales, profit and the amount customers owe, per shop, in one pass over the
// issued invoices (the receivable needs all of them anyway)
const invoiceFigures = async (shopId: TShopScope) => {
  const query = InvoiceRepository.createQueryBuilder("invoice")
    .select("invoice.shop_id", "shopId")
    .addSelect("SUM(CASE WHEN invoice.invoiceDate >= :today THEN 1 ELSE 0 END)", "todayCount")
    .addSelect("SUM(CASE WHEN invoice.invoiceDate >= :today THEN invoice.grandTotal ELSE 0 END)", "todayTotal")
    .addSelect(
      "SUM(CASE WHEN invoice.invoiceDate >= :today THEN invoice.grandTotal - invoice.taxTotal - invoice.costTotal ELSE 0 END)",
      "todayProfit"
    )
    .addSelect("SUM(CASE WHEN invoice.invoiceDate >= :month THEN 1 ELSE 0 END)", "monthCount")
    .addSelect("SUM(CASE WHEN invoice.invoiceDate >= :month THEN invoice.grandTotal ELSE 0 END)", "monthTotal")
    .addSelect(
      "SUM(CASE WHEN invoice.invoiceDate >= :month THEN invoice.grandTotal - invoice.taxTotal - invoice.costTotal ELSE 0 END)",
      "monthProfit"
    )
    .addSelect("SUM(invoice.grandTotal - invoice.paidAmount)", "receivable")
    .where("invoice.status = :status", { status: TInvoiceStatus.ISSUED, today: startOfDay(), month: startOfMonth() })
    .groupBy("invoice.shop_id");
  if (shopId) query.andWhere("invoice.shop_id = :shopId", { shopId });

  const rows = await query.getRawMany();
  return rows.map((row) => ({
    shopId: Number(row.shopId),
    todayCount: Number(row.todayCount || 0),
    todayTotal: Number(row.todayTotal || 0),
    todayProfit: Number(row.todayProfit || 0),
    monthCount: Number(row.monthCount || 0),
    monthTotal: Number(row.monthTotal || 0),
    monthProfit: Number(row.monthProfit || 0),
    receivable: Number(row.receivable || 0),
  }));
};

type TInvoiceFigures = Awaited<ReturnType<typeof invoiceFigures>>[number];

const sum = (rows: TInvoiceFigures[], key: keyof TInvoiceFigures) =>
  twoDecimalFloat(rows.reduce((total, row) => total + row[key], 0));

// One row per shop, so the owner can compare shops side by side
const shopBreakdown = async (figures: TInvoiceFigures[]) => {
  const [shops, alerts] = await Promise.all([
    ShopRepository.find({ order: { isActive: "DESC", name: "ASC" } }),
    ShopStockRepository.createQueryBuilder("stock")
      .innerJoin("stock.product", "product")
      .select("stock.shop_id", "shopId")
      .addSelect("COUNT(stock.id)", "count")
      .where("product.isDeleted = 0 AND product.isActive = 1 AND stock.quantity <= stock.reorderLevel")
      .groupBy("stock.shop_id")
      .getRawMany(),
  ]);

  return shops.map((shop) => {
    const row = figures.find((f) => f.shopId === shop.id);
    return {
      id: shop.id,
      name: shop.name,
      code: shop.code,
      isActive: shop.isActive,
      todaySales: twoDecimalFloat(row?.todayTotal || 0),
      todayInvoices: row?.todayCount || 0,
      monthSales: twoDecimalFloat(row?.monthTotal || 0),
      monthProfit: twoDecimalFloat(row?.monthProfit || 0),
      receivable: twoDecimalFloat(row?.receivable || 0),
      stockAlerts: Number(alerts.find((a) => Number(a.shopId) === shop.id)?.count || 0),
    };
  });
};

// 6 queries side by side (8 with the shop comparison), well under the connection pool, instead of one per figure
const summary = async (shopId: TShopScope) => {
  const chartFrom = startOfDay(moment.tz(SHOP_TIME_ZONE).subtract(DAYS - 1, "days").toDate());

  const payableQuery = PurchaseRepository.createQueryBuilder("purchase").select(
    "COALESCE(SUM(purchase.grandTotal - purchase.paidAmount), 0)",
    "due"
  );
  if (shopId) payableQuery.where("purchase.shop_id = :shopId", { shopId });

  const dailyQuery = InvoiceRepository.createQueryBuilder("invoice")
    .select(`DATE(CONVERT_TZ(invoice.invoiceDate, '+00:00', '+05:30'))`, "day")
    .addSelect("COALESCE(SUM(invoice.grandTotal), 0)", "total")
    .addSelect("COUNT(invoice.id)", "count")
    .where("invoice.status = :status", { status: TInvoiceStatus.ISSUED })
    .andWhere("invoice.invoiceDate >= :from", { from: chartFrom })
    .groupBy("day");
  if (shopId) dailyQuery.andWhere("invoice.shop_id = :shopId", { shopId });

  // the shop join is many-to-one, so a plain LIMIT is safe (find's `take` would add a second query)
  const recentQuery = InvoiceRepository.createQueryBuilder("invoice")
    .leftJoin("invoice.shop", "shop")
    .select([
      "invoice.id",
      "invoice.invoiceNumber",
      "invoice.invoiceDate",
      "invoice.customerName",
      "invoice.grandTotal",
      "invoice.paymentStatus",
      "invoice.status",
      "shop.id",
      "shop.name",
      "shop.code",
    ])
    .orderBy("invoice.id", "DESC")
    .limit(6);
  if (shopId) recentQuery.where("invoice.shop_id = :shopId", { shopId });

  const [figures, stock, payable, daily, recentInvoices, lowStock] = await Promise.all([
    invoiceFigures(shopId),
    stockService.summary(shopId),
    payableQuery.getRawOne(),
    dailyQuery.getRawMany(),
    recentQuery.getMany(),
    stockService.lowStock(shopId, LOW_STOCK_ROWS),
  ]);
  const shops = shopId ? null : await shopBreakdown(figures);

  const dailyMap = new Map(
    daily.map((d) => [moment(d.day).format("YYYY-MM-DD"), { total: Number(d.total), count: Number(d.count) }])
  );
  const salesTrend = Array.from({ length: DAYS }, (_, i) => {
    const day = moment
      .tz(SHOP_TIME_ZONE)
      .subtract(DAYS - 1 - i, "days")
      .format("YYYY-MM-DD");
    return { day, total: dailyMap.get(day)?.total || 0, count: dailyMap.get(day)?.count || 0 };
  });

  return {
    today: { count: sum(figures, "todayCount"), total: sum(figures, "todayTotal"), profit: sum(figures, "todayProfit") },
    month: { count: sum(figures, "monthCount"), total: sum(figures, "monthTotal"), profit: sum(figures, "monthProfit") },
    stock,
    receivable: sum(figures, "receivable"),
    payable: twoDecimalFloat(Number(payable.due)),
    salesTrend,
    recentInvoices,
    lowStock,
    shops,
  };
};

export default { summary };
