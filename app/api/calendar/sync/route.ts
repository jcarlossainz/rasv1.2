import { NextRequest, NextResponse } from 'next/server'
import { sincronizarCalendariosPropiedad, sincronizarTodasLasPropiedades } from '@/lib/calendar/ical-sync'

/**
 * POST /api/calendar/sync
 * Sincroniza calendarios iCal de una propiedad específica
 *
 * Body: { propiedadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propiedadId } = body

    if (!propiedadId) {
      return NextResponse.json(
        { error: 'propiedadId es requerido' },
        { status: 400 }
      )
    }

    const result = await sincronizarCalendariosPropiedad(propiedadId)

    return NextResponse.json({
      success: result.success,
      events: result.eventsProcessed,
      inserted: result.eventsInserted,
      updated: result.eventsUpdated,
      deleted: result.eventsDeleted,
      errors: result.errors,
      message: result.success
        ? `Sincronización completada: ${result.eventsInserted} nuevos, ${result.eventsUpdated} actualizados`
        : `Sincronización parcial con ${result.errors.length} error(es)`
    })

  } catch (error: any) {
    console.error('Error en sincronización:', error)
    return NextResponse.json(
      {
        error: 'Error en la sincronización',
        message: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calendar/sync
 * Sincroniza calendarios de TODAS las propiedades con URLs configuradas
 * (Útil para cron jobs o sincronización manual global)
 */
export async function GET() {
  try {
    const result = await sincronizarTodasLasPropiedades()

    return NextResponse.json({
      success: true,
      total: result.total,
      exitosas: result.exitosas,
      fallidas: result.fallidas,
      message: `Sincronización completada: ${result.exitosas}/${result.total} propiedades exitosas`
    })

  } catch (error: any) {
    console.error('Error en sincronización global:', error)
    return NextResponse.json(
      {
        error: 'Error en la sincronización global',
        message: error.message
      },
      { status: 500 }
    )
  }
}
