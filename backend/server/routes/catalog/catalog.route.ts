import express from "express";
import { createValidator } from "express-joi-validation";
import catalogController from "../../controllers/catalog.controller";
import { apExpressAsyncHandler } from "../../middlewares/async-handler.middleware";
import { hasPermission } from "../../middlewares/permission-handler.middleware";
import { TPermission } from "../../types/permission.type";
import { identifireValidation } from "../../validations/comman.validation";
import {
  brandSchema,
  categorySchema,
  createProductSchema,
  productListSchema,
  updateProductSchema,
} from "../../validations/schemas/catalog.schema";

const catalogRouter = express.Router();
const validator = createValidator({ passError: true });

// Category APIs

catalogRouter.get(
  "/categories",
  hasPermission(TPermission.PRODUCT_VIEW, TPermission.CATEGORY_BRAND_MANAGE),
  apExpressAsyncHandler(catalogController.categoryList)
);

catalogRouter.post(
  "/categories",
  hasPermission(TPermission.CATEGORY_BRAND_MANAGE),
  validator.body(categorySchema),
  apExpressAsyncHandler(catalogController.createCategory)
);

catalogRouter.put(
  "/categories/:id",
  hasPermission(TPermission.CATEGORY_BRAND_MANAGE),
  validator.params(identifireValidation),
  validator.body(categorySchema),
  apExpressAsyncHandler(catalogController.updateCategory)
);

catalogRouter.delete(
  "/categories/:id",
  hasPermission(TPermission.CATEGORY_BRAND_MANAGE),
  validator.params(identifireValidation),
  apExpressAsyncHandler(catalogController.deleteCategory)
);

// Brand APIs

catalogRouter.get(
  "/brands",
  hasPermission(TPermission.PRODUCT_VIEW, TPermission.CATEGORY_BRAND_MANAGE),
  apExpressAsyncHandler(catalogController.brandList)
);

catalogRouter.post(
  "/brands",
  hasPermission(TPermission.CATEGORY_BRAND_MANAGE),
  validator.body(brandSchema),
  apExpressAsyncHandler(catalogController.createBrand)
);

catalogRouter.put(
  "/brands/:id",
  hasPermission(TPermission.CATEGORY_BRAND_MANAGE),
  validator.params(identifireValidation),
  validator.body(brandSchema),
  apExpressAsyncHandler(catalogController.updateBrand)
);

catalogRouter.delete(
  "/brands/:id",
  hasPermission(TPermission.CATEGORY_BRAND_MANAGE),
  validator.params(identifireValidation),
  apExpressAsyncHandler(catalogController.deleteBrand)
);

// Product APIs

catalogRouter.get(
  "/products",
  hasPermission(TPermission.PRODUCT_VIEW),
  validator.query(productListSchema),
  apExpressAsyncHandler(catalogController.productList)
);

// used by billing and purchase screens, so either of those permissions is enough
catalogRouter.get(
  "/products/search",
  hasPermission(
    TPermission.PRODUCT_VIEW,
    TPermission.INVOICE_CREATE,
    TPermission.PURCHASE_CREATE,
    TPermission.STOCK_ADJUST
  ),
  apExpressAsyncHandler(catalogController.productSearch)
);

catalogRouter.get(
  "/products/:id",
  hasPermission(TPermission.PRODUCT_VIEW),
  validator.params(identifireValidation),
  apExpressAsyncHandler(catalogController.productDetail)
);

catalogRouter.post(
  "/products",
  hasPermission(TPermission.PRODUCT_CREATE),
  validator.body(createProductSchema),
  apExpressAsyncHandler(catalogController.createProduct)
);

catalogRouter.put(
  "/products/:id",
  hasPermission(TPermission.PRODUCT_UPDATE),
  validator.params(identifireValidation),
  validator.body(updateProductSchema),
  apExpressAsyncHandler(catalogController.updateProduct)
);

catalogRouter.delete(
  "/products/:id",
  hasPermission(TPermission.PRODUCT_DELETE),
  validator.params(identifireValidation),
  apExpressAsyncHandler(catalogController.deleteProduct)
);

export default catalogRouter;
