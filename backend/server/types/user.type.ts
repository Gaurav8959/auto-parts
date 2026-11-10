import { TShop } from "./shop.type";

export enum TUserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
}

export type TUser = {
  id?: number;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  role?: TUserRole;
  isActive?: boolean;
};

// Creating a manager either opens a new shop for them or hands them an existing shop without a manager
export type TCreateManager = TUser & {
  existingShopId?: number;
  shop?: TShop;
};

export type TChangePassword = {
  currentPassword: string;
  newPassword: string;
};
