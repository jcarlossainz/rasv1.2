'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'

// Email del propietario del sistema
const OWNER_EMAIL = 'juancarlossainzn@gmail.com'

interface UserWithProperties {
  id: string
  email: string
  full_name: string | null
  created_at: string
  propiedades: {
    id: string
    nombre: string
  }[]
  total_propiedades: number
}

export default function OhanaAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  const [loadingData, setLoadingData] = useState(true)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalPropiedades, setTotalPropiedades] = useState(0)
  const [usuariosConPropiedades, setUsuariosConPropiedades] = useState<UserWithProperties[]>([])
  const [error, setError] = useState<string | null>(null)

  // Verificar acceso solo para el owner
  useEffect(() => {
    if (!authLoading && user) {
      if (user.email !== OWNER_EMAIL) {
        router.push('/dashboard')
      }
    }
  }, [user, authLoading, router])

  // Cargar datos del sistema
  useEffect(() => {
    if (user?.email === OWNER_EMAIL) {
      loadSystemData()
    }
  }, [user])

  const loadSystemData = async () => {
    try {
      setLoadingData(true)
      setError(null)

      // Obtener el token de sesión actual
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('No hay sesión activa')
        return
      }

      // Llamar a la API con el token
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar datos')
      }

      const data = await response.json()

      setTotalUsuarios(data.totalUsuarios)
      setTotalPropiedades(data.totalPropiedades)
      setUsuariosConPropiedades(data.usuariosConPropiedades)

    } catch (error) {
      console.error('Error cargando datos del sistema:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setLoadingData(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  // Loading de autenticación
  if (authLoading) {
    return <Loading message="Verificando acceso..." />
  }

  // Si no es el owner, no mostrar nada (se redirige)
  if (user?.email !== OWNER_EMAIL) {
    return <Loading message="Acceso no autorizado..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <TopBar
        title="Panel de Control - Ohana"
        showHomeButton={true}
        showBackButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenido, Propietario
          </h1>
          <p className="text-slate-400">
            Panel de administración exclusivo del sistema Ohana
          </p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Cargando estadísticas...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={loadSystemData}
              className="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-red-300 text-sm font-medium transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* Total Usuarios */}
              <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Usuarios</p>
                    <p className="text-4xl font-bold text-white">{totalUsuarios}</p>
                  </div>
                </div>
              </div>

              {/* Total Propiedades */}
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Propiedades</p>
                    <p className="text-4xl font-bold text-white">{totalPropiedades}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Usuarios y Propiedades */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white">Usuarios y sus Propiedades</h2>
                <p className="text-slate-400 text-sm mt-1">Listado de todos los usuarios registrados con sus propiedades</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700/30">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Propiedades
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {usuariosConPropiedades.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                          No hay usuarios registrados
                        </td>
                      </tr>
                    ) : (
                      usuariosConPropiedades.map((usuario) => (
                        <tr key={usuario.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {(usuario.full_name || usuario.email)?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className="text-white font-medium">
                                {usuario.full_name || 'Sin nombre'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-300 text-sm">{usuario.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            {usuario.propiedades.length === 0 ? (
                              <span className="text-slate-500 text-sm italic">Sin propiedades</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {usuario.propiedades.slice(0, 3).map((prop) => (
                                  <span
                                    key={prop.id}
                                    className="inline-flex px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30"
                                  >
                                    {prop.nombre}
                                  </span>
                                ))}
                                {usuario.propiedades.length > 3 && (
                                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-600/50 text-slate-300 rounded-lg">
                                    +{usuario.propiedades.length - 3} más
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                              usuario.total_propiedades > 0
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-600/50 text-slate-400'
                            }`}>
                              {usuario.total_propiedades}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer de la tabla con resumen */}
              <div className="px-6 py-4 bg-slate-700/20 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Mostrando {usuariosConPropiedades.length} usuarios
                  </span>
                  <span className="text-slate-400">
                    Promedio: {totalUsuarios > 0 ? (totalPropiedades / totalUsuarios).toFixed(1) : 0} propiedades por usuario
                  </span>
                </div>
              </div>
            </div>

            {/* Sección futura - Membresías */}
            <div className="mt-10 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Próximamente: Sistema de Membresías</h3>
              </div>
              <p className="text-slate-400 text-sm">
                Aquí podrás crear cupones, gestionar suscripciones y controlar el acceso de usuarios según sus planes de pago.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
