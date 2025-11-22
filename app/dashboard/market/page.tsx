'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import Button from '@/components/ui/button'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'

interface Propiedad {
  id: string
  user_id: string
  nombre: string
  tipo_propiedad: string
  estados: string[]
  codigo_postal: string | null
  precios: {
    mensual?: number | null
    noche?: number | null
    venta?: number | null
  } | null
  estado_anuncio: 'borrador' | 'publicado' | 'pausado' | null
  anuncio_titulo: string | null
  anuncio_tagline: string | null
  created_at: string
  es_propio: boolean
  foto_portada?: string | null
}

export default function MarketPage() {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])

  // Estados para búsqueda y filtro
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'publicado' | 'pausado' | 'borrador'>('todos')
  const [filtroOperacion, setFiltroOperacion] = useState<'todos' | 'venta' | 'renta' | 'vacacional'>('todos')

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const ITEMS_POR_PAGINA = 12

  useEffect(() => {
    if (user?.id) {
      cargarPropiedades(user.id)
    }
  }, [user])

  const cargarPropiedades = async (userId: string) => {
    // ✅ QUERY 1: Propiedades propias con JOIN a imágenes (1 query en lugar de N+1)
    const { data: propiedadesPropias, error: errorPropias } = await supabase
      .from('propiedades')
      .select(`
        *,
        property_images (
          url_thumbnail,
          is_cover
        )
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (errorPropias) {
      console.error('Error cargando propiedades propias:', errorPropias)
      toast.error('Error al cargar propiedades')
      setPropiedades([])
      return
    }

    // Transformar propiedades propias con foto de portada
    const propsPropias = (propiedadesPropias || []).map((prop: any) => ({
      ...prop,
      es_propio: true,
      foto_portada: prop.property_images?.find((img: any) => img.is_cover)?.url_thumbnail || null
    }))

    // ✅ QUERY 2: IDs de propiedades compartidas
    const { data: propiedadesCompartidas } = await supabase
      .from('propiedades_colaboradores')
      .select('propiedad_id')
      .eq('user_id', userId)

    let propsCompartidas: any[] = []

    // ✅ QUERY 3: Propiedades compartidas con JOIN a imágenes (solo si hay)
    if (propiedadesCompartidas && propiedadesCompartidas.length > 0) {
      const idsCompartidos = propiedadesCompartidas.map(p => p.propiedad_id)
      const { data: datosCompartidos } = await supabase
        .from('propiedades')
        .select(`
          *,
          property_images (
            url_thumbnail,
            is_cover
          )
        `)
        .in('id', idsCompartidos)

      // Transformar propiedades compartidas con foto de portada
      propsCompartidas = (datosCompartidos || []).map((prop: any) => ({
        ...prop,
        es_propio: false,
        foto_portada: prop.property_images?.find((img: any) => img.is_cover)?.url_thumbnail || null
      }))
    }

    // Combinar y ordenar
    const todasPropiedades = [...propsPropias, ...propsCompartidas]
    todasPropiedades.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setPropiedades(todasPropiedades)

    // ✅ Log de optimización
    console.log(`✅ Market cargado con ${todasPropiedades.length} propiedades usando solo 3 queries (antes: ${todasPropiedades.length + 3})`)
  }

  const toggleEstadoAnuncio = async (propiedadId: string, estadoActual: string | null) => {
    let nuevoEstado: 'publicado' | 'pausado' = 'publicado'
    
    if (estadoActual === 'publicado') {
      nuevoEstado = 'pausado'
    }
    
    const { error } = await supabase
      .from('propiedades')
      .update({ estado_anuncio: nuevoEstado })
      .eq('id', propiedadId)
    
    if (error) {
      logger.error('Error actualizando estado:', error)
      toast.error('Error al actualizar estado')
      return
    }
    
    toast.success(`Anuncio ${nuevoEstado === 'publicado' ? 'publicado' : 'pausado'} correctamente`)
    
    // Recargar propiedades
    if (user?.id) cargarPropiedades(user.id)
  }

  const abrirAnuncio = (propiedadId: string) => {
    router.push(`/dashboard/anuncio/${propiedadId}`)
  }

  const handleLogout = async () => {
    const confirmed = await confirm.warning(
      '¿Estás seguro que deseas cerrar sesión?',
      'Se cerrará tu sesión actual'
    )

    if (!confirmed) return

    try {
      await logout()
      toast.success('Sesión cerrada correctamente')
    } catch (error: any) {
      logger.error('Error al cerrar sesión:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  // Helper functions - DEBEN estar ANTES del useMemo
  const getOperacionTipo = (prop: Propiedad): string[] => {
    const tipos: string[] = []
    if (prop.precios?.venta) tipos.push('venta')
    if (prop.precios?.mensual) tipos.push('renta')
    if (prop.precios?.noche) tipos.push('vacacional')
    return tipos
  }

  const getOperacionLabel = (prop: Propiedad): string => {
    if (prop.precios?.noche) return 'Renta Vacacional'
    if (prop.precios?.mensual) return 'Renta Largo Plazo'
    if (prop.precios?.venta) return 'Venta'
    return 'Sin modalidad'
  }

  const getPrecioDisplay = (prop: Propiedad) => {
    if (prop.precios?.venta) {
      return { monto: `$${prop.precios.venta.toLocaleString('es-MX')}`, periodo: '' }
    }
    if (prop.precios?.mensual) {
      return { monto: `$${prop.precios.mensual.toLocaleString('es-MX')}`, periodo: '/ mes' }
    }
    if (prop.precios?.noche) {
      return { monto: `$${prop.precios.noche.toLocaleString('es-MX')}`, periodo: '/ noche' }
    }
    return { monto: 'Sin precio', periodo: '' }
  }

  // Filtrar propiedades con useMemo para optimización
  const propiedadesFiltradas = useMemo(() => {
    return propiedades.filter(prop => {
      // Filtro búsqueda
      const matchBusqueda = busqueda === '' ||
        prop.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (prop.codigo_postal && prop.codigo_postal.includes(busqueda))

      // Filtro estado
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'borrador' && !prop.estado_anuncio) ||
        prop.estado_anuncio === filtroEstado

      // Filtro operación
      const operaciones = getOperacionTipo(prop)
      const matchOperacion =
        filtroOperacion === 'todos' ||
        operaciones.includes(filtroOperacion)

      return matchBusqueda && matchEstado && matchOperacion
    })
  }, [propiedades, busqueda, filtroEstado, filtroOperacion])

  // Paginar propiedades con useMemo
  const propiedadesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
    const fin = inicio + ITEMS_POR_PAGINA
    return propiedadesFiltradas.slice(inicio, fin)
  }, [propiedadesFiltradas, paginaActual])

  const totalPaginas = Math.ceil(propiedadesFiltradas.length / ITEMS_POR_PAGINA)

  // Auto-reset página cuando cambian filtros
  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, filtroEstado, filtroOperacion])

  if (authLoading) {
    return <Loading message="Cargando anuncios..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar 
        title="Market - Anuncios"
        onClick={() => router.push('/dashboard/market')}
        showBackButton={true}
        showAddButton={false}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex gap-3 items-center">
            
            {/* Búsqueda */}
            <div className="flex-1">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar propiedad..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-ras-turquesa focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              />
            </div>

            {/* Filtro Estado */}
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-ras-turquesa focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              >
                <option value="todos">Estado</option>
                <option value="publicado">Publicados</option>
                <option value="pausado">Pausados</option>
                <option value="borrador">Borradores</option>
              </select>
            </div>

            {/* Filtro Operación */}
            <div>
              <select
                value={filtroOperacion}
                onChange={(e) => setFiltroOperacion(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-ras-turquesa focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              >
                <option value="todos">Operación</option>
                <option value="venta">Venta</option>
                <option value="renta">Renta</option>
                <option value="vacacional">Vacacional</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid de tarjetas - 3 COLUMNAS */}
        {propiedadesFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {propiedadesPaginadas.map((prop) => {
              const precio = getPrecioDisplay(prop)
              const operacion = getOperacionLabel(prop)
              const isActivo = prop.estado_anuncio === 'publicado'
              
              return (
                <div 
                  key={prop.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
                >
                  {/* Imagen */}
                  <div 
                    onClick={() => abrirAnuncio(prop.id)}
                    className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer overflow-hidden group"
                  >
                    {prop.foto_portada ? (
                      <img
                        src={prop.foto_portada}
                        alt={prop.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Sin+foto"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                      {/* Badge Premium */}
                      {(prop.anuncio_titulo || prop.anuncio_tagline) && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-ras-turquesa to-ras-azul text-white backdrop-blur-sm shadow-lg">
                          ✨ PREMIUM
                        </span>
                      )}

                      {/* Badge Activo/Inactivo */}
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                        isActivo
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-gray-200/90 text-gray-700'
                      }`}>
                        {isActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    {/* Título */}
                    <h3
                      onClick={() => abrirAnuncio(prop.id)}
                      className="text-lg font-bold text-gray-900 mb-1 cursor-pointer hover:text-ras-azul line-clamp-1"
                    >
                      {prop.anuncio_titulo || prop.nombre}
                    </h3>

                    {/* Tagline o Ubicación */}
                    {prop.anuncio_tagline ? (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2 italic">
                        {prop.anuncio_tagline}
                      </p>
                    ) : null}

                    {/* Ubicación y código */}
                    <p className="text-xs text-gray-500 mb-3">
                      {prop.id.slice(0, 11).toUpperCase()} • {prop.estados?.[0] || 'Sin ubicación'}
                    </p>

                    {/* Tipo de operación */}
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {operacion}
                      </span>
                    </div>

                    {/* Precio */}
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {precio.monto} <span className="text-sm font-normal text-gray-600">{precio.periodo}</span>
                      </div>
                    </div>

                    {/* Switch toggle para activar/desactivar */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm font-medium text-gray-700">
                        {isActivo ? 'Anuncio activo' : 'Anuncio pausado'}
                      </span>
                      <button
                        onClick={() => toggleEstadoAnuncio(prop.id, prop.estado_anuncio)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          isActivo 
                            ? 'bg-blue-500 focus:ring-blue-500' 
                            : 'bg-gray-300 focus:ring-gray-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                            isActivo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {/* Paginación profesional */}
        {totalPaginas > 1 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4 mt-6">
            <div className="flex items-center justify-between">
              {/* Contador de resultados */}
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-gray-900">
                  {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}
                </span> - <span className="font-semibold text-gray-900">
                  {Math.min(paginaActual * ITEMS_POR_PAGINA, propiedadesFiltradas.length)}
                </span> de <span className="font-semibold text-gray-900">
                  {propiedadesFiltradas.length}
                </span> anuncios
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

                {/* Números de página con smart ellipsis */}
                <div className="flex gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(num => {
                      return (
                        num === 1 ||
                        num === totalPaginas ||
                        (num >= paginaActual - 1 && num <= paginaActual + 1)
                      )
                    })
                    .map((num, idx, arr) => (
                      <div key={num} className="flex items-center">
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

        {/* Empty State */}
        {propiedadesFiltradas.length === 0 && (
          <EmptyState 
            icon={
              <svg className="w-12 h-12 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2v1.5a7 7 0 0 1 4.5 6.196V15a3 3 0 0 0 1.5 2.598v.902H4v-.902A3 3 0 0 0 5.5 15v-3.304A7 7 0 0 1 10 5.5V4a2 2 0 0 1 2-2z"/>
              </svg>
            }
            title={propiedades.length === 0 ? "No tienes propiedades para anunciar" : "No se encontraron resultados"}
            description={propiedades.length === 0 ? "Ve al catálogo para crear tu primera propiedad" : "Intenta con otra búsqueda o cambia los filtros"}
            actionLabel={propiedades.length === 0 ? "Ir al Catálogo" : undefined}
            onAction={propiedades.length === 0 ? () => router.push('/dashboard/catalogo') : undefined}
          />
        )}
      </main>
    </div>
  )
}