import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import reportService from "../services/report/report.service";
import { TReportParams } from "../types/report.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";

const getRange = (req: any): TReportParams => ({
  shopId: req.shopId,
  from: ApiUtility.getQueryParam(req, "from"),
  to: ApiUtility.getQueryParam(req, "to"),
});

// cost and profit are hidden by the hideCost middleware for users who may not see cost
const sales: IController = async (req, res) => {
  const data = await reportService.sales(getRange(req));
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const gst: IController = async (req, res) => {
  const data = await reportService.gst(getRange(req));
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const stock: IController = async (req, res) => {
  const data = await reportService.stock(req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { sales, gst, stock };
