'use client'

/**
 * BALANCE/CUENTAS POR PROPIEDAD - Vista Individual
 * Muestra resumen financiero y movimientos de UNA propiedad específica
 * Diseño alineado con /dashboard/cuentas (global)
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import GestionCuentas from '@/components/GestionCuentas'

interface Movimiento {
  id: string
  propiedad_nombre: string
  tipo: 'egreso' | 'ingreso'
  titulo: string
  monto: number
  responsable: string | null
  fecha: string
  propiedad_id: string
  metodo_pago?: string | null
  referencia_pago?: string | null
  comprobante_url?: string | null
  cuenta_nombre?: string | null
  tiene_factura?: boolean
  numero_factura?: string | null
}

interface Propiedad {
  id: string
  nombre_propiedad: string
  tipo_propiedad?: string
}

export default function BalancePropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const { user, loading: authLoading } = useAuth()

  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movimientosFiltrados, setMovimientosFiltrados] = useState<Movimiento[]>([])

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltroTabla, setTipoFiltroTabla] = useState<string>('todos')
  const [ordenFecha, setOrdenFecha] = useState<'asc' | 'desc'>('asc')

  // Filtro de fechas para la TABLA (default = mes actual)
  const primerDiaMes = new Date()
  primerDiaMes.setDate(1)
  primerDiaMes.setHours(0, 0, 0, 0)

  const [fechaDesdeTabla, setFechaDesdeTabla] = useState(primerDiaMes.toISOString().split('T')[0])
  const [fechaHastaTabla, setFechaHastaTabla] = useState(new Date().toISOString().split('T')[0])

  // Dropdowns en headers de tabla
  const [showTipoDropdownTabla, setShowTipoDropdownTabla] = useState(false)
  const [showFechaDropdownTabla, setShowFechaDropdownTabla] = useState(false)
  const [showTituloDropdownTabla, setShowTituloDropdownTabla] = useState(false)
  const [showResponsableDropdownTabla, setShowResponsableDropdownTabla] = useState(false)

  // Filtro de rango de fechas personalizado (inicializado en el mes anterior por defecto)
  const mesAnteriorInicio = new Date()
  mesAnteriorInicio.setMonth(mesAnteriorInicio.getMonth() - 1)
  mesAnteriorInicio.setDate(1)

  const mesAnteriorFin = new Date()
  mesAnteriorFin.setDate(0)

  const [fechaDesde, setFechaDesde] = useState(mesAnteriorInicio.toISOString().split('T')[0])
  const [fechaHasta, setFechaHasta] = useState(mesAnteriorFin.toISOString().split('T')[0])

  const cargarDatos = useCallback(async () => {
    if (!propiedadId) return

    try {
      setLoading(true)

      // Cargar propiedad
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad')
        .eq('id', propiedadId)
        .single()

      if (propError) {
        console.error('Error cargando propiedad:', propError)
        toast.error('No se pudo cargar la propiedad')
        router.push('/dashboard/catalogo')
        return
      }

      setPropiedad(propData)

      // Cargar EGRESOS (pagos CONCRETADOS/PAGADOS para estado de cuenta)
      const { data: pagos } = await supabase
        .from('fechas_pago_servicios')
        .select(`
          id,
          fecha_pago,
          monto_real,
          monto_estimado,
          propiedad_id,
          metodo_pago,
          referencia_pago,
          responsable,
          tiene_factura,
          numero_factura,
          comprobante_url,
          cuenta_id,
          servicios_inmueble!inner(
            nombre,
            tipo_servicio
          ),
          cuentas_bancarias(
            nombre
          )
        `)
        .eq('propiedad_id', propiedadId)
        .eq('pagado', true)
        .limit(500)

      // Transformar pagos a movimientos (egresos)
      const movimientosEgresos: Movimiento[] = (pagos || []).map((pago: any) => ({
        id: pago.id,
        propiedad_nombre: propData.nombre_propiedad,
        tipo: 'egreso' as const,
        titulo: pago.servicios_inmueble.nombre,
        monto: pago.monto_real || pago.monto_estimado,
        responsable: pago.responsable || null,
        fecha: pago.fecha_pago,
        propiedad_id: pago.propiedad_id,
        metodo_pago: pago.metodo_pago,
        referencia_pago: pago.referencia_pago,
        comprobante_url: pago.comprobante_url,
        cuenta_nombre: pago.cuentas_bancarias?.nombre || null,
        tiene_factura: pago.tiene_factura,
        numero_factura: pago.numero_factura
      }))

      // Cargar INGRESOS
      const { data: ingresos } = await supabase
        .from('ingresos')
        .select(`
          id,
          concepto,
          monto,
          fecha_ingreso,
          metodo_pago,
          referencia_pago,
          tiene_factura,
          numero_factura,
          comprobante_url,
          cuenta_id,
          propiedad_id,
          cuentas_bancarias(
            nombre
          )
        `)
        .eq('propiedad_id', propiedadId)
        .limit(500)

      const movimientosIngresos: Movimiento[] = (ingresos || []).map((ingreso: any) => ({
        id: ingreso.id,
        propiedad_nombre: propData.nombre_propiedad,
        tipo: 'ingreso' as const,
        titulo: ingreso.concepto,
        monto: ingreso.monto,
        responsable: null,
        fecha: ingreso.fecha_ingreso,
        propiedad_id: ingreso.propiedad_id,
        metodo_pago: ingreso.metodo_pago,
        referencia_pago: ingreso.referencia_pago,
        comprobante_url: ingreso.comprobante_url,
        cuenta_nombre: ingreso.cuentas_bancarias?.nombre || null,
        tiene_factura: ingreso.tiene_factura,
        numero_factura: ingreso.numero_factura
      }))

      const todosMovimientos = [...movimientosEgresos, ...movimientosIngresos]
      setMovimientos(todosMovimientos)

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar balance')
    } finally {
      setLoading(false)
    }
  }, [propiedadId, toast, router])

  const aplicarFiltros = useCallback(() => {
    let filtrados = [...movimientos]

    // Filtro por rango de fechas de la TABLA
    const fechaDesdeTObj = new Date(fechaDesdeTabla)
    fechaDesdeTObj.setHours(0, 0, 0, 0)
    const fechaHastaTObj = new Date(fechaHastaTabla)
    fechaHastaTObj.setHours(23, 59, 59, 999)

    filtrados = filtrados.filter(m => {
      const fecha = new Date(m.fecha)
      return fecha >= fechaDesdeTObj && fecha <= fechaHastaTObj
    })

    // Filtro por tipo
    if (tipoFiltroTabla !== 'todos') {
      filtrados = filtrados.filter(m => m.tipo === tipoFiltroTabla)
    }

    // Búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase()
      filtrados = filtrados.filter(m =>
        m.titulo.toLowerCase().includes(searchLower) ||
        m.responsable.toLowerCase().includes(searchLower)
      )
    }

    // Ordenar por fecha según el estado
    if (ordenFecha === 'desc') {
      filtrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    } else {
      filtrados.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    }

    setMovimientosFiltrados(filtrados)
  }, [movimientos, tipoFiltroTabla, busqueda, ordenFecha, fechaDesdeTabla, fechaHastaTabla])

  useEffect(() => {
    if (!authLoading && user) {
      cargarDatos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, propiedadId])

  useEffect(() => {
    if (movimientos.length >= 0) {
      aplicarFiltros()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, tipoFiltroTabla, busqueda, ordenFecha, fechaDesdeTabla, fechaHastaTabla])

  const limpiarFiltros = useCallback(() => {
    setTipoFiltroTabla('todos')
    setBusqueda('')
    const primerDia = new Date()
    primerDia.setDate(1)
    primerDia.setHours(0, 0, 0, 0)
    setFechaDesdeTabla(primerDia.toISOString().split('T')[0])
    setFechaHastaTabla(new Date().toISOString().split('T')[0])
  }, [])

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto)
  }

  // Calcular estadísticas del mes actual
  const hoy = new Date()
  const mesActual = hoy.getMonth()
  const añoActual = hoy.getFullYear()

  const movimientosMesActual = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual
  })

  const statsMesActual = {
    totalEgresos: movimientosMesActual.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0),
    totalIngresos: movimientosMesActual.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0),
    totalMovimientos: movimientosMesActual.length
  }
  statsMesActual.balance = statsMesActual.totalIngresos - statsMesActual.totalEgresos

  // Calcular estadísticas del rango personalizado
  const fechaDesdeObj = new Date(fechaDesde)
  const fechaHastaObj = new Date(fechaHasta)
  fechaHastaObj.setHours(23, 59, 59, 999)

  const movimientosRangoPersonalizado = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= fechaDesdeObj && fecha <= fechaHastaObj
  })

  const statsRangoPersonalizado = {
    totalEgresos: movimientosRangoPersonalizado.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0),
    totalIngresos: movimientosRangoPersonalizado.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0),
    totalMovimientos: movimientosRangoPersonalizado.length
  }
  statsRangoPersonalizado.balance = statsRangoPersonalizado.totalIngresos - statsRangoPersonalizado.totalEgresos

  if (loading || authLoading) {
    return <Loading message="Cargando balance..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title={`Balance - ${propiedad?.nombre_propiedad || 'Propiedad'}`}
        showBackButton
        onBackClick={volverCatalogo}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Filtro de Rango Personalizado - DEL AL */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide font-poppins">
              Comparativo
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-gray-600 font-poppins">Del:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              />
              <label className="text-xs font-semibold text-gray-600 font-poppins">Al:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white rounded-lg shadow-sm p-2.5 border border-red-200">
              <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Egresos</div>
              <div className="text-xl font-bold text-red-600 font-poppins">
                ${(statsRangoPersonalizado.totalEgresos / 1000).toFixed(1)}K
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-2.5 border border-green-200">
              <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Ingresos</div>
              <div className="text-xl font-bold text-green-600 font-poppins">
                ${(statsRangoPersonalizado.totalIngresos / 1000).toFixed(1)}K
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-2.5 border border-blue-200">
              <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Balance</div>
              <div className={`text-xl font-bold font-poppins ${statsRangoPersonalizado.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ${(statsRangoPersonalizado.balance / 1000).toFixed(1)}K
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-2.5 border border-purple-200">
              <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Movimientos</div>
              <div className="text-xl font-bold text-purple-600 font-poppins">
                {statsRangoPersonalizado.totalMovimientos}
              </div>
            </div>
          </div>
        </div>

        {/* Línea divisora */}
        <div className="border-t-2 border-gray-300 my-6"></div>

        {/* Tarjetas de Resumen - MES ACTUAL */}
        <div className="mb-2">
          <h3 className="text-xs font-bold text-ras-azul mb-2 uppercase tracking-wide font-poppins">
            Mes Actual <span className="text-gray-500 font-normal">(1 - {hoy.getDate()} {hoy.toLocaleDateString('es-MX', { month: 'short' })})</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-2.5 border border-red-200">
            <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Egresos</div>
            <div className="text-xl font-bold text-red-600 font-poppins">
              ${(statsMesActual.totalEgresos / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-2.5 border border-green-200">
            <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Ingresos</div>
            <div className="text-xl font-bold text-green-600 font-poppins">
              ${(statsMesActual.totalIngresos / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-2.5 border border-blue-200">
            <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Balance</div>
            <div className={`text-xl font-bold font-poppins ${statsMesActual.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ${(statsMesActual.balance / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-2.5 border border-purple-200">
            <div className="text-[10px] font-semibold text-gray-500 mb-0.5 font-poppins">Movimientos</div>
            <div className="text-xl font-bold text-purple-600 font-poppins">
              {statsMesActual.totalMovimientos}
            </div>
          </div>
        </div>

        {/* Gestión de Cuentas */}
        <div className="mb-6">
          <GestionCuentas
            propiedadId={propiedadId}
            propiedadNombre={propiedad?.nombre_propiedad || 'Propiedad'}
            onCuentaSeleccionada={(cuenta) => {
              // Opcional: hacer algo cuando se selecciona una cuenta
              console.log('Cuenta seleccionada:', cuenta)
            }}
          />
        </div>

        {/* Filtros - Búsqueda + Fechas */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Filtro de Fechas */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600 font-poppins whitespace-nowrap">
                Mostrar del:
              </label>
              <input
                type="date"
                value={fechaDesdeTabla}
                onChange={(e) => setFechaDesdeTabla(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              />
              <label className="text-xs font-semibold text-gray-600 font-poppins">al:</label>
              <input
                type="date"
                value={fechaHastaTabla}
                onChange={(e) => setFechaHastaTabla(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              />
            </div>

            {/* Búsqueda */}
            <div className="flex-1">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, responsable..."
                className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
            </div>

            {/* Botón limpiar filtros */}
            {(tipoFiltroTabla !== 'todos' || busqueda) && (
              <div className="flex items-center">
                <button
                  onClick={limpiarFiltros}
                  className="py-2 px-4 rounded-lg border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-ras-turquesa transition-all whitespace-nowrap"
                  title="Limpiar todos los filtros"
                >
                  <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Movimientos */}
        {movimientosFiltrados.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                  <tr>
                    {/* Header FECHA con dropdown */}
                    <th className="px-6 py-3 text-left text-xs font-semibold font-poppins uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Fecha</span>
                        <button
                          onClick={() => {
                            setShowFechaDropdownTabla(!showFechaDropdownTabla)
                            setShowTipoDropdownTabla(false)
                            setShowTituloDropdownTabla(false)
                            setShowResponsableDropdownTabla(false)
                          }}
                          className="hover:bg-white/20 rounded p-1 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {showFechaDropdownTabla && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowFechaDropdownTabla(false)}
                          />
                          <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] p-3">
                            <div className="text-sm text-gray-800 font-semibold mb-2">Ordenar por:</div>
                            <button
                              onClick={() => {
                                setOrdenFecha('desc')
                                setShowFechaDropdownTabla(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-ras-turquesa/5 rounded transition-colors ${
                                ordenFecha === 'desc' ? 'bg-ras-turquesa/10 font-semibold' : ''
                              }`}
                            >
                              Más reciente primero
                            </button>
                            <button
                              onClick={() => {
                                setOrdenFecha('asc')
                                setShowFechaDropdownTabla(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-ras-turquesa/5 rounded transition-colors ${
                                ordenFecha === 'asc' ? 'bg-ras-turquesa/10 font-semibold' : ''
                              }`}
                            >
                              Más antigua primero
                            </button>
                          </div>
                        </>
                      )}
                    </th>

                    {/* Header TIPO con dropdown */}
                    <th className="px-6 py-3 text-left text-xs font-semibold font-poppins uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Tipo</span>
                        <button
                          onClick={() => {
                            setShowTipoDropdownTabla(!showTipoDropdownTabla)
                            setShowFechaDropdownTabla(false)
                            setShowTituloDropdownTabla(false)
                            setShowResponsableDropdownTabla(false)
                          }}
                          className="hover:bg-white/20 rounded p-1 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {showTipoDropdownTabla && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowTipoDropdownTabla(false)}
                          />
                          <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px]">
                            <button
                              onClick={() => {
                                setTipoFiltroTabla('todos')
                                setShowTipoDropdownTabla(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-ras-turquesa/5 transition-colors ${
                                tipoFiltroTabla === 'todos' ? 'bg-ras-turquesa/10 font-semibold text-ras-azul' : 'text-gray-700'
                              }`}
                            >
                              Todos
                            </button>
                            <button
                              onClick={() => {
                                setTipoFiltroTabla('egreso')
                                setShowTipoDropdownTabla(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-ras-turquesa/5 transition-colors ${
                                tipoFiltroTabla === 'egreso' ? 'bg-red-50 font-semibold text-red-700' : 'text-gray-700'
                              }`}
                            >
                              ↓ Egresos
                            </button>
                            <button
                              onClick={() => {
                                setTipoFiltroTabla('ingreso')
                                setShowTipoDropdownTabla(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-ras-turquesa/5 transition-colors ${
                                tipoFiltroTabla === 'ingreso' ? 'bg-green-50 font-semibold text-green-700' : 'text-gray-700'
                              }`}
                            >
                              ↑ Ingresos
                            </button>
                          </div>
                        </>
                      )}
                    </th>

                    {/* Header TÍTULO */}
                    <th className="px-6 py-3 text-left text-xs font-semibold font-poppins uppercase">Título</th>

                    {/* Header CUENTA */}
                    <th className="px-6 py-3 text-left text-xs font-semibold font-poppins uppercase">Cuenta</th>

                    {/* Header MÉTODO */}
                    <th className="px-6 py-3 text-left text-xs font-semibold font-poppins uppercase">Método</th>

                    <th className="px-6 py-3 text-right text-xs font-semibold font-poppins uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movimientosFiltrados.map((mov) => (
                    <tr
                      key={mov.id}
                      className="hover:bg-ras-turquesa/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatearFecha(mov.fecha)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(mov.fecha).toLocaleDateString('es-MX', { weekday: 'long' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {mov.tipo === 'egreso' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                            ↓ Egreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                            ↑ Ingreso
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{mov.titulo}</div>
                        {mov.responsable && (
                          <div className="text-xs text-gray-500">👤 {mov.responsable}</div>
                        )}
                        {mov.referencia_pago && (
                          <div className="text-xs text-gray-500">Ref: {mov.referencia_pago}</div>
                        )}
                        {mov.tiene_factura && mov.numero_factura && (
                          <div className="text-xs text-blue-600">📄 Factura: {mov.numero_factura}</div>
                        )}
                        {mov.comprobante_url && (
                          <a
                            href={mov.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-ras-turquesa hover:underline inline-flex items-center gap-1"
                          >
                            📎 Ver comprobante
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {mov.cuenta_nombre || <span className="text-gray-400">Sin cuenta</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 capitalize">
                          {mov.metodo_pago ? mov.metodo_pago.replace('_', ' ') : <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-lg font-bold font-poppins ${mov.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                          {mov.tipo === 'egreso' ? '-' : '+'}{formatearMonto(mov.monto)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer con resumen */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="text-xs font-semibold text-gray-600 font-poppins">
                  Mostrando {movimientosFiltrados.length} movimiento{movimientosFiltrados.length !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-gray-600">Egresos: </span>
                    <span className="font-bold text-red-600">
                      -{formatearMonto(statsMesActual.totalEgresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ingresos: </span>
                    <span className="font-bold text-green-600">
                      +{formatearMonto(statsMesActual.totalIngresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Balance: </span>
                    <span className={`font-bold ${statsMesActual.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatearMonto(statsMesActual.balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={
              <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            title="No hay movimientos"
            description={movimientos.length === 0
              ? "Aún no tienes movimientos registrados"
              : "No se encontraron movimientos con los filtros aplicados"
            }
          />
        )}
      </main>
    </div>
  )
}
