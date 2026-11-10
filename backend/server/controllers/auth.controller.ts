import httpStatusCodes from "http-status-codes";

// Interfaces
import IController from "../interfaces/IController";
import { ILoginUser } from "../interfaces/user.interface";

// Utilities
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";
import { generateUserCookie } from "../utilities/session.utility";

// Services
import permissionService from "../services/usermgmt/permission.service";
import userService from "../services/usermgmt/user.service";

const login: IController = async (req, res) => {
  const params: ILoginUser = {
    email: req.body.email,
    password: req.body.password,
  };
  const user = await userService.login(params);
  const cookie = await generateUserCookie(user);
  const permissions = await permissionService.getEffectivePermissions(user);

  return ApiResponse.result(
    res,
    { user: ApiUtility.sanitizeUser(user), permissions },
    httpStatusCodes.OK,
    cookie
  );
};

export default { login };
