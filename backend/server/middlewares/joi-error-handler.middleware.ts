import express from "express";
import { ExpressJoiError } from "express-joi-validation";
import * as HttpStatus from "http-status-codes";
import ApiResponse from "../utilities/api-response.utility";

export enum ContainerTypes {
  Body = "body",
  Query = "query",
  Headers = "headers",
  Fields = "fields",
  Params = "params",
}

export default (
  err: ExpressJoiError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (
    err &&
    err.type &&
    [...Object.values(ContainerTypes)].includes(err.type as ContainerTypes)
  ) {
    const error =
      err.error?.details &&
      err.error.details.map((er: any) => er.message.replace(/"/g, "")).join("\n");

    return ApiResponse.error(res, HttpStatus.BAD_REQUEST, error);
  }
  return next(err);
};
