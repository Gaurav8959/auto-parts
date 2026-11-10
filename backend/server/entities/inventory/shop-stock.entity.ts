import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { ColumnNumericTransformer } from "../../utilities/common.utility";
import { PrimaryAuditEntity } from "../base/primaryaudit.entity";
import { Product } from "../catalog/product.entity";
import { Shop } from "../shop/shop.entity";

// How much of a product one shop holds. Only stockService changes `quantity`,
// always together with a stock_transaction row, so the two never disagree.
@Entity("shop_stock")
@Unique("uq_shop_stock", ["shop", "product"])
export class ShopStock extends PrimaryAuditEntity {
  @ManyToOne(() => Shop, { nullable: false })
  @JoinColumn({ name: "shop_id" })
  shop: Shop;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  quantity: number;

  @Column({
    name: "reorder_level",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 5,
    transformer: new ColumnNumericTransformer(),
  })
  reorderLevel: number;

  @Column({ name: "rack_location", length: 50, nullable: true, default: null })
  rackLocation: string;

  // weighted average cost of this shop's stock, recalculated on every purchase
  @Column({
    name: "avg_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  avgCost: number;
}
