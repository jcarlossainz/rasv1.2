'use client'

import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import { logger } from '@/lib/logger'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'

// ⚡ LAZY LOADING: Modales pesados solo se cargan cuando se necesitan
const WizardModal = lazy(() => import('./nueva/components/WizardModal'))
const CompartirPropiedad = lazy(() => import('@/components/CompartirPropiedad'))
const AñadirCuentaModal = lazy(() => import('@/components/AñadirCuentaModal'))

interface Propiedad {
  id: string
  owner_id: string
  nombre: string
  codigo_postal: string | null
  created_at: string
  es_propio: boolean
  foto_portada?: string | null
  colaboradores?: { user_id: string; nombre: string; email: string }[]
}

export default function CatalogoPage() {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [showCompartir, setShowCompartir] = useState(false)
  const [showAñadirCuenta, setShowAñadirCuenta] = useState(false)
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<Propiedad | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroPropiedad, setFiltroPropiedad] = useState<'todos' | 'propios' | 'compartidos'>('todos')

  useEffect(() => {
    if (user?.id) {
      cargarPropiedades(user.id)
    }

    const handleOpenWizard = () => setShowWizard(true)
    window.addEventListener('openWizard', handleOpenWizard)

    return () => window.removeEventListener('openWizard', handleOpenWizard)
  }, [user])

  // ⚡ OPTIMIZADO: Usa JOINs de Supabase para eliminar N+1 queries
  const cargarPropiedades = async (userId: string) => {
    try {
      // ✅ QUERY 1: Propiedades propias con JOINs (1 query en lugar de 200+)
      const { data: propsPropias, error: errorPropias } = await supabase
        .from('propiedades')
        .select(`
          *,
          propiedades_colaboradores (
            user_id
          ),
          property_images (
            url_thumbnail,
            is_cover
          )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (errorPropias) {
        logger.error('Error cargando propiedades:', errorPropias)
        toast.error('Error al cargar propiedades')
        setPropiedades([])
        return
      }

      // Transformar propiedades propias
      const propiedadesPropias = (propsPropias || []).map((prop: any) => ({
        id: prop.id,
        owner_id: prop.owner_id,
        nombre: prop.nombre_propiedad || 'Sin nombre',
        codigo_postal: prop.ubicacion?.codigo_postal || 'N/A',
        created_at: prop.created_at,
        es_propio: true,
        foto_portada: prop.property_images?.find((img: any) => img.is_cover)?.url_thumbnail || null,
        colaboradores: prop.propiedades_colaboradores || []
      }))

      // ✅ QUERY 2: IDs de propiedades compartidas
      const { data: idsCompartidos } = await supabase
        .from('propiedades_colaboradores')
        .select('propiedad_id')
        .eq('user_id', userId)

      let propiedadesCompartidas: any[] = []

      // ✅ QUERY 3: Propiedades compartidas con JOINs (solo si hay)
      if (idsCompartidos && idsCompartidos.length > 0) {
        const ids = idsCompartidos.map(p => p.propiedad_id)

        const { data: propsCompartidas } = await supabase
          .from('propiedades')
          .select(`
            *,
            property_images (
              url_thumbnail,
              is_cover
            )
          `)
          .in('id', ids)

        // Transformar propiedades compartidas
        propiedadesCompartidas = (propsCompartidas || []).map((prop: any) => ({
          id: prop.id,
          owner_id: prop.owner_id,
          nombre: prop.nombre_propiedad || 'Sin nombre',
          codigo_postal: prop.ubicacion?.codigo_postal || 'N/A',
          created_at: prop.created_at,
          es_propio: false,
          foto_portada: prop.property_images?.find((img: any) => img.is_cover)?.url_thumbnail || null,
          colaboradores: []
        }))
      }

      // Combinar todas las propiedades
      const todasLasPropiedades = [...propiedadesPropias, ...propiedadesCompartidas]
      setPropiedades(todasLasPropiedades)

      logger.log(`✅ Cargadas ${propiedadesPropias.length} propias + ${propiedadesCompartidas.length} compartidas = ${todasLasPropiedades.length} total`)
      logger.log(`⚡ Optimización: 3 queries en lugar de ${todasLasPropiedades.length * 2 + 3}`)

    } catch (error: any) {
      logger.error('Error cargando propiedades:', error)
      toast.error('Error al cargar propiedades')
      setPropiedades([])
    }
  }

  // ⚡ OPTIMIZADO: Funciones memoizadas para evitar re-renders
  const abrirCompartir = useCallback((propiedad: Propiedad) => {
    setPropiedadSeleccionada(propiedad)
    setShowCompartir(true)
  }, [])

  const abrirHome = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/home`)
  }, [router])

  const abrirGaleria = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/galeria`)
  }, [router])

  const abrirInventario = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/inventario`)
  }, [router])

  const abrirTickets = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/tickets`)
  }, [router])

  const abrirCalendario = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/calendario`)
  }, [router])

  const abrirBalance = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/balance`)
  }, [router])

  const abrirAnuncio = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/anuncio`)
  }, [router])

  const editarPropiedad = useCallback((propiedadId: string) => {
    toast.info('Función de edición en desarrollo')
    logger.log('Editar propiedad:', propiedadId)
  }, [toast])

  const eliminarPropiedad = useCallback(async (propiedadId: string, nombrePropiedad: string) => {
    if (!user?.id) return

    const confirmed = await confirm.danger(
      `¿Eliminar "${nombrePropiedad}"?`,
      'Esta acción NO se puede deshacer. Se eliminarán todos los datos, colaboradores, fotos, tickets y todo el historial.'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('propiedades')
        .delete()
        .eq('id', propiedadId)
        .eq('owner_id', user.id)

      if (error) throw error

      await cargarPropiedades(user.id)
      toast.success(`Propiedad "${nombrePropiedad}" eliminada correctamente`)
    } catch (error: any) {
      logger.error('Error al eliminar propiedad:', error)
      toast.error('Error al eliminar la propiedad')
    }
  }, [user?.id, confirm, toast])

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm.warning('¿Cerrar sesión?')
    if (!confirmed) return

    await logout()
  }, [confirm, logout])

  const handleCloseWizard = useCallback(() => {
    setShowWizard(false)
  }, [])

  // ⚡ OPTIMIZADO: Filtros memoizados - solo se recalculan cuando cambian las dependencias
  const propiedadesFiltradas = useMemo(() => {
    return propiedades.filter(prop => {
      const cumpleBusqueda = prop.nombre.toLowerCase().includes(busqueda.toLowerCase())

      const cumpleFiltro =
        filtroPropiedad === 'todos' ||
        (filtroPropiedad === 'propios' && prop.es_propio) ||
        (filtroPropiedad === 'compartidos' && !prop.es_propio)

      return cumpleBusqueda && cumpleFiltro
    })
  }, [propiedades, busqueda, filtroPropiedad])

  if (authLoading) {
    return <Loading message="Cargando propiedades..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar 
        title="Catálogo"
        showBackButton={true}
        showAddButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
        dropdownItems={[
          {
            label: 'Agregar propiedad',
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            ),
            onClick: () => setShowWizard(true)
          },
          {
            label: 'Añadir cuenta',
            icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C6.5 2 2 4.5 2 7.5v1C2 11.5 6.5 14 12 14s10-2.5 10-5.5v-1C22 4.5 17.5 2 12 2z"/>
                <path d="M2 12c0 3 4.5 5.5 10 5.5S22 15 22 12"/>
                <path d="M2 16.5c0 3 4.5 5.5 10 5.5s10-2.5 10-5.5"/>
              </svg>
            ),
            onClick: () => setShowAñadirCuenta(true)
          }
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-ras-primary focus:outline-none transition-colors"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={filtroPropiedad}
                onChange={(e) => setFiltroPropiedad(e.target.value as 'todos' | 'propios' | 'compartidos')}
                className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:border-ras-primary focus:border-ras-primary focus:outline-none transition-colors cursor-pointer"
              >
                <option value="todos">📋 Todos</option>
                <option value="propios">🏠 Propios</option>
                <option value="compartidos">👥 Compartidos</option>
              </select>
              <svg className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {propiedadesFiltradas.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="w-20"></div>
                <div className="flex-1"></div>
                <div className="flex gap-4">
                  <div className="w-12 text-center text-xs font-semibold text-green-600">Home</div>
                  <div className="w-12 text-center text-xs font-semibold text-cyan-600">Calendario</div>
                  <div className="w-12 text-center text-xs font-semibold text-orange-600">Tickets</div>
                  <div className="w-12 text-center text-xs font-semibold text-gray-600">Inventario</div>
                  <div className="w-12 text-center text-xs font-semibold text-pink-600">Galería</div>
                  <div className="w-12 text-center text-xs font-semibold text-yellow-600">Anuncio</div>
                  <div className="w-12 text-center text-xs font-semibold text-emerald-600">Balance</div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {propiedadesFiltradas.map((prop) => (
                <div 
                  key={prop.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <img 
                        src={prop.foto_portada || "https://via.placeholder.com/80x60/f3f4f6/9ca3af?text=Sin+foto"}
                        alt={prop.nombre}
                        className="w-20 h-16 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/80x60/f3f4f6/9ca3af?text=Sin+foto"
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-800 font-poppins">
                          {prop.nombre}
                        </h3>
                        
                        <span 
                          className="text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0" 
                          style={{ 
                            background: prop.es_propio ? '#f0fdf4' : '#f3f4f6', 
                            color: prop.es_propio ? '#16a34a' : '#6b7280' 
                          }}
                        >
                          {prop.es_propio ? '🏠 Propio' : '👥 Compartido'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        ID: {prop.id.slice(0, 8)}...
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirHome(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-green-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirCalendario(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-cyan-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirTickets(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-orange-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                          <line x1="9" y1="12" x2="12" y2="12"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirInventario(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-gray-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirGaleria(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-pink-200 bg-pink-50 hover:bg-pink-100 hover:border-pink-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-pink-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <path d="M21 15l-5-5L5 21"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirAnuncio(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-yellow-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirBalance(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 hover:scale-110 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-7 h-7 text-emerald-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2C6.5 2 2 4.5 2 7.5v1C2 11.5 6.5 14 12 14s10-2.5 10-5.5v-1C22 4.5 17.5 2 12 2z"/><path d="M2 12c0 3 4.5 5.5 10 5.5S22 15 22 12"/><path d="M2 16.5c0 3 4.5 5.5 10 5.5s10-2.5 10-5.5"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState 
            icon={
              <svg className="w-12 h-12 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            }
            title={propiedades.length === 0 ? "No tienes propiedades" : "No se encontraron resultados"}
            description={propiedades.length === 0 ? "Usa el botón + para crear tu primera propiedad" : "Intenta con otra búsqueda o cambia los filtros"}
            actionLabel={propiedades.length === 0 ? "+ Crear Propiedad" : undefined}
            onAction={propiedades.length === 0 ? () => setShowWizard(true) : undefined}
          />
        )}
      </main>

      {/* ⚡ LAZY LOADING: Modales con Suspense */}
      {showCompartir && propiedadSeleccionada && (
        <Suspense fallback={<Loading message="Cargando opciones de compartir..." />}>
          <CompartirPropiedad
            isOpen={showCompartir}
            onClose={() => {
              setShowCompartir(false)
              setPropiedadSeleccionada(null)
              if (user?.id) cargarPropiedades(user.id)
            }}
            propiedadId={propiedadSeleccionada.id}
            propiedadNombre={propiedadSeleccionada.nombre}
            userId={user.id}
            esPropio={propiedadSeleccionada.es_propio}
          />
        </Suspense>
      )}

      {showWizard && (
        <Suspense fallback={<Loading message="Cargando formulario..." />}>
          <WizardModal
            isOpen={showWizard}
            onClose={handleCloseWizard}
            mode="create"
            onComplete={async (propertyId) => {
              logger.log('🎉 Propiedad creada con ID:', propertyId);

              // Recargar lista de propiedades
              if (user?.id) {
                await cargarPropiedades(user.id);
              }

              // Mostrar toast de éxito
              toast.success('✅ Propiedad creada exitosamente');
            }}
          />
        </Suspense>
      )}

      {showAñadirCuenta && user && (
        <Suspense fallback={<Loading message="Cargando formulario..." />}>
          <AñadirCuentaModal
            isOpen={showAñadirCuenta}
            onClose={() => setShowAñadirCuenta(false)}
            onSuccess={(cuenta) => {
              logger.log('💰 Cuenta creada con ID:', cuenta.id);
              setShowAñadirCuenta(false);
            }}
            userId={user.id}
          />
        </Suspense>
      )}
    </div>
  )
}