import { EntityManager } from "typeorm";
import { Sequence } from "../../entities/util/sequence.entity";

// Document numbers run per shop: the counter is keyed "<SEQUENCE>:<shopId>" and the prefix comes
// from the shop. Must be called inside a transaction: the row lock keeps numbers gap-free.
const getNextNumber = async (manager: EntityManager, name: string, shopId: number, prefix: string) => {
  const repo = manager.getRepository(Sequence);
  const key = `${name}:${shopId}`;

  // creates the counter the first time; on an existing one the no-op update takes the exclusive lock
  // directly (INSERT IGNORE would take a shared lock, which deadlocks when two bills upgrade it)
  await repo
    .createQueryBuilder()
    .insert()
    .values({ name: key, prefix, nextValue: 1 })
    .orUpdate(["name"], ["name"])
    .updateEntity(false)
    .execute();
  const sequence = await repo.findOne({ where: { name: key }, lock: { mode: "pessimistic_write" } });

  const value = sequence.nextValue;
  await repo.update(key, { nextValue: value + 1, prefix });

  return `${prefix}-${String(value).padStart(5, "0")}`;
};

export default {
  getNextNumber,
};
