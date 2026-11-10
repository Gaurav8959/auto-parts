import joi from "joi";
import { TStockStatusFilter } from "../../types/catalog.type";

export const categorySchema = joi.object({
  name: joi.string().trim().min(1).max(100).required(),
  description: joi.string().max(255).allow("", null).optional(),
});

export const brandSchema = categorySchema;

const productFields = {
  sku: joi.string().trim().min(1).max(50),
  partNumber: joi.string().trim().max(100).allow("", null),
  name: joi.string().trim().min(1).max(255),
  description: joi.string().allow("", null),
  categoryId: joi.number().integer().positive().allow(null),
  brandId: joi.number().integer().positive().allow(null),
  unit: joi.string().trim().max(20),
  hsnCode: joi.string().trim().max(10).allow("", null),
  taxPercent: joi.number().min(0).max(100),
  purchasePrice: joi.number().min(0),
  sellingPrice: joi.number().min(0),
  mrp: joi.number().min(0).allow(null),
  reorderLevel: joi.number().min(0),
  rackLocation: joi.string().trim().max(50).allow("", null),
  vehicleCompatibility: joi.string().allow("", null),
  isActive: joi.boolean(),
};

export const createProductSchema = joi.object({
  ...productFields,
  sku: productFields.sku.required(),
  name: productFields.name.required(),
  sellingPrice: productFields.sellingPrice.required(),
  openingStock: joi.number().min(0).optional(),
});

export const updateProductSchema = joi.object(productFields);

export const productListSchema = joi
  .object({
    page: joi.number().integer().min(1),
    limit: joi.number().integer().min(1).max(200),
    keyword: joi.string().allow(""),
    categoryId: joi.number().integer().positive(),
    brandId: joi.number().integer().positive(),
    stockStatus: joi.string().valid(...Object.values(TStockStatusFilter)),
    isActive: joi.string().valid("true", "false", ""),
  });
