import joi from "joi";

export const partySchema = joi.object({
  name: joi.string().trim().min(1).max(150).required(),
  contactPerson: joi.string().trim().max(100).allow("", null).optional(),
  phone: joi.string().trim().max(20).allow("", null).optional(),
  email: joi.string().email({ tlds: { allow: false } }).max(100).allow("", null).optional(),
  address: joi.string().allow("", null).optional(),
  gstin: joi.string().trim().uppercase().max(20).allow("", null).optional(),
  notes: joi.string().allow("", null).optional(),
});
