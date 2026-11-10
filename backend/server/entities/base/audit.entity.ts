import { JoinColumn, ManyToOne } from "typeorm";
import { User } from "../usermgmt/user.entity";
import { PrimaryAuditEntity } from "./primaryaudit.entity";

export abstract class AuditEntity extends PrimaryAuditEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy?: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "updated_by" })
  updatedBy?: User;
}
