import { db } from '@/db/db';

export const receiptsRepository = {
  async save(blob: Blob): Promise<string> {
    const id = crypto.randomUUID();
    await db.receipts.add({ id, blob });
    return id;
  },

  get(id: string): Promise<Blob | undefined> {
    return db.receipts.get(id).then((r) => r?.blob);
  },

  remove(id: string): Promise<void> {
    return db.receipts.delete(id);
  },
};
