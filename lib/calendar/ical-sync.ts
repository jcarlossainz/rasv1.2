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
          }
        }

        // Marcar como procesado
        eventosExistentesMap.delete(evento.reserva_id)

      } else {
        // Insertar nuevo evento
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(evento)

        if (insertError) {
          console.error(`❌ Error al insertar evento:`, insertError)
        } else {
          inserted++
        }
      }
    }

    // 3. Eliminar eventos que ya no están en el feed (fueron cancelados)
    const eventosAEliminar = Array.from(eventosExistentesMap.values())
    if (eventosAEliminar.length > 0) {
      const idsAEliminar = eventosAEliminar.map(e => e.id)
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .in('id', idsAEliminar)

      if (deleteError) {
        console.error(`❌ Error al eliminar eventos:`, deleteError)
      } else {
        deleted = idsAEliminar.length
      }
    }

    return { inserted, updated, deleted }

  } catch (error: any) {
    console.error(`❌ Error al sincronizar eventos de ${origen}:`, error)
    throw error
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
