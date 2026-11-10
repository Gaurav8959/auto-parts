import httpStatusCodes from "http-status-codes";
import IController from "../interfaces/IController";
import brandService from "../services/catalog/brand.service";
import categoryService from "../services/catalog/category.service";
import productService from "../services/catalog/product.service";
import { TBrand, TCategory, TProduct, TProductListParams } from "../types/catalog.type";
import { TPermission } from "../types/permission.type";
import ApiResponse from "../utilities/api-response.utility";
import ApiUtility from "../utilities/api.utility";

// Cost is hidden from responses by the hideCost middleware; here it only stops users without
// "See purchase cost" from setting it
const canSeeCost = (permissions: string[]) =>
  permissions.includes(TPermission.PRODUCT_VIEW_COST);

// Categories

const categoryList: IController = async (req, res) => {
  const categories = await categoryService.list();
  return ApiResponse.result(res, categories, httpStatusCodes.OK);
};

const createCategory: IController = async (req, res) => {
  const params: TCategory = req.body;
  const category = await categoryService.create(params, req.user.id);
  return ApiResponse.result(res, category, httpStatusCodes.CREATED);
};

const updateCategory: IController = async (req, res) => {
  const id = Number(req.params.id);
  const params: TCategory = req.body;
  const category = await categoryService.update(id, params, req.user.id);
  return ApiResponse.result(res, category, httpStatusCodes.OK);
};

const deleteCategory: IController = async (req, res) => {
  const data = await categoryService.remove(Number(req.params.id));
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

// Brands

const brandList: IController = async (req, res) => {
  const brands = await brandService.list();
  return ApiResponse.result(res, brands, httpStatusCodes.OK);
};

const createBrand: IController = async (req, res) => {
  const params: TBrand = req.body;
  const brand = await brandService.create(params, req.user.id);
  return ApiResponse.result(res, brand, httpStatusCodes.CREATED);
};

const updateBrand: IController = async (req, res) => {
  const id = Number(req.params.id);
  const params: TBrand = req.body;
  const brand = await brandService.update(id, params, req.user.id);
  return ApiResponse.result(res, brand, httpStatusCodes.OK);
};

const deleteBrand: IController = async (req, res) => {
  const data = await brandService.remove(Number(req.params.id));
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

// Products

const productList: IController = async (req, res) => {
  const params: TProductListParams = {
    shopId: req.shopId,
    limit: ApiUtility.getQueryParam(req, "limit"),
    page: ApiUtility.getQueryParam(req, "page"),
    keyword: ApiUtility.getQueryParam(req, "keyword"),
    categoryId: ApiUtility.getQueryParam(req, "categoryId"),
    brandId: ApiUtility.getQueryParam(req, "brandId"),
    stockStatus: ApiUtility.getQueryParam(req, "stockStatus"),
    isActive: ApiUtility.getQueryParam(req, "isActive"),
  };
  const data = await productService.list(params);
  return ApiResponse.result(res, data.response, httpStatusCodes.OK, null, data.pagination);
};

const productSearch: IController = async (req, res) => {
  const keyword = ApiUtility.getQueryParam(req, "keyword");
  const products = await productService.search(keyword, req.shopId);
  return ApiResponse.result(res, products, httpStatusCodes.OK);
};

const productDetail: IController = async (req, res) => {
  const product = await productService.detail(Number(req.params.id), req.shopId);
  return ApiResponse.result(res, product, httpStatusCodes.OK);
};

const createProduct: IController = async (req, res) => {
  const params: TProduct = req.body;
  if (!canSeeCost(req.permissions)) delete params.purchasePrice;

  const product = await productService.create(params, req.user.id, req.shopId);
  return ApiResponse.result(res, product, httpStatusCodes.CREATED);
};

const updateProduct: IController = async (req, res) => {
  const params: TProduct = req.body;
  if (!canSeeCost(req.permissions)) delete params.purchasePrice;

  const product = await productService.update(Number(req.params.id), params, req.user.id, req.shopId);
  return ApiResponse.result(res, product, httpStatusCodes.OK);
};

const deleteProduct: IController = async (req, res) => {
  const data = await productService.remove(Number(req.params.id), req.user.id);
  return ApiResponse.result(res, data, httpStatusCodes.OK);
};

export default {
  categoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  brandList,
  createBrand,
  updateBrand,
  deleteBrand,
  productList,
  productSearch,
  productDetail,
  createProduct,
  updateProduct,
  deleteProduct,
};
