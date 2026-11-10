import joi from "joi";
import { newShopSchema } from "./shop.schema";

export const loginSchema = joi.object({
  email: joi.string().email({ tlds: { allow: false } }).required(),
  password: joi.string().required(),
});

// A manager comes with a shop: a new one (`shop`) or an existing shop without a manager (`existingShopId`)
export const createUserSchema = joi
  .object({
    email: joi.string().email({ tlds: { allow: false } }).max(100).required(),
    password: joi.string().min(6).max(50).required(),
    firstName: joi.string().trim().min(1).max(100).required(),
    lastName: joi.string().trim().max(100).allow("", null).optional(),
    mobile: joi.string().max(20).allow("", null).optional(),
    isActive: joi.boolean().optional(),
    existingShopId: joi.number().integer().positive(),
    shop: newShopSchema,
  })
  .xor("existingShopId", "shop");

export const updateUserSchema = joi.object({
  email: joi.string().email({ tlds: { allow: false } }).max(100).optional(),
  firstName: joi.string().trim().min(1).max(100).optional(),
  lastName: joi.string().trim().max(100).allow("", null).optional(),
  mobile: joi.string().max(20).allow("", null).optional(),
  isActive: joi.boolean().optional(),
});

export const resetPasswordSchema = joi.object({
  password: joi.string().min(6).max(50).required(),
});

export const changePasswordSchema = joi.object({
  currentPassword: joi.string().required(),
  newPassword: joi.string().min(6).max(50).required(),
});

export const updateProfileSchema = joi.object({
  firstName: joi.string().trim().min(1).max(100).required(),
  lastName: joi.string().trim().max(100).allow("", null).optional(),
  mobile: joi.string().max(20).allow("", null).optional(),
});

export const userPermissionUpdateSchema = joi.object({
  permissions: joi
    .array()
    .items(
      joi.object({
        permission: joi.string().required(),
        permissionVal: joi.boolean().required(),
      })
    )
    .min(1)
    .required(),
});
