import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { TInvoicePaymentType } from "../../types/invoice.type";
import { TPaymentMode } from "../../types/purchase.type";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { AuditEntity } from "../base/audit.entity";
import { Invoice } from "./invoice.entity";

@Entity("invoice_payment")
export class InvoicePayment extends AuditEntity {
  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "invoice_id" })
  invoice: Invoice;

  @Column({
    name: "amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  // a refund is stored with a negative amount, so the payments of an invoice always add up to paidAmount
  @Column({ type: "varchar", length: 10, default: TInvoicePaymentType.PAYMENT })
  type: TInvoicePaymentType;

  @Column({ name: "payment_mode", type: "varchar", length: 20 })
  paymentMode: TPaymentMode;

  @Column({ name: "paid_at", type: "datetime" })
  paidAt: Date;

  @Column({ length: 255, nullable: true, default: null })
  note: string;
}
