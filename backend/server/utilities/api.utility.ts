import { Request } from "express";

// Entities
import { User } from "../entities/usermgmt/user.entity";

// Interfaces
import { IPagination } from "../interfaces/common.interface";

export default class ApiUtility {
  static getAuthorizationToken(req: Request) {
    if (req.headers.authorization) {
      return req.headers.authorization.split(" ")[1];
    }
    return null;
  }

  static sanitizeUser(user: User) {
    const { password, isDeleted, tokenVersion, ...basicUser } = user;
    return basicUser;
  }

  static getQueryParam(req: any, type: string) {
    if (req && type && type !== "") {
      switch (type) {
        case "limit": {
          return req.query.limit ? parseInt(req.query.limit.toString(), 10) : 20;
        }
        case "page": {
          return req.query.page ? parseInt(req.query.page.toString(), 10) : 1;
        }
        default: {
          return req.query[type] ? req.query[type] : null;
        }
      }
    }
    return null;
  }

  static getOffset(limit: number, page: number) {
    return limit * page - limit;
  }

  static getPagination(total: number, limit: number, currentPage: number) {
    const pagination: IPagination = {
      currentPage,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      previousPage: currentPage <= 1 ? null : currentPage - 1,
      nextPage: total - currentPage * limit > 0 ? currentPage + 1 : null,
      totalItems: total,
    };
    return { pagination };
  }
}
