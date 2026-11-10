import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { ColumnNumericTransformer } from "../../utilities/common.utility";

// Single-row table (id = 1) with business-wide settings. Each shop's own details live on the shop table.
@Entity("shop_setting")
export class ShopSetting {
  @PrimaryColumn({ type: "int", default: 1 })
  id: number;

  // the business name (shown in the app); each shop prints its own name on invoices
  @Column({ name: "shop_name", length: 150, default: "My Auto Parts" })
  shopName: string;







  @Column({
    name: "default_tax_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 18,
    transformer: new ColumnNumericTransformer(),
  })
  defaultTaxPercent: number;

  @Column({ name: "low_stock_default", default: 5 })
  lowStockDefault: number;

  // the business logo: printed on invoices of any shop that hasn't uploaded its own.
  // Not loaded with the settings: read it explicitly (see GET /settings/logos).
  @Column({ type: "mediumtext", nullable: true, select: false })
  logo: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
