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

interface Propiedad {
  id: string
  owner_id: string
  nombre: string
  codigo_postal: string | null
  created_at: string
  es_propio: boolean
  foto_portada?: string | null
  colaboradores?: { user_id: string; nombre: string; email: string }[]
  rol?: 'propietario' | 'supervisor' | null // Rol del usuario en propiedades compartidas
  tipo_propiedad?: string | null
  estados?: string[] | null
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
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<Propiedad | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroPropiedad, setFiltroPropiedad] = useState<'todos' | 'propios' | 'compartidos'>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtrosDelAsistente, setFiltrosDelAsistente] = useState(false)

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const ITEMS_POR_PAGINA = 20

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
        colaboradores: prop.propiedades_colaboradores || [],
        tipo_propiedad: prop.tipo_propiedad || null,
        estados: prop.estados || null
      }))

      // ✅ QUERY 2: IDs de propiedades compartidas CON ROL
      const { data: colaboraciones } = await supabase
        .from('propiedades_colaboradores')
        .select('propiedad_id, rol')
        .eq('user_id', userId)

      let propiedadesCompartidas: any[] = []

      // ✅ QUERY 3: Propiedades compartidas con JOINs (solo si hay)
      if (colaboraciones && colaboraciones.length > 0) {
        const ids = colaboraciones.map(p => p.propiedad_id)

        // Crear mapa de roles por propiedad_id
        const rolesMap = new Map(colaboraciones.map(c => [c.propiedad_id, c.rol]))

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

        // Transformar propiedades compartidas CON ROL
        propiedadesCompartidas = (propsCompartidas || []).map((prop: any) => ({
          id: prop.id,
          owner_id: prop.owner_id,
          nombre: prop.nombre_propiedad || 'Sin nombre',
          codigo_postal: prop.ubicacion?.codigo_postal || 'N/A',
          created_at: prop.created_at,
          es_propio: false,
          foto_portada: prop.property_images?.find((img: any) => img.is_cover)?.url_thumbnail || null,
          colaboradores: [],
          rol: rolesMap.get(prop.id) || null,
          tipo_propiedad: prop.tipo_propiedad || null,
          estados: prop.estados || null
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

  const abrirArchivo = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/archivo`)
  }, [router])

  const abrirConfig = useCallback((propiedadId: string) => {
    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/config`)
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

      const cumpleTipo = !filtroTipo || prop.tipo_propiedad === filtroTipo

      const cumpleEstado = !filtroEstado || (prop.estados && prop.estados.includes(filtroEstado))

      return cumpleBusqueda && cumpleFiltro && cumpleTipo && cumpleEstado
    })
  }, [propiedades, busqueda, filtroPropiedad, filtroTipo, filtroEstado])

  // ⚡ PAGINACIÓN: Calcular propiedades a mostrar
  const propiedadesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
    const fin = inicio + ITEMS_POR_PAGINA
    return propiedadesFiltradas.slice(inicio, fin)
  }, [propiedadesFiltradas, paginaActual])

  const totalPaginas = Math.ceil(propiedadesFiltradas.length / ITEMS_POR_PAGINA)

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, filtroPropiedad, filtroTipo, filtroEstado])

  // Escuchar eventos de filtrado del asistente
  useEffect(() => {
    const handleAssistantFilter = (e: CustomEvent<{
      busqueda?: string
      tipo?: string
      estado?: string
      propiedad?: 'todos' | 'propios' | 'compartidos'
    }>) => {
      const filtros = e.detail

      // Aplicar filtros del asistente
      if (filtros.busqueda !== undefined) {
        setBusqueda(filtros.busqueda)
      }
      if (filtros.tipo !== undefined) {
        setFiltroTipo(filtros.tipo)
      }
      if (filtros.estado !== undefined) {
        setFiltroEstado(filtros.estado)
      }
      if (filtros.propiedad !== undefined) {
        setFiltroPropiedad(filtros.propiedad)
      }

      // Marcar que los filtros fueron aplicados por el asistente
      setFiltrosDelAsistente(Object.keys(filtros).length > 0)

      // Si no hay filtros, limpiar todo
      if (Object.keys(filtros).length === 0) {
        setBusqueda('')
        setFiltroTipo('')
        setFiltroEstado('')
        setFiltroPropiedad('todos')
      }
    }

    window.addEventListener('assistant-filter-catalogo', handleAssistantFilter as EventListener)

    return () => {
      window.removeEventListener('assistant-filter-catalogo', handleAssistantFilter as EventListener)
    }
  }, [])

  // Función para limpiar filtros del asistente
  const limpiarFiltrosAsistente = useCallback(() => {
    setBusqueda('')
    setFiltroTipo('')
    setFiltroEstado('')
    setFiltroPropiedad('todos')
    setFiltrosDelAsistente(false)
  }, [])

  if (authLoading) {
    return <Loading message="Cargando propiedades..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Catálogo"
        showHomeButton={true}
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
          }
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Indicador de filtros del asistente */}
        {filtrosDelAsistente && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span className="text-sm font-medium">Filtros aplicados por el asistente IA</span>
            </div>
            <button
              onClick={limpiarFiltrosAsistente}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setFiltrosDelAsistente(false); }}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-ras-primary focus:outline-none transition-colors"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            {busqueda && (
              <button
                onClick={() => { setBusqueda(''); setFiltrosDelAsistente(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
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
                  <div className="w-12 text-center text-xs font-semibold text-amber-600">Archivero</div>
                  <div className="w-12 text-center text-xs font-semibold text-gray-500">Config</div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {propiedadesPaginadas.map((prop) => (
                <div 
                  key={prop.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Thumbnail clickeable con indicador */}
                    <div
                      onClick={(e) => { e.stopPropagation(); abrirGaleria(prop.id); }}
                      className="relative group cursor-pointer"
                    >
                      <img
                        src={prop.foto_portada || "https://via.placeholder.com/80x60/f3f4f6/9ca3af?text=Sin+foto"}
                        alt={prop.nombre}
                        className="w-20 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-purple-400 transition-all group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/80x60/f3f4f6/9ca3af?text=Sin+foto"
                        }}
                      />
                      {/* Overlay con icono de cámara */}
                      <div className="absolute inset-0 bg-purple-600 bg-opacity-0 group-hover:bg-opacity-70 rounded-lg transition-all flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                      {/* Badge indicador si no hay foto */}
                      {!prop.foto_portada && (
                        <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          +
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 font-poppins">
                        {prop.nombre}
                      </h3>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirHome(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 hover:scale-110 transition-all flex items-center justify-center group"
                        title="Home"
                      >
                        <svg className="w-7 h-7 text-green-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); abrirCalendario(prop.id); }}
                        className="w-12 h-12 rounded-lg border-2 border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400 hover:scale-110 transition-all flex items-center justify-center group"
                        title="Calendario"
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
                        title="Tickets"
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
                        title="Inventario"
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
                        title="Galería"
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
                        title="Anuncio"
                      >
                        <svg className="w-7 h-7 text-yellow-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </button>

                      {/* Balance - Admin y Propietario (no supervisor) */}
                      {(prop.es_propio || prop.rol === 'propietario') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirBalance(prop.id); }}
                          className="w-12 h-12 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 hover:scale-110 transition-all flex items-center justify-center group"
                          title="Balance"
                        >
                          <svg className="w-7 h-7 text-emerald-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C6.5 2 2 4.5 2 7.5v1C2 11.5 6.5 14 12 14s10-2.5 10-5.5v-1C22 4.5 17.5 2 12 2z"/><path d="M2 12c0 3 4.5 5.5 10 5.5S22 15 22 12"/><path d="M2 16.5c0 3 4.5 5.5 10 5.5s10-2.5 10-5.5"/>
                          </svg>
                        </button>
                      )}

                      {/* Archivero - Admin y Propietario (no supervisor) */}
                      {(prop.es_propio || prop.rol === 'propietario') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirArchivo(prop.id); }}
                          className="w-12 h-12 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 hover:scale-110 transition-all flex items-center justify-center group"
                          title="Archivo"
                        >
                          <svg className="w-7 h-7 text-amber-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="3" width="16" height="18" rx="2" ry="2"/>
                            <line x1="4" y1="9" x2="20" y2="9"/>
                            <line x1="4" y1="15" x2="20" y2="15"/>
                            <line x1="9" y1="6" x2="15" y2="6"/>
                          </svg>
                        </button>
                      )}

                      {/* Config - Solo para administrador (owner) */}
                      {prop.es_propio && (
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirConfig(prop.id); }}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 bg-gray-100 hover:bg-gray-200 hover:border-gray-500 hover:scale-110 transition-all flex items-center justify-center group"
                          title="Configuración"
                        >
                          <svg className="w-7 h-7 text-gray-700 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  {/* Info de resultados */}
                  <div className="text-sm text-gray-600">
                    Mostrando{' '}
                    <span className="font-semibold text-gray-900">
                      {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}
                    </span>
                    {' - '}
                    <span className="font-semibold text-gray-900">
                      {Math.min(paginaActual * ITEMS_POR_PAGINA, propiedadesFiltradas.length)}
                    </span>
                    {' de '}
                    <span className="font-semibold text-gray-900">
                      {propiedadesFiltradas.length}
                    </span>
                    {' propiedades'}
                  </div>

                  {/* Controles de navegación */}
                  <div className="flex items-center gap-2">
                    {/* Botón Anterior */}
                    <button
                      onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                      disabled={paginaActual === 1}
                      className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700 transition-all"
                    >
                      ← Anterior
                    </button>

                    {/* Números de página */}
                    <div className="flex gap-1">
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                        .filter(num => {
                          // Mostrar primera, última, actual y vecinas
                          return (
                            num === 1 ||
                            num === totalPaginas ||
                            (num >= paginaActual - 1 && num <= paginaActual + 1)
                          )
                        })
                        .map((num, idx, arr) => (
                          <div key={num} className="flex items-center">
                            {/* Puntos suspensivos si hay salto */}
                            {idx > 0 && arr[idx - 1] !== num - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}

                            <button
                              onClick={() => setPaginaActual(num)}
                              className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                                paginaActual === num
                                  ? 'bg-ras-azul text-white shadow-lg'
                                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {num}
                            </button>
                          </div>
                        ))}
                    </div>

                    {/* Botón Siguiente */}
                    <button
                      onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700 transition-all"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            )}
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
    </div>
  )
}