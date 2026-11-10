import { AppDataSource } from "../data-source/data-source";
import {
  BrandRepository,
  CategoryRepository,
  CustomerRepository,
  ProductRepository,
  SupplierRepository,
} from "../data-source/repository";
import { ShopStock } from "../entities/inventory/shop-stock.entity";
import userService from "../services/usermgmt/user.service";
import { User } from "../entities/usermgmt/user.entity";
import stockService from "../services/inventory/stock.service";
import { TStockTransactionType } from "../types/inventory.type";

// scripts/share-demo.sh sets a random one, because a shared demo link is public
const DEMO_MANAGER_PASSWORD = process.env.DEMO_MANAGER_PASSWORD || "Manager@123";

const categories = ["Brakes", "Engine", "Filters", "Suspension", "Electrical", "Lubricants", "Body Parts", "Clutch"];
const brands = ["Bosch", "Minda", "Lumax", "Valeo", "Castrol", "Mobil", "Brembo", "Exide", "Purolator", "Gabriel"];

// [sku, partNumber, name, category, brand, hsn, tax, cost, price, mrp, opening, reorder, rack, fits]
const products: [string, string, string, string, string, string, number, number, number, number, number, number, string, string][] = [
  ["BP-SWF-F", "0986AB1234", "Front Brake Pad Set", "Brakes", "Bosch", "8708", 28, 620, 1150, 1290, 24, 6, "A1", "Maruti Swift 2011-2017, Dzire"],
  ["BP-CRT-F", "BRM-P30-0", "Front Brake Pad Set", "Brakes", "Brembo", "8708", 28, 1450, 2350, 2600, 8, 4, "A1", "Hyundai Creta 2015-2020"],
  ["BD-I20-F", "0986479R", "Front Brake Disc", "Brakes", "Bosch", "8708", 28, 1300, 2100, 2400, 6, 3, "A2", "Hyundai i20 Elite"],
  ["OF-MAR-01", "PUR-OF-112", "Oil Filter", "Filters", "Purolator", "8421", 18, 95, 190, 220, 60, 15, "B1", "Maruti Alto, WagonR, Swift (petrol)"],
  ["AF-HON-CTY", "PUR-AF-310", "Air Filter", "Filters", "Purolator", "8421", 18, 210, 420, 480, 18, 6, "B1", "Honda City 2014-2020"],
  ["CF-UNI-01", "BOS-CF-77", "Cabin AC Filter", "Filters", "Bosch", "8421", 18, 180, 380, 450, 3, 6, "B2", "Hyundai, Kia (universal fit)"],
  ["SP-IR-4", "FR7DPP33", "Spark Plug (Iridium)", "Engine", "Bosch", "8511", 28, 260, 480, 550, 40, 12, "C1", "Most petrol cars"],
  ["TB-INN-01", "VAL-TB-21", "Timing Belt Kit", "Engine", "Valeo", "4010", 18, 2400, 3900, 4400, 2, 2, "C3", "Toyota Innova 2.5 D"],
  ["SA-SWF-F", "GAB-SA-560", "Front Shock Absorber", "Suspension", "Gabriel", "8708", 28, 1550, 2450, 2800, 4, 4, "D1", "Maruti Swift 2018+"],
  ["HL-BLR-L", "LMX-HL-90", "Headlamp Assembly LH", "Electrical", "Lumax", "8512", 28, 2200, 3450, 3900, 0, 2, "E2", "Maruti Baleno 2016-2019"],
  ["BAT-35AH", "EXD-ML35", "Car Battery 35Ah", "Electrical", "Exide", "8507", 28, 3400, 4600, 5100, 5, 3, "F1", "Hatchbacks"],
  ["HN-12V-PR", "MND-HRN-2", "Horn Set 12V", "Electrical", "Minda", "8512", 18, 380, 690, 790, 14, 5, "E1", "Universal"],
  ["EO-5W30-3L", "CAS-MAG-5W30", "Engine Oil 5W-30 (3L)", "Lubricants", "Castrol", "2710", 18, 1380, 1950, 2150, 20, 8, "G1", "Petrol cars"],
  ["EO-15W40-5L", "MOB-DLX-1540", "Engine Oil 15W-40 (5L)", "Lubricants", "Mobil", "2710", 18, 1700, 2350, 2600, 9, 6, "G1", "Diesel cars & SUVs"],
  ["CK-ALT-01", "VAL-CK-801", "Clutch Kit (3 pc)", "Clutch", "Valeo", "8708", 28, 2900, 4300, 4800, 3, 2, "H1", "Maruti Alto 800, K10"],
  ["WB-UNI-24", "BOS-AERO-24", "Wiper Blade 24\"", "Body Parts", "Bosch", "8512", 18, 260, 520, 599, 22, 8, "E3", "Universal hook type"],
];

export const seedDemoCatalog = async (admin: User) => {
  const existing = await ProductRepository.count();
  if (existing) {
    console.log("Products already exist, skipping demo catalog");
    return;
  }

  const categoryMap = new Map<string, number>();
  for (const name of categories) {
    const category = await CategoryRepository.save({ name, createdBy: admin, updatedBy: admin });
    categoryMap.set(name, category.id);
  }
  const brandMap = new Map<string, number>();
  for (const name of brands) {
    const brand = await BrandRepository.save({ name, createdBy: admin, updatedBy: admin });
    brandMap.set(name, brand.id);
  }

  // Two shops, each run by its own manager, holding different amounts of the shared catalog
  const kb = await userService.create(
    {
      email: "ravi@autoparts.local",
      password: DEMO_MANAGER_PASSWORD,
      firstName: "Ravi",
      lastName: "Kumar",
      shop: { name: "Karol Bagh Auto Parts", code: "KB", address: "Shop 14, Bank Street, Karol Bagh, Delhi", phone: "9811000001", gstin: "07ABCDE1234F1Z5", invoiceTerms: "Goods once sold will not be taken back without bill." },
    },
    admin.id
  );
  const ln = await userService.create(
    {
      email: "neha@autoparts.local",
      password: DEMO_MANAGER_PASSWORD,
      firstName: "Neha",
      lastName: "Gupta",
      shop: { name: "Lajpat Nagar Spares", code: "LN", address: "B-22, Central Market, Lajpat Nagar, Delhi", phone: "9811000002", gstin: "07ABCDE5678F1Z9", invoiceTerms: "Warranty as per manufacturer terms only." },
    },
    admin.id
  );

  for (const [sku, partNumber, name, category, brand, hsnCode, taxPercent, purchasePrice, sellingPrice, mrp, opening, reorderLevel, rackLocation, vehicleCompatibility] of products) {
    await AppDataSource.transaction(async (manager) => {
      const product = (await manager.getRepository("Product").save({
        sku,
        partNumber,
        name,
        category: { id: categoryMap.get(category) },
        brand: { id: brandMap.get(brand) },
        hsnCode,
        taxPercent,
        purchasePrice,
        sellingPrice,
        mrp,
        reorderLevel,
        vehicleCompatibility,
        createdBy: admin,
        updatedBy: admin,
      })) as any;

      // the second shop carries a smaller range
      const stockPlan: [number, number][] = [
        [kb.shop.id, opening],
        [ln.shop.id, Math.floor(opening / 2)],
      ];
      for (const [shopId, quantity] of stockPlan) {
        const stock = await stockService.lockStockRow(manager, shopId, product);
        await manager.getRepository(ShopStock).update(stock.id, { rackLocation, avgCost: purchasePrice });
        if (quantity > 0) {
          await stockService.move(manager, {
            shopId,
            productId: product.id,
            type: TStockTransactionType.OPENING,
            quantity,
            unitCost: purchasePrice,
            note: "Opening stock",
            userId: admin.id,
          });
        }
      }
    });
  }

  await SupplierRepository.save([
    { name: "Sharma Auto Distributors", contactPerson: "Rakesh Sharma", phone: "9810012345", gstin: "07AABCS1234F1Z5", address: "Kashmere Gate, Delhi", createdBy: admin, updatedBy: admin },
    { name: "Bosch Authorised Dealer", contactPerson: "Neha Gupta", phone: "9876501234", gstin: "07AADCB5678K1Z2", address: "Karol Bagh, Delhi", createdBy: admin, updatedBy: admin },
  ]);
  await CustomerRepository.save([
    { name: "City Car Care Garage", contactPerson: "Imran", phone: "9899011122", address: "Karol Bagh, Delhi", shop: { id: kb.shop.id }, createdBy: admin, updatedBy: admin },
    { name: "Rohit Verma", phone: "9811122233", shop: { id: kb.shop.id }, createdBy: admin, updatedBy: admin },
    { name: "Lajpat Motor Works", contactPerson: "Sandeep", phone: "9899044455", address: "Lajpat Nagar, Delhi", shop: { id: ln.shop.id }, createdBy: admin, updatedBy: admin },
  ]);

  console.log(`Demo catalog created: ${products.length} products in 2 shops`);
  console.log(`Managers: ravi@autoparts.local (Karol Bagh) and neha@autoparts.local (Lajpat Nagar), password ${DEMO_MANAGER_PASSWORD}`);
};
