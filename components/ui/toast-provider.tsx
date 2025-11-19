/**
 * TOAST PROVIDER - Sistema Global de Notificaciones
 * ==================================================
 * 
 * Provider que maneja el estado global de todas las notificaciones toast.
 * Debe envolver toda la aplicación en layout.tsx
 * 
 * CARACTERÍSTICAS:
 * - Múltiples toasts simultáneos
 * - Posicionamiento configurable
 * - Cola de mensajes
 * - Auto-dismiss
 * - Límite de toasts
 * 
 * USO:
 * 1. Agregar en app/layout.tsx
 * 2. Usar el hook useToast en cualquier componente
 */

'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import Toast from './toast'
import type { 
  ToastContextValue, 
  ToastMessage, 
  ToastOptions,
  SimpleToastOptions,
  ToastPosition,
  ToastProviderProps 
} from '@/types/notifications'
import { logger } from '@/lib/logger'

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_DURATION = 5000      // 5 segundos
const DEFAULT_POSITION: ToastPosition = 'top-right'
const MAX_TOASTS = 5               // Máximo de toasts simultáneos

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null)

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function ToastProvider({ 
  children,
  defaultPosition = DEFAULT_POSITION,
  defaultDuration = DEFAULT_DURATION,
  maxToasts = MAX_TOASTS,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Genera un ID único para cada toast
   */
  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Agrupa toasts por posición para renderizado
   */
  const groupToastsByPosition = () => {
    return toasts.reduce((groups, toast) => {
      const position = toast.position || defaultPosition
      if (!groups[position]) {
        groups[position] = []
      }
      groups[position].push(toast)
      return groups
    }, {} as Record<ToastPosition, ToastMessage[]>)
  }

  // ============================================================================
  // MÉTODOS PRINCIPALES
  // ============================================================================

  /**
   * Muestra un nuevo toast
   */
  const show = useCallback((options: ToastOptions): string => {
    const id = generateId()
    
    const newToast: ToastMessage = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      duration: options.duration ?? defaultDuration,
      position: options.position ?? defaultPosition,
      dismissible: options.dismissible ?? true,
      action: options.action,
      createdAt: Date.now(),
    }

    setToasts(prev => {
      // Si alcanzamos el límite, removemos el más antiguo
      const toastsToKeep = prev.length >= maxToasts 
        ? prev.slice(1) 
        : prev
      
      return [...toastsToKeep, newToast]
    })

    logger.debug('Toast shown:', newToast)
    return id
  }, [defaultDuration, defaultPosition, maxToasts])

  /**
   * Cierra un toast específico
   */
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
    logger.debug('Toast dismissed:', id)
  }, [])

  /**
   * Cierra todos los toasts
   */
  const dismissAll = useCallback(() => {
    setToasts([])
    logger.debug('All toasts dismissed')
  }, [])

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA
  // ============================================================================

  /**
   * Toast de éxito
   */
  const success = useCallback((
    message: string, 
    options?: SimpleToastOptions
  ): string => {
    return show({
      type: 'success',
      message,
      title: options?.title,
      duration: options?.duration,
      position: options?.position,
      action: options?.action,
    })
  }, [show])

  /**
   * Toast de error
   */
  const error = useCallback((
    message: string, 
    options?: SimpleToastOptions
  ): string => {
    return show({
      type: 'error',
      message,
      title: options?.title,
      duration: options?.duration ?? 7000, // Errores duran más
      position: options?.position,
      action: options?.action,
    })
  }, [show])

  /**
   * Toast de warning
   */
  const warning = useCallback((
    message: string, 
    options?: SimpleToastOptions
  ): string => {
    return show({
      type: 'warning',
      message,
      title: options?.title,
      duration: options?.duration ?? 6000,
      position: options?.position,
      action: options?.action,
    })
  }, [show])

  /**
   * Toast de info
   */
  const info = useCallback((
    message: string, 
    options?: SimpleToastOptions
  ): string => {
    return show({
      type: 'info',
      message,
      title: options?.title,
      duration: options?.duration,
      position: options?.position,
      action: options?.action,
    })
  }, [show])

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: ToastContextValue = {
    toasts,
    show,
    dismiss,
    dismissAll,
    success,
    error,
    warning,
    info,
  }

  // ============================================================================
  // LIMPIEZA AUTOMÁTICA
  // ============================================================================

  // Limpiar toasts muy antiguos (por si acaso)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(toast => {
        const age = now - (toast.createdAt || 0)
        const maxAge = (toast.duration || DEFAULT_DURATION) + 1000
        return age < maxAge
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // ============================================================================
  // RENDER
  // ============================================================================

  const groupedToasts = groupToastsByPosition()

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Contenedores de toasts por posición */}
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`
            fixed z-[80]
            pointer-events-none
            ${getPositionClasses(position as ToastPosition)}
          `}
        >
          <div className="flex flex-col gap-3 p-4">
            {positionToasts.map(toast => (
              <div key={toast.id} className="pointer-events-auto">
                <Toast toast={toast} onDismiss={dismiss} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </ToastContext.Provider>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtiene las clases de Tailwind para cada posición
 */
function getPositionClasses(position: ToastPosition): string {
  const positions = {
    'top-left': 'top-0 left-0',
    'top-center': 'top-0 left-1/2 -translate-x-1/2',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0',
  }
  
  return positions[position] || positions['top-right']
}

// ============================================================================
// HOOK PARA USAR EL CONTEXT
// ============================================================================

/**
 * Hook para acceder al sistema de toast
 * Debe usarse dentro de un componente que esté dentro del ToastProvider
 */
export function useToastContext() {
  const context = useContext(ToastContext)
  
  if (!context) {
    throw new Error(
      'useToastContext debe ser usado dentro de un ToastProvider. ' +
      'Asegúrate de envolver tu aplicación con <ToastProvider> en layout.tsx'
    )
  }
  
  return context
}

// ============================================================================
// EXPORT
// ============================================================================

export default ToastProvider

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/**
 * 1. SETUP EN app/layout.tsx:
 * 
 * import { ToastProvider } from '@/components/ui/toast-provider'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ToastProvider>
 *           {children}
 *         </ToastProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * 
 * 
 * 2. SETUP CON CONFIGURACIÓN PERSONALIZADA:
 * 
 * <ToastProvider
 *   defaultPosition="bottom-right"
 *   defaultDuration={4000}
 *   maxToasts={3}
 * >
 *   {children}
 * </ToastProvider>
 * 
 * 
 * 3. USO EN COMPONENTES (a través del hook useToast):
 * 
 * import { useToast } from '@/hooks/useToast'
 * 
 * function MyComponent() {
 *   const toast = useToast()
 *   
 *   const handleSave = async () => {
 *     try {
 *       await saveData()
 *       toast.success('Guardado correctamente')
 *     } catch (error) {
 *       toast.error('Error al guardar')
 *     }
 *   }
 *   
 *   return <button onClick={handleSave}>Guardar</button>
 * }
 * 
 * 
 * 4. TOAST CON ACCIÓN:
 * 
 * toast.success('Elemento eliminado', {
 *   action: {
 *     label: 'Deshacer',
 *     onClick: () => handleUndo()
 *   }
 * })
 * 
 * 
 * 5. TOAST PERSONALIZADO:
 * 
 * toast.show({
 *   type: 'info',
 *   title: 'Nueva actualización',
 *   message: 'Hay una nueva versión disponible',
 *   duration: 0,  // No auto-dismiss
 *   position: 'bottom-center',
 *   action: {
 *     label: 'Actualizar ahora',
 *     onClick: () => window.location.reload()
 *   }
 * })
 * 
 * 
 * 6. CERRAR TODOS LOS TOASTS:
 * 
 * const toast = useToast()
 * toast.dismissAll()
 */
