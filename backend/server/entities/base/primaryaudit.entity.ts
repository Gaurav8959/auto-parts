import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export abstract class PrimaryAuditEntity {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @CreateDateColumn({
    nullable: true,
  })
  createdAt?: Date;

  @UpdateDateColumn({
    nullable: true,
  })
  updatedAt?: Date;
}
