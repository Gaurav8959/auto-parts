import joi from "joi";
import { TPaymentMode, TPaymentStatus } from "../../types/purchase.type";

export const paymentSchema = joi.object({
  amount: joi.number().positive().required(),
  paymentMode: joi.string().valid(...Object.values(TPaymentMode)).required(),
  note: joi.string().max(255).allow("", null).optional(),
});

export const createPurchaseSchema = joi.object({
  supplierId: joi.number().integer().positive().required(),
  supplierBillNo: joi.string().trim().max(50).allow("", null).optional(),
  purchaseDate: joi.date().iso().optional(),
  notes: joi.string().allow("", null).optional(),
  items: joi
    .array()
    .items(
      joi.object({
        productId: joi.number().integer().positive().required(),
        quantity: joi.number().positive().required(),
        unitCost: joi.number().min(0).required(),
        taxPercent: joi.number().min(0).max(100).optional(),
      })
    )
    .min(1)
    .required(),
  paidAmount: joi.number().min(0).optional(),
  paymentMode: joi
    .string()
    .valid(...Object.values(TPaymentMode))
    .when("paidAmount", {
      is: joi.number().required().greater(0),
      then: joi.required(),
    }),
  updateProductCost: joi.boolean().optional(),
});

export const purchaseListSchema = joi.object({
  page: joi.number().integer().min(1),
  limit: joi.number().integer().min(1).max(200),
  keyword: joi.string().allow(""),
  supplierId: joi.number().integer().positive(),
  paymentStatus: joi.string().valid(...Object.values(TPaymentStatus)),
  from: joi.date().iso(),
  to: joi.date().iso(),
});
