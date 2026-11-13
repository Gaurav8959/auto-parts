import joi from "joi";
import { TInvoiceCopy, TInvoiceStatus } from "../../types/invoice.type";
import { GST_STATE_CODES } from "../../utilities/gst.utility";
import { TPaymentMode, TPaymentStatus } from "../../types/purchase.type";

export const createInvoiceSchema = joi.object({
  customerId: joi.number().integer().positive().allow(null).optional(),
  customerName: joi.string().trim().max(150).allow("", null).optional(),
  customerPhone: joi.string().trim().max(20).allow("", null).optional(),
  customerEmail: joi.string().trim().email({ tlds: { allow: false } }).max(100).allow("", null).optional(),
  paymentTermsDays: joi.number().integer().min(0).max(365).optional(),
  vehicleNumber: joi.string().trim().max(20).allow("", null).optional(),
  invoiceDate: joi.date().iso().optional(),
  placeOfSupply: joi.string().valid(...GST_STATE_CODES).allow("", null).optional(),
  isGst: joi.boolean().optional(),
  notes: joi.string().allow("", null).optional(),
  items: joi
    .array()
    .items(
      joi.object({
        productId: joi.number().integer().positive().required(),
        quantity: joi.number().positive().required(),
        unitPrice: joi.number().min(0).required(),
        discountPercent: joi.number().min(0).max(100).optional(),
      })
    )
    .min(1)
    // one bill, not a bulk import: keeps the billing transaction (and its locks) short
    .max(200)
    .required(),
  extraDiscount: joi.number().min(0).optional(),
  paidAmount: joi.number().min(0).optional(),
  paymentMode: joi
    .string()
    .valid(...Object.values(TPaymentMode))
    .when("paidAmount", {
      is: joi.number().required().greater(0),
      then: joi.required(),
    }),
});

// Editing keeps the invoice's kind, date and payments: those fields aren't accepted
export const updateInvoiceSchema = createInvoiceSchema.fork(
  ["isGst", "invoiceDate", "paidAmount", "paymentMode"],
  (schema) => schema.forbidden()
);

export const cancelInvoiceSchema = joi.object({
  reason: joi.string().trim().min(3).max(255).required(),
  refundMode: joi.string().valid(...Object.values(TPaymentMode)).optional(),
});

export const invoiceListSchema = joi.object({
  page: joi.number().integer().min(1),
  limit: joi.number().integer().min(1).max(200),
  keyword: joi.string().allow(""),
  customerId: joi.number().integer().positive(),
  paymentStatus: joi.string().valid(...Object.values(TPaymentStatus)),
  status: joi.string().valid(...Object.values(TInvoiceStatus)),
  overdue: joi.string().valid("true", "false", ""),
  gst: joi.string().valid("true", "false", ""),
  from: joi.date().iso(),
  to: joi.date().iso(),
});

const emailList = joi
  .string()
  .trim()
  .max(255)
  .custom((value, helpers) => {
    const parts = value.split(",").map((v: string) => v.trim()).filter(Boolean);
    const bad = parts.find((p: string) => joi.string().email({ tlds: { allow: false } }).validate(p).error);
    return bad ? helpers.message({ custom: `${bad} is not a valid email address` }) : parts.join(", ");
  });

export const emailInvoiceSchema = joi.object({
  to: emailList.required(),
  cc: emailList.allow("", null).optional(),
  subject: joi.string().trim().max(255).allow("", null).optional(),
  message: joi.string().max(5000).allow("", null).optional(),
  copy: joi.string().valid(...Object.values(TInvoiceCopy)).optional(),
  saveToCustomer: joi.boolean().optional(),
});

export const invoicePdfSchema = joi.object({
  copy: joi.string().valid(...Object.values(TInvoiceCopy)).optional(),
});
