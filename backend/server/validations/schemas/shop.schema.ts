import joi from "joi";

// a small PNG/JPEG logo, resized in the browser before upload
export const logoSchema = joi
  .string()
  .pattern(/^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/)
  .max(400_000)
  .allow("", null)
  .messages({ "string.max": "The logo is too large. Use a smaller image.", "string.pattern.base": "The logo must be a PNG or JPEG image." });

const shopFields = {
  name: joi.string().trim().min(1).max(150),
  code: joi.string().trim().uppercase().alphanum().min(1).max(10),
  tagline: joi.string().max(150).allow("", null),
  address: joi.string().allow("", null),
  phone: joi.string().max(30).allow("", null),
  email: joi.string().email({ tlds: { allow: false } }).max(100).allow("", null),
  gstin: joi.string().trim().uppercase().max(20).allow("", null),
  invoiceTerms: joi.string().allow("", null),
  invoicePrefix: joi.string().trim().uppercase().alphanum().min(1).max(10),
  purchasePrefix: joi.string().trim().uppercase().alphanum().min(1).max(10),
  logo: logoSchema,
  bankName: joi.string().trim().max(100).allow("", null),
  bankAccountName: joi.string().trim().max(150).allow("", null),
  bankAccountNumber: joi.string().trim().max(40).allow("", null),
  bankIfsc: joi.string().trim().uppercase().max(20).allow("", null),
  upiId: joi
    .string()
    .trim()
    .pattern(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Enter a UPI id like shopname@okicici." }),
};

export const newShopSchema = joi.object({ ...shopFields, name: shopFields.name.required() });

export const updateShopSchema = joi.object({ ...shopFields, isActive: joi.boolean() });
