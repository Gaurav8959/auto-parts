import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { AuditEntity } from "../base/audit.entity";
import { Brand } from "./brand.entity";
import { Category } from "./category.entity";

@Entity("product")
@Index("idx_product_name", ["name"])
@Index("idx_product_part_number", ["partNumber"])
export class Product extends AuditEntity {
  @Column({ length: 50, unique: true })
  sku: string;

  @Column({ name: "part_number", length: 100, nullable: true, default: null })
  partNumber: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @ManyToOne(() => Brand, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "brand_id" })
  brand: Brand;

  @Column({ length: 20, default: "PCS" })
  unit: string;

  @Column({ name: "hsn_code", length: 10, nullable: true, default: null })
  hsnCode: string;

  @Column({
    name: "tax_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 18,
    transformer: new ColumnNumericTransformer(),
  })
  taxPercent: number;

  // Catalog reference cost: the latest purchase price. Each shop keeps its own average in shop_stock.
  @Column({
    name: "purchase_price",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  purchasePrice: number;

  @Column({
    name: "selling_price",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  sellingPrice: number;

  @Column({
    name: "mrp",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new ColumnNumericTransformer(),
  })
  mrp: number;


  // default reorder level for a shop that starts stocking this product
  @Column({
    name: "reorder_level",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 5,
    transformer: new ColumnNumericTransformer(),
  })
  reorderLevel: number;

  @Column({ name: "vehicle_compatibility", type: "text", nullable: true })
  vehicleCompatibility: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "is_deleted", default: false })
  isDeleted: boolean;
}
