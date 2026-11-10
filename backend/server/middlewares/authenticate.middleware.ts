import express from "express";
import httpStatusCodes from "http-status-codes";

// Errors
import { ForbiddenError } from "../errors/forbidden.error";
import { StringError } from "../errors/string.error";

// Services
import permissionService from "../services/usermgmt/permission.service";
import userService from "../services/usermgmt/user.service";

// Interfaces
import IRequest from "../interfaces/IRequest";

// Utilities
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import Encryption from "../utilities/encryption.utility";
import { resolveShopScope, SHOP_HEADER } from "../utilities/shop-scope.utility";

// Constants
import constants from "../constants";

export default async (
  req: IRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  if (
    req.method === "OPTIONS" ||
    constants.APPLICATION.authorizationIgnorePath.indexOf(req.path) !== -1
  ) {
    return next();
  }

  const authorizationToken = ApiUtility.getAuthorizationToken(req);

  if (!authorizationToken) {
    return ApiResponse.error(res, httpStatusCodes.UNAUTHORIZED);
  }

  // Express 4 ignores a rejected promise from middleware, which would crash the process:
  // database errors are handed to the error handler instead
  try {
    const decoded = await Encryption.verifyJWTToken(authorizationToken);
    if (!decoded) {
      return ApiResponse.error(res, httpStatusCodes.UNAUTHORIZED);
    }

    const user = await userService.getById(
      decoded.data[constants.COOKIE.KEY_USER_ID]
    );

    if (!user || !user.isActive) {
      return ApiResponse.error(
        res,
        httpStatusCodes.UNAUTHORIZED,
        "Your account is inactive. Contact the admin."
      );
    }

    // a password change, a reset or "sign out other devices" ends older sessions
    if (decoded.data[constants.COOKIE.KEY_TOKEN_VERSION] !== user.tokenVersion) {
      return ApiResponse.error(
        res,
        httpStatusCodes.UNAUTHORIZED,
        "Your session has ended. Please sign in again."
      );
    }

    req.user = user;
    req.permissions = await permissionService.getEffectivePermissions(user);
    req.shopId = await resolveShopScope(user, req.headers[SHOP_HEADER]);
  } catch (error) {
    if (error instanceof StringError || error instanceof ForbiddenError) {
      return ApiResponse.exception(res, error);
    }
    return next(error);
  }

  next();
};
