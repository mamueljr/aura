import { lazy, type ComponentType } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useApplyTheme } from '@/hooks/useApplyTheme'
import { useDriveSync } from '@/hooks/useDriveSync'
import { useReminderNotifications } from '@/hooks/useReminderNotifications'
import { AppLayout } from '@/layouts/AppLayout'
import { MODULES } from '@/config/navigation'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { useOnboardingStore } from '@/stores/onboarding.store'

const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const ServicesPage = lazy(() =>
  import('@/features/services/ServicesPage').then((m) => ({ default: m.ServicesPage })),
)
const ShoppingPage = lazy(() =>
  import('@/features/shopping/ShoppingPage').then((m) => ({ default: m.ShoppingPage })),
)
const TasksPage = lazy(() =>
  import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const ContactsPage = lazy(() =>
  import('@/features/contacts/ContactsPage').then((m) => ({ default: m.ContactsPage })),
)
const MaintenancePage = lazy(() =>
  import('@/features/maintenance/MaintenancePage').then((m) => ({ default: m.MaintenancePage })),
)
const PetsPage = lazy(() =>
  import('@/features/pets/PetsPage').then((m) => ({ default: m.PetsPage })),
)
const VehiclesPage = lazy(() =>
  import('@/features/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
)
const PlantsPage = lazy(() =>
  import('@/features/plants/PlantsPage').then((m) => ({ default: m.PlantsPage })),
)
const DocumentsPage = lazy(() =>
  import('@/features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
)
const RoomsPage = lazy(() =>
  import('@/features/rooms/RoomsPage').then((m) => ({ default: m.RoomsPage })),
)
const StatsPage = lazy(() =>
  import('@/features/stats/StatsPage').then((m) => ({ default: m.StatsPage })),
)
const FamilyPage = lazy(() =>
  import('@/features/family/FamilyPage').then((m) => ({ default: m.FamilyPage })),
)
const DesignShowcasePage = lazy(() =>
  import('@/pages/DesignShowcasePage').then((m) => ({ default: m.DesignShowcasePage })),
)
const ModulePlaceholderPage = lazy(() =>
  import('@/pages/ModulePlaceholderPage').then((m) => ({ default: m.ModulePlaceholderPage })),
)
const ModulesPage = lazy(() =>
  import('@/pages/ModulesPage').then((m) => ({ default: m.ModulesPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

/**
 * Página de cada módulo del registro central (config/navigation).
 * Un módulo sin entrada aquí aún no está implementado y muestra
 * su placeholder automáticamente.
 */
const MODULE_PAGES: Record<string, ComponentType> = {
  calendario: CalendarPage,
  servicios: ServicesPage,
  tareas: TasksPage,
  compras: ShoppingPage,
  mantenimiento: MaintenancePage,
  contactos: ContactsPage,
  mascotas: PetsPage,
  vehiculos: VehiclesPage,
  plantas: PlantsPage,
  documentos: DocumentsPage,
  'mi-hogar': RoomsPage,
  estadisticas: StatsPage,
  familia: FamilyPage,
}

export function App() {
  useApplyTheme()
  useReminderNotifications()
  useDriveSync()
  const onboarded = useOnboardingStore((s) => s.completed)
  const completeOnboarding = useOnboardingStore((s) => s.complete)

  if (!onboarded) {
    return <WelcomePage onComplete={completeOnboarding} />
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/modulos" element={<ModulesPage />} />
          {MODULES.map((m) => {
            const Page = MODULE_PAGES[m.id]
            return (
              <Route
                key={m.id}
                path={m.path}
                element={Page ? <Page /> : <ModulePlaceholderPage module={m} />}
              />
            )
          })}
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="/design" element={<DesignShowcasePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
