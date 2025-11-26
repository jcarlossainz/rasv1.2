'use client'

/**
 * MODAL NUEVA RESERVACIÓN
 * Modal para crear reservaciones manuales en el calendario
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'

interface NuevaReservacionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  propiedadId: string
  propiedadNombre: string
}

export default function NuevaReservacionModal({
  isOpen,
  onClose,
  onSuccess,
  propiedadId,
  propiedadNombre
}: NuevaReservacionModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [estado, setEstado] = useState<'reservado' | 'bloqueado'>('reservado')
  const [notas, setNotas] = useState('')

  const resetForm = () => {
    setTitulo('')
    setFechaInicio('')
    setFechaFin('')
    setEstado('reservado')
    setNotas('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!titulo.trim()) {
      toast.error('El título es requerido')
      return
    }
    if (!fechaInicio) {
      toast.error('La fecha de inicio es requerida')
      return
    }
    if (!fechaFin) {
      toast.error('La fecha de fin es requerida')
      return
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          propiedad_id: propiedadId,
          titulo: titulo.trim(),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          origen: 'manual',
          estado: estado,
          notas: notas.trim() || null
        })

      if (error) throw error

      toast.success('Reservación creada correctamente')
      resetForm()
      onSuccess()
    } catch (error: any) {
      console.error('Error creando reservación:', error)
      toast.error('Error al crear la reservación')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-pink-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Nueva Reservación</h2>
              <p className="text-sm text-white/90 mt-1">{propiedadNombre}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
              disabled={loading}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Título / Nombre del huésped *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Reserva Juan García"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-in *
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-out *
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de bloqueo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEstado('reservado')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  estado === 'reservado'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div className="text-left">
                    <div className="font-semibold">Reservado</div>
                    <div className="text-xs opacity-75">Huésped confirmado</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEstado('bloqueado')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  estado === 'bloqueado'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚫</span>
                  <div className="text-left">
                    <div className="font-semibold">Bloqueado</div>
                    <div className="text-xs opacity-75">Mantenimiento, uso personal</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Información adicional sobre la reservación..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Reservación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
