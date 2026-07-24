import {
  BarChart3,
  CalendarDays,
  Car,
  FileText,
  Home,
  LayoutGrid,
  Leaf,
  ListTodo,
  PawPrint,
  Phone,
  Receipt,
  ShoppingCart,
  Sofa,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export interface ModuleDef {
  id: string
  path: string
  label: string
  icon: LucideIcon
  description: string
  /** Versión del roadmap en la que el módulo estará funcional. */
  plannedVersion: string
}

/**
 * Registro central de módulos de Aura Home.
 * Navegación, rutas y páginas se derivan de esta lista.
 */
export const MODULES: ModuleDef[] = [
  {
    id: 'calendario',
    path: '/calendario',
    label: 'Calendario',
    icon: CalendarDays,
    description: 'Eventos, cumpleaños, recordatorios y vencimientos en un solo lugar.',
    plannedVersion: 'v0.8',
  },
  {
    id: 'servicios',
    path: '/servicios',
    label: 'Servicios',
    icon: Receipt,
    description: 'Luz, agua, internet, streaming… con fechas de pago e historial.',
    plannedVersion: 'v0.6',
  },
  {
    id: 'tareas',
    path: '/tareas',
    label: 'Tareas',
    icon: ListTodo,
    description: 'Pendientes con prioridad, subtareas, etiquetas y fechas.',
    plannedVersion: 'v0.7',
  },
  {
    id: 'compras',
    path: '/compras',
    label: 'Compras',
    icon: ShoppingCart,
    description: 'Lista inteligente con categorías, prioridad e historial.',
    plannedVersion: 'v0.9',
  },
  {
    id: 'mantenimiento',
    path: '/mantenimiento',
    label: 'Mantenimiento',
    icon: Wrench,
    description: 'Casa, auto y electrodomésticos: fechas, costos y fotos.',
    plannedVersion: 'v0.10',
  },
  {
    id: 'contactos',
    path: '/contactos',
    label: 'Contactos',
    icon: Phone,
    description: 'Plomero, doctor, veterinario, familia y emergencias.',
    plannedVersion: 'v0.11',
  },
  {
    id: 'mascotas',
    path: '/mascotas',
    label: 'Mascotas',
    icon: PawPrint,
    description: 'Vacunas, veterinario, peso y medicamentos.',
    plannedVersion: 'v0.12',
  },
  {
    id: 'vehiculos',
    path: '/vehiculos',
    label: 'Vehículos',
    icon: Car,
    description: 'Servicios, gasolina, seguro, tenencia y verificación.',
    plannedVersion: 'v0.12',
  },
  {
    id: 'plantas',
    path: '/plantas',
    label: 'Plantas',
    icon: Leaf,
    description: 'Riego, fertilización y fotografías de su progreso.',
    plannedVersion: 'v0.12',
  },
  {
    id: 'documentos',
    path: '/documentos',
    label: 'Documentos',
    icon: FileText,
    description: 'Garantías, contratos, recibos y manuales, siempre a la mano.',
    plannedVersion: 'v0.13',
  },
  {
    id: 'mi-hogar',
    path: '/mi-hogar',
    label: 'Mi Hogar',
    icon: Sofa,
    description: 'Tu vivienda, habitación por habitación, de forma visual.',
    plannedVersion: 'v0.14',
  },
  {
    id: 'estadisticas',
    path: '/estadisticas',
    label: 'Estadísticas',
    icon: BarChart3,
    description: 'Gráficas de gastos, pagos y actividad del hogar.',
    plannedVersion: 'v0.15',
  },
  {
    id: 'familia',
    path: '/familia',
    label: 'Familia y Datos',
    icon: Users,
    description: 'CURP, RFC, tipo de sangre y datos importantes de cada quien.',
    plannedVersion: 'v1.1',
  },
]

/** Entradas fijas de la navegación (no son módulos). */
export const NAV_HOME = { path: '/', label: 'Inicio', icon: Home } as const
export const NAV_MODULES = { path: '/modulos', label: 'Módulos', icon: LayoutGrid } as const

/** Ítems de la barra inferior (móvil): 4 accesos + "Módulos". */
export const BOTTOM_NAV_IDS = ['calendario', 'servicios', 'tareas'] as const

export function findModuleByPath(pathname: string): ModuleDef | undefined {
  return MODULES.find((m) => m.path === pathname)
}
