/**
 * TYPES - Notificaciones y Sistema de Alertas
 * ============================================
 * 
 * Define todos los tipos TypeScript para el sistema de notificaciones:
 * - Toast notifications
 * - Confirm modals
 * - Alert modals
 * 
 * Estos tipos aseguran type-safety en toda la aplicación
 */

// ============================================================================
// TIPOS DE NOTIFICACIÓN
// ============================================================================

/**
 * Tipos de notificación disponibles
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Variantes de confirmación
 */
export type ConfirmVariant = 'default' | 'danger' | 'warning' | 'info'

/**
 * Posiciones donde puede aparecer el toast
 */
export type ToastPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

// ============================================================================
// INTERFACES PARA TOAST
// ============================================================================

/**
 * Mensaje individual de toast
 */
export interface ToastMessage {
  /** ID único del toast */
  id: string
  
  /** Tipo de notificación */
  type: NotificationType
  
  /** Título opcional del toast */
  title?: string
  
  /** Mensaje principal */
  message: string
  
  /** Duración en ms antes de auto-dismiss (0 = no auto-dismiss) */
  duration?: number
  
  /** Posición en pantalla */
  position?: ToastPosition
  
  /** Si se puede cerrar manualmente */
  dismissible?: boolean
  
  /** Acción opcional (botón adicional) */
  action?: ToastAction
  
  /** Timestamp de creación */
  createdAt?: number
}

/**
 * Acción opcional en un toast
 */
export interface ToastAction {
  /** Texto del botón de acción */
  label: string
  
  /** Callback al hacer clic */
  onClick: () => void
}

/**
 * Props para el componente Toast individual
 */
export interface ToastProps {
  /** Datos del toast */
  toast: ToastMessage
  
  /** Callback para cerrar */
  onDismiss: (id: string) => void
}

/**
 * Opciones al crear un toast (sin id ni createdAt)
 */
export type ToastOptions = Omit<ToastMessage, 'id' | 'createdAt'>

/**
 * Opciones simplificadas para métodos de conveniencia
 */
export interface SimpleToastOptions {
  title?: string
  duration?: number
  position?: ToastPosition
  action?: ToastAction
}

// ============================================================================
// INTERFACES PARA CONFIRM MODAL
// ============================================================================

/**
 * Configuración de un modal de confirmación
 */
export interface ConfirmOptions {
  /** Título del modal */
  title: string
  
  /** Mensaje/descripción */
  message: string | React.ReactNode
  
  /** Variante visual */
  variant?: ConfirmVariant
  
  /** Texto del botón de confirmar */
  confirmText?: string
  
  /** Texto del botón de cancelar */
  cancelText?: string
  
  /** Si muestra el botón de cerrar (X) */
  showCloseButton?: boolean
  
  /** Si se puede cerrar clickeando fuera */
  closeOnClickOutside?: boolean
  
  /** Callback al confirmar */
  onConfirm?: () => void | Promise<void>
  
  /** Callback al cancelar */
  onCancel?: () => void
  
  /** Ícono personalizado */
  icon?: React.ReactNode
}

/**
 * Props para el componente ConfirmModal
 */
export interface ConfirmModalProps {
  /** Si el modal está abierto */
  isOpen: boolean
  
  /** Callback para cerrar */
  onClose: () => void
  
  /** Configuración del modal */
  options: ConfirmOptions
  
  /** Callback con el resultado (true = confirmado, false = cancelado) */
  onResult?: (confirmed: boolean) => void
}

/**
 * Resultado de una confirmación
 */
export interface ConfirmResult {
  /** Si fue confirmado */
  confirmed: boolean
  
  /** Timestamp de la decisión */
  timestamp: number
}

// ============================================================================
// CONTEXT Y PROVIDER
// ============================================================================

/**
 * Contexto del sistema de toast
 */
export interface ToastContextValue {
  /** Lista de toasts activos */
  toasts: ToastMessage[]
  
  /** Agregar un nuevo toast */
  show: (options: ToastOptions) => string
  
  /** Remover un toast por ID */
  dismiss: (id: string) => void
  
  /** Remover todos los toasts */
  dismissAll: () => void
  
  /** Métodos de conveniencia */
  success: (message: string, options?: SimpleToastOptions) => string
  error: (message: string, options?: SimpleToastOptions) => string
  warning: (message: string, options?: SimpleToastOptions) => string
  info: (message: string, options?: SimpleToastOptions) => string
}

/**
 * Contexto del sistema de confirm
 */
export interface ConfirmContextValue {
  /** Mostrar modal de confirmación */
  show: (options: ConfirmOptions) => Promise<boolean>
  
  /** Cerrar modal actual */
  dismiss: () => void
  
  /** Estado del modal */
  isOpen: boolean
}

/**
 * Props para ToastProvider
 */
export interface ToastProviderProps {
  /** Elementos hijos */
  children: React.ReactNode
  
  /** Posición por defecto de los toasts */
  defaultPosition?: ToastPosition
  
  /** Duración por defecto (ms) */
  defaultDuration?: number
  
  /** Máximo de toasts simultáneos */
  maxToasts?: number
}

/**
 * Props para ConfirmProvider
 */
export interface ConfirmProviderProps {
  /** Elementos hijos */
  children: React.ReactNode
}

// ============================================================================
// UTILIDADES Y HELPERS
// ============================================================================

/**
 * Configuración de estilo por tipo de notificación
 */
export interface NotificationStyle {
  /** Color de fondo */
  bgColor: string
  
  /** Color de borde */
  borderColor: string
  
  /** Color de texto */
  textColor: string
  
  /** Ícono */
  icon: string
  
  /** Color del ícono */
  iconColor: string
}

/**
 * Map de estilos por tipo
 */
export type NotificationStyleMap = Record<NotificationType, NotificationStyle>

/**
 * Configuración de estilo por variante de confirmación
 */
export interface ConfirmVariantStyle {
  /** Color primario */
  primaryColor: string
  
  /** Color de hover */
  hoverColor: string
  
  /** Color de texto del botón */
  buttonTextColor: string
  
  /** Ícono por defecto */
  defaultIcon: string
}

/**
 * Map de estilos por variante
 */
export type ConfirmVariantStyleMap = Record<ConfirmVariant, ConfirmVariantStyle>

// ============================================================================
// EVENTOS Y CALLBACKS
// ============================================================================

/**
 * Evento de cambio en el sistema de toast
 */
export interface ToastChangeEvent {
  /** Acción realizada */
  action: 'add' | 'remove' | 'clear'
  
  /** Toast afectado (si aplica) */
  toast?: ToastMessage
  
  /** Total de toasts activos */
  count: number
}

/**
 * Callback de cambio
 */
export type ToastChangeCallback = (event: ToastChangeEvent) => void

/**
 * Hook de toast - valor de retorno
 */
export interface UseToastReturn {
  /** Mostrar toast genérico */
  show: (options: ToastOptions) => string
  
  /** Toast de éxito */
  success: (message: string, options?: SimpleToastOptions) => string
  
  /** Toast de error */
  error: (message: string, options?: SimpleToastOptions) => string
  
  /** Toast de warning */
  warning: (message: string, options?: SimpleToastOptions) => string
  
  /** Toast de info */
  info: (message: string, options?: SimpleToastOptions) => string
  
  /** Cerrar toast específico */
  dismiss: (id: string) => void
  
  /** Cerrar todos */
  dismissAll: () => void
  
  /** Lista de toasts activos */
  toasts: ToastMessage[]
}

/**
 * Hook de confirm - valor de retorno
 */
export interface UseConfirmReturn {
  /** Mostrar confirmación */
  show: (options: ConfirmOptions) => Promise<boolean>
  
  /** Cerrar modal */
  dismiss: () => void
  
  /** Estado */
  isOpen: boolean
  
  /** Métodos de conveniencia */
  confirm: (message: string, title?: string) => Promise<boolean>
  danger: (message: string, title?: string) => Promise<boolean>
  warning: (message: string, title?: string) => Promise<boolean>
}

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

/**
 * Configuración por defecto del sistema
 */
export interface ToastConfig {
  /** Duración por defecto (ms) */
  DEFAULT_DURATION: number
  
  /** Posición por defecto */
  DEFAULT_POSITION: ToastPosition
  
  /** Máximo de toasts simultáneos */
  MAX_TOASTS: number
  
  /** Delay entre animaciones (ms) */
  ANIMATION_DELAY: number
  
  /** Duración de animación (ms) */
  ANIMATION_DURATION: number
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Exportar todo junto para imports convenientes
export type {
  // React
  ReactNode,
} from 'react'

