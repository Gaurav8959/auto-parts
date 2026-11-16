import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { TDiscountType } from "../../types/catalog.type";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { PrimaryAuditEntity } from "../base/primaryaudit.entity";
import { Product } from "../catalog/product.entity";
import { Purchase } from "./purchase.entity";

@Entity("purchase_item")
export class PurchaseItem extends PrimaryAuditEntity {
  @ManyToOne(() => Purchase, (purchase) => purchase.items, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "purchase_id" })
  purchase: Purchase;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  // snapshot so the bill reads the same even if the product is renamed later
  @Column({ name: "product_name", length: 255 })
  productName: string;

  @Column({ length: 50 })
  sku: string;

  @Column({
    name: "quantity",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  quantity: number;

  @Column({
    name: "unit_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  unitCost: number;

  // Discount off the line (quantity × unit cost) before GST, as entered: a percent or a flat ₹ amount
  @Column({ name: "discount_type", type: "varchar", length: 10, nullable: true, default: null })
  discountType: TDiscountType;

  @Column({
    name: "discount_value",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  discountValue: number;

  // what the discount came to in ₹
  @Column({
    name: "discount_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  discountAmount: number;

  @Column({
    name: "tax_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  taxPercent: number;

  @Column({
    name: "tax_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  taxAmount: number;

  @Column({
    name: "line_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  lineTotal: number;
}
