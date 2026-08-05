export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  accountId: string;
  /** Referencia a un Blob en la tabla `receipts` — la foto del comprobante, si hay una. */
  receiptId?: string;
  /**
   * Id del comprobante en Drive, una vez subido. Los bytes nunca viajan dentro
   * del snapshot: van por el canal de binarios y aquí solo queda la referencia,
   * que es lo que permite a otro dispositivo descargarlo.
   */
  receiptDriveFileId?: string;
  /** MIME original del comprobante: el cifrado no lo conserva y hay que restaurarlo. */
  receiptType?: string;
  createdAt: string;
  updatedAt: string;
  /** Tombstone de Aura Sync: se propaga en vez de borrar, para que la eliminación llegue a otros dispositivos. */
  deletedAt?: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
