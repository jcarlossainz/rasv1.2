import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'premium' | 'success' | 'info' | 'warning' | 'default'
  className?: string
}

/**
 * Badge - Etiqueta con estilos predefinidos
 * Variante premium con gradiente turquesa-azul
 */
export default function Badge({
  children,
  variant = 'default',
  className = ''
}: BadgeProps) {
  const variants = {
    premium: 'bg-gradient-to-r from-ras-turquesa to-ras-azul text-white',
    success: 'bg-green-100 text-green-700 border border-green-300',
    info: 'bg-blue-100 text-blue-700 border border-blue-300',
    warning: 'bg-orange-100 text-orange-700 border border-orange-300',
    default: 'bg-gray-100 text-gray-700 border border-gray-300'
  }

  return (
    <span
      className={`
        inline-flex items-center
        px-3 py-1 rounded-full
        text-xs font-semibold
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
