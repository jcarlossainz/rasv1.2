'use client'

import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
}

interface ToastOptions {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export function useNotification() {
  // Estado para ConfirmModal
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '¿Estás seguro?',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning' as 'danger' | 'warning' | 'info' | 'success',
    onConfirm: () => {},
    loading: false
  })

  // Estado para Toast
  const [toastState, setToastState] = useState({
    show: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info' | 'warning',
    duration: 3000
  })

  // Función para mostrar confirmación
  const showConfirm = useCallback((
    options: ConfirmOptions,
    onConfirm: () => void | Promise<void>
  ) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || '¿Estás seguro?',
        message: options.message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'warning',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, loading: true }))
          try {
            await onConfirm()
            resolve(true)
          } catch (error) {
            resolve(false)
          } finally {
            setConfirmState(prev => ({ ...prev, isOpen: false, loading: false }))
          }
        },
        loading: false
      })
    })
  }, [])

  // Función para cerrar confirmación
  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Función para mostrar toast
  const showToast = useCallback((options: ToastOptions) => {
    setToastState({
      show: true,
      message: options.message,
      type: options.type || 'success',
      duration: options.duration || 3000
    })
  }, [])

  // Funciones de ayuda para toasts comunes
  const success = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration })
  }, [showToast])

  const error = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration })
  }, [showToast])

  const warning = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'warning', duration })
  }, [showToast])

  const info = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration })
  }, [showToast])

  // Función para cerrar toast
  const closeToast = useCallback(() => {
    setToastState(prev => ({ ...prev, show: false }))
  }, [])

  return {
    // Estados
    confirmState,
    toastState,
    
    // Funciones de confirmación
    showConfirm,
    closeConfirm,
    
    // Funciones de toast
    showToast,
    success,
    error,
    warning,
    info,
    closeToast
  }
}