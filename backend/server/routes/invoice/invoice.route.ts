import express from "express";
import { createValidator } from "express-joi-validation";
import invoiceController from "../../controllers/invoice.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { userRateLimit } from "../../middlewares/rate-limit.middleware";
import { TPermission } from "../../types/permission.type";
import { identifireValidation } from "../../validations/comman.validation";
import {
  cancelInvoiceSchema,
  createInvoiceSchema,
  emailInvoiceSchema,
  invoiceListSchema,
  invoicePdfSchema,
} from "../../validations/schemas/invoice.schema";
import { paymentSchema } from "../../validations/schemas/purchase.schema";

const invoiceRouter = express.Router();
const validator = createValidator({ passError: true });

// generous for normal billing, but stops a runaway script or misuse of the shop's mailbox
const pdfRateLimit = userRateLimit(60, 10, "Too many PDFs in a short time. Wait a few minutes and try again.");
const emailRateLimit = userRateLimit(30, 60, "Too many invoice emails in the last hour. Try again later.");

invoiceRouter.get(
  "/",
  hasPermission(TPermission.INVOICE_VIEW),
  validator.query(invoiceListSchema),
  apExpressAsyncHandler(invoiceController.list)
);

invoiceRouter.get(
  "/:id",
  hasPermission(TPermission.INVOICE_VIEW, TPermission.INVOICE_CREATE),
  validator.params(identifireValidation),
  apExpressAsyncHandler(invoiceController.detail)
);

invoiceRouter.get(
  "/:id/pdf",
  hasPermission(TPermission.INVOICE_VIEW, TPermission.INVOICE_CREATE),
  pdfRateLimit,
  validator.params(identifireValidation),
  validator.query(invoicePdfSchema),
  apExpressAsyncHandler(invoiceController.pdf)
);

invoiceRouter.post(
  "/:id/email",
  hasPermission(TPermission.INVOICE_SEND),
  emailRateLimit,
  validator.params(identifireValidation),
  validator.body(emailInvoiceSchema),
  apExpressAsyncHandler(invoiceController.sendEmail)
);

invoiceRouter.post(
  "/",
  hasPermission(TPermission.INVOICE_CREATE),
  validator.body(createInvoiceSchema),
  apExpressAsyncHandler(invoiceController.create)
);

invoiceRouter.post(
  "/:id/payments",
  hasPermission(TPermission.INVOICE_PAYMENT),
  validator.params(identifireValidation),
  validator.body(paymentSchema),
  apExpressAsyncHandler(invoiceController.addPayment)
);

invoiceRouter.post(
  "/:id/cancel",
  hasPermission(TPermission.INVOICE_CANCEL),
  validator.params(identifireValidation),
  validator.body(cancelInvoiceSchema),
  apExpressAsyncHandler(invoiceController.cancel)
);

export default invoiceRouter;
