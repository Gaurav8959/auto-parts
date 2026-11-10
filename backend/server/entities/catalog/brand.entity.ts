import { Column, Entity } from "typeorm";
import { AuditEntity } from "../base/audit.entity";

@Entity("brand")
export class Brand extends AuditEntity {
  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 255, nullable: true, default: null })
  description: string;
}
