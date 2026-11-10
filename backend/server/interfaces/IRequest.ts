import { Request } from "express";
import { User } from "../entities/usermgmt/user.entity";

export default interface IRequest extends Request {
  user?: User;
  permissions?: string[];
  // the shop this request acts on: a manager's own shop, the admin's selected shop, or null for all shops
  shopId?: number | null;
}
