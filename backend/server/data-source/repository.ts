import { Brand } from "../entities/catalog/brand.entity";
import { Category } from "../entities/catalog/category.entity";
import { Product } from "../entities/catalog/product.entity";
import { StockTransaction } from "../entities/inventory/stock-transaction.entity";
import { InvoiceEmail } from "../entities/invoice/invoice-email.entity";
import { InvoiceItem } from "../entities/invoice/invoice-item.entity";
import { InvoicePayment } from "../entities/invoice/invoice-payment.entity";
import { Invoice } from "../entities/invoice/invoice.entity";
import { Customer } from "../entities/party/customer.entity";
import { Supplier } from "../entities/party/supplier.entity";
import { PurchaseItem } from "../entities/purchase/purchase-item.entity";
import { PurchasePayment } from "../entities/purchase/purchase-payment.entity";
import { Purchase } from "../entities/purchase/purchase.entity";
import { ShopSetting } from "../entities/settings/shop-setting.entity";
import { Shop } from "../entities/shop/shop.entity";
import { ShopStock } from "../entities/inventory/shop-stock.entity";
import { Permission } from "../entities/usermgmt/permission.entity";
import { UserPermission } from "../entities/usermgmt/user-permission.entity";
import { User } from "../entities/usermgmt/user.entity";
import { Sequence } from "../entities/util/sequence.entity";
import { DocumentRevision } from "../entities/util/document-revision.entity";
import { AppDataSource } from "./data-source";

export const UserRepository = AppDataSource.getRepository(User);
export const PermissionRepository = AppDataSource.getRepository(Permission);
export const UserPermissionRepository =
  AppDataSource.getRepository(UserPermission);

export const CategoryRepository = AppDataSource.getRepository(Category);
export const BrandRepository = AppDataSource.getRepository(Brand);
export const ProductRepository = AppDataSource.getRepository(Product);
export const ShopRepository = AppDataSource.getRepository(Shop);
export const ShopStockRepository = AppDataSource.getRepository(ShopStock);
export const StockTransactionRepository =
  AppDataSource.getRepository(StockTransaction);

export const SupplierRepository = AppDataSource.getRepository(Supplier);
export const CustomerRepository = AppDataSource.getRepository(Customer);

export const PurchaseRepository = AppDataSource.getRepository(Purchase);
export const PurchaseItemRepository = AppDataSource.getRepository(PurchaseItem);
export const PurchasePaymentRepository =
  AppDataSource.getRepository(PurchasePayment);

export const InvoiceRepository = AppDataSource.getRepository(Invoice);
export const InvoiceItemRepository = AppDataSource.getRepository(InvoiceItem);
export const InvoiceEmailRepository = AppDataSource.getRepository(InvoiceEmail);
export const InvoicePaymentRepository =
  AppDataSource.getRepository(InvoicePayment);

export const SequenceRepository = AppDataSource.getRepository(Sequence);
export const DocumentRevisionRepository = AppDataSource.getRepository(DocumentRevision);
export const ShopSettingRepository = AppDataSource.getRepository(ShopSetting);
