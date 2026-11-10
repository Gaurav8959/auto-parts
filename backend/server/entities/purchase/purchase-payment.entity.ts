import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { TPaymentMode } from "../../types/purchase.type";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { AuditEntity } from "../base/audit.entity";
import { Purchase } from "./purchase.entity";

@Entity("purchase_payment")
export class PurchasePayment extends AuditEntity {
  @ManyToOne(() => Purchase, (purchase) => purchase.payments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "purchase_id" })
  purchase: Purchase;

  @Column({
    name: "amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  @Column({ name: "payment_mode", type: "varchar", length: 20 })
  paymentMode: TPaymentMode;

  @Column({ name: "paid_at", type: "datetime" })
  paidAt: Date;

  @Column({ length: 255, nullable: true, default: null })
  note: string;
}
