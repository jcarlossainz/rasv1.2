'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { logger } from '@/lib/logger'

interface ConfigurarCalendarioModalProps {
  isOpen: boolean
  onClose: () => void
  propiedadId: string
  propiedadNombre: string
}

interface CalendarUrls {
  ical_airbnb_url: string | null
  ical_booking_url: string | null
  ical_expedia_url: string | null
  ultimo_sync_ical: string | null
}

export default function ConfigurarCalendarioModal({
  isOpen,
  onClose,
  propiedadId,
  propiedadNombre
}: ConfigurarCalendarioModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [urls, setUrls] = useState<CalendarUrls>({
    ical_airbnb_url: null,
    ical_booking_url: null,
    ical_expedia_url: null,
    ultimo_sync_ical: null
  })

  useEffect(() => {
    if (isOpen) {
      cargarUrls()
    }
  }, [isOpen, propiedadId])

  const cargarUrls = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('propiedades')
        .select('ical_airbnb_url, ical_booking_url, ical_expedia_url, ultimo_sync_ical')
        .eq('id', propiedadId)
        .single()

      if (error) throw error

      if (data) {
        setUrls({
          ical_airbnb_url: data.ical_airbnb_url || '',
          ical_booking_url: data.ical_booking_url || '',
          ical_expedia_url: data.ical_expedia_url || '',
          ultimo_sync_ical: data.ultimo_sync_ical
        })
      }
    } catch (error: any) {
      logger.error('Error al cargar URLs de calendarios:', error)
      toast.error('Error al cargar configuración de calendarios')
    } finally {
      setLoading(false)
    }
  }

  const guardarUrls = async () => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('propiedades')
        .update({
          ical_airbnb_url: urls.ical_airbnb_url || null,
          ical_booking_url: urls.ical_booking_url || null,
          ical_expedia_url: urls.ical_expedia_url || null
        })
        .eq('id', propiedadId)

      if (error) throw error

      toast.success('URLs de calendarios guardadas correctamente')
      onClose()
    } catch (error: any) {
      logger.error('Error al guardar URLs:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setLoading(false)
    }
  }

  const sincronizarAhora = async () => {
    try {
      setSyncing(true)
      toast.info('Sincronizando calendarios...')

      // TODO: Implementar endpoint de sincronización
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propiedadId })
      })

      if (!response.ok) {
        throw new Error('Error en la sincronización')
      }

      const result = await response.json()

      toast.success(`Sincronización completada: ${result.events || 0} eventos importados`)

      // Recargar datos para actualizar último sync
      await cargarUrls()
    } catch (error: any) {
      logger.error('Error al sincronizar:', error)
      toast.error('Error al sincronizar calendarios. Endpoint no implementado aún.')
    } finally {
      setSyncing(false)
    }
  }

  const validarUrl = (url: string): boolean => {
    if (!url) return true // Vacío es válido
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const isValidForm = (): boolean => {
    const airbnbValid = validarUrl(urls.ical_airbnb_url || '')
    const bookingValid = validarUrl(urls.ical_booking_url || '')
    const expediaValid = validarUrl(urls.ical_expedia_url || '')
    return airbnbValid && bookingValid && expediaValid
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Configurar Calendarios</h2>
              <p className="text-sm text-gray-600 mt-1">{propiedadNombre}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading || syncing}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Última sincronización */}
          {urls.ultimo_sync_ical && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-900">
                  Última sincronización: {new Date(urls.ultimo_sync_ical).toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Instrucciones */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-2">¿Cómo encontrar las URLs de iCal?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Airbnb:</strong> Panel de anfitrión → Calendario → Exportar calendario</li>
                  <li><strong>Booking.com:</strong> Extranet → Calendario → Sincronización de calendario</li>
                  <li><strong>Expedia:</strong> Partner Central → Calendario → Exportar iCal</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Airbnb URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xs font-bold">A</span>
              </div>
              URL de Airbnb (iCal)
            </label>
            <input
              type="url"
              value={urls.ical_airbnb_url || ''}
              onChange={(e) => setUrls({ ...urls, ical_airbnb_url: e.target.value })}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                urls.ical_airbnb_url && !validarUrl(urls.ical_airbnb_url)
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={loading || syncing}
            />
            {urls.ical_airbnb_url && !validarUrl(urls.ical_airbnb_url) && (
              <p className="text-xs text-red-600 mt-1">URL inválida</p>
            )}
          </div>

          {/* Booking.com URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">B</span>
              </div>
              URL de Booking.com (iCal)
            </label>
            <input
              type="url"
              value={urls.ical_booking_url || ''}
              onChange={(e) => setUrls({ ...urls, ical_booking_url: e.target.value })}
              placeholder="https://admin.booking.com/hotel/hoteladmin/ical/..."
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                urls.ical_booking_url && !validarUrl(urls.ical_booking_url)
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={loading || syncing}
            />
            {urls.ical_booking_url && !validarUrl(urls.ical_booking_url) && (
              <p className="text-xs text-red-600 mt-1">URL inválida</p>
            )}
          </div>

          {/* Expedia URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <div className="w-6 h-6 rounded bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 text-xs font-bold">E</span>
              </div>
              URL de Expedia (iCal)
            </label>
            <input
              type="url"
              value={urls.ical_expedia_url || ''}
              onChange={(e) => setUrls({ ...urls, ical_expedia_url: e.target.value })}
              placeholder="https://www.expedia.com/icalendar/..."
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                urls.ical_expedia_url && !validarUrl(urls.ical_expedia_url)
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={loading || syncing}
            />
            {urls.ical_expedia_url && !validarUrl(urls.ical_expedia_url) && (
              <p className="text-xs text-red-600 mt-1">URL inválida</p>
            )}
          </div>

          {/* Info sobre sincronización */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Sincronización automática</p>
                <p>Los calendarios se sincronizan automáticamente cada 4 horas. También puedes sincronizar manualmente usando el botón "Sincronizar ahora".</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium border-2 border-gray-300"
              disabled={loading || syncing}
            >
              Cancelar
            </button>

            <button
              onClick={sincronizarAhora}
              disabled={loading || syncing || !isValidForm()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>

            <button
              onClick={guardarUrls}
              disabled={loading || syncing || !isValidForm()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
