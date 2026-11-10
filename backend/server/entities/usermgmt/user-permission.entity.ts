import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";

// Entities
import { PrimaryAuditEntity } from "../base/primaryaudit.entity";
import { User } from "./user.entity";

// A missing row means the manager holds the permission (managers get everything by default).
// A row only needs to exist once the admin has explicitly set a value.
@Entity("user_permission")
@Unique("uq_user_permission", ["user", "permission"])
export class UserPermission extends PrimaryAuditEntity {
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_id",
    referencedColumnName: "id",
  })
  user: User;

  @Column({ name: "permission", length: 100 })
  permission: string;

  @Column({ name: "permission_val" })
  permissionVal: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: "updated_by" })
  updatedBy?: User;
}
