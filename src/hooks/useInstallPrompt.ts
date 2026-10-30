/**
 * useInstallPrompt — Detecta y expone la oportunidad de instalar la PWA
 *
 * En Chrome/Edge Android y Safari iOS, el evento 'beforeinstallprompt' se dispara
 * cuando la app cumple criterios de instalabilidad (manifest, HTTPS, service worker,
 * visitas previas). Este hook lo captura y lo expone para mostrar un botón "Instalar".
 */

import { useState, useEffect, useCallback } from 'react'

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // En iOS standalone ya está instalado si se abrió desde la pantalla de inicio
    if (iOS && (navigator as any).standalone) {
      setIsInstalled(true)
    }
  }, [])

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    e.preventDefault()
    setDeferredPrompt(e as any)
  }, [])

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    })
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [handleBeforeInstallPrompt])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }
  }, [deferredPrompt])

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS,
    install,
  }
}
