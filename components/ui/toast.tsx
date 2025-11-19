/**
 * components/ui/toast.tsx - VERSIÓN MEJORADA
 * ===========================================
 * 
 * Componente Toast individual con mejoras visuales profesionales
 * 
 * MEJORAS vs versión anterior:
 * ✅ Iconos SVG profesionales (en vez de emojis)
 * ✅ Barra de progreso animada
 * ✅ Colores RAS integrados (turquesa para info)
 * ✅ Animaciones más suaves de entrada/salida
 * ✅ Mejor accesibilidad (ARIA attributes)
 * ✅ Diseño más pulido y profesional
 * 
 * COMPATIBILIDAD:
 * - Funciona con tu toast-provider.tsx actual (sin cambios)
 * - Usa tus tipos de types/notifications.ts
 * - API idéntica, solo mejoras visuales
 */

'use client'

import { useEffect, useState } from 'react'
import type { ToastMessage } from '@/types/notifications'

interface ToastProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  // ===== AUTO-DISMISS CON PROGRESO =====
  useEffect(() => {
    if (toast.duration > 0) {
      // Iniciar temporizador de auto-dismiss
      const dismissTimer = setTimeout(() => {
        handleDismiss()
      }, toast.duration)

      // Animar barra de progreso
      const startTime = Date.now()
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100)
        setProgress(remaining)
        
        if (remaining <= 0) {
          clearInterval(progressInterval)
        }
      }, 16) // ~60fps

      return () => {
        clearTimeout(dismissTimer)
        clearInterval(progressInterval)
      }
    }
  }, [toast.duration, toast.id])

  // ===== HANDLER DE DISMISS =====
  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300) // Duración de animación de salida
  }

  // ===== ESTILOS POR TIPO (Colores RAS) =====
  const typeConfig = {
    success: {
      bg: 'bg-green-500',
      border: 'border-green-600',
      progressBar: 'bg-green-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    error: {
      bg: 'bg-red-500',
      border: 'border-red-600',
      progressBar: 'bg-red-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-yellow-500',
      border: 'border-yellow-600',
      progressBar: 'bg-yellow-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-ras-turquesa',
      border: 'border-ras-azul',
      progressBar: 'bg-ras-azul/30',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  const config = typeConfig[toast.type]

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`
        ${config.bg} ${config.border}
        relative overflow-hidden
        rounded-xl shadow-2xl border-2
        min-w-[340px] max-w-md
        text-white font-roboto
        transition-all duration-300 ease-out
        ${isExiting 
          ? 'opacity-0 translate-x-full scale-95' 
          : 'opacity-100 translate-x-0 scale-100'
        }
      `}
      style={{
        animation: isExiting ? 'none' : 'slideIn 0.3s ease-out'
      }}
    >
      {/* Contenido Principal */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className="flex-shrink-0 mt-0.5">
            {config.icon}
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            {/* Título (opcional) */}
            {toast.title && (
              <h4 className="font-bold text-base mb-1 font-poppins">
                {toast.title}
              </h4>
            )}
            
            {/* Mensaje */}
            <p className="text-sm leading-relaxed break-words">
              {toast.message}
            </p>

            {/* Botón de Acción (opcional) */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick()
                  handleDismiss()
                }}
                className="
                  mt-3 px-4 py-2 rounded-lg text-sm font-semibold
                  bg-white text-gray-900
                  hover:bg-white/90
                  transition-all duration-200
                  shadow-md hover:shadow-lg
                  transform hover:scale-105
                "
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Botón Cerrar */}
          {toast.dismissible !== false && (
            <button
              onClick={handleDismiss}
              className="
                flex-shrink-0 
                hover:bg-white/20 active:bg-white/30
                rounded-full p-1.5 
                transition-all duration-200
                transform hover:scale-110
              "
              aria-label="Cerrar notificación"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Progreso */}
      {toast.duration > 0 && (
        <div className={`h-1 ${config.progressBar}`}>
          <div
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

