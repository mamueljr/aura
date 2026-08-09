import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aura/ui/components/dialog';
import { Button } from '@aura/ui/components/button';
import { Input } from '@aura/ui/components/input';
import { Label } from '@aura/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aura/ui/components/select';
import { Tabs, TabsList, TabsTrigger } from '@aura/ui/components/tabs';
import { compressReceiptImage } from '@/lib/image';
import { receiptsRepository } from '@/repositories/receipts.repository';
import type { Account } from '@/types/account';
import type { NewTransaction, Transaction, TransactionType } from '@/types/transaction';
import { CATEGORIES } from './categories';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  accounts: Account[];
  onSubmit: (data: NewTransaction) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialState(transaction: Transaction | null, accounts: Account[]) {
  return {
    type: transaction?.type ?? ('expense' as TransactionType),
    description: transaction?.description ?? '',
    amount: transaction ? String(transaction.amount) : '',
    category: transaction?.category ?? CATEGORIES.expense[0],
    date: transaction?.date ?? today(),
    accountId: transaction?.accountId ?? accounts[0]?.id ?? '',
  };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  accounts,
  onSubmit,
}: TransactionFormDialogProps) {
  const [form, setForm] = useState(() => initialState(transaction, accounts));
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialState(transaction, accounts));
    setNewReceiptFile(null);
    setRemoveReceipt(false);

    // Revoca cualquier preview de una sesión previa (p. ej. cancelar tras
    // elegir una foto y volver a abrir) antes de reemplazarla.
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    let cancelled = false;
    if (transaction?.receiptId) {
      void receiptsRepository.get(transaction.receiptId).then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setReceiptPreview(url);
      });
    } else {
      setReceiptPreview(null);
    }
    return () => {
      cancelled = true;
    };
  }, [open, transaction, accounts]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const set = <K extends keyof ReturnType<typeof initialState>>(
    key: K,
    value: ReturnType<typeof initialState>[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const amount = Number(form.amount);
  const valid = form.description.trim().length > 0 && amount > 0 && form.accountId !== '';

  function setType(type: TransactionType) {
    setForm((f) => ({ ...f, type, category: CATEGORIES[type][0] }));
  }

  function pickReceiptFile(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setNewReceiptFile(file);
    setRemoveReceipt(false);
    setReceiptPreview(url);
  }

  function clearReceipt() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setNewReceiptFile(null);
    setRemoveReceipt(true);
    setReceiptPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;

    let receiptId = transaction?.receiptId;
    if (newReceiptFile) {
      const blob = await compressReceiptImage(newReceiptFile);
      receiptId = await receiptsRepository.save(blob);
      if (transaction?.receiptId) await receiptsRepository.remove(transaction.receiptId);
    } else if (removeReceipt && transaction?.receiptId) {
      await receiptsRepository.remove(transaction.receiptId);
      receiptId = undefined;
    }

    onSubmit({
      type: form.type,
      description: form.description.trim(),
      amount,
      category: form.category,
      date: form.date,
      accountId: form.accountId,
      ...(receiptId ? { receiptId } : {}),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
          <DialogDescription>Registra un ingreso o un gasto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Tabs value={form.type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="w-full">
              <TabsTrigger
                value="expense"
                className="flex-1 data-active:bg-destructive/15 data-active:text-destructive"
              >
                Gasto
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="flex-1 data-active:bg-finance-1/15 data-active:text-finance-1"
              >
                Ingreso
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="tx-desc">Descripción</Label>
            <Input
              id="tx-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Monto</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-category">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger id="tx-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[form.type].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-account">Cuenta</Label>
              <Select value={form.accountId} onValueChange={(v) => set('accountId', v)}>
                <SelectTrigger id="tx-account" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            {receiptPreview ? (
              <div className="relative w-24">
                <img
                  src={receiptPreview}
                  alt="Comprobante"
                  className="size-24 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={clearReceipt}
                  aria-label="Quitar comprobante"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex size-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                aria-label="Agregar foto del comprobante"
              >
                <Camera className="size-5" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pickReceiptFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {transaction ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
