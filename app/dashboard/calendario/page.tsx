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

interface Reserva {
  id: string
  titulo: string
  fecha_inicio: string
  fecha_fin: string
  origen: 'airbnb' | 'booking' | 'expedia' | 'manual' | 'google_vr' | string
  estado: string
  propiedad_id: string
  propiedad_nombre: string
  propietario_id: string
  propietario_nombre: string
  notas?: string
}

const COLORES_PLATAFORMA: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  airbnb: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', gradient: 'from-red-500 to-red-600' },
  booking: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-600' },
  expedia: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', gradient: 'from-yellow-500 to-yellow-600' },
  manual: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', gradient: 'from-gray-500 to-gray-600' },
  google_vr: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', gradient: 'from-green-500 to-green-600' },
  default: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' }
}

interface DiaCalendario {
  fecha: Date
  dia: number
  esHoy: boolean
  esMesActual: boolean
  tickets: Ticket[]
  reservas: Reserva[]
  montoTotal: number
}

interface Propiedad {
  id: string
  nombre_propiedad: string
  owner_id: string
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
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [reservasFiltradas, setReservasFiltradas] = useState<Reserva[]>([])
  const [mesActual, setMesActual] = useState(new Date())
  const [semanaActual, setSemanaActual] = useState(new Date())
  const [diasCalendario, setDiasCalendario] = useState<DiaCalendario[]>([])
  const [diasSemana, setDiasSemana] = useState<DiaCalendario[]>([])
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null)

  // Estados para vistas y filtros MULTI-SELECCIÓN
  const [vista, setVista] = useState<VistaCalendario>('calendario')
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])

  // Estado para expansión inline de días en calendario
  const [diaExpandido, setDiaExpandido] = useState<string | null>(null)
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
    if (tickets.length > 0 || reservas.length > 0) {
      aplicarFiltros()
    }
  }, [tickets, reservas, propiedadFiltro, propietarioFiltro])

  useEffect(() => {
    if (ticketsFiltrados.length >= 0 || reservasFiltradas.length >= 0) {
      generarCalendario()
    }
  }, [mesActual, ticketsFiltrados, reservasFiltradas])

  useEffect(() => {
    if (ticketsFiltrados.length >= 0 || reservasFiltradas.length >= 0) {
      generarSemana()
    }
  }, [semanaActual, ticketsFiltrados, reservasFiltradas])

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

      let propsCompartidasData: Propiedad[] = []
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
      const userIds = [...new Set(todasPropiedades.map(p => p.owner_id))]
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

      // Cargar TODOS los tickets del próximo año (de AMBAS tablas)
      const hoy = new Date()
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1) // Incluir mes anterior
      const fechaFin = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate()) // Hasta 1 año adelante

      const propIds = todasPropiedades.map(p => p.id)

      // Cargar TODOS los tickets desde tabla unificada
      const { data: todosTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          titulo,
          fecha_programada,
          monto_estimado,
          pagado,
          servicio_id,
          tipo,
          tipo_ticket,
          estado,
          prioridad,
          propiedad_id
        `)
        .in('propiedad_id', propIds)
        .gte('fecha_programada', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_programada', fechaFin.toISOString().split('T')[0])
        .order('fecha_programada', { ascending: true })

      if (ticketsError) {
        console.error('Error cargando tickets:', ticketsError)
      }

      // Transformar tickets
      const ticketsTransformados = (todosTickets || []).map(ticket => {
        const propiedad = todasPropiedades.find(p => p.id === ticket.propiedad_id)
        const propietario = propietariosUnicos.find(p => p.id === propiedad?.owner_id)

        // Determinar tipo de ticket
        const tipoTicket = ticket.tipo_ticket || ticket.tipo || (ticket.servicio_id ? 'Servicio' : 'Manual')

        return {
          id: ticket.id,
          titulo: ticket.titulo || 'Ticket sin título',
          fecha_programada: ticket.fecha_programada,
          monto_estimado: ticket.monto_estimado || 0,
          pagado: ticket.pagado || false,
          servicio_id: ticket.servicio_id,
          tipo_ticket: tipoTicket,
          estado: ticket.estado || 'pendiente',
          prioridad: ticket.prioridad || 'Media',
          propiedad_id: ticket.propiedad_id,
          propiedad_nombre: propiedad?.nombre_propiedad || 'Sin nombre',
          propietario_id: propiedad?.owner_id || '',
          propietario_nombre: propietario?.nombre || 'Desconocido'
        }
      })

      setTickets(ticketsTransformados)

      // Cargar reservaciones de calendar_events
      const { data: eventosData, error: eventosError } = await supabase
        .from('calendar_events')
        .select(`
          id,
          titulo,
          fecha_inicio,
          fecha_fin,
          origen,
          estado,
          propiedad_id,
          notas
        `)
        .in('propiedad_id', propIds)
        .or(`fecha_inicio.gte.${fechaInicio.toISOString().split('T')[0]},fecha_fin.gte.${fechaInicio.toISOString().split('T')[0]}`)
        .lte('fecha_inicio', fechaFin.toISOString().split('T')[0])
        .order('fecha_inicio', { ascending: true })

      if (eventosError) {
        console.error('Error cargando reservaciones:', eventosError)
      }

      // Transformar reservaciones
      const reservasTransformadas = (eventosData || []).map(evento => {
        const propiedad = todasPropiedades.find(p => p.id === evento.propiedad_id)
        const propietario = propietariosUnicos.find(p => p.id === propiedad?.owner_id)

        return {
          id: evento.id,
          titulo: evento.titulo || 'Reservación',
          fecha_inicio: evento.fecha_inicio,
          fecha_fin: evento.fecha_fin,
          origen: evento.origen || 'manual',
          estado: evento.estado || 'confirmada',
          propiedad_id: evento.propiedad_id,
          propiedad_nombre: propiedad?.nombre_propiedad || 'Sin nombre',
          propietario_id: propiedad?.owner_id || '',
          propietario_nombre: propietario?.nombre || 'Desconocido',
          notas: evento.notas
        }
      })

      setReservas(reservasTransformadas)

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar calendario')
    }
  }

  const aplicarFiltros = () => {
    let ticketsF = [...tickets]
    let reservasF = [...reservas]

    if (propietarioFiltro.length > 0) {
      ticketsF = ticketsF.filter(t => propietarioFiltro.includes(t.propietario_id))
      reservasF = reservasF.filter(r => propietarioFiltro.includes(r.propietario_id))
    }

    if (propiedadFiltro.length > 0) {
      ticketsF = ticketsF.filter(t => propiedadFiltro.includes(t.propiedad_id))
      reservasF = reservasF.filter(r => propiedadFiltro.includes(r.propiedad_id))
    }

    setTicketsFiltrados(ticketsF)
    setReservasFiltradas(reservasF)
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

      // Filtrar reservaciones que incluyen este día
      const reservasDelDia = reservasFiltradas.filter(reserva => {
        const fechaInicio = new Date(reserva.fecha_inicio)
        const fechaFin = new Date(reserva.fecha_fin)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin.setHours(0, 0, 0, 0)
        const fechaDia = new Date(fecha)
        fechaDia.setHours(0, 0, 0, 0)
        return fechaDia >= fechaInicio && fechaDia <= fechaFin
      })

      const montoTotal = ticketsDelDia.reduce((sum, t) => sum + t.monto_estimado, 0)

      dias.push({
        fecha,
        dia: fecha.getDate(),
        esHoy,
        esMesActual,
        tickets: ticketsDelDia,
        reservas: reservasDelDia,
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

  const generarSemana = () => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    // Obtener el lunes de la semana actual
    const diaSemana = semanaActual.getDay()
    const lunes = new Date(semanaActual)
    lunes.setDate(semanaActual.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
    lunes.setHours(0, 0, 0, 0)

    const dias: DiaCalendario[] = []

    // Generar 7 días (Lun-Dom)
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(lunes)
      fecha.setDate(lunes.getDate() + i)

      const esHoy = fecha.getTime() === hoy.getTime()

      const ticketsDelDia = ticketsFiltrados.filter(ticket => {
        const fechaTicket = new Date(ticket.fecha_programada)
        return fechaTicket.getDate() === fecha.getDate() &&
               fechaTicket.getMonth() === fecha.getMonth() &&
               fechaTicket.getFullYear() === fecha.getFullYear()
      })

      // Filtrar reservaciones que incluyen este día
      const reservasDelDia = reservasFiltradas.filter(reserva => {
        const fechaInicio = new Date(reserva.fecha_inicio)
        const fechaFin = new Date(reserva.fecha_fin)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin.setHours(0, 0, 0, 0)
        const fechaDia = new Date(fecha)
        fechaDia.setHours(0, 0, 0, 0)
        return fechaDia >= fechaInicio && fechaDia <= fechaFin
      })

      const montoTotal = ticketsDelDia.reduce((sum, t) => sum + t.monto_estimado, 0)

      dias.push({
        fecha,
        dia: fecha.getDate(),
        esHoy,
        esMesActual: true, // Todos los días de la semana se muestran igual
        tickets: ticketsDelDia,
        reservas: reservasDelDia,
        montoTotal
      })
    }

    setDiasSemana(dias)
  }

  const cambiarSemana = (incremento: number) => {
    const nuevaFecha = new Date(semanaActual)
    nuevaFecha.setDate(semanaActual.getDate() + (incremento * 7))
    setSemanaActual(nuevaFecha)
  }

  const nombreMes = mesActual.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric'
  })

  // Obtener rango de fechas de la semana
  const getNombreSemana = () => {
    const diaSemana = semanaActual.getDay()
    const lunes = new Date(semanaActual)
    lunes.setDate(semanaActual.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))

    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)

    const mesLunes = lunes.toLocaleDateString('es-MX', { month: 'short' })
    const mesDomingo = domingo.toLocaleDateString('es-MX', { month: 'short' })
    const año = lunes.getFullYear()

    if (mesLunes === mesDomingo) {
      return `${lunes.getDate()}-${domingo.getDate()} ${mesLunes} ${año}`
    } else {
      return `${lunes.getDate()} ${mesLunes} - ${domingo.getDate()} ${mesDomingo} ${año}`
    }
  }

  const nombreSemana = getNombreSemana()

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  if (authLoading) {
    return <Loading message="Cargando calendario..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Planificador"
        showHomeButton
        showBackButton
        showAddButton
        showUserInfo={true}
        userEmail={user?.email}
        onBackClick={() => router.push('/dashboard')}
        onNuevoTicket={() => setShowNuevoTicketModal(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Controles: Filtros */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">

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
                      .filter(prop => propietarioFiltro.length === 0 || propietarioFiltro.includes(prop.owner_id))
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
                          <span className="ml-3 text-sm text-gray-700">{prop.nombre_propiedad}</span>
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
              <div className="flex items-center justify-between gap-4">
                {/* Navegación de mes */}
                <div className="flex items-center gap-4">
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

                {/* Selector de Vista */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setVista('calendario')}
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                  const tieneReservas = dia.reservas.length > 0
                  const tieneContenido = tieneTickets || tieneReservas
                  const diaKey = dia.fecha.toISOString().split('T')[0]
                  const estaExpandido = diaExpandido === diaKey
                  const ticketsMostrados = estaExpandido ? dia.tickets : dia.tickets.slice(0, 1)
                  const reservasMostradas = estaExpandido ? dia.reservas : dia.reservas.slice(0, 1)
                  const itemsOcultos = (dia.tickets.length - 1) + (dia.reservas.length - 1)

                  return (
                    <div
                      key={index}
                      className={`${estaExpandido ? 'min-h-[200px]' : 'min-h-[85px]'} p-1.5 rounded-lg border transition-all ${
                        dia.esMesActual ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'
                      } ${estaExpandido ? 'border-ras-turquesa shadow-lg z-10' : ''}`}
                    >
                      <div className={`text-center text-xs font-bold mb-1 w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all font-poppins ${
                        dia.esHoy ? 'bg-ras-turquesa text-white shadow-md' : dia.esMesActual ? 'bg-gray-100 text-gray-700' : 'bg-transparent text-gray-400'
                      }`}>
                        {dia.dia}
                      </div>
                      {tieneContenido && dia.esMesActual && (
                        <div className="space-y-1">
                          {/* Reservaciones */}
                          {reservasMostradas.map(reserva => {
                            const colores = COLORES_PLATAFORMA[reserva.origen] || COLORES_PLATAFORMA.default
                            return (
                              <div
                                key={reserva.id}
                                onClick={() => setReservaSeleccionada(reserva)}
                                className={`text-[10px] p-1 ${colores.bg} rounded border ${colores.border} hover:opacity-80 transition-all cursor-pointer`}
                              >
                                <div className={`flex items-center gap-1 ${colores.text}`}>
                                  <span className="flex-shrink-0">🏠</span>
                                  <span className="truncate flex-1 font-semibold">{reserva.titulo}</span>
                                </div>
                                <div className="text-[9px] text-gray-600 mt-0.5 truncate">
                                  {reserva.propiedad_nombre}
                                </div>
                              </div>
                            )
                          })}
                          {/* Tickets */}
                          {ticketsMostrados.map(ticket => (
                            <div
                              key={ticket.id}
                              onClick={() => setTicketSeleccionado(ticket)}
                              className="text-[10px] p-1 bg-gradient-to-r from-ras-turquesa/10 to-ras-azul/10 rounded border border-ras-turquesa/30 hover:from-ras-turquesa/20 hover:to-ras-azul/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-1 text-ras-azul">
                                <span className="flex-shrink-0">{ticket.pagado ? '✓' : '○'}</span>
                                <span className="truncate flex-1 font-semibold">{ticket.titulo}</span>
                              </div>
                              <div className="text-[9px] text-gray-600 mt-0.5">
                                ${ticket.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                              </div>
                            </div>
                          ))}
                          {itemsOcultos > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDiaExpandido(estaExpandido ? null : diaKey)
                              }}
                              className="w-full text-[9px] text-center text-white bg-ras-azul hover:bg-ras-turquesa font-bold py-1 px-2 rounded transition-all cursor-pointer"
                            >
                              {estaExpandido ? '▲ Contraer' : `▼ Ver ${itemsOcultos} más`}
                            </button>
                          )}
                          {tieneTickets && (
                            <div className="text-[10px] text-center font-bold text-ras-azul">
                              ${(dia.montoTotal / 1000).toFixed(1)}K
                            </div>
                          )}
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
          <>
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
              <div className="flex items-center justify-between gap-4">
                {/* Navegación de semana */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => cambiarSemana(-1)}
                    className="p-2 rounded-lg hover:bg-ras-turquesa/10 text-ras-azul transition-all hover:scale-110"
                    aria-label="Semana anterior"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-xl font-bold text-ras-azul capitalize font-poppins">{nombreSemana}</h2>
                  <button
                    onClick={() => cambiarSemana(1)}
                    className="p-2 rounded-lg hover:bg-ras-turquesa/10 text-ras-azul transition-all hover:scale-110"
                    aria-label="Semana siguiente"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Selector de Vista */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setVista('calendario')}
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                {diasSemana.map((dia, index) => {
                  const tieneTickets = dia.tickets.length > 0
                  const tieneReservas = dia.reservas.length > 0
                  const tieneContenido = tieneTickets || tieneReservas
                  const diaKey = dia.fecha.toISOString().split('T')[0]
                  const estaExpandido = diaExpandido === diaKey
                  const ticketsMostrados = estaExpandido ? dia.tickets : dia.tickets.slice(0, 2)
                  const reservasMostradas = estaExpandido ? dia.reservas : dia.reservas.slice(0, 2)
                  const itemsOcultos = Math.max(0, (dia.tickets.length - 2)) + Math.max(0, (dia.reservas.length - 2))

                  return (
                    <div
                      key={index}
                      className={`${estaExpandido ? 'min-h-[250px]' : 'min-h-[120px]'} p-1.5 rounded-lg border border-gray-200 bg-white transition-all ${
                        estaExpandido ? 'border-ras-turquesa shadow-lg z-10' : ''
                      }`}
                    >
                      <div className={`text-center text-xs font-bold mb-1 w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all font-poppins ${
                        dia.esHoy ? 'bg-ras-turquesa text-white shadow-md' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {dia.dia}
                      </div>
                      {tieneContenido && (
                        <div className="space-y-1">
                          {/* Reservaciones */}
                          {reservasMostradas.map(reserva => {
                            const colores = COLORES_PLATAFORMA[reserva.origen] || COLORES_PLATAFORMA.default
                            return (
                              <div
                                key={reserva.id}
                                onClick={() => setReservaSeleccionada(reserva)}
                                className={`text-[10px] p-1 ${colores.bg} rounded border ${colores.border} hover:opacity-80 transition-all cursor-pointer`}
                              >
                                <div className={`flex items-center gap-1 ${colores.text}`}>
                                  <span className="flex-shrink-0">🏠</span>
                                  <span className="truncate flex-1 font-semibold">{reserva.titulo}</span>
                                </div>
                                <div className="text-[9px] text-gray-600 mt-0.5 truncate">
                                  {reserva.propiedad_nombre}
                                </div>
                              </div>
                            )
                          })}
                          {/* Tickets */}
                          {ticketsMostrados.map(ticket => (
                            <div
                              key={ticket.id}
                              onClick={() => setTicketSeleccionado(ticket)}
                              className="text-[10px] p-1 bg-gradient-to-r from-ras-turquesa/10 to-ras-azul/10 rounded border border-ras-turquesa/30 hover:from-ras-turquesa/20 hover:to-ras-azul/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-1 text-ras-azul">
                                <span className="flex-shrink-0">{ticket.pagado ? '✓' : '○'}</span>
                                <span className="truncate flex-1 font-semibold">{ticket.titulo}</span>
                              </div>
                              <div className="text-[9px] text-gray-600 mt-0.5">
                                ${ticket.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                              </div>
                            </div>
                          ))}
                          {itemsOcultos > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDiaExpandido(estaExpandido ? null : diaKey)
                              }}
                              className="w-full text-[9px] text-center text-white bg-ras-azul hover:bg-ras-turquesa font-bold py-1 px-2 rounded transition-all cursor-pointer"
                            >
                              {estaExpandido ? '▲ Contraer' : `▼ Ver ${itemsOcultos} más`}
                            </button>
                          )}
                          {tieneTickets && (
                            <div className="text-[10px] text-center font-bold text-ras-azul">
                              ${(dia.montoTotal / 1000).toFixed(1)}K
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* VISTA LISTADO */}
        {vista === 'listado' && (
          <>
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-ras-azul font-poppins">Tickets y Reservaciones</h2>

                {/* Selector de Vista */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setVista('calendario')}
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
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
            </div>

            {/* Sección de Reservaciones */}
            {reservasFiltradas.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-red-500 to-blue-500 px-6 py-3">
                  <h3 className="text-white font-bold">Reservaciones ({reservasFiltradas.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Origen</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-in</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-out</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Huésped</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Propiedad</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reservasFiltradas
                        .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
                        .map(reserva => {
                          const colores = COLORES_PLATAFORMA[reserva.origen] || COLORES_PLATAFORMA.default
                          return (
                            <tr
                              key={reserva.id}
                              onClick={() => setReservaSeleccionada(reserva)}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colores.bg} ${colores.text} ${colores.border} border`}>
                                  {reserva.origen.charAt(0).toUpperCase() + reserva.origen.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(reserva.fecha_inicio).toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(reserva.fecha_fin).toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{reserva.titulo}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{reserva.propiedad_nombre}</div>
                                <div className="text-xs text-gray-500">{reserva.propietario_nombre}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  {reserva.estado}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sección de Tickets */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-ras-azul to-ras-turquesa px-6 py-3">
                <h3 className="text-white font-bold">Tickets ({ticketsFiltrados.length})</h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Propiedad</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Propietario</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Monto</th>
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
          </>
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

        {/* Modal de detalle de reservación */}
        {reservaSeleccionada && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setReservaSeleccionada(null)}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const colores = COLORES_PLATAFORMA[reservaSeleccionada.origen] || COLORES_PLATAFORMA.default
                return (
                  <>
                    <div className={`bg-gradient-to-r ${colores.gradient} p-6 text-white`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                            <span className="text-2xl">🏠</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold font-poppins">{reservaSeleccionada.titulo}</h3>
                            <p className="text-sm text-white/90 font-roboto">{reservaSeleccionada.propiedad_nombre}</p>
                            <p className="text-xs text-white/80 font-roboto capitalize">{reservaSeleccionada.origen}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setReservaSeleccionada(null)}
                          className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 text-green-700">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-semibold">Check-in</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {new Date(reservaSeleccionada.fecha_inicio).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                        <div className="flex items-center gap-2 text-red-700">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-semibold">Check-out</span>
                        </div>
                        <span className="text-sm font-bold text-red-600">
                          {new Date(reservaSeleccionada.fecha_fin).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold">Noches</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">
                          {Math.ceil((new Date(reservaSeleccionada.fecha_fin).getTime() - new Date(reservaSeleccionada.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24))} noches
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-2 text-purple-700">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold">Estado</span>
                        </div>
                        <span className="text-sm font-bold text-purple-600 capitalize">
                          {reservaSeleccionada.estado}
                        </span>
                      </div>
                      {reservaSeleccionada.notas && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2 text-gray-700 mb-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-sm font-semibold">Notas</span>
                          </div>
                          <p className="text-sm text-gray-600">{reservaSeleccionada.notas}</p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          router.push(`/dashboard/catalogo/propiedad/${reservaSeleccionada.propiedad_id}/calendario`)
                          setReservaSeleccionada(null)
                        }}
                        className={`w-full py-3.5 bg-gradient-to-r ${colores.gradient} text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all font-poppins flex items-center justify-center gap-2`}
                      >
                        <span>Ver calendario de la propiedad</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Modal de Nuevo Ticket */}
        <NuevoTicket
          isOpen={showNuevoTicketModal}
          onClose={() => setShowNuevoTicketModal(false)}
          propiedades={propiedades.map(p => ({ id: p.id, nombre: p.nombre_propiedad }))}
          onTicketCreado={() => {
            if (user?.id) {
              cargarDatos(user.id)
            }
          }}
        />
      </main>
    </div>
  )
}