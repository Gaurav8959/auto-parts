import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("permission")
export class Permission {
  @PrimaryColumn({ length: 100, nullable: false })
  permission: string;

  // Groups permissions so the UI can render them section-wise
  @Column({ name: "category", length: 50 })
  category: string;

  @Column({ name: "permission_order", default: 0 })
  permissionOrder: number;

  @Column({ length: 255 })
  description: string;
}
