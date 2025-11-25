import { NextRequest, NextResponse } from 'next/server'

/**
 * API de prueba: Genera feeds iCal simulados para testing
 *
 * Uso:
 * /api/calendar/test-feed?platform=airbnb
 * /api/calendar/test-feed?platform=booking
 * /api/calendar/test-feed?platform=expedia
 * /api/calendar/test-feed?events=10 (opcional, por defecto 8)
 */

interface ICalEvent {
  uid: string
  summary: string
  description: string
  dtstart: string // YYYYMMDD
  dtend: string   // YYYYMMDD
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function generateRandomDate(daysOffset: number, duration: number): { start: Date; end: Date } {
  const start = new Date()
  start.setDate(start.getDate() + daysOffset)

  const end = new Date(start)
  end.setDate(end.getDate() + duration)

  return { start, end }
}

function generateAirbnbEvent(index: number, daysOffset: number, duration: number): ICalEvent {
  const { start, end } = generateRandomDate(daysOffset, duration)
  const reservationId = `HM${Math.random().toString(36).substring(2, 12).toUpperCase()}`

  return {
    uid: `${reservationId}@airbnb.com`,
    summary: `Airbnb (Reserved)`,
    description: `Reservation ID: ${reservationId}\\nGuest: Test Guest ${index + 1}\\nNights: ${duration}`,
    dtstart: formatDate(start),
    dtend: formatDate(end),
    status: 'CONFIRMED'
  }
}

function generateBookingEvent(index: number, daysOffset: number, duration: number): ICalEvent {
  const { start, end } = generateRandomDate(daysOffset, duration)
  const reservationId = `${Math.floor(Math.random() * 9000000000) + 1000000000}`

  return {
    uid: `booking_${reservationId}@booking.com`,
    summary: `Booking.com Reservation`,
    description: `Booking ID: ${reservationId}\\nGuest Name: Test Guest ${index + 1}\\nPhone: +34 600 000 ${String(index).padStart(3, '0')}`,
    dtstart: formatDate(start),
    dtend: formatDate(end),
    status: 'CONFIRMED'
  }
}

function generateExpediaEvent(index: number, daysOffset: number, duration: number): ICalEvent {
  const { start, end } = generateRandomDate(daysOffset, duration)
  const itineraryId = `${Math.floor(Math.random() * 900000000000) + 100000000000}`

  return {
    uid: `${itineraryId}@expedia.com`,
    summary: `Expedia Booking`,
    description: `Itinerary: ${itineraryId}\\nGuest: Expedia Guest ${index + 1}\\nConfirmation: EXP${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    dtstart: formatDate(start),
    dtend: formatDate(end),
    status: 'CONFIRMED'
  }
}

function generateEvents(platform: string, count: number): ICalEvent[] {
  const events: ICalEvent[] = []

  // Generar eventos variados:
  // - Algunos en el pasado reciente (para verificar filtrado)
  // - Algunos actuales
  // - Mayoría en el futuro

  const offsets = [
    -45, -30, -15,  // Pasado
    -5, 2, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 330  // Presente y futuro
  ]

  const durations = [1, 2, 3, 4, 5, 7, 10, 14, 21]  // Noches de estancia

  for (let i = 0; i < count; i++) {
    const daysOffset = offsets[i % offsets.length] + Math.floor(Math.random() * 10)
    const duration = durations[Math.floor(Math.random() * durations.length)]

    let event: ICalEvent

    switch (platform.toLowerCase()) {
      case 'airbnb':
        event = generateAirbnbEvent(i, daysOffset, duration)
        break
      case 'booking':
        event = generateBookingEvent(i, daysOffset, duration)
        break
      case 'expedia':
        event = generateExpediaEvent(i, daysOffset, duration)
        break
      default:
        event = generateAirbnbEvent(i, daysOffset, duration)
    }

    events.push(event)
  }

  // Ordenar por fecha de inicio
  events.sort((a, b) => a.dtstart.localeCompare(b.dtstart))

  return events
}

function generateICalFeed(platform: string, events: ICalEvent[]): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//RAS Test Feed//${platform.toUpperCase()}//ES`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Test ${platform.charAt(0).toUpperCase() + platform.slice(1)} Calendar`,
    'X-WR-TIMEZONE:Europe/Madrid',
    'X-WR-CALDESC:Calendario de prueba para desarrollo'
  ].join('\r\n')

  for (const event of events) {
    ical += '\r\n' + [
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${event.dtstart}`,
      `DTEND;VALUE=DATE:${event.dtend}`,
      `DTSTAMP:${timestamp}`,
      `UID:${event.uid}`,
      `SUMMARY:${event.summary}`,
      `DESCRIPTION:${event.description}`,
      `STATUS:${event.status}`,
      'TRANSP:OPAQUE',
      'SEQUENCE:0',
      'END:VEVENT'
    ].join('\r\n')
  }

  ical += '\r\nEND:VCALENDAR\r\n'

  return ical
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros
    const platform = searchParams.get('platform') || 'airbnb'
    const eventCount = parseInt(searchParams.get('events') || '8', 10)

    // Validar plataforma
    const validPlatforms = ['airbnb', 'booking', 'expedia']
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        {
          error: 'Plataforma inválida',
          valid: validPlatforms,
          example: '/api/calendar/test-feed?platform=airbnb&events=10'
        },
        { status: 400 }
      )
    }

    // Validar cantidad de eventos
    if (eventCount < 1 || eventCount > 50) {
      return NextResponse.json(
        { error: 'events debe estar entre 1 y 50' },
        { status: 400 }
      )
    }

    // Generar eventos
    const events = generateEvents(platform, eventCount)

    // Generar feed iCal
    const icalFeed = generateICalFeed(platform, events)

    console.log(`📅 Test feed generado: ${platform} - ${events.length} eventos`)

    // Retornar como texto/calendar (formato iCal estándar)
    return new NextResponse(icalFeed, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${platform}-test.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })

  } catch (error) {
    console.error('Error generando test feed:', error)
    return NextResponse.json(
      { error: 'Error generando feed de prueba' },
      { status: 500 }
    )
  }
}
