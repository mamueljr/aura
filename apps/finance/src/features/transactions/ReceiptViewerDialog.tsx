import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@aura/ui/components/dialog';
import { receiptsRepository } from '@/repositories/receipts.repository';

interface ReceiptViewerDialogProps {
  receiptId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptViewerDialog({ receiptId, onOpenChange }: ReceiptViewerDialogProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    void receiptsRepository.get(receiptId).then((blob) => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receiptId]);

  return (
    <Dialog open={receiptId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprobante</DialogTitle>
        </DialogHeader>
        {url && <img src={url} alt="Comprobante" className="w-full rounded-lg" />}
      </DialogContent>
    </Dialog>
  );
}
