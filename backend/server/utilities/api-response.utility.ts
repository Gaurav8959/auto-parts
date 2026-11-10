import { Response } from "express";
import httpStatusCodes from "http-status-codes";

// Interfaces
import { ICookie, IPagination } from "../interfaces/common.interface";

// Errors
import { ForbiddenError } from "../errors/forbidden.error";
import { StringError } from "../errors/string.error";

export default class ApiResponse {
  static result = (
    res: Response,
    data: any,
    status: number = 200,
    cookie: ICookie = null,
    pagination: IPagination = null
  ) => {
    res.status(status);

    let responseData: any = {
      data,
      success: true,
      ...(cookie && { token: cookie.value }),
    };

    if (pagination) {
      responseData = { ...responseData, pagination };
    }

    res.json(responseData);
  };

  static error = (
    res: Response,
    status: number = 400,
    error: string = httpStatusCodes.getStatusText(status)
  ) => {
    res.status(status).json({
      error: {
        message: error,
      },
      success: false,
    });
  };

  static exception(res: any, error: any) {
    if (error instanceof StringError) {
      return ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    }
    if (error instanceof ForbiddenError) {
      return ApiResponse.error(res, httpStatusCodes.FORBIDDEN, error.message);
    }
    return ApiResponse.error(
      res,
      httpStatusCodes.BAD_REQUEST,
      "Something went wrong"
    );
  }
}
