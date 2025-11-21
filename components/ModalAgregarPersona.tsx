'use client'

import { useState } from 'react'

interface ModalAgregarPersonaProps {
  isOpen: boolean
  onClose: () => void
  onAgregar: (email: string, rol: 'propietario' | 'supervisor' | 'promotor' | 'inquilino') => void
  mostrarPromotor?: boolean // Para controlar si mostrar opción promotor (wizard no lo muestra)
  mostrarInquilino?: boolean // Para controlar si mostrar opción inquilino
  rolFijo?: 'propietario' | 'supervisor' | 'promotor' | 'inquilino' // Si se pasa, el rol queda fijo y no se puede cambiar
}

export default function ModalAgregarPersona({
  isOpen,
  onClose,
  onAgregar,
  mostrarPromotor = false,
  mostrarInquilino = false,
  rolFijo
}: ModalAgregarPersonaProps) {
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<'propietario' | 'supervisor' | 'promotor' | 'inquilino'>(
    rolFijo || 'propietario'
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validar que el campo no esté vacío
    if (!email.trim()) {
      setError('Por favor ingresa un correo')
      return
    }

    setLoading(true)
    try {
      await onAgregar(email, rol)
      setEmail('')
      setRol('propietario')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al agregar persona')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-8">
      <div className="bg-white rounded-t-2xl shadow-xl p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            👤 Agregar Persona
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent"
              required
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rol
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as 'propietario' | 'supervisor' | 'promotor' | 'inquilino')}
              disabled={!!rolFijo}
              className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto ${
                rolFijo ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="propietario">Propietario</option>
              <option value="supervisor">Supervisor</option>
              {mostrarPromotor && <option value="promotor">Promotor</option>}
              {mostrarInquilino && <option value="inquilino">Inquilino</option>}
            </select>
            {rolFijo && (
              <p className="text-xs text-gray-500 mt-1">Este rol no se puede cambiar</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
