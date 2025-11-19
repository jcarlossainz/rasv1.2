/**
 * CONFIRM MODAL - Modal de Confirmación Profesional
 * ==================================================
 * 
 * Modal personalizado para reemplazar window.confirm() con:
 * - Diseño profesional acorde a RAS
 * - Variantes (default, danger, warning, info)
 * - Promesas para async/await
 * - Completamente personalizable
 * 
 * USO:
 * Usar a través del hook useConfirm, no directamente
 * 
 * const confirm = useConfirm()
 * const confirmed = await confirm.danger('¿Eliminar?')
 */

'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { 
  ConfirmOptions, 
  ConfirmContextValue,
  ConfirmVariant,
  ConfirmProviderProps 
} from '@/types/notifications'
import { colors } from '@/lib/constants/design-tokens'
import { logger } from '@/lib/logger'

// ============================================================================
// ESTILOS POR VARIANTE
// ============================================================================

const variantStyles = {
  default: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBg: 'bg-gradient-to-r from-ras-azul to-ras-turquesa hover:shadow-lg',
    confirmText: 'text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round"/>
        <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round"/>
      </svg>
    ),
  },
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-600 hover:bg-red-700 hover:shadow-lg',
    confirmText: 'text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBg: 'bg-amber-600 hover:bg-amber-700 hover:shadow-lg',
    confirmText: 'text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBg: 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg',
    confirmText: 'text-white',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round"/>
        <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round"/>
      </svg>
    ),
  },
}

// ============================================================================
// CONTEXT
// ============================================================================

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  /**
   * Muestra el modal de confirmación y retorna una promesa
   */
  const show = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    logger.debug('Confirm modal shown:', opts)

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }, [])

  /**
   * Cierra el modal sin confirmar
   */
  const dismiss = useCallback(() => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
    logger.debug('Confirm modal dismissed')
  }, [resolvePromise])

  /**
   * Maneja la confirmación
   */
  const handleConfirm = useCallback(async () => {
    if (options?.onConfirm) {
      await options.onConfirm()
    }
    
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
    
    logger.debug('Confirm modal confirmed')
  }, [options, resolvePromise])

  /**
   * Maneja la cancelación
   */
  const handleCancel = useCallback(() => {
    if (options?.onCancel) {
      options.onCancel()
    }
    
    dismiss()
  }, [options, dismiss])

  const value: ConfirmContextValue = {
    show,
    dismiss,
    isOpen,
  }

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      
      {/* Modal */}
      {isOpen && options && (
        <ConfirmModal
          options={options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onClickOutside={
            options.closeOnClickOutside !== false ? handleCancel : undefined
          }
        />
      )}
    </ConfirmContext.Provider>
  )
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

interface ConfirmModalComponentProps {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
  onClickOutside?: () => void
}

function ConfirmModal({ 
  options, 
  onConfirm, 
  onCancel,
  onClickOutside 
}: ConfirmModalComponentProps) {
  const variant = options.variant || 'default'
  const style = variantStyles[variant]

  return (
    <div 
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClickOutside}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con ícono */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Ícono */}
            <div className={`
              flex-shrink-0
              w-12 h-12
              ${style.iconBg}
              rounded-xl
              flex items-center justify-center
              ${style.iconColor}
            `}>
              {options.icon || style.icon}
            </div>

            {/* Título y mensaje */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 font-poppins mb-2">
                {options.title}
              </h3>
              
              <div className="text-sm text-gray-600 leading-relaxed">
                {typeof options.message === 'string' ? (
                  <p>{options.message}</p>
                ) : (
                  options.message
                )}
              </div>
            </div>

            {/* Botón cerrar (opcional) */}
            {options.showCloseButton !== false && (
              <button
                onClick={onCancel}
                className="flex-shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex items-center justify-center"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          {/* Botón cancelar */}
          <button
            onClick={onCancel}
            className="
              px-6 py-2.5
              rounded-xl
              border-2 border-gray-300
              text-gray-700 font-semibold
              hover:bg-gray-50 hover:border-gray-400
              active:scale-95
              transition-all duration-200
            "
          >
            {options.cancelText || 'Cancelar'}
          </button>

          {/* Botón confirmar */}
          <button
            onClick={onConfirm}
            className={`
              px-6 py-2.5
              rounded-xl
              font-semibold
              active:scale-95
              transition-all duration-200
              ${style.confirmBg}
              ${style.confirmText}
            `}
          >
            {options.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HOOK PARA USAR EL CONTEXT
// ============================================================================

export function useConfirmContext() {
  const context = useContext(ConfirmContext)
  
  if (!context) {
    throw new Error(
      'useConfirmContext debe ser usado dentro de un ConfirmProvider. ' +
      'Asegúrate de envolver tu aplicación con <ConfirmProvider> en layout.tsx'
    )
  }
  
  return context
}

// ============================================================================
// HOOK CONVENIENTE CON MÉTODOS ADICIONALES
// ============================================================================

export function useConfirm() {
  const context = useConfirmContext()

  return {
    // Método principal
    show: context.show,
    dismiss: context.dismiss,
    isOpen: context.isOpen,

    // Método de conveniencia - confirmación estándar
    confirm: (message: string, title = '¿Confirmar?'): Promise<boolean> => {
      return context.show({
        title,
        message,
        variant: 'default',
      })
    },

    // Método de conveniencia - acción peligrosa
    danger: (message: string, title = '¿Estás seguro?'): Promise<boolean> => {
      return context.show({
        title,
        message,
        variant: 'danger',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
      })
    },

    // Método de conveniencia - advertencia
    warning: (message: string, title = 'Advertencia'): Promise<boolean> => {
      return context.show({
        title,
        message,
        variant: 'warning',
      })
    },

    // Método de conveniencia - información
    info: (message: string, title = 'Información'): Promise<boolean> => {
      return context.show({
        title,
        message,
        variant: 'info',
      })
    },
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConfirmProvider

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/**
 * 1. SETUP EN app/layout.tsx (junto con ToastProvider):
 * 
 * import { ToastProvider } from '@/components/ui/toast-provider'
 * import { ConfirmProvider } from '@/components/ui/confirm-modal'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ToastProvider>
 *           <ConfirmProvider>
 *             {children}
 *           </ConfirmProvider>
 *         </ToastProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * 
 * 
 * 2. USO BÁSICO - Método danger (reemplazar confirm()):
 * 
 * import { useConfirm } from '@/components/ui/confirm-modal'
 * import { useToast } from '@/hooks/useToast'
 * 
 * function DeleteButton({ itemName }) {
 *   const confirm = useConfirm()
 *   const toast = useToast()
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await confirm.danger(
 *       `¿Estás seguro que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`,
 *       'Confirmar eliminación'
 *     )
 *     
 *     if (!confirmed) return
 *     
 *     try {
 *       await deleteItem()
 *       toast.success('Elemento eliminado correctamente')
 *     } catch (error) {
 *       toast.error('Error al eliminar')
 *     }
 *   }
 *   
 *   return <button onClick={handleDelete}>Eliminar</button>
 * }
 * 
 * 
 * 3. USO CON OPCIONES COMPLETAS:
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm.show({
 *     title: 'Eliminar propiedad',
 *     message: (
 *       <div>
 *         <p className="mb-2">
 *           ¿Estás seguro que deseas eliminar esta propiedad?
 *         </p>
 *         <p className="text-sm text-gray-500">
 *           Se eliminarán:
 *         </p>
 *         <ul className="text-sm text-gray-500 list-disc ml-4 mt-1">
 *           <li>Todos los datos</li>
 *           <li>Fotos y documentos</li>
 *           <li>Historial completo</li>
 *         </ul>
 *       </div>
 *     ),
 *     variant: 'danger',
 *     confirmText: 'Sí, eliminar',
 *     cancelText: 'Cancelar',
 *     showCloseButton: true,
 *     closeOnClickOutside: true,
 *     onConfirm: async () => {
 *       await deleteProperty()
 *     }
 *   })
 *   
 *   if (confirmed) {
 *     toast.success('Propiedad eliminada')
 *   }
 * }
 * 
 * 
 * 4. MIGRACIÓN DESDE window.confirm():
 * 
 * ANTES:
 * ------
 * const handleDelete = async () => {
 *   if (!confirm('¿Estás seguro?')) return
 *   await deleteItem()
 *   alert('Eliminado')
 * }
 * 
 * DESPUÉS:
 * --------
 * import { useConfirm } from '@/components/ui/confirm-modal'
 * import { useToast } from '@/hooks/useToast'
 * 
 * const confirm = useConfirm()
 * const toast = useToast()
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm.danger('¿Estás seguro?')
 *   if (!confirmed) return
 *   
 *   await deleteItem()
 *   toast.success('Eliminado')
 * }
 */
