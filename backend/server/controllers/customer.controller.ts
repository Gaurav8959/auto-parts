import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import customerService from "../services/customer/customer.service";
import { TParty, TPartyListParams } from "../types/party.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import { requireShop } from "../utilities/shop-scope.utility";

const list: IController = async (req, res) => {
  const params: TPartyListParams = {
    shopId: req.shopId,
    limit: ApiUtility.getQueryParam(req, "limit"),
    page: ApiUtility.getQueryParam(req, "page"),
    keyword: ApiUtility.getQueryParam(req, "keyword"),
  };
  const data = await customerService.list(params);
  return ApiResponse.result(res, data.response, httpStatusCodes.OK, null, data.pagination);
};

const all: IController = async (req, res) => {
  const data = await customerService.all(req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const detail: IController = async (req, res) => {
  const data = await customerService.detail(Number(req.params.id), req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const create: IController = async (req, res) => {
  const params: TParty = req.body;
  const data = await customerService.create(params, req.user.id, requireShop(req.shopId));
  return ApiResponse.result(res, data, httpStatusCodes.CREATED);
};

const update: IController = async (req, res) => {
  const params: TParty = req.body;
  const data = await customerService.update(Number(req.params.id), params, req.user.id, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const remove: IController = async (req, res) => {
  const data = await customerService.remove(Number(req.params.id), req.user.id, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { list, all, detail, create, update, remove };
