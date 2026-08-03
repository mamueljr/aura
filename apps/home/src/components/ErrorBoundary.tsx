import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@aura/ui/components/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Última línea de defensa: si una página lanza una excepción no controlada,
 * muestra un mensaje recuperable en lugar de dejar la PWA en blanco.
 * "Reintentar" vuelve a renderizar; al cambiar de ruta el layout remonta este
 * árbol entero (`key={location.pathname}`), así que el estado se limpia solo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Error no controlado en la página:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle className="size-10 text-destructive" aria-hidden />
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">Algo salió mal</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ocurrió un error al mostrar esta página. Tus datos están a salvo.
          </p>
        </div>
        <Button variant="outline" onClick={() => this.setState({ error: null })}>
          <RotateCcw /> Reintentar
        </Button>
      </div>
    )
  }
}
