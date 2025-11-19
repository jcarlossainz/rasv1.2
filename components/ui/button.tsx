/**
 * BUTTON COMPONENT - Botón Mejorado y Profesional
 * ================================================
 * 
 * Componente de botón mejorado con:
 * - 5 variantes (primary, secondary, outline, ghost, danger)
 * - 3 tamaños (sm, md, lg)
 * - Estado loading con spinner
 * - Soporte para iconos
 * - Animaciones suaves
 * - Accesibilidad completa
 * 
 * USO:
 * <Button variant="primary" size="md" loading={isLoading}>
 *   Guardar
 * </Button>
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual del botón */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  
  /** Tamaño del botón */
  size?: 'sm' | 'md' | 'lg'
  
  /** Ancho completo */
  fullWidth?: boolean
  
  /** Estado de carga (muestra spinner) */
  loading?: boolean
  
  /** Ícono a la izquierda del texto */
  leftIcon?: React.ReactNode
  
  /** Ícono a la derecha del texto */
  rightIcon?: React.ReactNode
  
  /** Solo ícono (sin texto) */
  iconOnly?: boolean
  
  /** Contenido del botón */
  children?: React.ReactNode
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // ========================================================================
    // ESTILOS BASE
    // ========================================================================

    const baseStyles = cn(
      // Base
      'inline-flex items-center justify-center gap-2',
      'font-semibold font-poppins',
      'rounded-xl',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      
      // Animaciones
      'active:scale-95',
      !disabled && !loading && 'hover:scale-105',
      
      // Loading cursor
      loading && 'cursor-wait'
    )

    // ========================================================================
    // VARIANTES
    // ========================================================================

    const variants = {
      primary: cn(
        'bg-gradient-to-r from-ras-azul to-ras-turquesa',
        'text-white',
        'shadow-md',
        !disabled && !loading && 'hover:shadow-xl',
        'focus:ring-ras-azul'
      ),
      
      secondary: cn(
        'bg-ras-crema',
        'text-ras-azul',
        'border-2 border-ras-azul',
        !disabled && !loading && 'hover:bg-ras-azul hover:text-white',
        'focus:ring-ras-azul'
      ),
      
      outline: cn(
        'border-2 border-ras-azul',
        'text-ras-azul',
        'bg-transparent',
        !disabled && !loading && 'hover:bg-ras-azul hover:text-white',
        'focus:ring-ras-azul'
      ),
      
      ghost: cn(
        'text-ras-azul',
        'bg-transparent',
        !disabled && !loading && 'hover:bg-ras-crema',
        'focus:ring-ras-azul'
      ),
      
      danger: cn(
        'bg-red-600',
        'text-white',
        'shadow-md',
        !disabled && !loading && 'hover:bg-red-700 hover:shadow-xl',
        'focus:ring-red-500'
      ),
    }

    // ========================================================================
    // TAMAÑOS
    // ========================================================================

    const sizes = {
      sm: cn(
        iconOnly ? 'w-8 h-8' : 'px-4 py-2',
        'text-sm',
        'gap-1.5'
      ),
      md: cn(
        iconOnly ? 'w-10 h-10' : 'px-6 py-3',
        'text-base',
        'gap-2'
      ),
      lg: cn(
        iconOnly ? 'w-12 h-12' : 'px-8 py-4',
        'text-lg',
        'gap-2.5'
      ),
    }

    // ========================================================================
    // CLASES FINALES
    // ========================================================================

    const buttonClasses = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    )

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {/* Spinner de loading */}
        {loading && <LoadingSpinner size={size} />}
        
        {/* Ícono izquierdo */}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">
            {leftIcon}
          </span>
        )}
        
        {/* Texto/contenido */}
        {!iconOnly && children && (
          <span>{children}</span>
        )}
        
        {/* Ícono derecho */}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ============================================================================
// COMPONENTE SPINNER
// ============================================================================

interface LoadingSpinnerProps {
  size: 'sm' | 'md' | 'lg'
}

function LoadingSpinner({ size }: LoadingSpinnerProps) {
  const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <svg
      className={cn(
        'animate-spin',
        spinnerSizes[size]
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Button

// ============================================================================
// VARIANTES ADICIONALES COMO COMPONENTES
// ============================================================================

/**
 * Botón primario - Para acciones principales
 */
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />
}

/**
 * Botón secundario - Para acciones secundarias
 */
export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />
}

/**
 * Botón outline - Para acciones terciarias
 */
export function OutlineButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="outline" {...props} />
}

/**
 * Botón ghost - Para acciones sutiles
 */
export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />
}

/**
 * Botón de peligro - Para acciones destructivas
 */
export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />
}

/**
 * Botón de ícono - Solo ícono sin texto
 */
export function IconButton(props: Omit<ButtonProps, 'iconOnly'>) {
  return <Button iconOnly {...props} />
}

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/**
 * EJEMPLO 1: USO BÁSICO
 * ======================
 * 
 * import Button from '@/components/ui/button'
 * 
 * <Button variant="primary" size="md">
 *   Guardar
 * </Button>
 * 
 * <Button variant="danger" size="sm">
 *   Eliminar
 * </Button>
 * 
 * <Button variant="ghost" size="lg">
 *   Cancelar
 * </Button>
 */

/**
 * EJEMPLO 2: CON LOADING
 * =======================
 * 
 * import Button from '@/components/ui/button'
 * 
 * function SaveButton() {
 *   const [loading, setLoading] = useState(false)
 *   
 *   const handleSave = async () => {
 *     setLoading(true)
 *     try {
 *       await saveData()
 *       toast.success('Guardado')
 *     } finally {
 *       setLoading(false)
 *     }
 *   }
 *   
 *   return (
 *     <Button
 *       variant="primary"
 *       loading={loading}
 *       onClick={handleSave}
 *     >
 *       Guardar
 *     </Button>
 *   )
 * }
 */

/**
 * EJEMPLO 3: CON ICONOS
 * ======================
 * 
 * import Button from '@/components/ui/button'
 * 
 * <Button
 *   variant="primary"
 *   leftIcon={
 *     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 *       <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
 *       <polyline points="17 21 17 13 7 13 7 21"/>
 *       <polyline points="7 3 7 8 15 8"/>
 *     </svg>
 *   }
 * >
 *   Guardar
 * </Button>
 * 
 * <Button
 *   variant="secondary"
 *   rightIcon={
 *     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 *       <polyline points="9 18 15 12 9 6"/>
 *     </svg>
 *   }
 * >
 *   Siguiente
 * </Button>
 */

/**
 * EJEMPLO 4: BOTÓN SOLO ÍCONO
 * ============================
 * 
 * import Button from '@/components/ui/button'
 * 
 * <Button
 *   variant="ghost"
 *   size="sm"
 *   iconOnly
 *   aria-label="Cerrar"
 * >
 *   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
 *     <line x1="18" y1="6" x2="6" y2="18"/>
 *     <line x1="6" y1="6" x2="18" y2="18"/>
 *   </svg>
 * </Button>
 */

/**
 * EJEMPLO 5: USANDO COMPONENTES ESPECÍFICOS
 * ==========================================
 * 
 * import { 
 *   PrimaryButton, 
 *   SecondaryButton, 
 *   DangerButton,
 *   IconButton 
 * } from '@/components/ui/button'
 * 
 * <PrimaryButton onClick={handleSave}>
 *   Guardar
 * </PrimaryButton>
 * 
 * <SecondaryButton onClick={handleCancel}>
 *   Cancelar
 * </SecondaryButton>
 * 
 * <DangerButton onClick={handleDelete} loading={deleting}>
 *   Eliminar
 * </DangerButton>
 * 
 * <IconButton size="sm" onClick={handleClose}>
 *   <XIcon />
 * </IconButton>
 */

/**
 * EJEMPLO 6: BOTÓN CON ANCHO COMPLETO
 * ====================================
 * 
 * <Button variant="primary" fullWidth>
 *   Iniciar Sesión
 * </Button>
 */

/**
 * EJEMPLO 7: EN FORMULARIOS
 * ==========================
 * 
 * import Button from '@/components/ui/button'
 * 
 * <form onSubmit={handleSubmit}>
 *   <input type="text" />
 *   
 *   <div className="flex gap-3">
 *     <Button
 *       type="button"
 *       variant="ghost"
 *       onClick={onCancel}
 *     >
 *       Cancelar
 *     </Button>
 *     
 *     <Button
 *       type="submit"
 *       variant="primary"
 *       loading={isSubmitting}
 *       disabled={!isValid}
 *     >
 *       Enviar
 *     </Button>
 *   </div>
 * </form>
 */

/**
 * EJEMPLO 8: BOTÓN CON CONFIRMACIÓN
 * ==================================
 * 
 * import Button from '@/components/ui/button'
 * import { useConfirm } from '@/components/ui/confirm-modal'
 * import { useToast } from '@/hooks/useToast'
 * 
 * function DeleteButton({ itemName }) {
 *   const confirm = useConfirm()
 *   const toast = useToast()
 *   const [deleting, setDeleting] = useState(false)
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await confirm.danger(
 *       `¿Eliminar "${itemName}"?`,
 *       'Esta acción no se puede deshacer'
 *     )
 *     
 *     if (!confirmed) return
 *     
 *     setDeleting(true)
 *     try {
 *       await deleteItem()
 *       toast.success('Eliminado correctamente')
 *     } catch (error) {
 *       toast.error('Error al eliminar')
 *     } finally {
 *       setDeleting(false)
 *     }
 *   }
 *   
 *   return (
 *     <Button
 *       variant="danger"
 *       size="sm"
 *       loading={deleting}
 *       onClick={handleDelete}
 *     >
 *       Eliminar
 *     </Button>
 *   )
 * }
 */

/**
 * PATRONES COMUNES
 * ================
 * 
 * 1. Botón de acción principal:
 *    <Button variant="primary" size="md">Acción</Button>
 * 
 * 2. Botón de cancelar/cerrar:
 *    <Button variant="ghost" size="md">Cancelar</Button>
 * 
 * 3. Botón de eliminar:
 *    <Button variant="danger" size="sm">Eliminar</Button>
 * 
 * 4. Botón con loading:
 *    <Button loading={isLoading}>Guardar</Button>
 * 
 * 5. Botón deshabilitado:
 *    <Button disabled={!isValid}>Enviar</Button>
 * 
 * 6. Botón solo ícono:
 *    <Button iconOnly><Icon /></Button>
 */
