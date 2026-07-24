import { motion } from 'framer-motion'
import { Bell, CalendarDays, Home, Receipt, Sparkles } from 'lucide-react'
import { Badge } from '@aura/ui/components/badge'
import { Button } from '@aura/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aura/ui/components/card'
import { Checkbox } from '@aura/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@aura/ui/components/dialog'
import { Input } from '@aura/ui/components/input'
import { Label } from '@aura/ui/components/label'
import { Separator } from '@aura/ui/components/separator'
import { Skeleton } from '@aura/ui/components/skeleton'
import { Switch } from '@aura/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aura/ui/components/tabs'
import { APP_CONFIG } from '@/config/app'

/* Clases estáticas: Tailwind no genera clases construidas dinámicamente */
const AURA_SHADES = [
  ['aura-50', 'bg-aura-50'],
  ['aura-100', 'bg-aura-100'],
  ['aura-200', 'bg-aura-200'],
  ['aura-300', 'bg-aura-300'],
  ['aura-400', 'bg-aura-400'],
  ['aura-500', 'bg-aura-500'],
  ['aura-600', 'bg-aura-600'],
  ['aura-700', 'bg-aura-700'],
  ['aura-800', 'bg-aura-800'],
  ['aura-900', 'bg-aura-900'],
] as const

const SEMANTIC_TOKENS = [
  ['background', 'bg-background'],
  ['card', 'bg-card'],
  ['primary', 'bg-primary'],
  ['secondary', 'bg-secondary'],
  ['muted', 'bg-muted'],
  ['accent', 'bg-accent'],
] as const

const sectionMotion = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: 'easeOut' },
} as const

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.section {...sectionMotion} className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </motion.section>
  )
}

/**
 * Showcase interno del Aura Design System (v0.2).
 * Sirve como referencia visual y prueba de humo de los componentes.
 */
export function DesignShowcasePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12">
      <p className="text-sm text-muted-foreground">
        Sistema de diseño del ecosistema Aura · v{APP_CONFIG.version}
      </p>
        <Section title="Paleta Aura">
          <div className="flex overflow-hidden rounded-xl border">
            {AURA_SHADES.map(([name, bgClass]) => (
              <div key={name} title={name} className={`h-14 flex-1 ${bgClass}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SEMANTIC_TOKENS.map(([token, bgClass]) => (
              <div
                key={token}
                className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1.5 pr-3 text-xs"
              >
                <span className={`size-4 rounded-full border ${bgClass}`} />
                {token}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Tipografía">
          <div className="space-y-1">
            <p className="font-heading text-3xl font-semibold tracking-tight">
              Sora — títulos con carácter
            </p>
            <p className="text-muted-foreground">
              Inter — texto de lectura, cómodo y neutro para el día a día.
            </p>
          </div>
        </Section>

        <Section title="Botones">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <Sparkles /> Primario
            </Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Eliminar</Button>
            <Button size="icon" aria-label="Notificaciones">
              <Bell />
            </Button>
          </div>
        </Section>

        <Section title="Tarjetas">
          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="size-4 text-primary" /> Próximo pago
                  </CardTitle>
                  <CardDescription>Internet · vence en 3 días</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-2xl font-semibold">$599.00</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="glass h-full border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" /> Glassmorphism
                  </CardTitle>
                  <CardDescription>
                    Superficie translúcida con la utilidad `glass`.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Badge>Hoy</Badge>
                  <Badge variant="secondary">Hogar</Badge>
                  <Badge variant="outline">Recordatorio</Badge>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Section>

        <Section title="Formularios">
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service">Nombre del servicio</Label>
                <Input id="service" placeholder="Ej. Luz, Agua, Internet…" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="reminders">Recordatorios</Label>
                <Switch id="reminders" defaultChecked />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="monthly" defaultChecked />
                <Label htmlFor="monthly">Pago mensual</Label>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Navegación y overlays">
          <Tabs defaultValue="resumen">
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
            </TabsList>
            <TabsContent value="resumen" className="pt-3">
              <div className="flex items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Home /> Abrir diálogo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bienvenido a Aura Home</DialogTitle>
                      <DialogDescription>
                        Los diálogos usan Radix: accesibles, con foco atrapado y
                        animaciones suaves.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="historial" className="pt-3 text-sm text-muted-foreground">
              Aquí vivirá el historial de cada módulo.
            </TabsContent>
            <TabsContent value="ajustes" className="pt-3 text-sm text-muted-foreground">
              Preferencias por módulo, en camino.
            </TabsContent>
          </Tabs>
        </Section>
    </div>
  )
}
