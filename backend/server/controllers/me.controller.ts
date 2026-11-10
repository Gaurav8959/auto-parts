import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import userService from "../services/usermgmt/user.service";
import settingsService from "../services/settings/settings.service";
import { TChangePassword, TUser } from "../types/user.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import { generateUserCookie } from "../utilities/session.utility";

const me: IController = async (req, res) => {
  return ApiResponse.result(
    res,
    { user: ApiUtility.sanitizeUser(req.user), permissions: req.permissions },
    httpStatusCodes.OK
  );
};

const updateProfile: IController = async (req, res) => {
  const params: TUser = req.body;
  const user = await userService.updateProfile(req.user.id, params);
  return ApiResponse.result(res, ApiUtility.sanitizeUser(user), httpStatusCodes.OK);
};

// Other devices are signed out; this one gets a fresh token so it stays signed in
const changePassword: IController = async (req, res) => {
  const params: TChangePassword = req.body;
  const user = await userService.changeOwnPassword(req.user.id, params);
  const cookie = await generateUserCookie(user);
  return ApiResponse.result(res, { id: user.id }, httpStatusCodes.OK, cookie);
};

const signOutOtherDevices: IController = async (req, res) => {
  const user = await userService.endOtherSessions(req.user.id);
  const cookie = await generateUserCookie(user);
  return ApiResponse.result(res, { id: user.id }, httpStatusCodes.OK, cookie);
};

// Business logo on the profile; printed on the user's invoices
const updateLogo: IController = async (req, res) => {
  const data = await settingsService.setProfileLogo(req.user, req.body.logo);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default { me, updateProfile, changePassword, signOutOtherDevices, updateLogo };
