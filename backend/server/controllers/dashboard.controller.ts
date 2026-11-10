import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import dashboardService from "../services/dashboard/dashboard.service";
import ApiResponse from "../utilities/api-response.utility";

// profit and stock value are hidden by the hideCost middleware for users who may not see cost
const summary: IController = async (req, res) => {
  const data = await dashboardService.summary(req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { summary };
