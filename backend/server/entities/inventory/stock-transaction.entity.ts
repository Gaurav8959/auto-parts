import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { TStockTransactionType } from "../../types/inventory.type";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { AuditEntity } from "../base/audit.entity";
import { Product } from "../catalog/product.entity";
import { Shop } from "../shop/shop.entity";

// Append-only ledger of every stock movement. Never updated or deleted.
@Entity("stock_transaction")
@Index("idx_stock_txn_reference", ["referenceType", "referenceId"])
export class StockTransaction extends AuditEntity {
  @ManyToOne(() => Shop, { nullable: false })
  @JoinColumn({ name: "shop_id" })
  shop: Shop;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "varchar", length: 30 })
  type: TStockTransactionType;

  // signed: positive is stock in, negative is stock out
  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  quantity: number;

  @Column({
    name: "balance_after",
    type: "decimal",
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  balanceAfter: number;

  @Column({
    name: "unit_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new ColumnNumericTransformer(),
  })
  unitCost: number;

  @Column({ name: "reference_type", length: 30, nullable: true, default: null })
  referenceType: string;

  @Column({ name: "reference_id", nullable: true, default: null })
  referenceId: number;

  @Column({ name: "reference_no", length: 50, nullable: true, default: null })
  referenceNo: string;

  @Column({ length: 255, nullable: true, default: null })
  note: string;
}
