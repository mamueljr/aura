import { useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { ACCOUNT_COLORS, type Account, type NewAccount } from '@/types/account';

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onSubmit: (data: NewAccount) => void;
}

function initialState(account: Account | null) {
  return {
    name: account?.name ?? '',
    color: account?.color ?? ACCOUNT_COLORS[0],
  };
}

export function AccountFormDialog({ open, onOpenChange, account, onSubmit }: AccountFormDialogProps) {
  const [form, setForm] = useState(() => initialState(account));

  useEffect(() => {
    if (open) setForm(initialState(account));
  }, [open, account]);

  const valid = form.name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ name: form.name.trim(), color: form.color });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
          <DialogDescription>Ej. Efectivo, banco o tarjeta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acc-name">Nombre</Label>
            <Input
              id="acc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {ACCOUNT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  aria-pressed={form.color === color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    'size-8 rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    form.color === color && 'ring-2 ring-ring',
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid}>
              {account ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
