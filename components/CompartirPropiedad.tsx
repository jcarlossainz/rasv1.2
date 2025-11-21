'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Modal from '@/components/ui/modal'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'

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
  const [emailColaborador, setEmailColaborador] = useState('')
  const [rolSeleccionado, setRolSeleccionado] = useState<'supervisor' | 'propietario' | 'promotor'>('supervisor')
  const [agregando, setAgregando] = useState(false)
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

      console.log(`✅ Colaboradores cargados: ${colaboradoresConDatos.length} (activos + pendientes)`)
      setColaboradores(colaboradoresConDatos)
    } catch (error) {
      console.error('Error al cargar colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  const agregarColaborador = async (e: React.FormEvent) => {
    e.preventDefault()
    setAgregando(true)

    try {
      const emailBuscar = emailColaborador.trim().toLowerCase()

      // Validar que no sea el mismo usuario
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.email?.toLowerCase() === emailBuscar) {
        toast.error('No puedes agregarte a ti mismo')
        setAgregando(false)
        return
      }

      // Buscar si el usuario ya está registrado
      const { data: perfilData } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', emailBuscar)
        .maybeSingle() // maybeSingle permite que no exista sin error

      let dataToInsert: any = {
        propiedad_id: propiedadId,
        rol: rolSeleccionado
      }

      if (perfilData) {
        // ✅ Usuario registrado: usar user_id
        dataToInsert.user_id = perfilData.id
      } else {
        // ✅ Usuario NO registrado: usar email_invitado (invitación abierta)
        dataToInsert.email_invitado = emailBuscar
      }

      // Agregar colaborador o invitación
      const { error: insertError } = await supabase
        .from('propiedades_colaboradores')
        .insert(dataToInsert)

      if (insertError) {
        if (insertError.code === '23505') {
          toast.warning('Este email ya fue invitado o ya es colaborador')
        } else {
          toast.error('Error: ' + insertError.message)
        }
        setAgregando(false)
      } else {
        setEmailColaborador('')
        if (perfilData) {
          toast.success('Colaborador agregado correctamente')
        } else {
          toast.success('Invitación enviada. El usuario tendrá acceso cuando se registre.')
        }
        // Recargar colaboradores después de agregar
        await cargarColaboradores()
        setAgregando(false)
      }
    } catch (err) {
      toast.error('Error: ' + (err as Error).message)
    } finally {
      setAgregando(false)
    }
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
          <h3 className="text-xl font-semibold mb-4 font-poppins text-gray-800">
            Colaboradores
          </h3>

          {/* Formulario agregar colaborador */}
          <form onSubmit={agregarColaborador} className="mb-6">
            <div className="flex gap-2 mb-3">
              <Input
                type="email"
                value={emailColaborador}
                onChange={(e) => setEmailColaborador(e.target.value)}
                placeholder="Email del colaborador"
                required
                className="flex-1"
              />
              <select
                value={rolSeleccionado}
                onChange={(e) => setRolSeleccionado(e.target.value as 'supervisor' | 'propietario' | 'promotor')}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto"
              >
                <option value="supervisor">Supervisor</option>
                <option value="propietario">Propietario</option>
                <option value="promotor">Promotor</option>
              </select>
              <Button type="submit" disabled={agregando} size="md">
                {agregando ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 font-roboto">
              💡 Puedes invitar cualquier email. Si aún no está registrado, tendrá acceso automáticamente cuando se registre.
            </p>
          </form>

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
                      {colab.esPendiente && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          Invitación pendiente
                        </span>
                      )}
                    </div>
                    {colab.full_name && (
                      <div className="text-sm text-gray-500 font-roboto">
                        {colab.full_name}
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
    </Modal>
  )
}