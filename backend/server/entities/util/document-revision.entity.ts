import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { TRevisionDocument } from "../../types/revision.type";
import { AuditEntity } from "../base/audit.entity";
import { Shop } from "../shop/shop.entity";

// One row per edit of an issued invoice or a recorded purchase: who edited it, when, what changed
// (readable lines) and the document as it was just before. Rows are only ever added.
@Entity("document_revision")
@Index("idx_revision_document", ["documentType", "documentId"])
export class DocumentRevision extends AuditEntity {
  @Column({ name: "document_type", type: "varchar", length: 20 })
  documentType: TRevisionDocument;

  @Column({ name: "document_id" })
  documentId: number;

  @ManyToOne(() => Shop, { nullable: false })
  @JoinColumn({ name: "shop_id" })
  shop: Shop;

  // e.g. "Oil Filter: quantity 1 → 2", "Total ₹1,180.00 → ₹1,370.00"
  @Column({ type: "json" })
  changes: string[];

  // the document before this edit
  @Column({ type: "json" })
  before: object;
}
