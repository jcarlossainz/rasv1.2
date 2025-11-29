'use client'

/**
 * Componente de Chat del Asistente IA de Ohana
 * Interfaz de usuario para interactuar con el asistente
 */

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, User, Loader2, X, Minimize2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AssistantChatProps {
  mode?: 'floating' | 'embedded'
  onClose?: () => void
  avatarSrc?: string | null
  avatarLabel?: string
  userId?: string
}

export function AssistantChat({ mode = 'floating', onClose, avatarSrc, avatarLabel, userId }: AssistantChatProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId, // Enviar el ID del usuario autenticado
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error del asistente')
      }

      // Leer el stream de respuesta
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      setMessages(prev => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          assistantContent += chunk

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: assistantContent }
                : m
            )
          )
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  // Contenedor del chat - POSICIÓN ARRIBA (top-20 para quedar bajo el topbar)
  const containerClasses = mode === 'floating'
    ? 'fixed top-20 right-4 w-96 max-h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50'
    : 'w-full h-full bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden'

  if (mode === 'floating' && isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed top-20 right-4 w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-50 overflow-hidden"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={avatarLabel || 'Avatar'} className="w-full h-full object-cover" />
        ) : (
          <User className="w-6 h-6" />
        )}
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: -20 }}
      className={containerClasses}
    >
      {/* Header - Colores neutros tipo topbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-white/20">
            {avatarSrc ? (
              <img src={avatarSrc} alt={avatarLabel || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Ohana Assistant</h3>
            <p className="text-xs text-white/70">Tu asistente de propiedades</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {mode === 'floating' && (
            <>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Minimizar"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[350px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 mb-3 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt={avatarLabel || 'Avatar'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-center">
              ¡Hola! Soy tu asistente de Ohana.<br />
              ¿En qué puedo ayudarte hoy?
            </p>
            <div className="mt-4 space-y-2 w-full max-w-xs">
              <SuggestionButton
                text="¿Cuántas propiedades tengo?"
                onClick={() => setInputValue('¿Cuántas propiedades tengo?')}
              />
              <SuggestionButton
                text="Ver tickets pendientes"
                onClick={() => setInputValue('Muéstrame los tickets pendientes')}
              />
              <SuggestionButton
                text="Resumen financiero del mes"
                onClick={() => setInputValue('Dame el resumen financiero de este mes')}
              />
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} avatarSrc={avatarSrc} />
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Pensando...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            <p>Error: {error}</p>
            <button
              onClick={handleClearChat}
              className="text-red-700 underline mt-1"
            >
              Limpiar chat
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors"
              title="Detener"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enviar"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>
    </motion.div>
  )
}

// Componente de burbuja de mensaje
function MessageBubble({ message, avatarSrc }: { message: Message; avatarSrc?: string | null }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
          isUser
            ? 'bg-gray-100 text-gray-600'
            : 'bg-slate-700 text-white'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : avatarSrc ? (
          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          isUser
            ? 'bg-gray-100 text-gray-800 rounded-tr-md'
            : 'bg-slate-100 text-gray-800 rounded-tl-md'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content || '...'}</div>
      </div>
    </motion.div>
  )
}

// Botón de sugerencia
function SuggestionButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 text-xs text-left text-gray-600 bg-gray-50 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors border border-gray-100"
    >
      {text}
    </button>
  )
}

// Botón flotante para abrir el chat (exportado por si se necesita)
export function AssistantButton({ onClick, avatarSrc }: { onClick: () => void; avatarSrc?: string | null }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed top-20 right-4 w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-50 overflow-hidden"
    >
      {avatarSrc ? (
        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <User className="w-6 h-6" />
      )}
    </motion.button>
  )
}
