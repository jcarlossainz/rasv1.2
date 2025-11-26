'use client'

/**
 * CALENDARIO POR PROPIEDAD - Vista Individual
 * Calendario de tickets programados de UNA propiedad específica
 * Diseño alineado con /dashboard/calendario (global)
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
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
  nombre_propiedad: string
  tipo_propiedad?: string
}

type VistaCalendario = 'calendario' | 'semana' | 'listado'

export default function CalendarioPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const { user, loading: authLoading } = useAuth()

  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [mesActual, setMesActual] = useState(new Date())
  const [semanaActual, setSemanaActual] = useState(new Date())
  const [diasCalendario, setDiasCalendario] = useState<DiaCalendario[]>([])
  const [diasSemana, setDiasSemana] = useState<DiaCalendario[]>([])
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null)

  // Estados para vistas
  const [vista, setVista] = useState<VistaCalendario>('calendario')

  // Modal de Nuevo Ticket
  const [showNuevoTicketModal, setShowNuevoTicketModal] = useState(false)

  // Estado para expansión inline de días en calendario
  const [diaExpandido, setDiaExpandido] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else {
        cargarDatos()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  useEffect(() => {
    if (tickets.length >= 0) {
      generarCalendario()
    }
  }, [mesActual, tickets])

  useEffect(() => {
    if (tickets.length >= 0) {
      generarSemana()
    }
  }, [semanaActual, tickets])

  // Función auxiliar para recargar solo eventos después de sincronización
  const cargarEventos = async () => {
    if (!propiedadId) return

    try {
      const hoy = new Date()
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)

      const { data: eventosData, error: eventosError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('propiedad_id', propiedadId)
        .gte('fecha_inicio', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_fin', fechaFin.toISOString().split('T')[0])
        .order('fecha_inicio', { ascending: true })

      if (eventosError) {
        console.error('Error cargando eventos:', eventosError)
        return
      }

      const eventosTransformados = (eventosData || []).map(evento => ({
        id: evento.id,
        titulo: evento.titulo || `Reserva ${evento.origen}`,
        fecha_inicio: evento.fecha_inicio,
        fecha_fin: evento.fecha_fin,
        origen: evento.origen,
        estado: evento.estado,
        reserva_id: evento.reserva_id,
        notas: evento.notas
      }))

      setEventos(eventosTransformados)
      console.log('✅ Eventos recargados después de sincronización')
    } catch (error) {
      console.error('Error recargando eventos:', error)
    }
  }

  const cargarDatos = useCallback(async () => {
    if (!propiedadId) return

    try {
      setLoading(true)

      // 1. Sincronizar calendarios OTA en segundo plano (no bloqueante)
      console.log('🔄 Iniciando sincronización de calendarios OTA...')
      fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propiedadId })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('✅ Calendarios sincronizados:', data.stats)
            // Recargar eventos después de la sincronización
            cargarEventos()
          } else {
            console.warn('⚠️ Sincronización completada con errores:', data.errors)
          }
        })
        .catch(err => {
          console.error('❌ Error en sincronización:', err)
        })

      // 2. Cargar propiedad
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

      // Cargar TODOS los tickets de los próximos 3 meses (tabla unificada 'tickets')
      const hoy = new Date()
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)

      // Cargar todos los tickets de la tabla unificada
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          titulo,
          fecha_programada,
          monto_estimado,
          pagado,
          servicio_id,
          tipo_ticket,
          estado,
          prioridad,
          propiedad_id
        `)
        .eq('propiedad_id', propiedadId)
        .gte('fecha_programada', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_programada', fechaFin.toISOString().split('T')[0])
        .order('fecha_programada', { ascending: true })

      if (ticketsError) {
        console.error('Error cargando tickets:', ticketsError)
      }

      // Transformar tickets
      const todosLosTickets = (ticketsData || []).map(ticket => ({
        id: ticket.id,
        titulo: ticket.titulo || 'Ticket sin título',
        fecha_programada: ticket.fecha_programada,
        monto_estimado: ticket.monto_estimado || 0,
        pagado: ticket.pagado || false,
        servicio_id: ticket.servicio_id,
        tipo_ticket: ticket.tipo_ticket || (ticket.servicio_id ? 'Servicio' : 'Manual'),
        estado: ticket.estado || 'pendiente',
        prioridad: ticket.prioridad || 'media',
        propiedad_id: ticket.propiedad_id,
        propiedad_nombre: propData.nombre_propiedad
      }))

      setTickets(todosLosTickets)

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar calendario')
    } finally {
      setLoading(false)
    }
  }, [propiedadId, toast, router])

  const generarCalendario = useCallback(() => {
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

      const ticketsDelDia = tickets.filter(ticket => {
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
  }, [mesActual, tickets])

  const cambiarMes = useCallback((incremento: number) => {
    const nuevaFecha = new Date(mesActual)
    nuevaFecha.setMonth(mesActual.getMonth() + incremento)
    setMesActual(nuevaFecha)
  }, [mesActual])

  const generarSemana = useCallback(() => {
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

      const ticketsDelDia = tickets.filter(ticket => {
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
        esMesActual: true, // Todos los días de la semana se muestran igual
        tickets: ticketsDelDia,
        montoTotal
      })
    }

    setDiasSemana(dias)
  }, [semanaActual, tickets])

  const cambiarSemana = useCallback((incremento: number) => {
    const nuevaFecha = new Date(semanaActual)
    nuevaFecha.setDate(semanaActual.getDate() + (incremento * 7))
    setSemanaActual(nuevaFecha)
  }, [semanaActual])

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

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

  if (loading || authLoading) {
    return <Loading message="Cargando calendario..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title={`${propiedad?.nombre_propiedad || 'Propiedad'}`}
        showHomeButton
        showBackButton
        showAddButton
        onBackClick={volverCatalogo}
        onNuevoTicket={() => setShowNuevoTicketModal(true)}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

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
                  const diaKey = dia.fecha.toISOString().split('T')[0]
                  const estaExpandido = diaExpandido === diaKey
                  const ticketsMostrados = estaExpandido ? dia.tickets : dia.tickets.slice(0, 2)
                  const ticketsOcultos = dia.tickets.length - 2

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
                      {tieneTickets && dia.esMesActual && (
                        <div className="space-y-1">
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
                          {dia.tickets.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDiaExpandido(estaExpandido ? null : diaKey)
                              }}
                              className="w-full text-[9px] text-center text-white bg-ras-azul hover:bg-ras-turquesa font-bold py-1 px-2 rounded transition-all cursor-pointer"
                            >
                              {estaExpandido ? '▲ Contraer' : `▼ Ver ${ticketsOcultos} más`}
                            </button>
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
                  const diaKey = dia.fecha.toISOString().split('T')[0]
                  const estaExpandido = diaExpandido === diaKey
                  const ticketsMostrados = estaExpandido ? dia.tickets : dia.tickets.slice(0, 3)
                  const ticketsOcultos = dia.tickets.length - 3

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
                      {tieneTickets && (
                        <div className="space-y-1">
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
                          {dia.tickets.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDiaExpandido(estaExpandido ? null : diaKey)
                              }}
                              className="w-full text-[9px] text-center text-white bg-ras-azul hover:bg-ras-turquesa font-bold py-1 px-2 rounded transition-all cursor-pointer"
                            >
                              {estaExpandido ? '▲ Contraer' : `▼ Ver ${ticketsOcultos} más`}
                            </button>
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

        {/* VISTA LISTADO */}
        {vista === 'listado' && (
          <>
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-ras-azul font-poppins">Todos los Tickets</h2>

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

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Ticket</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="font-medium">No hay tickets programados</p>
                      </td>
                    </tr>
                  ) : (
                    tickets
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
                            {ticket.tipo_ticket && (
                              <div className="text-xs text-gray-500 capitalize">{ticket.tipo_ticket}</div>
                            )}
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
                    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/tickets`)
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
        {showNuevoTicketModal && propiedad && (
          <NuevoTicket
            isOpen={showNuevoTicketModal}
            onClose={() => setShowNuevoTicketModal(false)}
            onSuccess={() => {
              setShowNuevoTicketModal(false)
              cargarDatos()
            }}
            propiedades={[{
              id: propiedad.id,
              nombre: propiedad.nombre_propiedad,
              user_id: user?.id || ''
            }]}
            propiedadInicial={propiedad.id}
          />
        )}
      </main>
    </div>
  )
}
