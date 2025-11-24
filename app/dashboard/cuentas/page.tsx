'use client'

/**
 * CUENTAS - Vista Consolidada
 * Muestra resumen financiero y tabla de movimientos (egresos e ingresos)
 * Diseño alineado con Calendario y Tickets RAS
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import { obtenerTodasLasCuentas, crearCuenta } from '@/services/cuentas-api'
import type { CuentaBancaria, NuevaCuentaBancaria } from '@/types/property'

interface Movimiento {
  id: string
  propiedad_nombre: string
  tipo: 'egreso' | 'ingreso'
  titulo: string
  monto: number
  responsable: string
  fecha: string
  propiedad_id: string
}

export default function CuentasGlobalPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movimientosFiltrados, setMovimientosFiltrados] = useState<Movimiento[]>([])
  const [propiedades, setPropiedades] = useState<{ id: string; nombre: string }[]>([])

  // Estados para cuentas bancarias
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cargandoCuentas, setCargandoCuentas] = useState(false)
  const [mostrarModalCuenta, setMostrarModalCuenta] = useState(false)

  // Estados del formulario de nueva cuenta
  const [nombreCuenta, setNombreCuenta] = useState('')
  const [propiedadCuenta, setPropiedadCuenta] = useState('')
  const [tipoMoneda, setTipoMoneda] = useState<'MXN' | 'USD'>('MXN')
  const [tipoCuenta, setTipoCuenta] = useState<'Banco' | 'Tarjeta' | 'Efectivo'>('Banco')
  const [banco, setBanco] = useState('')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [balanceInicial, setBalanceInicial] = useState('0')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [propiedadFiltroTabla, setPropiedadFiltroTabla] = useState<string>('todas')
  const [tipoFiltroTabla, setTipoFiltroTabla] = useState<string>('todos')
  const [ordenFecha, setOrdenFecha] = useState<'asc' | 'desc'>('asc') // asc = más antigua primero (por defecto)

  // Filtro de fechas para la TABLA (default = mes actual)
  const primerDiaMes = new Date()
  primerDiaMes.setDate(1)
  primerDiaMes.setHours(0, 0, 0, 0)

  const [fechaDesdeTabla, setFechaDesdeTabla] = useState(primerDiaMes.toISOString().split('T')[0])
  const [fechaHastaTabla, setFechaHastaTabla] = useState(new Date().toISOString().split('T')[0])

  // Dropdowns en headers de tabla
  const [showPropiedadDropdownTabla, setShowPropiedadDropdownTabla] = useState(false)
  const [showTipoDropdownTabla, setShowTipoDropdownTabla] = useState(false)
  const [showFechaDropdownTabla, setShowFechaDropdownTabla] = useState(false)
  const [showTituloDropdownTabla, setShowTituloDropdownTabla] = useState(false)
  const [showResponsableDropdownTabla, setShowResponsableDropdownTabla] = useState(false)

  // Filtros del comparativo (multi-select)
  const [propietarioComparativo, setPropietarioComparativo] = useState<string[]>([])
  const [propiedadComparativo, setPropiedadComparativo] = useState<string[]>([])
  const [showPropietarioDropdown, setShowPropietarioDropdown] = useState(false)
  const [showPropiedadDropdown, setShowPropiedadDropdown] = useState(false)

  // Filtro de rango de fechas personalizado (inicializado en el mes anterior por defecto)
  const mesAnteriorInicio = new Date()
  mesAnteriorInicio.setMonth(mesAnteriorInicio.getMonth() - 1)
  mesAnteriorInicio.setDate(1)

  const mesAnteriorFin = new Date()
  mesAnteriorFin.setDate(0) // Último día del mes anterior

  const [fechaDesde, setFechaDesde] = useState(mesAnteriorInicio.toISOString().split('T')[0])
  const [fechaHasta, setFechaHasta] = useState(mesAnteriorFin.toISOString().split('T')[0])

  useEffect(() => {
    if (user?.id) {
      cargarDatos(user.id)
      cargarCuentas()
    }
  }, [user])

  useEffect(() => {
    if (movimientos.length > 0) {
      aplicarFiltros()
    }
  }, [movimientos, propiedadFiltroTabla, tipoFiltroTabla, busqueda, ordenFecha, fechaDesdeTabla, fechaHastaTabla])

  const cargarDatos = async (userId: string) => {
    try {
      // Cargar propiedades
      const { data: propsPropias } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)

      const { data: propsCompartidas } = await supabase
        .from('propiedades_colaboradores')
        .select('propiedad_id')
        .eq('user_id', userId)

      let propsCompartidasData: any[] = []
      if (propsCompartidas && propsCompartidas.length > 0) {
        const ids = propsCompartidas.map(p => p.propiedad_id)
        const { data } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .in('id', ids)
        propsCompartidasData = data || []
      }

      const todasPropiedades = [
        ...(propsPropias || []).map(p => ({ id: p.id, nombre: p.nombre_propiedad })),
        ...propsCompartidasData.map(p => ({ id: p.id, nombre: p.nombre_propiedad }))
      ]

      setPropiedades(todasPropiedades)

      if (todasPropiedades.length === 0) {
        setMovimientos([])
        return
      }

      // Cargar EGRESOS (pagos CONCRETADOS/PAGADOS para estado de cuenta)
      const propIds = todasPropiedades.map(p => p.id)
      const { data: pagos } = await supabase
        .from('fechas_pago_servicios')
        .select(`
          id,
          fecha_pago,
          monto_estimado,
          propiedad_id,
          servicios_inmueble!inner(
            nombre,
            tipo_servicio
          )
        `)
        .in('propiedad_id', propIds)
        .eq('pagado', true) // CAMBIO CRÍTICO: Solo pagos concretados
        .limit(500) // Aumentado para tener más histórico

      // Transformar pagos a movimientos (egresos)
      const movimientosEgresos: Movimiento[] = (pagos || []).map(pago => {
        const propiedad = todasPropiedades.find(p => p.id === pago.propiedad_id)
        return {
          id: pago.id,
          propiedad_nombre: propiedad?.nombre || 'Sin nombre',
          tipo: 'egreso' as const,
          titulo: pago.servicios_inmueble.nombre,
          monto: pago.monto_estimado,
          responsable: 'Sistema',
          fecha: pago.fecha_pago,
          propiedad_id: pago.propiedad_id
        }
      })

      console.log('📊 Movimientos CONCRETADOS cargados:', movimientosEgresos.length)

      // TODO: Aquí agregarás los INGRESOS cuando estén en la BD
      const movimientosIngresos: Movimiento[] = []

      const todosMovimientos = [...movimientosEgresos, ...movimientosIngresos]
      setMovimientos(todosMovimientos)

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar cuentas')
    }
  }

  const cargarCuentas = async () => {
    try {
      setCargandoCuentas(true)
      const data = await obtenerTodasLasCuentas()
      setCuentas(data)
    } catch (error) {
      console.error('Error cargando cuentas bancarias:', error)
      toast.error('Error al cargar cuentas bancarias')
    } finally {
      setCargandoCuentas(false)
    }
  }

  const abrirModalNuevaCuenta = () => {
    setNombreCuenta('')
    setPropiedadCuenta('')
    setTipoMoneda('MXN')
    setTipoCuenta('Banco')
    setBanco('')
    setNumeroCuenta('')
    setBalanceInicial('0')
    setDescripcion('')
    setColor('#3B82F6')
    setMostrarModalCuenta(true)
  }

  const handleGuardarCuenta = async () => {
    if (!nombreCuenta.trim()) {
      toast.error('El nombre de la cuenta es obligatorio')
      return
    }

    if (!propiedadCuenta) {
      toast.error('Debes seleccionar una propiedad')
      return
    }

    if (parseFloat(balanceInicial) < 0) {
      toast.error('El balance inicial no puede ser negativo')
      return
    }

    setGuardandoCuenta(true)

    try {
      const cuentaData: NuevaCuentaBancaria = {
        nombre_cuenta: nombreCuenta.trim(),
        moneda: tipoMoneda,
        tipo_cuenta: tipoCuenta,
        banco: banco.trim() || undefined,
        numero_cuenta: numeroCuenta.trim() || undefined,
        saldo_inicial: parseFloat(balanceInicial),
        descripcion: descripcion.trim() || undefined,
        propiedades_ids: propiedadCuenta ? [propiedadCuenta] : undefined
      }

      await crearCuenta(cuentaData)
      await cargarCuentas()
      setMostrarModalCuenta(false)
      toast.success('Cuenta creada exitosamente')
    } catch (error: any) {
      console.error('Error guardando cuenta:', error)
      toast.error(error.message || 'Error al crear la cuenta')
    } finally {
      setGuardandoCuenta(false)
    }
  }

  const formatoMoneda = (monto: number, moneda?: 'MXN' | 'USD') => {
    const currencyCode = moneda || 'MXN' // Default a MXN si no hay moneda
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currencyCode
    }).format(monto)
  }

  const aplicarFiltros = () => {
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

    // Filtro por propiedad
    if (propiedadFiltroTabla !== 'todas') {
      filtrados = filtrados.filter(m => m.propiedad_id === propiedadFiltroTabla)
    }

    // Filtro por tipo
    if (tipoFiltroTabla !== 'todos') {
      filtrados = filtrados.filter(m => m.tipo === tipoFiltroTabla)
    }

    // Búsqueda
    if (busqueda) {
      const searchLower = busqueda.toLowerCase()
      filtrados = filtrados.filter(m =>
        m.propiedad_nombre.toLowerCase().includes(searchLower) ||
        m.titulo.toLowerCase().includes(searchLower) ||
        m.responsable.toLowerCase().includes(searchLower)
      )
    }

    // Ordenar por fecha según el estado
    if (ordenFecha === 'desc') {
      // Más reciente primero
      filtrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    } else {
      // Más antigua primero (por defecto)
      filtrados.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    }

    setMovimientosFiltrados(filtrados)
  }

  const limpiarFiltros = () => {
    setPropiedadFiltroTabla('todas')
    setTipoFiltroTabla('todos')
    setBusqueda('')
    // Resetear fechas al mes actual
    const primerDia = new Date()
    primerDia.setDate(1)
    primerDia.setHours(0, 0, 0, 0)
    setFechaDesdeTabla(primerDia.toISOString().split('T')[0])
    setFechaHastaTabla(new Date().toISOString().split('T')[0])
  }

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
  // IMPORTANTE: Usar movimientos SIN los filtros de la tabla
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

  // Calcular estadísticas del rango personalizado (Del - Al)
  // IMPORTANTE: Usar movimientos SIN los filtros de la tabla
  const fechaDesdeObj = new Date(fechaDesde)
  const fechaHastaObj = new Date(fechaHasta)
  fechaHastaObj.setHours(23, 59, 59, 999)
  
  const movimientosRangoPersonalizado = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    const dentroDelRango = fecha >= fechaDesdeObj && fecha <= fechaHastaObj
    
    // Aplicar filtro de propiedad si hay selección
    if (propiedadComparativo.length > 0) {
      return dentroDelRango && propiedadComparativo.includes(m.propiedad_id)
    }
    
    return dentroDelRango
  })

  // Debug del comparativo
  console.log('🔍 COMPARATIVO DEBUG:', {
    fechaDesde,
    fechaHasta,
    totalMovimientos: movimientos.length,
    movimientosEnRango: movimientosRangoPersonalizado.length,
    propiedadComparativo,
    primeraFecha: movimientos[0]?.fecha,
    ultimaFecha: movimientos[movimientos.length - 1]?.fecha
  })

  const statsRangoPersonalizado = {
    totalEgresos: movimientosRangoPersonalizado.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0),
    totalIngresos: movimientosRangoPersonalizado.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0),
    totalMovimientos: movimientosRangoPersonalizado.length
  }
  statsRangoPersonalizado.balance = statsRangoPersonalizado.totalIngresos - statsRangoPersonalizado.totalEgresos

  const tiposOpciones = [
    { id: 'egreso', label: 'Egresos' },
    { id: 'ingreso', label: 'Ingresos' }
  ]

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  if (authLoading) {
    return <Loading message="Cargando cuentas..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Cuentas"
        showHomeButton
        showBackButton
        showAddButton
        showUserInfo={true}
        userEmail={user?.email}
        onBackClick={() => router.push('/dashboard')}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Filtro de Rango Personalizado - DEL AL + PROPIEDAD */}
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
              
              <span className="text-gray-400 mx-1">|</span>
              
              {/* Dropdown Propietario */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowPropietarioDropdown(!showPropietarioDropdown)
                    setShowPropiedadDropdown(false)
                  }}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa bg-white hover:bg-gray-50 font-semibold text-gray-700 flex items-center gap-2"
                >
                  <span>Propietario {propietarioComparativo.length > 0 && `(${propietarioComparativo.length})`}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPropietarioDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowPropietarioDropdown(false)}
                    />
                    <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] max-h-60 overflow-y-auto">
                      <label className="flex items-center px-4 py-2 hover:bg-ras-turquesa/5 cursor-pointer border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={propietarioComparativo.length === 0}
                          onChange={() => setPropietarioComparativo([])}
                          className="w-4 h-4 text-ras-turquesa border-gray-300 rounded focus:ring-ras-turquesa"
                        />
                        <span className="ml-3 text-sm text-gray-700 font-semibold">Todos</span>
                      </label>
                      {/* TODO: Aquí irán los propietarios cuando estén disponibles en la BD */}
                      <div className="px-4 py-3 text-xs text-gray-500 italic">
                        Propietarios próximamente
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Dropdown Propiedad */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowPropiedadDropdown(!showPropiedadDropdown)
                    setShowPropietarioDropdown(false)
                  }}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa bg-white hover:bg-gray-50 font-semibold text-gray-700 flex items-center gap-2"
                >
                  <span>Propiedad {propiedadComparativo.length > 0 && `(${propiedadComparativo.length})`}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showPropiedadDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowPropiedadDropdown(false)}
                    />
                    <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] max-h-60 overflow-y-auto">
                      <label className="flex items-center px-4 py-2 hover:bg-ras-turquesa/5 cursor-pointer border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={propiedadComparativo.length === 0}
                          onChange={() => setPropiedadComparativo([])}
                          className="w-4 h-4 text-ras-turquesa border-gray-300 rounded focus:ring-ras-turquesa"
                        />
                        <span className="ml-3 text-sm text-gray-700 font-semibold">Todas</span>
                      </label>
                      {propiedades.map(prop => (
                        <label
                          key={prop.id}
                          className="flex items-center px-4 py-2 hover:bg-ras-turquesa/5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={propiedadComparativo.includes(prop.id)}
                            onChange={() => {
                              if (propiedadComparativo.includes(prop.id)) {
                                setPropiedadComparativo(propiedadComparativo.filter(p => p !== prop.id))
                              } else {
                                setPropiedadComparativo([...propiedadComparativo, prop.id])
                              }
                            }}
                            className="w-4 h-4 text-ras-turquesa border-gray-300 rounded focus:ring-ras-turquesa"
                          />
                          <span className="ml-3 text-sm text-gray-700">{prop.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
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

        {/* Sección de Cuentas Bancarias */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cuentas Bancarias</h3>
              <p className="text-sm text-gray-500">Gestiona tus cuentas y balances</p>
            </div>
            <button
              onClick={abrirModalNuevaCuenta}
              className="px-4 py-2 bg-ras-azul text-white rounded-md hover:bg-ras-turquesa transition-colors flex items-center gap-2 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Cuenta
            </button>
          </div>

          {cargandoCuentas ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-ras-azul border-t-transparent rounded-full" />
            </div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cuentas registradas</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza creando una cuenta bancaria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuentas.map(cuenta => (
                <div
                  key={cuenta.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cuenta.color || '#3B82F6' }}
                      />
                      <h4 className="font-semibold text-gray-900">{cuenta.nombre}</h4>
                    </div>
                  </div>

                  {/* Tipo y banco */}
                  <div className="space-y-1 mb-3">
                    <p className="text-xs text-gray-500">{cuenta.tipo_cuenta}</p>
                    {cuenta.banco && (
                      <p className="text-xs text-gray-600">{cuenta.banco}</p>
                    )}
                    {cuenta.numero_cuenta && (
                      <p className="text-xs text-gray-500">•••• {cuenta.numero_cuenta}</p>
                    )}
                  </div>

                  {/* Balance */}
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs text-gray-500 mb-1">Saldo actual</p>
                    <p className={`text-xl font-bold ${cuenta.saldo_actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatoMoneda(cuenta.saldo_actual || 0, cuenta.moneda)}
                    </p>
                  </div>

                  {cuenta.descripcion && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2">{cuenta.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
                placeholder="Buscar propiedad, título, responsable..."
                className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
            </div>

            {/* Botón limpiar filtros */}
            {(propiedadFiltroTabla !== 'todas' || tipoFiltroTabla !== 'todos' || busqueda) && (
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

        {/* Tabla de Movimientos - IGUAL AL CALENDARIO */}
        {movimientosFiltrados.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                  <tr>
                    {/* Header FECHA con dropdown */}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Fecha</span>
                        <button
                          onClick={() => {
                            setShowFechaDropdownTabla(!showFechaDropdownTabla)
                            setShowTipoDropdownTabla(false)
                            setShowPropiedadDropdownTabla(false)
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Tipo</span>
                        <button
                          onClick={() => {
                            setShowTipoDropdownTabla(!showTipoDropdownTabla)
                            setShowPropiedadDropdownTabla(false)
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
                    
                    {/* Header TÍTULO con dropdown */}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Título</span>
                        <button
                          onClick={() => {
                            setShowTituloDropdownTabla(!showTituloDropdownTabla)
                            setShowTipoDropdownTabla(false)
                            setShowPropiedadDropdownTabla(false)
                            setShowFechaDropdownTabla(false)
                            setShowResponsableDropdownTabla(false)
                          }}
                          className="hover:bg-white/20 rounded p-1 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {showTituloDropdownTabla && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowTituloDropdownTabla(false)}
                          />
                          <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] p-3">
                            <div className="text-sm text-gray-800 font-semibold mb-2">Ordenar por:</div>
                            <button
                              onClick={() => {
                                // Implementar ordenamiento A-Z
                                setShowTituloDropdownTabla(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-ras-turquesa/5 rounded transition-colors"
                            >
                              A → Z
                            </button>
                            <button
                              onClick={() => {
                                // Implementar ordenamiento Z-A
                                setShowTituloDropdownTabla(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-ras-turquesa/5 rounded transition-colors"
                            >
                              Z → A
                            </button>
                          </div>
                        </>
                      )}
                    </th>
                    
                    {/* Header PROPIEDAD con dropdown */}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Propiedad</span>
                        <button
                          onClick={() => {
                            setShowPropiedadDropdownTabla(!showPropiedadDropdownTabla)
                            setShowTipoDropdownTabla(false)
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
                      {showPropiedadDropdownTabla && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowPropiedadDropdownTabla(false)}
                          />
                          <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[250px] max-h-80 overflow-y-auto">
                            <button
                              onClick={() => {
                                setPropiedadFiltroTabla('todas')
                                setShowPropiedadDropdownTabla(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-ras-turquesa/5 transition-colors border-b border-gray-100 ${
                                propiedadFiltroTabla === 'todas' ? 'bg-ras-turquesa/10 font-semibold text-ras-azul' : 'text-gray-700'
                              }`}
                            >
                              Todas las propiedades
                            </button>
                            {propiedades.map(prop => (
                              <button
                                key={prop.id}
                                onClick={() => {
                                  setPropiedadFiltroTabla(prop.id)
                                  setShowPropiedadDropdownTabla(false)
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-ras-turquesa/5 transition-colors ${
                                  propiedadFiltroTabla === prop.id ? 'bg-ras-turquesa/10 font-semibold text-ras-azul' : 'text-gray-700'
                                }`}
                              >
                                {prop.nombre}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </th>
                    
                    {/* Header RESPONSABLE con dropdown */}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase relative">
                      <div className="flex items-center gap-2">
                        <span>Responsable</span>
                        <button
                          onClick={() => {
                            setShowResponsableDropdownTabla(!showResponsableDropdownTabla)
                            setShowTipoDropdownTabla(false)
                            setShowPropiedadDropdownTabla(false)
                            setShowFechaDropdownTabla(false)
                            setShowTituloDropdownTabla(false)
                          }}
                          className="hover:bg-white/20 rounded p-1 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {showResponsableDropdownTabla && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowResponsableDropdownTabla(false)}
                          />
                          <div className="absolute z-50 mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] p-3">
                            <div className="text-sm text-gray-800 font-semibold mb-2">Ordenar por:</div>
                            <button
                              onClick={() => {
                                // Implementar ordenamiento A-Z
                                setShowResponsableDropdownTabla(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-ras-turquesa/5 rounded transition-colors"
                            >
                              A → Z
                            </button>
                            <button
                              onClick={() => {
                                // Implementar ordenamiento Z-A
                                setShowResponsableDropdownTabla(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-ras-turquesa/5 rounded transition-colors"
                            >
                              Z → A
                            </button>
                          </div>
                        </>
                      )}
                    </th>
                    
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase"></th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase"></th>
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{mov.propiedad_nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{mov.responsable}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-lg font-bold font-poppins ${mov.tipo === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                          {mov.tipo === 'egreso' ? '-' : '+'}{formatearMonto(mov.monto)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/propiedad/${mov.propiedad_id}/cuentas`)}
                            className="p-2 hover:bg-ras-turquesa/10 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <svg className="w-5 h-5 text-ras-azul" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              // TODO: Implementar edición
                              toast.info('Función de edición próximamente')
                            }}
                            className="p-2 hover:bg-ras-azul/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5 text-ras-azul" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
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

        {/* Modal para crear cuenta */}
        {mostrarModalCuenta && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Nueva Cuenta</h2>
                <button
                  onClick={() => setMostrarModalCuenta(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={guardandoCuenta}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la cuenta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombreCuenta}
                    onChange={(e) => setNombreCuenta(e.target.value)}
                    placeholder="Ej: Cuenta principal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                  />
                </div>

                {/* Propiedad (dropdown obligatorio) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Propiedad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={propiedadCuenta}
                    onChange={(e) => setPropiedadCuenta(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                  >
                    <option value="">Seleccionar propiedad...</option>
                    {propiedades.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de cuenta y moneda */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de cuenta <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tipoCuenta}
                      onChange={(e) => setTipoCuenta(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                    >
                      <option value="Banco">Banco</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Moneda <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tipoMoneda}
                      onChange={(e) => setTipoMoneda(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                    >
                      <option value="MXN">MXN (Pesos)</option>
                      <option value="USD">USD (Dólares)</option>
                    </select>
                  </div>
                </div>

                {/* Banco (solo si no es efectivo) */}
                {tipoCuenta !== 'Efectivo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                    <input
                      type="text"
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      placeholder="Ej: BBVA, Santander, Banamex..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                    />
                  </div>
                )}

                {/* Número de cuenta */}
                {tipoCuenta !== 'Efectivo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Últimos 4 dígitos</label>
                    <input
                      type="text"
                      value={numeroCuenta}
                      onChange={(e) => setNumeroCuenta(e.target.value)}
                      placeholder="1234"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                    />
                  </div>
                )}

                {/* Balance inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance inicial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={balanceInicial}
                    onChange={(e) => setBalanceInicial(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    El balance actual se calculará automáticamente con ingresos y egresos
                  </p>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color (para identificación visual)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{color}</span>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={2}
                    placeholder="Notas adicionales sobre esta cuenta..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setMostrarModalCuenta(false)}
                  disabled={guardandoCuenta}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCuenta}
                  disabled={guardandoCuenta}
                  className="px-4 py-2 bg-ras-azul text-white rounded-md hover:bg-ras-turquesa transition-colors disabled:opacity-50"
                >
                  {guardandoCuenta ? 'Guardando...' : 'Crear Cuenta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}