import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source/data-source";

const DEADLOCK = "ER_LOCK_DEADLOCK";

// MySQL settles a deadlock by rolling one transaction back; running it again is the documented remedy.
// The work must be safe to repeat: everything it wrote was rolled back with the failed attempt.
export const transactionWithRetry = async <T>(work: (manager: EntityManager) => Promise<T>, attempts = 3): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await AppDataSource.transaction(work);
    } catch (error) {
      if (error?.code !== DEADLOCK || attempt >= attempts) throw error;
    }
  }
};
