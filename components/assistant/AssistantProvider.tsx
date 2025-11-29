'use client'

/**
 * Provider del Asistente IA de Ohana
 * Maneja el estado global del chat y escucha eventos para abrirlo
 */

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AssistantChat } from './AssistantChat'

interface AssistantProviderProps {
  children: React.ReactNode
}

export function AssistantProvider({ children }: AssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Escuchar evento para abrir el asistente desde el TopBar
  useEffect(() => {
    const handleOpenAssistant = () => {
      setIsOpen(true)
    }

    window.addEventListener('openAssistant', handleOpenAssistant)

    return () => {
      window.removeEventListener('openAssistant', handleOpenAssistant)
    }
  }, [])

  return (
    <>
      {children}

      {/* Chat flotante del asistente */}
      <AnimatePresence>
        {isOpen && (
          <AssistantChat
            mode="floating"
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
