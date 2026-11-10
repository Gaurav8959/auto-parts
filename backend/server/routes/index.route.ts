import * as express from "express";

import authRouter from "./auth/auth.route";
import catalogRouter from "./catalog/catalog.route";
import customerRouter from "./customer/customer.route";
import dashboardRouter from "./dashboard/dashboard.route";
import defaultRouter from "./default/default.route";
import inventoryRouter from "./inventory/inventory.route";
import invoiceRouter from "./invoice/invoice.route";
import meRouter from "./me/me.route";
import purchaseRouter from "./purchase/purchase.route";
import reportRouter from "./report/report.route";
import settingsRouter from "./settings/settings.route";
import shopRouter from "./shop/shop.route";
import supplierRouter from "./supplier/supplier.route";
import userRouter from "./user/user.route";

const router = express.Router();

router.use("/", defaultRouter);
router.use("/auth", authRouter);
router.use("/me", meRouter);
router.use("/user", userRouter);
router.use("/dashboard", dashboardRouter);
router.use("/catalog", catalogRouter);
router.use("/inventory", inventoryRouter);
router.use("/supplier", supplierRouter);
router.use("/customer", customerRouter);
router.use("/purchase", purchaseRouter);
router.use("/invoice", invoiceRouter);
router.use("/report", reportRouter);
router.use("/settings", settingsRouter);
router.use("/shop", shopRouter);

export default router;
