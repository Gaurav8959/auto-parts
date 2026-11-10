import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import purchaseService from "../services/purchase/purchase.service";
import {
  TPurchase,
  TPurchaseListParams,
  TPurchasePayment,
} from "../types/purchase.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import { requireShop } from "../utilities/shop-scope.utility";

const list: IController = async (req, res) => {
  const params: TPurchaseListParams = {
    shopId: req.shopId,
    limit: ApiUtility.getQueryParam(req, "limit"),
    page: ApiUtility.getQueryParam(req, "page"),
    keyword: ApiUtility.getQueryParam(req, "keyword"),
    supplierId: ApiUtility.getQueryParam(req, "supplierId"),
    paymentStatus: ApiUtility.getQueryParam(req, "paymentStatus"),
    from: ApiUtility.getQueryParam(req, "from"),
    to: ApiUtility.getQueryParam(req, "to"),
  };
  const data = await purchaseService.list(params);
  return ApiResponse.result(res, data.response, httpStatusCodes.OK, null, data.pagination);
};

const detail: IController = async (req, res) => {
  const data = await purchaseService.detail(Number(req.params.id), req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const create: IController = async (req, res) => {
  const params: TPurchase = req.body;
  const data = await purchaseService.create(params, req.user.id, requireShop(req.shopId));
  return ApiResponse.result(res, data, httpStatusCodes.CREATED);
};

const addPayment: IController = async (req, res) => {
  const params: TPurchasePayment = req.body;
  const data = await purchaseService.addPayment(Number(req.params.id), params, req.user.id, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { list, detail, create, addPayment };
