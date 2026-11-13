import { EntityManager } from "typeorm";
import { DocumentRevisionRepository } from "../../data-source/repository";
import { DocumentRevision } from "../../entities/util/document-revision.entity";
import { TRevisionDocument, TRevisionLine } from "../../types/revision.type";
import { formatInr } from "../../utilities/amount-in-words.utility";

const same = (a: unknown, b: unknown) => (a ?? "") === (b ?? "");
const shown = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : String(value));

// "Vehicle: DL3CAB1234 → DL3CAB9999", or nothing when the value didn't change
const field = (label: string, before: unknown, after: unknown, format: (v: any) => string = shown) =>
  same(before, after) ? [] : [`${label}: ${format(before)} → ${format(after)}`];

const money = (label: string, before: number, after: number) =>
  Number(before) === Number(after) ? [] : [`${label}: ${formatInr(before)} → ${formatInr(after)}`];

// a product billed on two lines counts once, with its quantities added
const byProduct = (lines: TRevisionLine[]) => {
  const map = new Map<number, TRevisionLine>();
  lines.forEach((line) => {
    const seen = map.get(line.productId);
    if (seen) seen.quantity += line.quantity;
    else map.set(line.productId, { ...line });
  });
  return map;
};

// Added / removed / changed lines, in readable form
const lines = (before: TRevisionLine[], after: TRevisionLine[], priceLabel: string) => {
  const old = byProduct(before);
  const next = byProduct(after);
  const out: string[] = [];

  next.forEach((line, productId) => {
    const was = old.get(productId);
    if (!was) {
      out.push(`Added ${line.name} × ${line.quantity} at ${formatInr(line.price)}`);
      return;
    }
    const parts = [
      ...(was.quantity !== line.quantity ? [`quantity ${was.quantity} → ${line.quantity}`] : []),
      ...(Number(was.price) !== Number(line.price) ? [`${priceLabel} ${formatInr(was.price)} → ${formatInr(line.price)}`] : []),
      ...(Number(was.discountPercent || 0) !== Number(line.discountPercent || 0)
        ? [`discount ${was.discountPercent || 0}% → ${line.discountPercent || 0}%`]
        : []),
      ...(Number(was.taxPercent || 0) !== Number(line.taxPercent || 0) ? [`GST ${was.taxPercent || 0}% → ${line.taxPercent || 0}%`] : []),
    ];
    if (parts.length) out.push(`${line.name}: ${parts.join(", ")}`);
  });
  old.forEach((line, productId) => {
    if (!next.has(productId)) out.push(`Removed ${line.name} (${line.quantity})`);
  });
  return out;
};

const record = (
  manager: EntityManager,
  params: {
    documentType: TRevisionDocument;
    documentId: number;
    shopId: number;
    changes: string[];
    before: object;
    userId: number;
  }
) =>
  manager.getRepository(DocumentRevision).insert({
    documentType: params.documentType,
    documentId: params.documentId,
    shop: { id: params.shopId },
    changes: params.changes,
    before: params.before,
    createdBy: { id: params.userId },
    updatedBy: { id: params.userId },
  });

// newest first, with who made each edit
const history = (documentType: TRevisionDocument, documentId: number) =>
  DocumentRevisionRepository.createQueryBuilder("revision")
    .leftJoin("revision.createdBy", "createdBy")
    .select(["revision.id", "revision.changes", "revision.createdAt"])
    .addSelect(["createdBy.id", "createdBy.firstName", "createdBy.lastName"])
    .where("revision.documentType = :documentType AND revision.documentId = :documentId", { documentType, documentId })
    .orderBy("revision.id", "DESC")
    .getMany();

export default { field, money, lines, record, history };
