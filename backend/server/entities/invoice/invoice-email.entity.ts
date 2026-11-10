import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AuditEntity } from "../base/audit.entity";
import { Invoice } from "./invoice.entity";

export enum TInvoiceEmailStatus {
  SENT = "SENT",
  FAILED = "FAILED",
}

// Every attempt to email an invoice, so the shop can see who was sent what and when
@Entity("invoice_email")
export class InvoiceEmail extends AuditEntity {
  @ManyToOne(() => Invoice, (invoice) => invoice.emails, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "invoice_id" })
  invoice: Invoice;

  @Column({ name: "to_address", length: 255 })
  toAddress: string;

  @Column({ name: "cc_address", length: 255, nullable: true, default: null })
  ccAddress: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: "varchar", length: 10 })
  status: TInvoiceEmailStatus;

  @Column({ length: 500, nullable: true, default: null })
  error: string;
}
