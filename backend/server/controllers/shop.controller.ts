import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import shopService from "../services/shop/shop.service";
import { TShop } from "../types/shop.type";
import { TUserRole } from "../types/user.type";
import ApiResponse from "../utilities/api-response.utility";

// The admin always gets every shop (for the shop switcher), whichever shop is selected
const list: IController = async (req, res) => {
  const shops = await shopService.list(req.user.role === TUserRole.ADMIN ? null : req.shopId);
  return ApiResponse.result(res, shops, httpStatusCodes.OK);
};

const withoutManager: IController = async (req, res) => {
  const shops = await shopService.withoutManager();
  return ApiResponse.result(res, shops, httpStatusCodes.OK);
};

const scopeFor = (req: any) => (req.user.role === TUserRole.ADMIN ? null : req.shopId);

const detail: IController = async (req, res) => {
  const shop = await shopService.detail(Number(req.params.id), scopeFor(req));
  return ApiResponse.result(res, shop, httpStatusCodes.OK);
};

const update: IController = async (req, res) => {
  const params: TShop = req.body;
  const shop = await shopService.update(Number(req.params.id), params, req.user.id, scopeFor(req));
  return ApiResponse.result(res, shop, httpStatusCodes.OK);
};

export default { list, withoutManager, detail, update };
