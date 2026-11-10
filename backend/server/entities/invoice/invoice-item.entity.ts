import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { PrimaryAuditEntity } from "../base/primaryaudit.entity";
import { Product } from "../catalog/product.entity";
import { Invoice } from "./invoice.entity";

// Everything here is a snapshot taken at billing time; later product edits never change an issued invoice.
@Entity("invoice_item")
export class InvoiceItem extends PrimaryAuditEntity {
  @ManyToOne(() => Invoice, (invoice) => invoice.items, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "invoice_id" })
  invoice: Invoice;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "product_name", length: 255 })
  productName: string;

  @Column({ length: 50 })
  sku: string;

  @Column({ name: "part_number", length: 100, nullable: true, default: null })
  partNumber: string;

  @Column({ name: "hsn_code", length: 10, nullable: true, default: null })
  hsnCode: string;

  @Column({ length: 20, default: "PCS" })
  unit: string;

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
    name: "unit_price",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  unitPrice: number;

  @Column({
    name: "discount_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  discountPercent: number;

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
    name: "taxable_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  taxableAmount: number;

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

  // product cost at the moment of sale, so profit never drifts when cost changes later
  @Column({
    name: "unit_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  unitCost: number;
}
