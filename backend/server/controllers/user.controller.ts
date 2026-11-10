import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import permissionService from "../services/usermgmt/permission.service";
import userService from "../services/usermgmt/user.service";
import { TUserPermissionUpdate } from "../types/permission.type";
import { TCreateManager, TUser } from "../types/user.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";

const list: IController = async (req, res) => {
  const keyword = ApiUtility.getQueryParam(req, "keyword");
  const users = await userService.list(keyword);
  return ApiResponse.result(res, users.map(ApiUtility.sanitizeUser), httpStatusCodes.OK);
};

const create: IController = async (req, res) => {
  const params: TCreateManager = req.body;
  const user = await userService.create(params, req.user.id);
  return ApiResponse.result(res, ApiUtility.sanitizeUser(user), httpStatusCodes.CREATED);
};

const update: IController = async (req, res) => {
  const id = Number(req.params.id);
  const params: TUser = req.body;
  const user = await userService.update(id, params, req.user);
  return ApiResponse.result(res, ApiUtility.sanitizeUser(user), httpStatusCodes.OK);
};

const resetPassword: IController = async (req, res) => {
  const id = Number(req.params.id);
  const data = await userService.resetPassword(id, req.body.password);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const remove: IController = async (req, res) => {
  const id = Number(req.params.id);
  const data = await userService.remove(id, req.user);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

const permissionCatalogue: IController = async (req, res) => {
  const permissions = await permissionService.getPermissionCatalogue();
  return ApiResponse.result(res, permissions, httpStatusCodes.OK);
};

const getUserPermissions: IController = async (req, res) => {
  const id = Number(req.params.id);
  const permissions = await permissionService.getUserPermissions(id);
  return ApiResponse.result(res, permissions, httpStatusCodes.OK);
};

const updateUserPermissions: IController = async (req, res) => {
  const id = Number(req.params.id);
  const params: TUserPermissionUpdate[] = req.body.permissions;
  const permissions = await permissionService.updateUserPermissions(
    id,
    params,
    req.user.id
  );
  return ApiResponse.result(res, permissions, httpStatusCodes.OK);
};

export default {
  list,
  create,
  update,
  resetPassword,
  remove,
  permissionCatalogue,
  getUserPermissions,
  updateUserPermissions,
};
