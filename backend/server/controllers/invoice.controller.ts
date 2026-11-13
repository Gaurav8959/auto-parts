import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import invoiceService from "../services/invoice/invoice.service";
import {
  TInvoice,
  TInvoiceCancel,
  TInvoiceCopy,
  TInvoiceEmailRequest,
  TInvoiceListParams,
  TInvoiceUpdate,
  TInvoicePayment,
} from "../types/invoice.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import { requireShop } from "../utilities/shop-scope.utility";

const list: IController = async (req, res) => {
  const params: TInvoiceListParams = {
    shopId: req.shopId,
    limit: ApiUtility.getQueryParam(req, "limit"),
    page: ApiUtility.getQueryParam(req, "page"),
    keyword: ApiUtility.getQueryParam(req, "keyword"),
    customerId: ApiUtility.getQueryParam(req, "customerId"),
    paymentStatus: ApiUtility.getQueryParam(req, "paymentStatus"),
    status: ApiUtility.getQueryParam(req, "status"),
    overdue: ApiUtility.getQueryParam(req, "overdue"),
    gst: ApiUtility.getQueryParam(req, "gst"),
    from: ApiUtility.getQueryParam(req, "from"),
    to: ApiUtility.getQueryParam(req, "to"),
  };
  const data = await invoiceService.list(params);
  return ApiResponse.result(
    res,
    data.response,
    httpStatusCodes.OK,
    null,
    data.pagination
  );
};

const detail: IController = async (req, res) => {
  const data = await invoiceService.detail(Number(req.params.id), req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const create: IController = async (req, res) => {
  const params: TInvoice = req.body;
  const data = await invoiceService.create(params, req.user.id, req.permissions, requireShop(req.shopId));
  return ApiResponse.result(res, data, httpStatusCodes.CREATED);
};

const update: IController = async (req, res) => {
  const params: TInvoiceUpdate = req.body;
  const data = await invoiceService.update(Number(req.params.id), params, req.user.id, req.permissions, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const addPayment: IController = async (req, res) => {
  const params: TInvoicePayment = req.body;
  const data = await invoiceService.addPayment(Number(req.params.id), params, req.user.id, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const cancel: IController = async (req, res) => {
  const params: TInvoiceCancel = req.body;
  const data = await invoiceService.cancel(Number(req.params.id), params, req.user.id, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

// The PDF the customer receives. Streamed as a file, not wrapped in the usual JSON envelope.
const pdf: IController = async (req, res) => {
  const copy = (ApiUtility.getQueryParam(req, "copy") as TInvoiceCopy) || TInvoiceCopy.ORIGINAL;
  const file = await invoiceService.pdf(Number(req.params.id), req.shopId, copy);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);
  res.setHeader("Content-Length", file.buffer.length);
  res.send(file.buffer);
};

const sendEmail: IController = async (req, res) => {
  const params: TInvoiceEmailRequest = req.body;
  const data = await invoiceService.sendEmail(Number(req.params.id), params, req.user.id, req.shopId);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { list, detail, create, update, addPayment, cancel, pdf, sendEmail };
