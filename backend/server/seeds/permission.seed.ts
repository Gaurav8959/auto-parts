import { TPermission, TPermissionDefinition } from "../types/permission.type";

// Source of truth for every permission in the system. Synced into the `permission` table on boot.
export const permissionSeed: TPermissionDefinition[] = [
  { permission: TPermission.DASHBOARD_VIEW, category: "Dashboard", description: "View the dashboard and today's numbers", permissionOrder: 1 },

  { permission: TPermission.PRODUCT_VIEW, category: "Products", description: "View products and search parts", permissionOrder: 10 },
  { permission: TPermission.PRODUCT_VIEW_COST, category: "Products", description: "See purchase cost, stock value and profit (purchase bills always show their prices)", permissionOrder: 11 },
  { permission: TPermission.PRODUCT_CREATE, category: "Products", description: "Add new products", permissionOrder: 12 },
  { permission: TPermission.PRODUCT_UPDATE, category: "Products", description: "Edit products and prices", permissionOrder: 13 },
  { permission: TPermission.PRODUCT_DELETE, category: "Products", description: "Delete products", permissionOrder: 14 },
  { permission: TPermission.CATEGORY_BRAND_MANAGE, category: "Products", description: "Manage categories and brands", permissionOrder: 15 },

  { permission: TPermission.STOCK_VIEW, category: "Stock", description: "View stock levels and stock history", permissionOrder: 20 },
  { permission: TPermission.STOCK_ADJUST, category: "Stock", description: "Adjust stock (damaged, lost, recount)", permissionOrder: 21 },

  { permission: TPermission.SUPPLIER_VIEW, category: "Purchases", description: "View suppliers", permissionOrder: 30 },
  { permission: TPermission.SUPPLIER_MANAGE, category: "Purchases", description: "Add, edit and delete suppliers", permissionOrder: 31 },
  { permission: TPermission.PURCHASE_VIEW, category: "Purchases", description: "View purchases (supplier bills, including their prices)", permissionOrder: 32 },
  { permission: TPermission.PURCHASE_CREATE, category: "Purchases", description: "Record purchases (stock in)", permissionOrder: 33 },
  { permission: TPermission.PURCHASE_PAYMENT, category: "Purchases", description: "Record payments to suppliers", permissionOrder: 34 },

  { permission: TPermission.CUSTOMER_VIEW, category: "Sales", description: "View customers", permissionOrder: 40 },
  { permission: TPermission.CUSTOMER_MANAGE, category: "Sales", description: "Add, edit and delete customers", permissionOrder: 41 },
  { permission: TPermission.INVOICE_VIEW, category: "Sales", description: "View invoices", permissionOrder: 42 },
  { permission: TPermission.INVOICE_CREATE, category: "Sales", description: "Create invoices", permissionOrder: 43 },
  { permission: TPermission.INVOICE_DISCOUNT, category: "Sales", description: "Give discounts and sell below listed price", permissionOrder: 44 },
  { permission: TPermission.INVOICE_PAYMENT, category: "Sales", description: "Record payments against invoices", permissionOrder: 45 },
  { permission: TPermission.INVOICE_SEND, category: "Sales", description: "Email and share invoices with customers", permissionOrder: 46 },
  { permission: TPermission.INVOICE_CANCEL, category: "Sales", description: "Cancel invoices (returns stock)", permissionOrder: 47 },

  { permission: TPermission.REPORT_VIEW, category: "Reports", description: "View sales, profit and stock reports", permissionOrder: 50 },
  { permission: TPermission.SETTINGS_MANAGE, category: "Settings", description: "Edit their shop's details (address, GSTIN, invoice terms)", permissionOrder: 60 },
];
