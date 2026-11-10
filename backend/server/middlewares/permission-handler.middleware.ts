import express from "express";
import httpStatusCodes from "http-status-codes";

// Interfaces
import IRequest from "../interfaces/IRequest";

// Types
import { TPermission } from "../types/permission.type";
import { TUserRole } from "../types/user.type";

// Utilities
import ApiResponse from "../utilities/api-response.utility";

export const isAdmin = () => {
  return async (
    req: IRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.user?.role !== TUserRole.ADMIN) {
      return ApiResponse.error(
        res,
        httpStatusCodes.FORBIDDEN,
        "Only admin can do this."
      );
    }
    next();
  };
};

// Passes when the user holds at least one of the given permissions
export const hasPermission = (...permissions: TPermission[]) => {
  return async (
    req: IRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const granted = permissions.some((permission) =>
      req.permissions?.includes(permission)
    );
    if (!granted) {
      return ApiResponse.error(
        res,
        httpStatusCodes.FORBIDDEN,
        "You do not have permission to do this."
      );
    }
    next();
  };
};
