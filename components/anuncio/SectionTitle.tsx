import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface SectionTitleProps {
  children: ReactNode
  subtitle?: string
  icon?: string
  align?: 'left' | 'center'
  className?: string
}

/**
 * SectionTitle - Título de sección con animación
 * Diseño Apple-style con opcional icono y subtítulo
 */
export default function SectionTitle({
  children,
  subtitle,
  icon,
  align = 'left',
  className = ''
}: SectionTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`
        ${align === 'center' ? 'text-center' : 'text-left'}
        ${className}
      `}
    >
      {icon && (
        <div className={`text-4xl mb-3 ${align === 'center' ? 'mx-auto' : ''}`}>
          {icon}
        </div>
      )}

      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
        {children}
      </h2>

      {subtitle && (
        <p className="text-lg text-gray-600">
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}
