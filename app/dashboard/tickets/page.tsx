'use client'

/**
 * TICKETS - Vista Consolidada
 * Lista de todos los pagos pendientes con filtros multi-selección
 * Diseño alineado con Calendario RAS
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'

import RegistrarPagoModal from '@/components/RegistrarPagoModal'
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
  responsable: string | null
  proveedor: string | null
  propiedad_id: string
  propiedad_nombre: string
  dias_restantes: number
}

interface Propiedad {
  id: string
  nombre: string
}

type EstadoUrgencia = 'vencido' | 'hoy' | 'proximo' | 'futuro'

export default function TicketsGlobalPage() {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsFiltrados, setTicketsFiltrados] = useState<Ticket[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])

  // Filtro de búsqueda
  const [busqueda, setBusqueda] = useState('')

  // Filtro de fechas para la tabla (default = mes actual)
  const hoy = new Date()
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

  const [fechaDesdeTabla, setFechaDesdeTabla] = useState(primerDiaMes.toISOString().split('T')[0])
  const [fechaHastaTabla, setFechaHastaTabla] = useState(ultimoDiaMes.toISOString().split('T')[0])

  // Modal de Registro de Pago
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null)

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
  }, [tickets, busqueda, fechaDesdeTabla, fechaHastaTabla])

  const cargarDatos = async (userId: string) => {
    try {
      // Cargar todas las propiedades del usuario
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
        ...(propsPropias || []),
        ...propsCompartidasData
      ]
      setPropiedades(todasPropiedades)

      if (todasPropiedades.length === 0) {
        setTickets([])
        return
      }

      // Cargar todos los tickets pendientes
      const propIds = todasPropiedades.map(p => p.id)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .in('propiedad_id', propIds)
        .eq('pagado', false)
        .order('fecha_programada', { ascending: true })
        .limit(200)

      if (ticketsError) {
        console.error('Error cargando tickets:', ticketsError)
        setTickets([])
        return
      }

      const ticketsTransformados = (ticketsData || []).map(ticket => {
        const propiedad = todasPropiedades.find(p => p.id === ticket.propiedad_id)
        const diasRestantes = getDiasRestantes(ticket.fecha_programada)
        
        return {
          id: ticket.id,
          titulo: ticket.titulo,
          fecha_programada: ticket.fecha_programada,
          monto_estimado: ticket.monto_estimado,
          pagado: ticket.pagado,
          servicio_id: ticket.servicio_id,
          tipo_ticket: ticket.tipo_ticket,
          estado: ticket.estado,
          prioridad: ticket.prioridad,
          responsable: ticket.responsable,
          proveedor: ticket.proveedor,
          propiedad_id: ticket.propiedad_id,
          propiedad_nombre: propiedad?.nombre || 'Sin nombre',
          dias_restantes: diasRestantes
        }
      })

      setTickets(ticketsTransformados)

    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  const getDiasRestantes = (fechaProgramada: string) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fecha = new Date(fechaProgramada + 'T00:00:00')
    const diff = fecha.getTime() - hoy.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const aplicarFiltros = () => {
    let resultado = [...tickets]

    // Filtro de búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      resultado = resultado.filter(t =>
        t.titulo.toLowerCase().includes(termino) ||
        t.propiedad_nombre.toLowerCase().includes(termino) ||
        t.tipo_ticket.toLowerCase().includes(termino) ||
        t.proveedor?.toLowerCase().includes(termino)
      )
    }

    // Filtro de fechas
    const desde = new Date(fechaDesdeTabla + 'T00:00:00')
    const hasta = new Date(fechaHastaTabla + 'T23:59:59')
    
    resultado = resultado.filter(t => {
      const fecha = new Date(t.fecha_programada + 'T00:00:00')
      return fecha >= desde && fecha <= hasta
    })

    setTicketsFiltrados(resultado)
  }

  const getTipoIcon = (tipo: string) => {
    const iconMap: Record<string, string> = {
      compra: '💵',
      mantenimiento: '🔧',
      reparacion: '🛠️',
      limpieza: '🧹',
      inspeccion: '🔍',
      servicio_recurrente: '📅',
      otro: '📋'
    }
    return iconMap[tipo] || '📋'
  }

  const getEstadoBadge = (diasRestantes: number) => {
    if (diasRestantes < 0) {
      return {
        text: 'VENCIDO',
        classes: 'bg-red-100 text-red-700 border-red-300'
      }
    }
    if (diasRestantes === 0) {
      return {
        text: 'HOY',
        classes: 'bg-yellow-100 text-yellow-700 border-yellow-300'
      }
    }
    if (diasRestantes <= 7) {
      return {
        text: 'PRÓXIMO',
        classes: 'bg-orange-100 text-orange-700 border-orange-300'
      }
    }
    return {
      text: 'PROGRAMADO',
      classes: 'bg-green-100 text-green-700 border-green-300'
    }
  }

  const handleMarcarPagado = (ticket: Ticket) => {
    setTicketSeleccionado(ticket)
    setShowPagoModal(true)
  }

  const handlePagoSuccess = () => {
    toast.success('✅ Pago registrado correctamente')
    if (user?.id) {
      cargarDatos(user.id)
    }
  }

  const handleCompartir = async (ticket: Ticket) => {
    const texto = `
📋 *Ticket: ${ticket.titulo}*
🏠 Propiedad: ${ticket.propiedad_nombre}
📅 Fecha: ${new Date(ticket.fecha_programada).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
💰 Monto: $${ticket.monto_estimado?.toFixed(2) || '0.00'}
📊 Estado: ${ticket.estado}
⚡ Prioridad: ${ticket.prioridad}
${ticket.responsable ? `👤 Responsable: ${ticket.responsable}` : ''}
${ticket.proveedor ? `🏢 Proveedor: ${ticket.proveedor}` : ''}
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({ text: texto })
        toast.success('📤 Información compartida')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copiarAlPortapapeles(texto)
        }
      }
    } else {
      copiarAlPortapapeles(texto)
    }
  }

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      toast.success('📋 Información copiada al portapapeles')
    }).catch(() => { toast.error('No se pudo copiar al portapapeles') })
  }

  const handleEditar = (ticket: Ticket) => {
    // Si es un ticket de servicio recurrente, ir a editar el servicio
    if (ticket.servicio_id) {
      router.push(`/dashboard/propiedad/${ticket.propiedad_id}/servicios?edit=${ticket.servicio_id}`)
    } else {
      // TODO: Abrir modal de edición de ticket manual
      toast.info('Función de edición de tickets manuales en desarrollo')
    }
  }

  if (authLoading) {
    return <Loading message="Cargando tickets..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Tickets"
        showBackButton
        showAddButton
        onBackClick={() => router.push('/dashboard')}
        onNuevoTicket={() => setShowNuevoTicketModal(true)}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Filtros - Fechas y Búsqueda */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Filtro de Fechas */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 font-poppins whitespace-nowrap">
                Del:
              </label>
              <input
                type="date"
                value={fechaDesdeTabla}
                onChange={(e) => setFechaDesdeTabla(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
              />
              <label className="text-sm font-semibold text-gray-700 font-poppins">al:</label>
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
                placeholder="Buscar por título, propiedad, tipo o proveedor..."
                className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Tickets */}
        {ticketsFiltrados.length > 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Título</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Propiedad</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Fecha Programada</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ticketsFiltrados.map(ticket => {
                    const badge = getEstadoBadge(ticket.dias_restantes)
                    return (
                      <tr
                        key={ticket.id}
                        className="hover:bg-ras-turquesa/5 transition-colors"
                      >
                        {/* Título */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">{getTipoIcon(ticket.tipo_ticket)}</div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{ticket.titulo}</div>
                              <div className="text-xs text-gray-500 capitalize">{ticket.tipo_ticket.replace('_', ' ')}</div>
                            </div>
                          </div>
                        </td>

                        {/* Propiedad */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{ticket.propiedad_nombre}</div>
                          {ticket.proveedor && (
                            <div className="text-xs text-gray-500">🏢 {ticket.proveedor}</div>
                          )}
                        </td>

                        {/* Fecha Programada */}
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

                        {/* Estado */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.classes}`}>
                            {badge.text}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {ticket.dias_restantes < 0 
                              ? `${Math.abs(ticket.dias_restantes)} días atrasado` 
                              : ticket.dias_restantes === 0 
                              ? 'Vence hoy' 
                              : `En ${ticket.dias_restantes} días`
                            }
                          </div>
                          {ticket.monto_estimado && (
                            <div className="text-xs font-medium text-gray-700 mt-1">
                              ${ticket.monto_estimado.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex gap-2 justify-center items-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMarcarPagado(ticket) }} 
                              className="p-2 rounded-lg bg-gradient-to-r from-ras-azul to-ras-turquesa text-white hover:shadow-lg hover:scale-110 transition-all" 
                              title="Registrar pago"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/propiedad/${ticket.propiedad_id}/tickets`) }} 
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-110 transition-all" 
                              title="Ver detalles"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleCompartir(ticket) }} 
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-110 transition-all" 
                              title="Compartir"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEditar(ticket) }} 
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-110 transition-all" 
                              title="Editar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={
              <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title={tickets.length === 0 ? "No hay tickets pendientes" : "No se encontraron tickets"}
            description={tickets.length === 0 
              ? "¡Excelente! No tienes tickets pendientes en este momento"
              : "Intenta ajustar los filtros de búsqueda"
            }
          />
        )}

        {/* Modal de Registro de Pago */}
        <RegistrarPagoModal
          isOpen={showPagoModal}
          onClose={() => { setShowPagoModal(false); setTicketSeleccionado(null) }}
          onSuccess={handlePagoSuccess}
          propiedades={propiedades}
          pagoExistente={ticketSeleccionado ? {
            id: ticketSeleccionado.id,
            fecha_pago: ticketSeleccionado.fecha_programada,
            monto_estimado: ticketSeleccionado.monto_estimado,
            propiedad_id: ticketSeleccionado.propiedad_id,
            servicio_nombre: ticketSeleccionado.titulo
          } : null}
        />

        {/* Modal de Nuevo Ticket */}
        <NuevoTicket
          isOpen={showNuevoTicketModal}
          onClose={() => setShowNuevoTicketModal(false)}
          propiedades={propiedades}
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