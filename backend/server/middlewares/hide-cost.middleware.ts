import express from "express";

// Interfaces
import IRequest from "../interfaces/IRequest";

// Types
import { TPermission } from "../types/permission.type";

// Every response field that reveals what the shop paid for its stock or what it earns on it
export const COST_FIELDS = new Set([
  "purchasePrice",
  "avgCost",
  "lastAvgCost",
  "unitCost",
  "costTotal",
  "cost",
  "stockValue",
  "profit",
  "monthProfit",
]);

// Purchase bills are cost documents: anyone allowed to view purchases sees their prices
const COST_DOCUMENT_PATHS = ["/purchase"];

export const withoutCost = (value: any): any => {
  if (Array.isArray(value)) return value.map(withoutCost);
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !COST_FIELDS.has(key))
      .map(([key, field]) => [key, withoutCost(field)])
  );
};

// One place that hides cost from users without "See purchase cost", for every endpoint (present and
// future), instead of each controller remembering to strip its own fields
export default (req: IRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.permissions?.includes(TPermission.PRODUCT_VIEW_COST)) return next();
  if (COST_DOCUMENT_PATHS.some((path) => req.path.startsWith(path))) return next();

  const json = res.json.bind(res);
  res.json = (body: any) => json(withoutCost(body));
  next();
};
