'use client'

/**
 * CALENDARIO POR PROPIEDAD - Vista Individual
 * Calendario de pagos programados de UNA propiedad específica
 * Diseño alineado con /dashboard/calendario (global)
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'

interface Pago {
  id: string
  fecha_pago: string
  monto_estimado: number
  servicio_nombre: string
  tipo_servicio: string
  propiedad_id: string
  propiedad_nombre: string
}

interface DiaCalendario {
  fecha: Date
  dia: number
  esHoy: boolean
  esMesActual: boolean
  pagos: Pago[]
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
  const [pagos, setPagos] = useState<Pago[]>([])
  const [mesActual, setMesActual] = useState(new Date())
  const [diasCalendario, setDiasCalendario] = useState<DiaCalendario[]>([])
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null)

  // Estados para vistas
  const [vista, setVista] = useState<VistaCalendario>('calendario')

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
    if (pagos.length >= 0) {
      generarCalendario()
    }
  }, [mesActual, pagos])

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

      // Cargar pagos de los próximos 3 meses para esta propiedad
      const hoy = new Date()
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)

      const { data: pagosData, error: pagosError } = await supabase
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
        .eq('propiedad_id', propiedadId)
        .eq('pagado', false)
        .gte('fecha_pago', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_pago', fechaFin.toISOString().split('T')[0])
        .order('fecha_pago', { ascending: true })

      if (pagosError) {
        console.error('Error cargando pagos:', pagosError)
        toast.error('Error al cargar pagos')
        return
      }

      const pagosTransformados = (pagosData || []).map(pago => ({
        id: pago.id,
        fecha_pago: pago.fecha_pago,
        monto_estimado: pago.monto_estimado,
        servicio_nombre: pago.servicios_inmueble.nombre,
        tipo_servicio: pago.servicios_inmueble.tipo_servicio,
        propiedad_id: pago.propiedad_id,
        propiedad_nombre: propData.nombre_propiedad
      }))

      setPagos(pagosTransformados)

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

      const pagosDelDia = pagos.filter(pago => {
        const fechaPago = new Date(pago.fecha_pago)
        return fechaPago.getDate() === fecha.getDate() &&
               fechaPago.getMonth() === fecha.getMonth() &&
               fechaPago.getFullYear() === fecha.getFullYear()
      })

      const montoTotal = pagosDelDia.reduce((sum, p) => sum + p.monto_estimado, 0)

      dias.push({
        fecha,
        dia: fecha.getDate(),
        esHoy,
        esMesActual,
        pagos: pagosDelDia,
        montoTotal
      })
    }

    setDiasCalendario(dias)
  }, [mesActual, pagos])

  const cambiarMes = useCallback((incremento: number) => {
    const nuevaFecha = new Date(mesActual)
    nuevaFecha.setMonth(mesActual.getMonth() + incremento)
    setMesActual(nuevaFecha)
  }, [mesActual])

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

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

  // Obtener pagos de la semana actual
  const obtenerPagosSemanaActual = () => {
    const hoy = new Date()
    const diaSemana = hoy.getDay()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
    lunes.setHours(0, 0, 0, 0)

    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    domingo.setHours(23, 59, 59, 999)

    return pagos.filter(pago => {
      const fecha = new Date(pago.fecha_pago)
      return fecha >= lunes && fecha <= domingo
    })
  }

  const pagosSemana = obtenerPagosSemanaActual()

  if (loading || authLoading) {
    return <Loading message="Cargando calendario..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title={`Calendario - ${propiedad?.nombre_propiedad || 'Propiedad'}`}
        showBackButton
        onBackClick={volverCatalogo}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Controles: Vistas */}
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
                  const tienePagos = dia.pagos.length > 0
                  return (
                    <div
                      key={index}
                      className={`min-h-[85px] p-1.5 rounded-lg border transition-all ${
                        dia.esMesActual ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/50'
                      } ${tienePagos && dia.esMesActual ? 'hover:border-ras-turquesa hover:shadow-md cursor-pointer hover:scale-[1.02]' : ''}`}
                    >
                      <div className={`text-center text-xs font-bold mb-1 w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all font-poppins ${
                        dia.esHoy ? 'bg-ras-turquesa text-white shadow-md' : dia.esMesActual ? 'bg-gray-100 text-gray-700' : 'bg-transparent text-gray-400'
                      }`}>
                        {dia.dia}
                      </div>
                      {tienePagos && dia.esMesActual && (
                        <div className="space-y-1">
                          {dia.pagos.slice(0, 2).map(pago => (
                            <div
                              key={pago.id}
                              onClick={() => setPagoSeleccionado(pago)}
                              className="text-[10px] p-1 bg-gradient-to-r from-ras-turquesa/10 to-ras-azul/10 rounded border border-ras-turquesa/30 hover:from-ras-turquesa/20 hover:to-ras-azul/20 transition-all"
                            >
                              <div className="flex items-center gap-1 text-ras-azul">
                                <span className="flex-shrink-0">{getTipoIcon(pago.tipo_servicio)}</span>
                                <span className="truncate flex-1 font-semibold">{pago.servicio_nombre}</span>
                              </div>
                            </div>
                          ))}
                          {dia.pagos.length > 2 && (
                            <div className="text-[9px] text-center text-ras-azul font-bold">
                              +{dia.pagos.length - 2} más
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
              Pagos de esta semana ({pagosSemana.length})
            </h3>
            {pagosSemana.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-medium">No hay pagos programados esta semana</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagosSemana
                  .sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime())
                  .map(pago => (
                    <div
                      key={pago.id}
                      onClick={() => setPagoSeleccionado(pago)}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-ras-turquesa/5 to-ras-azul/5 rounded-xl border border-ras-turquesa/20 hover:border-ras-turquesa hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ras-turquesa/20 to-ras-azul/20 flex items-center justify-center text-ras-azul">
                        {getTipoIcon(pago.tipo_servicio)}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 font-poppins">{pago.servicio_nombre}</div>
                        <div className="text-xs text-gray-500 capitalize">{pago.tipo_servicio}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600">
                          {new Date(pago.fecha_pago).toLocaleDateString('es-MX', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        <div className="text-lg font-bold text-green-600 font-poppins">
                          ${pago.monto_estimado.toLocaleString('es-MX')}
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Servicio</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="font-medium">No hay pagos programados</p>
                      </td>
                    </tr>
                  ) : (
                    pagos
                      .sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime())
                      .map(pago => (
                        <tr
                          key={pago.id}
                          onClick={() => setPagoSeleccionado(pago)}
                          className="hover:bg-ras-turquesa/5 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(pago.fecha_pago).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(pago.fecha_pago).toLocaleDateString('es-MX', { weekday: 'long' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="text-ras-azul">{getTipoIcon(pago.tipo_servicio)}</div>
                              <div className="text-sm font-medium text-gray-900">{pago.servicio_nombre}</div>
                            </div>
                            <div className="text-xs text-gray-500 capitalize">{pago.tipo_servicio}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-lg font-bold text-green-600 font-poppins">
                              ${pago.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
        {pagoSeleccionado && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPagoSeleccionado(null)}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-ras-azul to-ras-turquesa p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                      {getTipoIcon(pagoSeleccionado.tipo_servicio)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-poppins">{pagoSeleccionado.servicio_nombre}</h3>
                      <p className="text-sm text-white/90 font-roboto">{pagoSeleccionado.propiedad_nombre}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPagoSeleccionado(null)}
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
                    <span className="text-sm font-semibold">Fecha de pago</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {new Date(pagoSeleccionado.fecha_pago).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
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
                    ${pagoSeleccionado.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={() => {
                    router.push(`/dashboard/catalogo/propiedad/${propiedadId}/tickets`)
                    setPagoSeleccionado(null)
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all font-poppins flex items-center justify-center gap-2"
                >
                  <span>Ver todos los pagos</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
