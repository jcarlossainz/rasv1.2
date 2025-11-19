/**
 * LOADING COMPONENT - Indicadores de Carga Mejorados
 * ===================================================
 * 
 * Componente de loading con:
 * - 2 modos: fullscreen e inline
 * - 3 tamaños: sm, md, lg
 * - Mensaje personalizable
 * - Spinner animado profesional
 * - Overlay opcional
 * 
 * USO:
 * <Loading message="Cargando datos..." />
 * <LoadingInline size="sm" />
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'
import { colors } from '@/lib/constants/design-tokens'

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingProps {
  /** Mensaje a mostrar debajo del spinner */
  message?: string
  
  /** Tamaño del spinner */
  size?: 'sm' | 'md' | 'lg'
  
  /** Si muestra overlay de fondo */
  overlay?: boolean
  
  /** Color del spinner (por defecto usa ras-azul) */
  color?: string
  
  /** Clase adicional */
  className?: string
}

export interface LoadingInlineProps {
  /** Tamaño del spinner */
  size?: 'sm' | 'md' | 'lg'
  
  /** Mensaje a mostrar */
  message?: string
  
  /** Color del spinner */
  color?: string
  
  /** Clase adicional */
  className?: string
}

// ============================================================================
// LOADING FULLSCREEN (DEFAULT)
// ============================================================================

export default function Loading({
  message = 'Cargando...',
  size = 'lg',
  overlay = true,
  color,
  className,
}: LoadingProps) {
  return (
    <div 
      className={cn(
        'fixed inset-0 z-50',
        'flex flex-col items-center justify-center',
        'p-4',
        overlay && 'bg-white/80 backdrop-blur-sm',
        className
      )}
    >
      <Spinner size={size} color={color} />
      
      {message && (
        <p className="mt-4 text-gray-600 font-medium text-center animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// LOADING INLINE
// ============================================================================

export function LoadingInline({
  size = 'md',
  message,
  color,
  className,
}: LoadingInlineProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center',
        'py-8',
        className
      )}
    >
      <Spinner size={size} color={color} />
      
      {message && (
        <p className="mt-3 text-gray-600 text-sm font-medium text-center">
          {message}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// SPINNER COMPONENT
// ============================================================================

interface SpinnerProps {
  size: 'sm' | 'md' | 'lg'
  color?: string
}

function Spinner({ size, color }: SpinnerProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const strokeWidths = {
    sm: '3',
    md: '4',
    lg: '4',
  }

  const spinnerColor = color || colors.primary.azul

  return (
    <div className="relative">
      <svg
        className={cn('animate-spin', sizes[size])}
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
          strokeWidth={strokeWidths[size]}
          style={{ color: spinnerColor }}
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          style={{ color: spinnerColor }}
        />
      </svg>
    </div>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export function LoadingSkeleton({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-gray-200 rounded',
            i === lines - 1 && 'w-4/5'
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// LOADING CARD
// ============================================================================

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl p-6 shadow-lg animate-pulse', className)}>
      <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
}

// ============================================================================
// LOADING DOTS
// ============================================================================

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-ras-azul rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// LOADING BAR
// ============================================================================

export function LoadingBar({ className }: { className?: string }) {
  return (
    <div className={cn('w-full h-1 bg-gray-200 rounded-full overflow-hidden', className)}>
      <div 
        className="h-full bg-gradient-to-r from-ras-azul to-ras-turquesa animate-loading-bar"
        style={{
          width: '40%',
        }}
      />
    </div>
  )
}

// ============================================================================
// LOADING BUTTON
// ============================================================================

export function LoadingButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <svg
      className={cn('animate-spin', sizes[size])}
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

export { Spinner }