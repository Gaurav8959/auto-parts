import { Column, Entity, Index } from "typeorm";
import { AuditEntity } from "../base/audit.entity";

@Entity("supplier")
@Index("idx_supplier_name", ["name"])
@Index("idx_supplier_phone", ["phone"])
export class Supplier extends AuditEntity {
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
