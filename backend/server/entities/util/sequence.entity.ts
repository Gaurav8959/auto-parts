import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("sequence")
export class Sequence {
  @PrimaryColumn({ length: 50 })
  name: string;

  @Column({ length: 10 })
  prefix: string;

  @Column({ name: "next_value", default: 1 })
  nextValue: number;
}
