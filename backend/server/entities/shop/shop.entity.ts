import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { PrimaryAuditEntity } from "../base/primaryaudit.entity";
import { User } from "../usermgmt/user.entity";

// A physical shop. Stock, invoices, purchases and customers all belong to exactly one shop;
// the product catalog and suppliers are shared across shops.
@Entity("shop")
// Extends PrimaryAuditEntity (not AuditEntity) because User points back at Shop;
// going through AuditEntity would make the two classes import each other before either exists.
export class Shop extends PrimaryAuditEntity {
  @Column({ length: 150 })
  name: string;

  // short, unique code used on screens and as the default document prefix
  @Column({ length: 10, unique: true })
  code: string;

  @Column({ length: 150, nullable: true, default: null })
  tagline: string;

  @Column({ type: "text", nullable: true })
  address: string;

  @Column({ length: 30, nullable: true, default: null })
  phone: string;

  @Column({ length: 100, nullable: true, default: null })
  email: string;

  @Column({ length: 20, nullable: true, default: null })
  gstin: string;

  @Column({ name: "invoice_terms", type: "text", nullable: true })
  invoiceTerms: string;

  @Column({ name: "invoice_prefix", length: 10 })
  invoicePrefix: string;

  @Column({ name: "purchase_prefix", length: 10 })
  purchasePrefix: string;

  // bills without GST are numbered in their own series, so the GST invoice series stays unbroken
  @Column({ name: "non_gst_prefix", length: 10, default: "BILL" })
  nonGstPrefix: string;

  // printed on invoices: logo as a small data URL (up to ~400 KB), and how customers can pay.
  // Not loaded with the shop: read it explicitly where it's printed (see GET /settings/logos).
  @Column({ type: "mediumtext", nullable: true, select: false })
  logo: string;

  @Column({ name: "bank_name", length: 100, nullable: true, default: null })
  bankName: string;

  @Column({ name: "bank_account_name", length: 150, nullable: true, default: null })
  bankAccountName: string;

  @Column({ name: "bank_account_number", length: 40, nullable: true, default: null })
  bankAccountNumber: string;

  @Column({ name: "bank_ifsc", length: 20, nullable: true, default: null })
  bankIfsc: string;

  // UPI id (e.g. shop@okicici): invoices show a QR code for the amount due
  @Column({ name: "upi_id", length: 100, nullable: true, default: null })
  upiId: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy?: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "updated_by" })
  updatedBy?: User;
}
