import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import stockService from "../services/inventory/stock.service";
import {
  TStockAdjustment,
  TStockTransactionListParams,
} from "../types/inventory.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import { requireShop } from "../utilities/shop-scope.utility";

const transactions: IController = async (req, res) => {
  const params: TStockTransactionListParams = {
    shopId: req.shopId,
    limit: ApiUtility.getQueryParam(req, "limit"),
    page: ApiUtility.getQueryParam(req, "page"),
    productId: ApiUtility.getQueryParam(req, "productId"),
    type: ApiUtility.getQueryParam(req, "type"),
    from: ApiUtility.getQueryParam(req, "from"),
    to: ApiUtility.getQueryParam(req, "to"),
  };
  const data = await stockService.listTransactions(params);
  return ApiResponse.result(res, data.response, httpStatusCodes.OK, null, data.pagination);
};

const adjust: IController = async (req, res) => {
  const params: TStockAdjustment = req.body;
  const transaction = await stockService.adjust(params, req.user.id, requireShop(req.shopId));
  return ApiResponse.result(res, transaction, httpStatusCodes.CREATED);
};

const lowStock: IController = async (req, res) => {
  const products = await stockService.lowStock(req.shopId);
  return ApiResponse.result(res, products, httpStatusCodes.OK);
};

const summary: IController = async (req, res) => {
  const data = await stockService.summary(req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { transactions, adjust, lowStock, summary };
