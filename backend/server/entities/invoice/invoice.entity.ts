import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from "typeorm";
import { TInvoiceStatus } from "../../types/invoice.type";
import { TPaymentStatus } from "../../types/purchase.type";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { AuditEntity } from "../base/audit.entity";
import { User } from "../usermgmt/user.entity";
import { Customer } from "../party/customer.entity";
import { InvoiceItem } from "./invoice-item.entity";
import { InvoicePayment } from "./invoice-payment.entity";
import { InvoiceEmail } from "./invoice-email.entity";
import { Shop } from "../shop/shop.entity";

// Issued invoices are never edited. A mistake is fixed by cancelling (stock goes back) and re-issuing.
@Entity("invoice")
@Index("idx_invoice_date", ["invoiceDate"])
@Unique("uq_invoice_shop_number", ["shop", "invoiceNumber"])
export class Invoice extends AuditEntity {
  @ManyToOne(() => Shop, { nullable: false })
  @JoinColumn({ name: "shop_id" })
  shop: Shop;

  // numbered per shop
  @Column({ name: "invoice_number", length: 30 })
  invoiceNumber: string;

  @Column({ name: "invoice_date", type: "datetime" })
  invoiceDate: Date;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  // snapshot of who was billed (also used for walk-in customers)
  @Column({ name: "customer_name", length: 150 })
  customerName: string;

  @Column({ name: "customer_phone", length: 20, nullable: true, default: null })
  customerPhone: string;

  @Column({ name: "customer_address", type: "text", nullable: true })
  customerAddress: string;

  @Column({ name: "customer_gstin", length: 20, nullable: true, default: null })
  customerGstin: string;

  // where the invoice is emailed; snapshotted so walk-in customers can be emailed too
  @Column({ name: "customer_email", length: 100, nullable: true, default: null })
  customerEmail: string;

  // payment terms for credit customers; overdue when past this and not fully paid
  @Column({ name: "due_date", type: "datetime", nullable: true, default: null })
  dueDate: Date;

  @Column({ name: "vehicle_number", length: 20, nullable: true, default: null })
  vehicleNumber: string;

  // GST state code where the supply takes place; a state other than the shop's means IGST
  @Column({ name: "place_of_supply", length: 2, nullable: true, default: null })
  placeOfSupply: string;

  @Column({ name: "is_inter_state", default: false })
  isInterState: boolean;

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
    name: "discount_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  discountTotal: number;

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
    name: "round_off",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  roundOff: number;

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
    name: "cost_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  costTotal: number;

  @Column({
    name: "payment_status",
    type: "varchar",
    length: 20,
    default: TPaymentStatus.UNPAID,
  })
  paymentStatus: TPaymentStatus;

  @Column({
    type: "varchar",
    length: 20,
    default: TInvoiceStatus.ISSUED,
  })
  status: TInvoiceStatus;

  @Column({ name: "cancelled_at", type: "datetime", nullable: true, default: null })
  cancelledAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "cancelled_by" })
  cancelledBy: User;

  @Column({ name: "cancel_reason", length: 255, nullable: true, default: null })
  cancelReason: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @OneToMany(() => InvoicePayment, (payment) => payment.invoice, {
    cascade: true,
  })
  payments: InvoicePayment[];

  @OneToMany(() => InvoiceEmail, (email) => email.invoice)
  emails: InvoiceEmail[];
}
