import joi from "joi";
import { logoSchema } from "./shop.schema";

// business-wide settings (admin only)
export const shopSettingsSchema = joi.object({
  shopName: joi.string().trim().min(1).max(150).optional(),
  defaultTaxPercent: joi.number().min(0).max(100).optional(),
  lowStockDefault: joi.number().integer().min(0).optional(),
  logo: logoSchema.optional(),
});

export const profileLogoSchema = joi.object({ logo: logoSchema.required() });
