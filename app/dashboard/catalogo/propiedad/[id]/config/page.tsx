'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'

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
  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadData | null>(null)
  const [user, setUser] = useState<any>(null)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [esAdmin, setEsAdmin] = useState(false)

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
    await supabase.auth.signOut()
    router.push('/login')
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

          {/* Acciones Administrativas */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Zona de Peligro</h2>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 mb-3">
                Las acciones en esta sección son irreversibles. Procede con precaución.
              </p>
              <button
                onClick={() => router.push(`/dashboard/catalogo/propiedad/${propiedadId}/home`)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Para eliminar esta propiedad, ve a la página principal →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
