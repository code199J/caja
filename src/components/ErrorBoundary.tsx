/**
 * ErrorBoundary — Límite de error por pestaña
 *
 * Envuelve cada tab para que un error en una sección no derrumbe toda la app.
 * Muestra un fallback con opción de reiniciar esa pestaña.
 */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button, Card } from '../design'
import { tokens } from '../design'

interface Props {
  children: ReactNode
  tab: string
  onReset: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`ErrorBoundary en pestaña "${this.props.tab}":`, error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card padded style={{ marginTop: tokens.space[5] }}>
          <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.semibold, color: tokens.color.destructive, marginBottom: tokens.space[2] }}>
            Algo falló en "{this.props.tab}"
          </div>
          <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[3] }}>
            {this.state.error?.message ?? 'Error desconocido'}
          </div>
          <div style={{ display: 'flex', gap: tokens.space[3] }}>
            <Button variant="primary" onClick={this.reset}>
              Volver a intentar
            </Button>
            <Button variant="ghost" onClick={() => {
              window.location.hash = 'repartir'
              this.reset()
            }}>
              Ir a Repartir
            </Button>
          </div>
        </Card>
      )
    }

    return <>{this.props.children}</>
  }
}