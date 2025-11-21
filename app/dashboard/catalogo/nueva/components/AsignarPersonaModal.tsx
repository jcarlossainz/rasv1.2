'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'

interface AsignarPersonaModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (userId: string) => void
  tipo: 'Propietario' | 'Supervisor'
}

interface Profile {
  id: string
  nombre: string
  email: string
  rol: string
}

export default function AsignarPersonaModal({
  isOpen,
  onClose,
  onSelect,
  tipo
}: AsignarPersonaModalProps) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const toast = useToast()

  useEffect(() => {
    if (isOpen) {
      cargarProfiles()
    }
  }, [isOpen])

  const cargarProfiles = async () => {
    try {
      setLoading(true)

      if (!user) return

      // Cargar todos los profiles de la empresa (mismo user_id o empresa_id)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, rol')
        .order('nombre')

      if (error) throw error

      setProfiles(data || [])
      logger.log('Profiles cargados:', data?.length || 0)
    } catch (error) {
      logger.error('Error al cargar profiles:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (profileId: string) => {
    onSelect(profileId)
    onClose()
  }

  const profilesFiltrados = profiles.filter(profile =>
    profile.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    profile.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-ras-azul to-ras-turquesa px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {tipo === 'Propietario' ? '🏠' : '👤'} Asignar {tipo}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-ras-azul focus:outline-none transition-colors"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>

        {/* Lista de profiles */}
        <div className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-ras-azul border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : profilesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <p className="font-semibold">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {profilesFiltrados.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelect(profile.id)}
                  className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-ras-azul to-ras-turquesa rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {profile.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{profile.nombre}</div>
                    <div className="text-sm text-gray-500">{profile.email}</div>
                    {profile.rol && (
                      <span className="inline-block mt-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {profile.rol}
                      </span>
                    )}
                  </div>
                  <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}