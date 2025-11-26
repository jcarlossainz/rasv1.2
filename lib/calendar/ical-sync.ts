/**
 * Servicio de sincronización de calendarios iCal
 * Soporta Airbnb, Booking.com, Expedia y otras plataformas
 */

import ical from 'node-ical'
import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase con service role para operaciones de sincronización
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CalendarEvent {
  propiedad_id: string
  fecha_inicio: string
  fecha_fin: string
  origen: 'airbnb' | 'booking' | 'expedia' | 'manual' | 'google_vr'
  reserva_id?: string
  estado: 'bloqueado' | 'reservado' | 'disponible'
  titulo?: string
  notas?: string
}

interface SyncResult {
  success: boolean
  eventsProcessed: number
  eventsInserted: number
  eventsUpdated: number
  eventsDeleted: number
  errors: string[]
}

/**
 * Detecta el origen basado en la URL del feed
 */
function detectarOrigen(url: string): 'airbnb' | 'booking' | 'expedia' | 'manual' {
  if (url.includes('airbnb.com')) return 'airbnb'
  if (url.includes('booking.com')) return 'booking'
  if (url.includes('expedia.com')) return 'expedia'
  return 'manual'
}

/**
 * Extrae el ID de reserva del summary o description
 */
function extraerReservaId(event: any, origen: string): string | undefined {
  const summary = event.summary?.val || event.summary || ''
  const description = event.description?.val || event.description || ''

  // Airbnb: usualmente incluye código en el summary
  if (origen === 'airbnb') {
    const match = summary.match(/HM[A-Z0-9]{8,}/i) || description.match(/HM[A-Z0-9]{8,}/i)
    return match ? match[0] : undefined
  }

  // Booking: incluye número de reserva
  if (origen === 'booking') {
    const match = summary.match(/\d{10,}/i) || description.match(/\d{10,}/i)
    return match ? match[0] : undefined
  }

  // Expedia: incluye itinerario
  if (origen === 'expedia') {
    const match = summary.match(/\d{12,}/i) || description.match(/\d{12,}/i)
    return match ? match[0] : undefined
  }

  // Usar UID como fallback
  return event.uid
}

/**
 * Determina el estado del evento basado en el summary/description
 */
function determinarEstado(event: any): 'bloqueado' | 'reservado' {
  const summary = (event.summary?.val || event.summary || '').toLowerCase()
  const description = (event.description?.val || event.description || '').toLowerCase()

  const textoCompleto = `${summary} ${description}`

  // Palabras clave que indican bloqueo
  const palabrasBloqueo = ['blocked', 'bloqueado', 'unavailable', 'no disponible', 'mantenimiento']
  if (palabrasBloqueo.some(palabra => textoCompleto.includes(palabra))) {
    return 'bloqueado'
  }

  // Por defecto, si está en el calendario es una reserva
  return 'reservado'
}

/**
 * Verifica si un evento se superpone con eventos existentes en la propiedad
 * Retorna true si HAY superposición (conflicto)
 */
async function verificarSuperposicion(
  propiedadId: string,
  fechaInicio: string,
  fechaFin: string,
  reservaIdExcluir?: string
): Promise<boolean> {
  try {
    // Buscar TODOS los eventos de esta propiedad
    const { data: eventosExistentes, error } = await supabase
      .from('calendar_events')
      .select('id, fecha_inicio, fecha_fin, reserva_id, titulo')
      .eq('propiedad_id', propiedadId)

    if (error) {
      console.error('Error verificando superposición:', error)
      return false
    }

    if (!eventosExistentes || eventosExistentes.length === 0) {
      return false // No hay eventos, no hay superposición
    }

    // Convertir fechas del nuevo evento a timestamps para comparación
    const nuevoInicio = new Date(fechaInicio).getTime()
    const nuevoFin = new Date(fechaFin).getTime()

    // Verificar superposición manualmente
    for (const evento of eventosExistentes) {
      // Si hay que excluir un reserva_id (para updates), saltarlo
      if (reservaIdExcluir && evento.reserva_id === reservaIdExcluir) {
        continue
      }

      const existenteInicio = new Date(evento.fecha_inicio).getTime()
      const existenteFin = new Date(evento.fecha_fin).getTime()

      // Superposición: (inicio1 < fin2) AND (fin1 > inicio2)
      // Dos rangos se superponen si uno empieza antes de que el otro termine
      // Y termina después de que el otro empiece
      if (nuevoInicio < existenteFin && nuevoFin > existenteInicio) {
        console.log(`🚫 Superposición detectada con: ${evento.titulo} (${evento.fecha_inicio} - ${evento.fecha_fin})`)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error en verificarSuperposicion:', error)
    return false
  }
}

/**
 * Parsea un feed iCal y extrae eventos
 */
async function parsearFeedICal(url: string, propiedadId: string, origen: 'airbnb' | 'booking' | 'expedia' | 'manual'): Promise<CalendarEvent[]> {
  try {
    console.log(`📥 Fetching iCal from ${origen}:`, url)

    // Fetch del feed iCal
    const data = await ical.async.fromURL(url)

    const eventos: CalendarEvent[] = []

    // Límites de fecha: solo eventos dentro de 1 año desde hoy
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const unAnoAdelante = new Date()
    unAnoAdelante.setFullYear(hoy.getFullYear() + 1)
    unAnoAdelante.setHours(23, 59, 59, 999)

    console.log(`📅 Sincronizando eventos entre ${hoy.toISOString().split('T')[0]} y ${unAnoAdelante.toISOString().split('T')[0]}`)

    // Procesar cada evento
    for (const k in data) {
      const event = data[k]

      // Solo procesar eventos (VEVENT), ignorar VTIMEZONE, etc.
      if (event.type !== 'VEVENT') continue

      // Validar fechas
      if (!event.start || !event.end) {
        console.warn(`⚠️ Evento sin fechas, ignorando:`, event.summary)
        continue
      }

      const fechaInicio = event.start instanceof Date ? event.start : new Date(event.start)
      const fechaFin = event.end instanceof Date ? event.end : new Date(event.end)

      // Validar que las fechas sean válidas
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        console.warn(`⚠️ Fechas inválidas, ignorando:`, event.summary)
        continue
      }

      // 🎯 FILTRO: Solo eventos que inician dentro del próximo año
      if (fechaInicio > unAnoAdelante) {
        // Evento muy lejano, ignorar
        continue
      }

      // 🎯 FILTRO: Ignorar eventos ya muy pasados (más de 1 mes)
      const unMesAtras = new Date()
      unMesAtras.setMonth(unMesAtras.getMonth() - 1)
      if (fechaFin < unMesAtras) {
        // Evento muy antiguo, ignorar
        continue
      }

      const reservaId = extraerReservaId(event, origen)
      const estado = determinarEstado(event)
      const titulo = event.summary?.val || event.summary || `Reserva ${origen}`
      const notas = event.description?.val || event.description

      eventos.push({
        propiedad_id: propiedadId,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        origen,
        reserva_id: reservaId,
        estado,
        titulo,
        notas: notas ? String(notas).substring(0, 500) : undefined // Limitar longitud
      })
    }

    console.log(`✅ Parseados ${eventos.length} eventos de ${origen}`)
    return eventos

  } catch (error: any) {
    console.error(`❌ Error al parsear feed de ${origen}:`, error.message)
    throw new Error(`Error al parsear feed de ${origen}: ${error.message}`)
  }
}

/**
 * Sincroniza eventos de un origen específico con la base de datos
 * También crea/actualiza tickets correspondientes
 */
async function sincronizarEventos(eventos: CalendarEvent[], propiedadId: string, origen: string): Promise<{ inserted: number, updated: number, deleted: number }> {
  let inserted = 0
  let updated = 0
  let deleted = 0

  try {
    // 1. Obtener eventos existentes de este origen para esta propiedad
    const { data: eventosExistentes, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, reserva_id, fecha_inicio, fecha_fin')
      .eq('propiedad_id', propiedadId)
      .eq('origen', origen)

    if (fetchError) throw fetchError

    const eventosExistentesMap = new Map(
      (eventosExistentes || []).map(e => [e.reserva_id, e])
    )

    // 2. Procesar cada evento del feed
    for (const evento of eventos) {
      const eventoExistente = eventosExistentesMap.get(evento.reserva_id)

      if (eventoExistente) {
        // Actualizar si las fechas cambiaron
        if (
          eventoExistente.fecha_inicio !== evento.fecha_inicio ||
          eventoExistente.fecha_fin !== evento.fecha_fin
        ) {
          const { error: updateError } = await supabase
            .from('calendar_events')
            .update({
              fecha_inicio: evento.fecha_inicio,
              fecha_fin: evento.fecha_fin,
              titulo: evento.titulo,
              notas: evento.notas,
              estado: evento.estado
            })
            .eq('id', eventoExistente.id)

          if (updateError) {
            console.error(`❌ Error al actualizar evento:`, updateError)
          } else {
            updated++
            // Actualizar ticket correspondiente
            await actualizarTicketReservacion(evento, propiedadId, origen)
          }
        }

        // Marcar como procesado
        eventosExistentesMap.delete(evento.reserva_id)

      } else {
        // VERIFICAR SUPERPOSICIÓN antes de insertar
        const haySuperposicion = await verificarSuperposicion(
          propiedadId,
          evento.fecha_inicio,
          evento.fecha_fin
        )

        if (haySuperposicion) {
          console.log(`⚠️ Saltando evento por superposición: ${evento.titulo} (${evento.fecha_inicio} - ${evento.fecha_fin})`)
          continue // Saltar este evento, ya hay una reserva en esas fechas
        }

        // Insertar nuevo evento (sin superposición)
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(evento)

        if (insertError) {
          console.error(`❌ Error al insertar evento:`, insertError)
        } else {
          inserted++
          // Crear ticket correspondiente
          await crearTicketReservacion(evento, propiedadId, origen)
        }
      }
    }

    // 3. Eliminar eventos que ya no están en el feed (fueron cancelados)
    const eventosAEliminar = Array.from(eventosExistentesMap.values())
    if (eventosAEliminar.length > 0) {
      const idsAEliminar = eventosAEliminar.map(e => e.id)
      const reservaIdsAEliminar = eventosAEliminar.map(e => e.reserva_id).filter(Boolean)

      // Eliminar eventos
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .in('id', idsAEliminar)

      if (deleteError) {
        console.error(`❌ Error al eliminar eventos:`, deleteError)
      } else {
        deleted = idsAEliminar.length
        // Eliminar tickets correspondientes
        await eliminarTicketsReservacion(reservaIdsAEliminar, propiedadId)
      }
    }

    return { inserted, updated, deleted }

  } catch (error: any) {
    console.error(`❌ Error al sincronizar eventos de ${origen}:`, error)
    throw error
  }
}

/**
 * Crea tickets de check-in y check-out para una reservación
 */
async function crearTicketReservacion(evento: CalendarEvent, propiedadId: string, origen: string): Promise<void> {
  try {
    // Solo crear tickets para reservaciones (no bloqueos)
    if (evento.estado === 'bloqueado') {
      console.log(`⏭️ Saltando bloqueo, no se crea ticket: ${evento.titulo}`)
      return
    }

    const checkIn = new Date(evento.fecha_inicio)
    const checkOut = new Date(evento.fecha_fin)
    const noches = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

    const origenCapitalizado = origen.charAt(0).toUpperCase() + origen.slice(1)
    const infoReserva = `Noches: ${noches}\nOrigen: ${origenCapitalizado}\n${evento.notas || ''}`

    // 1. TICKET DE CHECK-IN (sin costo)
    const ticketCheckIn = {
      propiedad_id: propiedadId,
      tipo_ticket: 'reservacion',
      titulo: `🔑 Check-in: ${evento.titulo || 'Huésped'}`,
      descripcion: `Check-out: ${evento.fecha_fin}\n${infoReserva}`.trim(),
      fecha_programada: evento.fecha_inicio,
      monto_estimado: null, // Sin costo en check-in
      prioridad: 'alta',
      estado: 'pendiente',
      responsable: null,
      proveedor: origen,
      servicio_id: null,
      pagado: false,
      reserva_id: `${evento.reserva_id}_checkin`
    }

    const { error: errorCheckIn } = await supabase
      .from('tickets')
      .insert(ticketCheckIn)

    if (errorCheckIn) {
      console.error(`❌ Error al crear ticket de check-in:`, errorCheckIn)
    } else {
      console.log(`🔑 Ticket check-in creado: ${evento.titulo}`)
    }

    // 2. TICKET DE CHECK-OUT (con costo/ingreso)
    const ticketCheckOut = {
      propiedad_id: propiedadId,
      tipo_ticket: 'reservacion',
      titulo: `🚪 Check-out: ${evento.titulo || 'Huésped'}`,
      descripcion: `Check-in: ${evento.fecha_inicio}\n${infoReserva}`.trim(),
      fecha_programada: evento.fecha_fin,
      monto_estimado: null, // Se puede actualizar manualmente con el ingreso real
      prioridad: 'alta',
      estado: 'pendiente',
      responsable: null,
      proveedor: origen,
      servicio_id: null,
      pagado: false,
      reserva_id: `${evento.reserva_id}_checkout`
    }

    const { error: errorCheckOut } = await supabase
      .from('tickets')
      .insert(ticketCheckOut)

    if (errorCheckOut) {
      console.error(`❌ Error al crear ticket de check-out:`, errorCheckOut)
    } else {
      console.log(`🚪 Ticket check-out creado: ${evento.titulo}`)
    }

  } catch (error) {
    console.error(`❌ Error creando tickets de reservación:`, error)
  }
}

/**
 * Actualiza los tickets de check-in y check-out de una reservación
 */
async function actualizarTicketReservacion(evento: CalendarEvent, propiedadId: string, origen: string): Promise<void> {
  try {
    if (!evento.reserva_id) return

    const checkIn = new Date(evento.fecha_inicio)
    const checkOut = new Date(evento.fecha_fin)
    const noches = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

    const origenCapitalizado = origen.charAt(0).toUpperCase() + origen.slice(1)
    const infoReserva = `Noches: ${noches}\nOrigen: ${origenCapitalizado}\n${evento.notas || ''}`
    const estadoTicket = evento.estado === 'bloqueado' ? 'cancelado' : 'pendiente'

    // Actualizar ticket de CHECK-IN
    const { error: errorCheckIn } = await supabase
      .from('tickets')
      .update({
        titulo: `🔑 Check-in: ${evento.titulo || 'Huésped'}`,
        descripcion: `Check-out: ${evento.fecha_fin}\n${infoReserva}`.trim(),
        fecha_programada: evento.fecha_inicio,
        estado: estadoTicket
      })
      .eq('reserva_id', `${evento.reserva_id}_checkin`)
      .eq('propiedad_id', propiedadId)

    if (errorCheckIn) {
      console.error(`❌ Error al actualizar ticket check-in:`, errorCheckIn)
    }

    // Actualizar ticket de CHECK-OUT
    const { error: errorCheckOut } = await supabase
      .from('tickets')
      .update({
        titulo: `🚪 Check-out: ${evento.titulo || 'Huésped'}`,
        descripcion: `Check-in: ${evento.fecha_inicio}\n${infoReserva}`.trim(),
        fecha_programada: evento.fecha_fin,
        estado: estadoTicket
      })
      .eq('reserva_id', `${evento.reserva_id}_checkout`)
      .eq('propiedad_id', propiedadId)

    if (errorCheckOut) {
      console.error(`❌ Error al actualizar ticket check-out:`, errorCheckOut)
    }

    if (!errorCheckIn && !errorCheckOut) {
      console.log(`🔄 Tickets actualizados para reservación: ${evento.titulo}`)
    }
  } catch (error) {
    console.error(`❌ Error actualizando tickets de reservación:`, error)
  }
}

/**
 * Elimina tickets de check-in y check-out de reservaciones canceladas
 */
async function eliminarTicketsReservacion(reservaIds: string[], propiedadId: string): Promise<void> {
  try {
    if (reservaIds.length === 0) return

    // Generar IDs de tickets (check-in y check-out)
    const ticketIds: string[] = []
    for (const reservaId of reservaIds) {
      ticketIds.push(`${reservaId}_checkin`)
      ticketIds.push(`${reservaId}_checkout`)
    }

    const { error } = await supabase
      .from('tickets')
      .delete()
      .in('reserva_id', ticketIds)
      .eq('propiedad_id', propiedadId)

    if (error) {
      console.error(`❌ Error al eliminar tickets de reservaciones:`, error)
    } else {
      console.log(`🗑️ ${reservaIds.length} reservaciones eliminadas (${ticketIds.length} tickets)`)
    }
  } catch (error) {
    console.error(`❌ Error eliminando tickets de reservaciones:`, error)
  }
}

/**
 * Sincroniza todos los calendarios de una propiedad
 */
export async function sincronizarCalendariosPropiedad(propiedadId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    eventsProcessed: 0,
    eventsInserted: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: []
  }

  try {
    console.log(`🔄 Iniciando sincronización para propiedad: ${propiedadId}`)

    // Obtener URLs de iCal de la propiedad
    const { data: propiedad, error: propError } = await supabase
      .from('propiedades')
      .select('ical_airbnb_url, ical_booking_url, ical_expedia_url')
      .eq('id', propiedadId)
      .single()

    if (propError) throw propError
    if (!propiedad) throw new Error('Propiedad no encontrada')

    const urls = [
      { url: propiedad.ical_airbnb_url, origen: 'airbnb' as const },
      { url: propiedad.ical_booking_url, origen: 'booking' as const },
      { url: propiedad.ical_expedia_url, origen: 'expedia' as const }
    ].filter(item => item.url) // Solo URLs configuradas

    if (urls.length === 0) {
      result.errors.push('No hay URLs de calendario configuradas')
      return result
    }

    // Sincronizar cada origen
    for (const { url, origen } of urls) {
      try {
        console.log(`📡 Sincronizando ${origen}...`)

        // Parsear feed
        const eventos = await parsearFeedICal(url, propiedadId, origen)
        result.eventsProcessed += eventos.length

        // Sincronizar con BD
        const syncStats = await sincronizarEventos(eventos, propiedadId, origen)
        result.eventsInserted += syncStats.inserted
        result.eventsUpdated += syncStats.updated
        result.eventsDeleted += syncStats.deleted

        console.log(`✅ ${origen} sincronizado: +${syncStats.inserted} ~${syncStats.updated} -${syncStats.deleted}`)

      } catch (error: any) {
        const errorMsg = `Error en ${origen}: ${error.message}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    // Actualizar timestamp de última sincronización
    await supabase
      .from('propiedades')
      .update({ ultimo_sync_ical: new Date().toISOString() })
      .eq('id', propiedadId)

    result.success = result.errors.length === 0

    console.log(`🎉 Sincronización completada:`, result)
    return result

  } catch (error: any) {
    console.error(`❌ Error general en sincronización:`, error)
    result.errors.push(error.message)
    return result
  }
}

/**
 * Sincroniza todas las propiedades que tienen URLs de iCal configuradas
 */
export async function sincronizarTodasLasPropiedades(): Promise<{ total: number, exitosas: number, fallidas: number }> {
  try {
    console.log(`🌍 Iniciando sincronización global de calendarios...`)

    // Obtener todas las propiedades con al menos una URL configurada
    const { data: propiedades, error } = await supabase
      .from('propiedades')
      .select('id, nombre_propiedad')
      .or('ical_airbnb_url.not.is.null,ical_booking_url.not.is.null,ical_expedia_url.not.is.null')

    if (error) throw error
    if (!propiedades || propiedades.length === 0) {
      console.log('⚠️ No hay propiedades con calendarios configurados')
      return { total: 0, exitosas: 0, fallidas: 0 }
    }

    console.log(`📊 Sincronizando ${propiedades.length} propiedades...`)

    let exitosas = 0
    let fallidas = 0

    // Sincronizar cada propiedad
    for (const prop of propiedades) {
      try {
        const result = await sincronizarCalendariosPropiedad(prop.id)
        if (result.success) {
          exitosas++
          console.log(`✅ ${prop.nombre_propiedad}: OK`)
        } else {
          fallidas++
          console.log(`⚠️ ${prop.nombre_propiedad}: Errores parciales`)
        }
      } catch (error: any) {
        fallidas++
        console.error(`❌ ${prop.nombre_propiedad}: ${error.message}`)
      }
    }

    console.log(`🎉 Sincronización global completada: ${exitosas}/${propiedades.length} exitosas`)

    return {
      total: propiedades.length,
      exitosas,
      fallidas
    }

  } catch (error: any) {
    console.error(`❌ Error en sincronización global:`, error)
    throw error
  }
}
