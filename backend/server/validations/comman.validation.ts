//comman.validation.ts

import Joi from "joi";

export const identifireValidation = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const paginationValidation = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  keyword: Joi.string().allow("").optional(),
}).unknown(true);

export const dateRangeValidation = Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().min(Joi.ref("from")).required(),
});
