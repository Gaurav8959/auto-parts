import joi from "joi";
import {
  TAdjustmentReason,
  TStockTransactionType,
} from "../../types/inventory.type";

export const stockAdjustmentSchema = joi.object({
  productId: joi.number().integer().positive().required(),
  type: joi
    .string()
    .valid(TStockTransactionType.ADJUSTMENT_IN, TStockTransactionType.ADJUSTMENT_OUT)
    .required(),
  quantity: joi.number().positive().required(),
  reason: joi.string().valid(...Object.values(TAdjustmentReason)).required(),
  note: joi.string().max(255).allow("", null).optional(),
});

export const stockTransactionListSchema = joi.object({
  page: joi.number().integer().min(1),
  limit: joi.number().integer().min(1).max(200),
  productId: joi.number().integer().positive(),
  type: joi.string().valid(...Object.values(TStockTransactionType)),
  from: joi.date().iso(),
  to: joi.date().iso(),
});
