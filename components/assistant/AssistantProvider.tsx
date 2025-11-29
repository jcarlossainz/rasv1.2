'use client'

/**
 * Provider del Asistente IA de Ohana
 * Maneja el estado global del chat y escucha eventos para abrirlo
 */

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AssistantChat } from './AssistantChat'
import { useAuth } from '@/hooks/useAuth'

// Configuración de avatares (mismo que en topbar y perfil)
const AVATARES = [
  { id: 'ballena', src: '/avatars_logo/Ballena.png', label: 'Ballena' },
  { id: 'estrella', src: '/avatars_logo/Estrella.png', label: 'Estrella' },
  { id: 'foca', src: '/avatars_logo/Foca.png', label: 'Foca' },
  { id: 'pez', src: '/avatars_logo/Pez.png', label: 'Pez' },
  { id: 'pulpo', src: '/avatars_logo/Pulpo.png', label: 'Pulpo' },
]

interface AssistantProviderProps {
  children: React.ReactNode
}

export function AssistantProvider({ children }: AssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  // Obtener avatar del usuario
  const avatarId = user?.avatar_url || null
  const avatar = AVATARES.find(a => a.id === avatarId)

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
            avatarSrc={avatar?.src}
            avatarLabel={avatar?.label}
          />
        )}
      </AnimatePresence>
    </>
  )
}
