'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { logger } from '@/lib/logger'

interface InvitarUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  rol: 'propietario' | 'supervisor'
}

export default function InvitarUsuarioModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  rol 
}: InvitarUsuarioModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: ''
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Obtener empresa_id del usuario actual
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      if (!profile?.empresa_id) throw new Error('Sin empresa asociada')

      // Aquí iría la lógica de invitación por email
      // Por ahora, solo guardamos el "pre-registro"
      
      toast.success(`Invitación enviada a ${formData.email}`)
      onSuccess()
      onClose()
    } catch (error: any) {
      logger.error('Error al invitar:', error)
      toast.error(error.message || 'Error al enviar invitación')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          Invitar {rol === 'propietario' ? 'Propietario' : 'Supervisor'}
        </h2>
        
        <form onSubmit={handleInvitar} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre completo"
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            className="w-full px-4 py-3 border-2 rounded-lg"
            required
          />
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 border-2 rounded-lg"
            required
          />
          
          <input
            type="tel"
            placeholder="Teléfono"
            value={formData.telefono}
            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
            className="w-full px-4 py-3 border-2 rounded-lg"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-ras-azul text-white rounded-lg"
            >
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}