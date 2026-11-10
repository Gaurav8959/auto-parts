import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import settingsService from "../services/settings/settings.service";
import { mailStatus } from "../mailer/mailer";
import { TShopSettings } from "../types/settings.type";
import { TUserRole } from "../types/user.type";
import ApiResponse from "../utilities/api-response.utility";

const get: IController = async (req, res) => {
  const data = await settingsService.get();
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const update: IController = async (req, res) => {
  const params: TShopSettings = req.body;
  const data = await settingsService.update(params);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

// the admin always gets every shop's logo (for the shop switcher), whichever shop is selected
const logos: IController = async (req, res) => {
  const data = await settingsService.logos(req.user.role === TUserRole.ADMIN ? null : req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

// lets the app say up front whether invoices can be emailed
const mail: IController = async (req, res) => {
  return ApiResponse.result(res, mailStatus(), httpStatusCodes.OK);
};

export default { get, logos, update, mail };
