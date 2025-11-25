'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import CompartirPropiedad from '@/components/CompartirPropiedad'
import ConfigurarCalendarioModal from '@/components/ConfigurarCalendarioModal'

// ⚡ LAZY LOADING: Modal pesado solo se carga cuando se necesita
const WizardModal = lazy(() => import('@/app/dashboard/catalogo/nueva/components/WizardModal'))

interface PropiedadData {
  id: string
  owner_id: string
  nombre_propiedad: string
  created_at: string
  updated_at: string
}

interface Colaborador {
  id: string
  email: string
  pendiente: boolean
  rol?: string
}

export default function ConfigPropiedad() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const confirm = useConfirm()
  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadData | null>(null)
  const [user, setUser] = useState<any>(null)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [esAdmin, setEsAdmin] = useState(false)

  // Estados para modales
  const [showCompartir, setShowCompartir] = useState(false)
  const [showDuplicarModal, setShowDuplicarModal] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [showCalendarioModal, setShowCalendarioModal] = useState(false)
  const [nombreDuplicado, setNombreDuplicado] = useState('')
  const [duplicando, setDuplicando] = useState(false)

  useEffect(() => {
    checkUserAndLoad()
  }, [])

  const checkUserAndLoad = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser({ ...profile, id: authUser.id })

      // Cargar propiedad
      const { data: propData, error } = await supabase
        .from('propiedades')
        .select('id, owner_id, nombre_propiedad, created_at, updated_at')
        .eq('id', propiedadId)
        .single()

      if (error || !propData) {
        toast.error('Propiedad no encontrada')
        router.push('/dashboard/catalogo')
        return
      }

      // Verificar si es el administrador (owner_id)
      if (propData.owner_id !== authUser.id) {
        toast.error('No tienes permisos para acceder a esta sección')
        router.push(`/dashboard/catalogo/propiedad/${propiedadId}/home`)
        return
      }

      setEsAdmin(true)
      setPropiedad(propData)

      // Cargar colaboradores
      const { data: colabData } = await supabase
        .from('propiedades_colaboradores')
        .select('id, user_id, email_invitado, rol')
        .eq('propiedad_id', propiedadId)

      if (colabData && colabData.length > 0) {
        const colaboradoresConDatos = await Promise.all(
          colabData.map(async (colab: any) => {
            if (colab.user_id) {
              const { data: perfil } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', colab.user_id)
                .maybeSingle()

              return {
                id: colab.id,
                email: perfil?.email || colab.email_invitado || 'Sin email',
                pendiente: false,
                rol: colab.rol
              }
            } else {
              return {
                id: colab.id,
                email: colab.email_invitado || 'Sin email',
                pendiente: true,
                rol: colab.rol
              }
            }
          })
        )
        setColaboradores(colaboradoresConDatos)
      }

    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirm.warning(
      '¿Estás seguro que deseas cerrar sesión?',
      'Se cerrará tu sesión actual'
    )

    if (!confirmed) return

    await supabase.auth.signOut()
    router.push('/login')
  }

  const editarPropiedad = () => {
    setShowEditarModal(true)
  }

  const duplicarPropiedad = async () => {
    if (!nombreDuplicado.trim()) {
      toast.error('Ingresa un nombre para la nueva propiedad')
      return
    }

    setDuplicando(true)
    try {
      // Obtener datos completos de la propiedad para duplicar
      const { data: propCompleta, error: fetchError } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', propiedadId)
        .single()

      if (fetchError || !propCompleta) {
        throw new Error('No se pudo obtener los datos de la propiedad')
      }

      // Duplicar la propiedad
      const { data: nuevaPropiedad, error } = await supabase
        .from('propiedades')
        .insert({
          ...propCompleta,
          id: undefined,
          nombre_propiedad: nombreDuplicado,
          created_at: undefined,
          updated_at: undefined
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Propiedad duplicada correctamente')
      setShowDuplicarModal(false)
      setNombreDuplicado('')
      router.push(`/dashboard/catalogo/propiedad/${nuevaPropiedad.id}/home`)
    } catch (error: any) {
      logger.error('Error al duplicar propiedad:', error)
      toast.error('Error al duplicar la propiedad')
    } finally {
      setDuplicando(false)
    }
  }

  const eliminarPropiedad = async () => {
    const confirmed = await confirm.danger(
      '¿Eliminar esta propiedad?',
      'Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('propiedades')
        .delete()
        .eq('id', propiedadId)

      if (error) throw error

      toast.success('Propiedad eliminada correctamente')
      router.push('/dashboard/catalogo')
    } catch (error: any) {
      logger.error('Error al eliminar propiedad:', error)
      toast.error('Error al eliminar la propiedad')
    }
  }

  if (loading) {
    return <Loading />
  }

  if (!propiedad || !esAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title="Configuración"
        showHomeButton={true}
        showBackButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuración de Propiedad</h1>
              <p className="text-gray-600">{propiedad.nombre_propiedad}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Acciones de Propiedad */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Acciones</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => setShowCompartir(true)}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Compartir</span>
              </button>

              <button
                onClick={editarPropiedad}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar</span>
              </button>

              <button
                onClick={() => setShowDuplicarModal(true)}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <span>Duplicar</span>
              </button>

              <button
                onClick={() => setShowCalendarioModal(true)}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Calendarios</span>
              </button>

              <button
                onClick={eliminarPropiedad}
                className="col-span-2 md:col-span-1 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border-2 border-red-200 flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                <span>Eliminar</span>
              </button>
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Información del Sistema</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 font-medium block mb-1">ID de Propiedad</span>
                <p className="text-gray-900 font-mono text-sm break-all">{propiedad.id}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 font-medium block mb-1">Fecha de Creación</span>
                <p className="text-gray-900 font-semibold">
                  {new Date(propiedad.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 font-medium block mb-1">Última Actualización</span>
                <p className="text-gray-900 font-semibold">
                  {new Date(propiedad.updated_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Colaboradores */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Colaboradores</h2>
              <span className="ml-auto px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                {colaboradores.length} {colaboradores.length === 1 ? 'colaborador' : 'colaboradores'}
              </span>
            </div>

            {colaboradores.length > 0 ? (
              <div className="space-y-3">
                {colaboradores.map((colab) => (
                  <div
                    key={colab.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      colab.pendiente
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        colab.pendiente ? 'bg-yellow-200' : 'bg-blue-200'
                      }`}>
                        <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{colab.email}</p>
                        <p className="text-sm text-gray-500 capitalize">{colab.rol || 'Sin rol'}</p>
                      </div>
                    </div>
                    {colab.pendiente && (
                      <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay colaboradores asignados</p>
            )}
          </div>
        </div>
      </main>

      {/* Modal Compartir */}
      {showCompartir && (
        <CompartirPropiedad
          isOpen={showCompartir}
          onClose={async () => {
            setShowCompartir(false)
            await checkUserAndLoad()
          }}
          propiedadId={propiedadId}
          propiedadNombre={propiedad.nombre_propiedad}
          userId={user.id}
          esPropio={true}
        />
      )}

      {/* Modal Duplicar */}
      {showDuplicarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Duplicar Propiedad</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la nueva propiedad
              </label>
              <input
                type="text"
                value={nombreDuplicado}
                onChange={(e) => setNombreDuplicado(e.target.value)}
                placeholder={`Copia de ${propiedad.nombre_propiedad}`}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDuplicarModal(false)
                  setNombreDuplicado('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={duplicando}
              >
                Cancelar
              </button>
              <button
                onClick={duplicarPropiedad}
                disabled={duplicando || !nombreDuplicado.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {duplicando ? 'Duplicando...' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar - Wizard en modo edición */}
      {showEditarModal && (
        <Suspense fallback={<Loading />}>
          <WizardModal
            key={`edit-wizard-${propiedadId}`}
            isOpen={showEditarModal}
            onClose={() => setShowEditarModal(false)}
            mode="edit"
            propertyId={propiedadId}
            onComplete={async () => {
              setShowEditarModal(false)
              toast.success('Propiedad actualizada correctamente')
              await checkUserAndLoad()
            }}
          />
        </Suspense>
      )}

      {/* Modal Calendario */}
      {showCalendarioModal && (
        <ConfigurarCalendarioModal
          isOpen={showCalendarioModal}
          onClose={() => setShowCalendarioModal(false)}
          propiedadId={propiedadId}
          propiedadNombre={propiedad.nombre_propiedad}
        />
      )}
    </div>
  )
}
