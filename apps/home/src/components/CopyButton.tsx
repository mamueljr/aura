import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@aura/ui/components/button'
import { cn } from '@/lib/utils'

/** Botón de ícono que copia `value` al portapapeles y confirma con un check. */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={cn('shrink-0', className)}
      aria-label={`Copiar ${label}`}
      onClick={async (e) => {
        e.stopPropagation()
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="text-primary" /> : <Copy />}
    </Button>
  )
}
