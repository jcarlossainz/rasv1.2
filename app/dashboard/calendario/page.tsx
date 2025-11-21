'use client'

/**
 * CALENDARIO - Vista Consolidada con Múltiples Vistas y Filtros Multi-Selección
 * ==============================================================================
 * 
 * CARACTERÍSTICAS:
 * ✅ 3 vistas: Calendario, Semana, Listado
 * ✅ Filtros multi-selección: Por propietario(s) y por propiedad(es)
 * ✅ Diseño compacto y profesional
 * ✅ Colores RAS
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import NuevoTicket from '@/app/dashboard/tickets/NuevoTicket'

interface Ticket {
  id: string
  titulo: string
  fecha_programada: string
  monto_estimado: number
  pagado: boolean
  servicio_id: string | null
  tipo_ticket: string
  estado: string
  prioridad: string
  propiedad_id: string
  propiedad_nombre: string
  propietario_id: string
  propietario_nombre: string
}

interface DiaCalendario {
  fecha: Date
  dia: number
  esHoy: boolean
  esMesActual: boolean
  tickets: Ticket[]
  montoTotal: number
}

interface Propiedad {
  id: string
  nombre: string
  user_id: string
}

interface Propietario {
  id: string
  nombre: string
}

type VistaCalendario = 'calendario' | 'semana' | 'listado'

export default function CalendarioGlobalPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsFiltrados, setTicketsFiltrados] = useState<Ticket[]>([])
  const [mesActual, setMesActual] = useState(new Date())
  const [diasCalendario, setDiasCalendario] = useState<DiaCalendario[]>([])
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null)

  // Estados para vistas y filtros MULTI-SELECCIÓN
  const [vista, setVista] = useState<VistaCalendario>('calendario')
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [propiedadFiltro, setPropiedadFiltro] = useState<string[]>([])
  const [propietarioFiltro, setPropietarioFiltro] = useState<string[]>([])
  const [showPropietarioDropdown, setShowPropietarioDropdown] = useState(false)
  const [showPropiedadDropdown, setShowPropiedadDropdown] = useState(false)

  // Modal de Nuevo Ticket
  const [showNuevoTicketModal, setShowNuevoTicketModal] = useState(false)

  useEffect(() => {
    if (user?.id) {
      cargarDatos(user.id)
    }
  }, [user])

  useEffect(() => {
    if (tickets.length > 0) {
      aplicarFiltros()
    }
  }, [tickets, propiedadFiltro, propietarioFiltro])

  useEffect(() => {
    if (ticketsFiltrados.length >= 0) {
      generarCalendario()
    }
  }, [mesActual, ticketsFiltrados])

  const cargarDatos = async (userId: string) => {
    try {
      // Cargar propiedades
      const { data: propsPropias } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, owner_id')
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
          .select('id, nombre_propiedad, owner_id')
          .in('id', ids)
        propsCompartidasData = data || []
      }

      const todasPropiedades = [
        ...(propsPropias || []),
        ...propsCompartidasData
      ]

      setPropiedades(todasPropiedades)

      // Obtener propietarios únicos
      const userIds = [...new Set(todasPropiedades.map(p => p.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const propietariosUnicos = (profilesData || []).map(p => ({
        id: p.id,
        nombre: p.full_name || p.email.split('@')[0]
      }))

      setPropietarios(propietariosUnicos)

      if (todasPropiedades.length === 0) {
        setTickets([])
        return
      }

      // Cargar TODOS los tickets de los próximos 3 meses
      const hoy = new Date()
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)

      const propIds = todasPropiedades.map(p => p.id)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('fechas_pago_servicios')
        .select(`
          *,
          servicios_inmueble:servicio_id(
            nombre,
            tipo_servicio
          )
        `)
        .in('propiedad_id', propIds)
        .gte('fecha_pago', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_pago', fechaFin.toISOString().split('T')[0])
        .order('fecha_pago', { ascending: true })

      if (ticketsError) {
        console.error('Error cargando tickets:', ticketsError)
        toast.error('Error al cargar tickets')
        return
      }

      const ticketsTransformados = (ticketsData || []).map(ticket => {
        const propiedad = todasPropiedades.find(p => p.id === ticket.propiedad_id)
        const propietario = propietariosUnicos.find(p => p.id === propiedad?.owner_id)
        const servicio = ticket.servicios_inmueble

        return {
          id: ticket.id,
          titulo: servicio?.nombre || ticket.descripcion || 'Ticket sin título',
          fecha_programada: ticket.fecha_pago,
          monto_estimado: ticket.monto_estimado || 0,
          pagado: ticket.pagado || false,
          servicio_id: ticket.servicio_id,
          tipo_ticket: ticket.tipo_ticket || 'Pago',
          estado: ticket.estado || 'Pendiente',
          prioridad: ticket.prioridad || 'Media',
          propiedad_id: ticket.propiedad_id,
          propiedad_nombre: propiedad?.nombre_propiedad || 'Sin nombre',
          propietario_id: propiedad?.owner_id || '',
          propietario_nombre: propietario?.nombre || 'Desconocido'
        }
      })

      setTickets(ticketsTransformados)

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar calendario')
    }
  }

  const aplicarFiltros = () => {
    let ticketsF = [...tickets]

    if (propietarioFiltro.length > 0) {
      ticketsF = ticketsF.filter(t => propietarioFiltro.includes(t.propietario_id))
    }

    if (propiedadFiltro.length > 0) {
      ticketsF = ticketsF.filter(t => propiedadFiltro.includes(t.propiedad_id))
    }

    setTicketsFiltrados(ticketsF)
  }

  const togglePropietario = (id: string) => {
    if (propietarioFiltro.includes(id)) {
      setPropietarioFiltro(propietarioFiltro.filter(p => p !== id))
    } else {
      setPropietarioFiltro([...propietarioFiltro, id])
    }
  }

  const togglePropiedad = (id: string) => {
    if (propiedadFiltro.includes(id)) {
      setPropiedadFiltro(propiedadFiltro.filter(p => p !== id))
    } else {
      setPropiedadFiltro([...propiedadFiltro, id])
    }
  }

  const limpiarFiltros = () => {
    setPropietarioFiltro([])
    setPropiedadFiltro([])
  }

  const generarCalendario = () => {
    const año = mesActual.getFullYear()
    const mes = mesActual.getMonth()
    
    const primerDia = new Date(año, mes, 1)
    const diaSemana = primerDia.getDay()
    const diasMesAnterior = diaSemana === 0 ? 6 : diaSemana - 1
    const primerDiaVisible = new Date(año, mes, 1 - diasMesAnterior)
    
    const dias: DiaCalendario[] = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 42; i++) {
      const fecha = new Date(primerDiaVisible)
      fecha.setDate(primerDiaVisible.getDate() + i)
      
      const esMesActual = fecha.getMonth() === mes
      const esHoy = fecha.getTime() === hoy.getTime()
      
      const ticketsDelDia = ticketsFiltrados.filter(ticket => {
        const fechaTicket = new Date(ticket.fecha_programada)
        return fechaTicket.getDate() === fecha.getDate() &&
               fechaTicket.getMonth() === fecha.getMonth() &&
               fechaTicket.getFullYear() === fecha.getFullYear()
      })

      const montoTotal = ticketsDelDia.reduce((sum, t) => sum + t.monto_estimado, 0)

      dias.push({
        fecha,
        dia: fecha.getDate(),
        esHoy,
        esMesActual,
        tickets: ticketsDelDia,
        montoTotal
      })
    }
    
    setDiasCalendario(dias)
  }

  const cambiarMes = (incremento: number) => {
    const nuevaFecha = new Date(mesActual)
    nuevaFecha.setMonth(mesActual.getMonth() + incremento)
    setMesActual(nuevaFecha)
  }

  const getTipoIcon = (tipo: string) => {
    const iconos: { [key: string]: JSX.Element } = {
      agua: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      luz: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      gas: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      internet: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round"/>
        </svg>
      ),
      mantenimiento: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      seguridad: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
    
    return iconos[tipo] || iconos.mantenimiento
  }

  const nombreMes = mesActual.toLocaleDateString('es-MX', { 
    month: 'long', 
    year: 'numeric' 
  })

  // Obtener tickets de la semana actual
  const obtenerTicketsSemanaActual = () => {
    const hoy = new Date()
    const diaSemana = hoy.getDay()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
    lunes.setHours(0, 0, 0, 0)

    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    domingo.setHours(23, 59, 59, 999)

    return ticketsFiltrados.filter(ticket => {
      const fecha = new Date(ticket.fecha_programada)
      return fecha >= lunes && fecha <= domingo
    })
  }

  const ticketsSemana = obtenerTicketsSemanaActual()

  if (authLoading) {
    return <Loading message="Cargando calendario..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Calendario de Tickets"
        showBackButton
        showAddButton
        onBackClick={() => router.push('/dashboard')}
        onNuevoTicket={() => setShowNuevoTicketModal(true)}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Controles: Vistas + Filtros */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Selector de Vista */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2 font-poppins">
                Vista
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVista('calendario')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                    vista === 'calendario'
                      ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Mes
                </button>
                <button
                  onClick={() => setVista('semana')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                    vista === 'semana'
                      ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeLinecap="round"/>
                  </svg>
                  Semana
                </button>
                <button
                  onClick={() => setVista('listado')}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                    vista === 'listado'
                      ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  Lista
                </button>
              </div>
            </div>

            {/* Filtro por Propietario - MULTI-SELECCIÓN */}
            <div className="flex-1 relative">
              <label className="block text-xs font-semibold text-gray-600 mb-2 font-poppins">
                Propietario {propietarioFiltro.length > 0 && (
                  <span className="text-ras-turquesa">({propietarioFiltro.length})</span>
                )}
              </label>
              <button
                onClick={() => {
                  setShowPropietarioDropdown(!showPropietarioDropdown)
                  setShowPropiedadDropdown(false)
                }}
                className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent flex items-center justify-between"
              >
                <span className="truncate">
                  {propietarioFiltro.length === 0 
                    ? 'Seleccionar propietarios' 
                    : `${propietarioFiltro.length} seleccionado${propietarioFiltro.length > 1 ? 's' : ''}`
                  }
                </span>
                <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showPropietarioDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPropietarioDropdown(false)}
                  />
                  <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto">
                    {propietarios.map(prop => (
                      <label
                        key={prop.id}
                        className="flex items-center px-4 py-2 hover:bg-ras-turquesa/5 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={propietarioFiltro.includes(prop.id)}
                          onChange={() => togglePropietario(prop.id)}
                          className="w-4 h-4 text-ras-turquesa border-gray-300 rounded focus:ring-ras-turquesa"
                        />
                        <span className="ml-3 text-sm text-gray-700">{prop.nombre}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Filtro por Propiedad - MULTI-SELECCIÓN */}
            <div className="flex-1 relative">
              <label className="block text-xs font-semibold text-gray-600 mb-2 font-poppins">
                Propiedad {propiedadFiltro.length > 0 && (
                  <span className="text-ras-turquesa">({propiedadFiltro.length})</span>
                )}
              </label>
              <button
                onClick={() => {
                  setShowPropiedadDropdown(!showPropiedadDropdown)
                  setShowPropietarioDropdown(false)
                }}
                className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent flex items-center justify-between"
              >
                <span className="truncate">
                  {propiedadFiltro.length === 0 
                    ? 'Seleccionar propiedades' 
                    : `${propiedadFiltro.length} seleccionada${propiedadFiltro.length > 1 ? 's' : ''}`
                  }
                </span>
                <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showPropiedadDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPropiedadDropdown(false)}
                  />
                  <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto">
                    {propiedades
                      .filter(prop => propietarioFiltro.length === 0 || propietarioFiltro.includes(prop.user_id))
                      .map(prop => (
                        <label
                          key={prop.id}
                          className="flex items-center px-4 py-2 hover:bg-ras-turquesa/5 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={propiedadFiltro.includes(prop.id)}
                            onChange={() => togglePropiedad(prop.id)}
                            className="w-4 h-4 text-ras-turquesa border-gray-300 rounded focus:ring-ras-turquesa"
                          />
                          <span className="ml-3 text-sm text-gray-700">{prop.nombre}</span>
                        </label>
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* Botón limpiar filtros */}
            {(propietarioFiltro.length > 0 || propiedadFiltro.length > 0) && (
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  className="py-2 px-4 rounded-lg border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-ras-turquesa transition-all"
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

        {/* VISTA CALENDARIO */}
        {vista === 'calendario' && (
          <>
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => cambiarMes(-1)}
                  className="p-2 rounded-lg hover:bg-ras-turquesa/10 text-ras-azul transition-all hover:scale-110"
                  aria-label="Mes anterior"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-ras-azul capitalize font-poppins">{nombreMes}</h2>
                <button
                  onClick={() => cambiarMes(1)}
                  className="p-2 rounded-lg hover:bg-ras-turquesa/10 text-ras-azul transition-all hover:scale-110"
                  aria-label="Mes siguiente"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                  <div key={dia} className="text-center font-bold text-ras-azul text-xs py-1.5 font-poppins">
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {diasCalendario.map((dia, index) => {
                  const tieneTickets = dia.tickets.length > 0
                  return (
                    <div
                      key={index}
                      className={`min-h-[85px] p-1.5 rounded-lg border transition-all ${
                        dia.esMesActual ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'
                      } ${tieneTickets && dia.esMesActual ? 'hover:border-ras-turquesa hover:shadow-md cursor-pointer hover:scale-[1.02]' : ''}`}
                    >
                      <div className={`text-center text-xs font-bold mb-1 w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all font-poppins ${
                        dia.esHoy ? 'bg-ras-turquesa text-white shadow-md' : dia.esMesActual ? 'bg-gray-100 text-gray-700' : 'bg-transparent text-gray-400'
                      }`}>
                        {dia.dia}
                      </div>
                      {tieneTickets && dia.esMesActual && (
                        <div className="space-y-1">
                          {dia.tickets.slice(0, 2).map(ticket => (
                            <div
                              key={ticket.id}
                              onClick={() => setTicketSeleccionado(ticket)}
                              className="text-[10px] p-1 bg-gradient-to-r from-ras-turquesa/10 to-ras-azul/10 rounded border border-ras-turquesa/30 hover:from-ras-turquesa/20 hover:to-ras-azul/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-1 text-ras-azul">
                                <span className="flex-shrink-0">{ticket.pagado ? '✓' : '○'}</span>
                                <span className="truncate flex-1 font-semibold">{ticket.titulo}</span>
                              </div>
                            </div>
                          ))}
                          {dia.tickets.length > 2 && (
                            <div className="text-[9px] text-center text-ras-azul font-bold">
                              +{dia.tickets.length - 2} más
                            </div>
                          )}
                          <div className="text-[10px] text-center font-bold text-ras-azul">
                            ${(dia.montoTotal / 1000).toFixed(1)}K
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* VISTA SEMANA */}
        {vista === 'semana' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-ras-azul mb-4 font-poppins">
              Tickets de esta semana ({ticketsSemana.length})
            </h3>
            {ticketsSemana.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-medium">No hay tickets programados esta semana</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ticketsSemana
                  .sort((a, b) => new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime())
                  .map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setTicketSeleccionado(ticket)}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-ras-turquesa/5 to-ras-azul/5 rounded-xl border border-ras-turquesa/20 hover:border-ras-turquesa hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ras-turquesa/20 to-ras-azul/20 flex items-center justify-center text-ras-azul">
                        {ticket.pagado ? '✓' : '○'}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 font-poppins">{ticket.titulo}</div>
                        <div className="text-sm text-gray-600">{ticket.propiedad_nombre}</div>
                        <div className="text-xs text-gray-500">{ticket.propietario_nombre}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600">
                          {new Date(ticket.fecha_programada).toLocaleDateString('es-MX', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        <div className="text-lg font-bold text-green-600 font-poppins">
                          ${ticket.monto_estimado.toLocaleString('es-MX')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA LISTADO */}
        {vista === 'listado' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Propiedad</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Propietario</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ticketsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="font-medium">No hay tickets con los filtros seleccionados</p>
                      </td>
                    </tr>
                  ) : (
                    ticketsFiltrados
                      .sort((a, b) => new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime())
                      .map(ticket => (
                        <tr
                          key={ticket.id}
                          onClick={() => setTicketSeleccionado(ticket)}
                          className="hover:bg-ras-turquesa/5 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-ras-turquesa/20 to-ras-azul/20">
                              <span className="text-lg">{ticket.pagado ? '✓' : '○'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(ticket.fecha_programada).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(ticket.fecha_programada).toLocaleDateString('es-MX', { weekday: 'long' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{ticket.titulo}</div>
                            <div className="text-xs text-gray-500 capitalize">{ticket.tipo_ticket}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{ticket.propiedad_nombre}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{ticket.propietario_nombre}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-lg font-bold text-green-600 font-poppins">
                              ${ticket.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de detalle */}
        {ticketSeleccionado && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setTicketSeleccionado(null)}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-ras-azul to-ras-turquesa p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                      <span className="text-2xl">{ticketSeleccionado.pagado ? '✓' : '○'}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-poppins">{ticketSeleccionado.titulo}</h3>
                      <p className="text-sm text-white/90 font-roboto">{ticketSeleccionado.propiedad_nombre}</p>
                      <p className="text-xs text-white/80 font-roboto">{ticketSeleccionado.propietario_nombre}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTicketSeleccionado(null)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span className="text-sm font-semibold">Fecha programada</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {new Date(ticketSeleccionado.fecha_programada).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm font-semibold">Estado</span>
                  </div>
                  <span className="text-sm font-bold text-purple-600 capitalize">
                    {ticketSeleccionado.pagado ? '✅ Pagado' : '⏳ Pendiente'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-semibold">Monto</span>
                  </div>
                  <span className="text-xl font-bold text-green-600 font-poppins">
                    ${ticketSeleccionado.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={() => {
                    router.push(`/dashboard/catalogo/propiedad/${ticketSeleccionado.propiedad_id}/tickets`)
                    setTicketSeleccionado(null)
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all font-poppins flex items-center justify-center gap-2"
                >
                  <span>Ver todos los tickets</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Nuevo Ticket */}
        {showNuevoTicketModal && (
          <NuevoTicket
            isOpen={showNuevoTicketModal}
            onClose={() => setShowNuevoTicketModal(false)}
            onSuccess={() => {
              setShowNuevoTicketModal(false)
              if (user?.id) cargarDatos(user.id)
            }}
            propiedades={propiedades}
          />
        )}
      </main>
    </div>
  )
}