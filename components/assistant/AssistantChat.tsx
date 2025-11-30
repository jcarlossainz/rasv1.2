'use client'

/**
 * Componente de Chat del Asistente IA de Ohana
 * Diseño moderno estilo AI Assistant
 */

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Sparkles, X, Minus, RotateCcw, ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  // Auto-resize del textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [inputValue])

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
          userId,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
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

  // Estado minimizado - botón flotante elegante
  if (mode === 'floating' && isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsMinimized(false)}
        className="fixed top-20 right-4 z-50 group"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/30">
            {avatarSrc ? (
              <img src={avatarSrc} alt={avatarLabel || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
        </div>
      </motion.button>
    )
  }

  const containerClasses = mode === 'floating'
    ? 'fixed top-20 right-4 w-[420px] max-h-[600px] z-50'
    : 'w-full h-full'

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: -10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={containerClasses}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 border border-gray-200/50 flex flex-col overflow-hidden h-full">
        {/* Header minimalista */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={avatarLabel || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Ohana Assistant</h3>
              <p className="text-xs text-gray-500">Siempre disponible</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                title="Nueva conversación"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            {mode === 'floating' && (
              <>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                  title="Minimizar"
                >
                  <Minus className="w-4 h-4" />
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 min-h-[300px] max-h-[400px] scroll-smooth">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-full py-8"
              >
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">¿En qué puedo ayudarte?</h4>
                <p className="text-sm text-gray-500 text-center mb-6 max-w-xs">
                  Pregúntame sobre tus propiedades, finanzas, tickets o cualquier cosa relacionada con Ohana.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  <QuickAction
                    text="¿Cuántas propiedades tengo?"
                    onClick={() => setInputValue('¿Cuántas propiedades tengo?')}
                  />
                  <QuickAction
                    text="Ver tickets pendientes"
                    onClick={() => setInputValue('Muéstrame los tickets pendientes')}
                  />
                  <QuickAction
                    text="Resumen financiero"
                    onClick={() => setInputValue('Dame el resumen financiero de este mes')}
                  />
                </div>
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  avatarSrc={avatarSrc}
                  isLast={index === messages.length - 1}
                />
              ))
            )}
          </AnimatePresence>

          {/* Indicador de carga */}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1 py-3">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 rounded-2xl p-4"
            >
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={handleClearChat}
                className="text-xs text-red-500 hover:text-red-700 mt-2 underline"
              >
                Reiniciar conversación
              </button>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area - Diseño moderno */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-100 transition-all">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                rows={1}
                className="flex-1 px-4 py-3 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none max-h-[120px]"
                disabled={isLoading}
              />
              <div className="p-2">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
                    title="Detener"
                  >
                    <X className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="p-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm disabled:shadow-none"
                    title="Enviar"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </form>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Powered by Claude AI
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Componente de mensaje individual
function MessageItem({ message, avatarSrc, isLast }: { message: Message; avatarSrc?: string | null; isLast: boolean }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
          isUser
            ? 'bg-gray-100'
            : 'bg-gradient-to-br from-violet-500 to-indigo-600'
        }`}
      >
        {isUser ? (
          <span className="text-xs font-medium text-gray-600">Tú</span>
        ) : avatarSrc ? (
          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Contenido del mensaje */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-tr-md'
              : 'bg-gray-100 text-gray-800 rounded-tl-md'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content || '...'}</div>
        </div>
      </div>
    </motion.div>
  )
}

// Botón de acción rápida
function QuickAction({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-sm text-left text-gray-700 bg-white hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-all border border-gray-200 hover:border-purple-200 shadow-sm hover:shadow"
    >
      {text}
    </motion.button>
  )
}

// Botón flotante para abrir el chat
export function AssistantButton({ onClick, avatarSrc }: { onClick: () => void; avatarSrc?: string | null }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed top-20 right-4 z-50 group"
    >
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/30">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
      </div>
    </motion.button>
  )
}
