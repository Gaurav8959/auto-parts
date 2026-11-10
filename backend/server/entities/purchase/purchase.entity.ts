import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from "typeorm";
import { TPaymentStatus } from "../../types/purchase.type";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { AuditEntity } from "../base/audit.entity";
import { Supplier } from "../party/supplier.entity";
import { PurchaseItem } from "./purchase-item.entity";
import { PurchasePayment } from "./purchase-payment.entity";
import { Shop } from "../shop/shop.entity";

// A purchase is the goods-receipt + supplier bill in one: saving it brings stock in.
@Entity("purchase")
@Unique("uq_purchase_shop_number", ["shop", "purchaseNumber"])
export class Purchase extends AuditEntity {
  // the shop the goods were delivered to
  @ManyToOne(() => Shop, { nullable: false })
  @JoinColumn({ name: "shop_id" })
  shop: Shop;

  @Column({ name: "purchase_number", length: 30 })
  purchaseNumber: string;

  @Column({ name: "supplier_bill_no", length: 50, nullable: true, default: null })
  supplierBillNo: string;

  @Column({ name: "purchase_date", type: "datetime" })
  purchaseDate: Date;

  @ManyToOne(() => Supplier, { nullable: false })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column({
    name: "sub_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  subTotal: number;

  @Column({
    name: "tax_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  taxTotal: number;

  @Column({
    name: "grand_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  grandTotal: number;

  @Column({
    name: "paid_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  paidAmount: number;

  @Column({
    name: "payment_status",
    type: "varchar",
    length: 20,
    default: TPaymentStatus.UNPAID,
  })
  paymentStatus: TPaymentStatus;

  @Column({ type: "text", nullable: true })
  notes: string;

  @OneToMany(() => PurchaseItem, (item) => item.purchase, { cascade: true })
  items: PurchaseItem[];

  @OneToMany(() => PurchasePayment, (payment) => payment.purchase, {
    cascade: true,
  })
  payments: PurchasePayment[];
}
