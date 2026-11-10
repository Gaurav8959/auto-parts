import express from "express";
import HttpStatus from "http-status-codes";
import logger from "../configs/logger.config";
import constants from "../constants";
import { ForbiddenError } from "../errors/forbidden.error";
import { StringError } from "../errors/string.error";
import ApiResponse from "../utilities/api-response.utility";

export const notFoundErrorHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  return ApiResponse.error(
    res,
    HttpStatus.NOT_FOUND,
    HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
  );
};

export const errorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Business-rule errors raised by services are safe to show to the user
  if (err instanceof StringError) {
    return ApiResponse.error(res, HttpStatus.BAD_REQUEST, err.message);
  }
  if (err instanceof ForbiddenError) {
    return ApiResponse.error(res, HttpStatus.FORBIDDEN, err.message);
  }
  if (err?.code === constants.ERROR_CODE.DUPLICATED) {
    return ApiResponse.error(
      res,
      HttpStatus.CONFLICT,
      "A record with the same value already exists."
    );
  }

  logger.error(
    `${req.method} ${req.originalUrl} failed: ${err?.stack || err}`
  );
  return ApiResponse.error(
    res,
    HttpStatus.INTERNAL_SERVER_ERROR,
    HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
  );
};
