import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

/**
 * GlassCard - Card con efecto glassmorphism
 * Diseño Apple-style con backdrop-blur y bordes sutiles
 */
export default function GlassCard({
  children,
  className = '',
  delay = 0,
  hover = false
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      className={`
        bg-white/90 backdrop-blur-md
        rounded-2xl border border-white/30
        shadow-xl
        ${hover ? 'transition-shadow hover:shadow-2xl cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
