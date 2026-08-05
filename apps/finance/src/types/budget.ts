export interface Budget {
  /** El nombre de la categoría es la clave — un presupuesto por categoría. */
  category: string;
  monthlyLimit: number;
  updatedAt: string;
  deletedAt?: string;
}
