'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import ModalAgregarPersona from '@/components/ModalAgregarPersona'

interface CompartirPropiedadProps {
  isOpen: boolean
  onClose: () => void
  propiedadId: string
  propiedadNombre: string
  userId: string
  esPropio: boolean
}

interface Colaborador {
  id: string
  user_id: string | null
  email: string
  full_name?: string
  email_invitado?: string | null
  esPendiente?: boolean
}

export default function CompartirPropiedad({
  isOpen,
  onClose,
  propiedadId,
  propiedadNombre,
  userId,
  esPropio
}: CompartirPropiedadProps) {
  const toast = useToast()
  const confirm = useConfirm()

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [showModalAgregar, setShowModalAgregar] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && esPropio) {
      cargarColaboradores()
    }
  }, [isOpen, propiedadId, esPropio])

  const cargarColaboradores = async () => {
    setLoading(true)
    try {
      // ✅ Cargar colaboradores activos Y pendientes (con email_invitado)
      const { data, error } = await supabase
        .from('propiedades_colaboradores')
        .select(`
          id,
          user_id,
          email_invitado,
          profiles!user_id (
            email,
            full_name
          )
        `)
        .eq('propiedad_id', propiedadId)

      if (error) {
        console.error('Error al cargar colaboradores:', error)
        setLoading(false)
        return
      }

      // Transformar datos: colaboradores activos + invitaciones pendientes
      const colaboradoresConDatos = (data || []).map((colab: any) => {
        const esPendiente = !colab.user_id && colab.email_invitado

        return {
          id: colab.id,
          user_id: colab.user_id,
          email_invitado: colab.email_invitado,
          email: esPendiente ? colab.email_invitado : (colab.profiles?.email || 'Sin email'),
          full_name: colab.profiles?.full_name,
          esPendiente
        }
      })

      setColaboradores(colaboradoresConDatos)
    } catch (error) {
      console.error('Error al cargar colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  const agregarColaborador = async (email: string, rol: 'propietario' | 'supervisor' | 'promotor') => {
    const emailBuscar = email.trim().toLowerCase()

    // Validar que no sea el mismo usuario
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser?.email?.toLowerCase() === emailBuscar) {
      throw new Error('No puedes agregarte a ti mismo')
    }

    // Buscar si el usuario ya está registrado (case-insensitive)
    const { data: perfilData, error: perfilError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', emailBuscar)
      .maybeSingle()

    // 🔍 DEBUG: Log para diagnosticar búsqueda de perfil
    console.log('🔍 Búsqueda de perfil:', { emailBuscar, perfilData, perfilError })

    let dataToInsert: any = {
      propiedad_id: propiedadId,
      rol: rol
    }

    if (perfilData) {
      // ✅ Usuario registrado: usar user_id
      dataToInsert.user_id = perfilData.id
      console.log('✅ Usuario encontrado, insertando con user_id:', perfilData.id)
    } else {
      // ✅ Usuario NO registrado: usar email_invitado
      dataToInsert.email_invitado = emailBuscar
      console.log('⚠️ Usuario NO encontrado, insertando con email_invitado:', emailBuscar)
    }

    // Agregar colaborador o invitación
    const { data: insertData, error: insertError } = await supabase
      .from('propiedades_colaboradores')
      .insert(dataToInsert)
      .select()

    // 🔍 DEBUG: Log del resultado de inserción
    console.log('🔍 Resultado de inserción:', { dataToInsert, insertData, insertError })

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('Este email ya fue invitado o ya es colaborador')
      } else {
        throw new Error('Error: ' + insertError.message)
      }
    }

    if (perfilData) {
      toast.success('Colaborador agregado correctamente')
    } else {
      toast.success('Invitación enviada. El usuario tendrá acceso cuando se registre.')
    }

    // Recargar colaboradores
    await cargarColaboradores()
  }

  const eliminarColaborador = async (colaboradorId: string, emailColab: string) => {
    const confirmed = await confirm.warning(
      `¿Eliminar a ${emailColab}?`,
      'Esta persona perderá el acceso a esta propiedad'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('propiedades_colaboradores')
        .delete()
        .eq('id', colaboradorId)

      if (error) throw error

      toast.success('Colaborador eliminado correctamente')
      cargarColaboradores()
    } catch (err) {
      toast.error('Error al eliminar colaborador')
      console.error(err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <h2 className="text-3xl font-bold mb-2 font-poppins text-gray-800">
        {propiedadNombre}
      </h2>
      <p className="text-gray-500 mb-8 font-roboto">
        {esPropio ? '🏠 Tu propiedad' : '👥 Compartido contigo'}
      </p>

      {esPropio ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold font-poppins text-gray-800">
              Colaboradores
            </h3>
            <Button
              onClick={() => setShowModalAgregar(true)}
              size="md"
              className="flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Persona
            </Button>
          </div>

          {/* Lista de colaboradores */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : colaboradores.length > 0 ? (
            <div className="space-y-3">
              {colaboradores.map((colab) => (
                <div
                  key={colab.id}
                  className={`flex justify-between items-center p-4 rounded-xl border ${
                    colab.esPendiente
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 font-roboto">
                        {colab.email}
                      </span>
                      {colab.esPendiente ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          Invitación pendiente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Activo
                        </span>
                      )}
                    </div>
                    {colab.full_name && (
                      <div className="text-sm text-gray-500 font-roboto">
                        {colab.full_name}
                      </div>
                    )}
                    {/* 🔍 DEBUG: Mostrar user_id para verificar */}
                    {colab.user_id && (
                      <div className="text-xs text-gray-400 font-mono mt-1">
                        ID: {colab.user_id.substring(0, 8)}...
                      </div>
                    )}
                    {colab.esPendiente && (
                      <div className="text-xs text-amber-600 mt-1 font-roboto">
                        Tendrá acceso cuando se registre en el sistema
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => eliminarColaborador(colab.id, colab.email)}
                    variant="danger"
                    size="sm"
                  >
                    {colab.esPendiente ? 'Cancelar' : 'Eliminar'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-roboto">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p>Aún no has agregado colaboradores</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 font-roboto">
          Esta propiedad fue compartida contigo por otro usuario.
        </div>
      )}

      <div className="mt-8">
        <Button onClick={onClose} variant="secondary" className="w-full">
          Cerrar
        </Button>
      </div>

      {/* Modal para agregar colaborador */}
      <ModalAgregarPersona
        isOpen={showModalAgregar}
        onClose={() => setShowModalAgregar(false)}
        onAgregar={agregarColaborador}
        mostrarPromotor={true}
      />
    </Modal>
  )
}