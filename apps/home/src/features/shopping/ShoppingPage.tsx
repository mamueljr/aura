import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  History,
  Minus,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { Badge } from '@aura/ui/components/badge'
import { Button } from '@aura/ui/components/button'
import { Card, CardContent } from '@aura/ui/components/card'
import { Checkbox } from '@aura/ui/components/checkbox'
import { Input } from '@aura/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@aura/ui/components/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aura/ui/components/tabs'
import { EmptyState } from '@/components/EmptyState'
import { useShoppingItems } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { parseLocalDate } from '@/utils/dates'
import type { Priority, ShoppingItem } from '@/types/entities'
import { DEFAULT_CATEGORY, SHOPPING_CATEGORIES } from './shopping-meta'
import { useShoppingMutations } from './useShoppingMutations'

function ItemRow({
  item,
  onToggle,
  onQuantity,
  onPriority,
  onRemove,
}: {
  item: ShoppingItem
  onToggle: (done: boolean) => void
  onQuantity: (quantity: number) => void
  onPriority: () => void
  onRemove: () => void
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2"
    >
      <Checkbox
        checked={Boolean(item.completedAt)}
        onCheckedChange={(v) => onToggle(v === true)}
        aria-label={`Marcar ${item.name}`}
      />
      <button
        type="button"
        onClick={onPriority}
        className="min-w-0 flex-1 text-left"
        title="Cambiar prioridad"
      >
        <p className="truncate text-sm font-medium">{item.name}</p>
      </button>
      {item.priority === 'alta' && <Badge>Urgente</Badge>}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Menos"
          disabled={item.quantity <= 1}
          onClick={() => onQuantity(item.quantity - 1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center text-sm tabular-nums">
          {item.quantity}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Más"
          onClick={() => onQuantity(item.quantity + 1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar ${item.name}`}
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </motion.li>
  )
}

const NEXT_PRIORITY: Record<Priority, Priority> = {
  media: 'alta',
  alta: 'baja',
  baja: 'media',
}

/** Lista de compras: alta rápida, categorías, cantidades e historial. */
export function ShoppingPage() {
  const { data: items = [] } = useShoppingItems()
  const { createItem, updateItem, toggleItem, removeItem } =
    useShoppingMutations()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY)

  const { byCategory, doneRecent, pendingCount } = useMemo(() => {
    const pending = items.filter((i) => !i.completedAt)
    const grouped = new Map<string, ShoppingItem[]>()
    for (const item of pending) {
      const key = item.category ?? DEFAULT_CATEGORY
      const list = grouped.get(key) ?? []
      list.push(item)
      grouped.set(key, list)
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }
    return {
      byCategory: [...grouped.entries()].sort(([a], [b]) =>
        a.localeCompare(b, 'es'),
      ),
      doneRecent: items
        .filter((i) => i.completedAt)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
        .slice(0, 30),
      pendingCount: pending.length,
    }
  }, [items])

  function quickAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createItem.mutate({
      name: trimmed,
      category,
      quantity: 1,
      priority: 'media',
    })
    setName('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={quickAdd} className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agregar producto…"
          className="min-w-40 flex-1"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHOPPING_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={!name.trim()}>
          <Plus />
          <span className="hidden sm:inline">Agregar</span>
        </Button>
      </form>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">
            Lista{pendingCount > 0 && ` (${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-5 pt-3">
          {byCategory.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              message="Tu lista está vacía. Agrega lo que necesitas comprar."
            />
          ) : (
            byCategory.map(([cat, list]) => (
              <section key={cat} className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {cat}
                </h3>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {list.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onToggle={(done) =>
                          toggleItem.mutate({ id: item.id, done })
                        }
                        onQuantity={(quantity) =>
                          updateItem.mutate({
                            id: item.id,
                            changes: { quantity },
                          })
                        }
                        onPriority={() =>
                          updateItem.mutate({
                            id: item.id,
                            changes: { priority: NEXT_PRIORITY[item.priority] },
                          })
                        }
                        onRemove={() => removeItem.mutate(item.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))
          )}
        </TabsContent>

        <TabsContent value="historial" className="pt-3">
          {doneRecent.length === 0 ? (
            <EmptyState
              icon={History}
              message="Lo que marques como comprado aparecerá aquí."
            />
          ) : (
            <Card>
              <CardContent>
                <ul className="divide-y">
                  {doneRecent.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm',
                            'text-muted-foreground line-through',
                          )}
                        >
                          {item.name}
                          {item.quantity > 1 && ` ×${item.quantity}`}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {item.completedAt &&
                            parseLocalDate(item.completedAt).toLocaleDateString(
                              'es-MX',
                              { day: 'numeric', month: 'short' },
                            )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleItem.mutate({ id: item.id, done: false })
                        }
                      >
                        <RotateCcw className="size-3.5" /> Volver a comprar
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
