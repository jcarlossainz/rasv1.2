'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FloatingCTAProps {
  whatsappNumber?: string
  whatsappMessage: string
  email?: string
  emailSubject: string
  emailBody: string
  propertyTitle: string
}

/**
 * FloatingCTA - Botón flotante multi-acción (WhatsApp, Email, Llamar)
 * Diseño Apple-style con menú expandible
 */
export default function FloatingCTA({
  whatsappNumber,
  whatsappMessage,
  email,
  emailSubject,
  emailBody,
  propertyTitle
}: FloatingCTAProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleWhatsApp = () => {
    if (!whatsappNumber) return
    const numero = whatsappNumber.replace(/\D/g, '')
    const mensaje = encodeURIComponent(whatsappMessage)
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank')
  }

  const handleEmail = () => {
    if (!email) return
    const asunto = encodeURIComponent(emailSubject)
    const cuerpo = encodeURIComponent(emailBody)
    window.location.href = `mailto:${email}?subject=${asunto}&body=${cuerpo}`
  }

  const handleCall = () => {
    if (!whatsappNumber) return
    window.location.href = `tel:${whatsappNumber}`
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: propertyTitle,
          text: whatsappMessage,
          url: window.location.href
        })
      } catch {
        // Share dialog was dismissed
      }
    } else {
      // Copiar URL al portapapeles
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado al portapapeles')
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden min-w-[200px]"
          >
            {whatsappNumber && (
              <button
                onClick={handleWhatsApp}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-green-50 transition-colors border-b border-gray-100"
              >
                <span className="text-2xl">💬</span>
                <span className="font-semibold text-gray-900">WhatsApp</span>
              </button>
            )}

            {email && (
              <button
                onClick={handleEmail}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-100"
              >
                <span className="text-2xl">📧</span>
                <span className="font-semibold text-gray-900">Email</span>
              </button>
            )}

            {whatsappNumber && (
              <button
                onClick={handleCall}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-purple-50 transition-colors border-b border-gray-100"
              >
                <span className="text-2xl">📞</span>
                <span className="font-semibold text-gray-900">Llamar</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">↗️</span>
              <span className="font-semibold text-gray-900">Compartir</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón principal */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-16 h-16 rounded-full
          bg-gradient-to-r from-ras-turquesa to-ras-azul
          text-white text-2xl
          shadow-2xl
          flex items-center justify-center
          transition-transform
        "
      >
        {isOpen ? '✕' : '💬'}
      </motion.button>
    </div>
  )
}
