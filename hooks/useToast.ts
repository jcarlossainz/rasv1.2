/**
 * useToast HOOK - Interface Simple para Notificaciones
 * =====================================================
 * 
 * Hook personalizado para usar el sistema de toast de forma sencilla.
 * Proporciona una API limpia y fácil de usar en cualquier componente.
 * 
 * USO BÁSICO:
 * const toast = useToast()
 * toast.success('¡Éxito!')
 * toast.error('Error')
 * toast.warning('Advertencia')
 * toast.info('Información')
 */

'use client'

import { useToastContext } from '@/components/ui/toast-provider'
import type { UseToastReturn } from '@/types/notifications'

/**
 * Hook para acceder al sistema de notificaciones toast
 * 
 * @returns Objeto con métodos para mostrar toasts
 * 
 * @example
 * const toast = useToast()
 * toast.success('Guardado correctamente')
 * toast.error('Error al guardar')
 */
export function useToast(): UseToastReturn {
  const context = useToastContext()

  return {
    show: context.show,
    success: context.success,
    error: context.error,
    warning: context.warning,
    info: context.info,
    dismiss: context.dismiss,
    dismissAll: context.dismissAll,
    toasts: context.toasts,
  }
}

export default useToast