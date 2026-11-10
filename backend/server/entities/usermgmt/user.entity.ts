import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TUserRole } from "../../types/user.type";
import { Shop } from "../shop/shop.entity";

@Entity("user", { orderBy: { firstName: "ASC" } })
export class User {
  @PrimaryGeneratedColumn({ type: "int" })
  id?: number;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @Column({ length: 100, unique: true })
  email?: string;

  @Column({ length: 100, select: false })
  password?: string;

  @Column({ length: 100 })
  firstName?: string;

  @Column({ length: 100, nullable: true, default: null })
  lastName?: string;

  @Column({ type: "varchar", length: 20, nullable: true, default: null })
  mobile?: string;

  @Column({
    type: "varchar",
    length: 20,
    default: TUserRole.MANAGER,
  })
  role?: TUserRole;

  // One manager runs one shop (unique). Admins have no shop: they see all of them.
  @OneToOne(() => Shop, { nullable: true })
  @JoinColumn({ name: "shop_id" })
  shop?: Shop;

  @Column({ name: "is_active", default: true })
  isActive?: boolean;

  @Column({ name: "is_deleted", default: false })
  isDeleted?: boolean;

  @Column({ name: "last_login_at", type: "datetime", nullable: true, default: null })
  lastLoginAt?: Date;

  // Part of every session token. A password change, a password reset or "sign out other devices"
  // increments it, which ends every session issued before.
  @Column({ name: "token_version", default: 0 })
  tokenVersion?: number;
}
