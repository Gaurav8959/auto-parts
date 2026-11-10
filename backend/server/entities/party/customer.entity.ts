import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Shop } from "../shop/shop.entity";
import { AuditEntity } from "../base/audit.entity";

@Entity("customer")
@Index("idx_customer_name", ["name"])
@Index("idx_customer_phone", ["phone"])
export class Customer extends AuditEntity {
  // customers belong to the shop that serves them
  @ManyToOne(() => Shop, { nullable: false })
  @JoinColumn({ name: "shop_id" })
  shop: Shop;

  @Column({ length: 150 })
  name: string;

  @Column({ name: "contact_person", length: 100, nullable: true, default: null })
  contactPerson: string;

  @Column({ length: 20, nullable: true, default: null })
  phone: string;

  @Column({ length: 100, nullable: true, default: null })
  email: string;

  @Column({ type: "text", nullable: true })
  address: string;

  @Column({ length: 20, nullable: true, default: null })
  gstin: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ name: "is_deleted", default: false })
  isDeleted: boolean;
}
