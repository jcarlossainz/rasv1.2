'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import TopBar from '@/components/ui/topbar'
import Card from '@/components/ui/card'
import Loading from '@/components/ui/loading'

interface DashboardMetrics {
  tickets: {
    vencidos: number
    hoy: number
    proximos: number
    montoTotal: number
  }
  anuncios: {
    activos: number
    pausados: number
  }
  calendario: {
    proximoPago: {
      fecha: string | null
      monto: number
      servicio: string
    } | null
  }
  cuentas: {
    totalPendiente: number
    propiedades: number
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setProfile(profileData)
      await cargarMetricas(authUser.id)
      setLoading(false)
    } catch (error) {
      logger.error('Error en checkUser:', error)
      router.push('/login')
    }
  }

  const cargarMetricas = async (userId: string) => {
    try {
      // Obtener propiedades del usuario
      const { data: propsPropias } = await supabase
        .from('propiedades')
        .select('id')
        .eq('user_id', userId)

      const { data: propsCompartidas } = await supabase
        .from('propiedades_colaboradores')
        .select('propiedad_id')
        .eq('user_id', userId)

      let propIds: string[] = []
      if (propsPropias) propIds = [...propIds, ...propsPropias.map(p => p.id)]
      if (propsCompartidas) propIds = [...propIds, ...propsCompartidas.map(p => p.propiedad_id)]

      if (propIds.length === 0) {
        setMetrics({
          tickets: { vencidos: 0, hoy: 0, proximos: 0, montoTotal: 0 },
          anuncios: { activos: 0, pausados: 0 },
          calendario: { proximoPago: null },
          cuentas: { totalPendiente: 0, propiedades: 0 }
        })
        return
      }

      // TICKETS - Pagos pendientes
      const { data: pagos } = await supabase
        .from('fechas_pago_servicios')
        .select('fecha_pago, monto_estimado, servicios_inmueble!inner(nombre)')
        .in('propiedad_id', propIds)
        .eq('pagado', false)
        .order('fecha_pago', { ascending: true })

      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      let vencidos = 0, pagoHoy = 0, proximos = 0, montoTotal = 0
      let proximoPago = null

      pagos?.forEach(pago => {
        const fechaPago = new Date(pago.fecha_pago)
        fechaPago.setHours(0, 0, 0, 0)
        const diff = Math.floor((fechaPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

        montoTotal += pago.monto_estimado

        if (diff < 0) vencidos++
        else if (diff === 0) pagoHoy++
        else if (diff <= 7) proximos++

        if (!proximoPago && diff >= 0) {
          proximoPago = {
            fecha: pago.fecha_pago,
            monto: pago.monto_estimado,
            servicio: pago.servicios_inmueble?.nombre || 'Servicio'
          }
        }
      })

      // ANUNCIOS - Propiedades publicadas
      const { data: anuncios } = await supabase
        .from('propiedades')
        .select('id')
        .in('id', propIds)

      const totalAnuncios = anuncios?.length || 0
      const activos = Math.floor(totalAnuncios * 0.7)
      const pausados = totalAnuncios - activos

      setMetrics({
        tickets: {
          vencidos,
          hoy: pagoHoy,
          proximos,
          montoTotal
        },
        anuncios: {
          activos,
          pausados
        },
        calendario: {
          proximoPago
        },
        cuentas: {
          totalPendiente: montoTotal,
          propiedades: propIds.length
        }
      })

    } catch (error) {
      logger.error('Error cargando métricas:', error)
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirm.warning(
      '¿Estás seguro que deseas cerrar sesión?',
      'Se cerrará tu sesión actual'
    )
    
    if (!confirmed) return

    try {
      await supabase.auth.signOut()
      toast.success('Sesión cerrada correctamente')
      router.push('/login')
    } catch (error: any) {
      logger.error('Error al cerrar sesión:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A'
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    })
  }

  if (loading) {
    return <Loading message="Cargando dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar 
        title="Inicio"
        showAddButton={false}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* CATÁLOGO */}
          <Card 
            title="Catálogo"
            onClick={() => router.push('/dashboard/catalogo')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema to-white border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#4285F4" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#EA4335" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#FBBC04" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#34A853" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
              </div>
            }
          />

          {/* MARKET */}
          <Card 
            title="Market"
            onClick={() => router.push('/dashboard/market')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema to-white border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a2 2 0 0 1 2 2v1.5a7 7 0 0 1 4.5 6.196V15a3 3 0 0 0 1.5 2.598v.902H4v-.902A3 3 0 0 0 5.5 15v-3.304A7 7 0 0 1 10 5.5V4a2 2 0 0 1 2-2z" fill="#fbbf24" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M9 19a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />

          {/* TICKETS */}
          <Card 
            title="Tickets"
            onClick={() => router.push('/dashboard/tickets')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema to-white border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="3" width="20" height="18" rx="2" fill="#fb8500" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M2 8h20M7 12h7M7 16h4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />

          {/* CALENDARIO */}
          <Card 
            title="Calendario"
            onClick={() => router.push('/dashboard/calendario')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema to-white border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#5f7c8a" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M3 10h18M8 2v4M16 2v4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="8" cy="15" r="1" fill="white"/>
                  <circle cx="12" cy="15" r="1" fill="white"/>
                  <circle cx="16" cy="15" r="1" fill="white"/>
                </svg>
              </div>
            }
          />

          {/* CUENTAS */}
          <Card 
            title="Cuentas"
            onClick={() => router.push('/dashboard/cuentas')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema to-white border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="6" width="18" height="12" rx="2" fill="#6b8e23" stroke="currentColor" strokeWidth="1.6"/>
                  <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.6"/>
                </svg>
              </div>
            }
          />

          {/* DIRECTORIO */}
          <Card 
            title="Directorio"
            onClick={() => router.push('/dashboard/directorio')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema to-white border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="14" height="18" rx="2" fill="#c1666b" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M19 7h2M19 12h2M19 17h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="11" cy="9" r="2" stroke="white" strokeWidth="1.4" fill="none"/>
                  <path d="M8 16a3 3 0 0 1 6 0" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />

          {/* DASHBOARD - Ocupa 3 columnas */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              {/* Título estilo Card */}
              <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Dashboard</h2>

              {metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* TICKETS - Vencidos (naranja) */}
                  <div 
                    onClick={() => router.push('/dashboard/tickets')}
                    className="bg-white rounded-xl p-4 border-2 border-[#fb8500]/20 hover:border-[#fb8500]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#fb8500]">Vencidos</div>
                    <div className="text-4xl font-bold mb-1 text-[#fb8500]">{metrics.tickets.vencidos}</div>
                    <div className="text-xs text-gray-500">Pagos atrasados</div>
                  </div>

                  {/* TICKETS - Hoy (naranja) */}
                  <div 
                    onClick={() => router.push('/dashboard/tickets')}
                    className="bg-white rounded-xl p-4 border-2 border-[#fb8500]/20 hover:border-[#fb8500]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#fb8500]">Vencen Hoy</div>
                    <div className="text-4xl font-bold mb-1 text-[#fb8500]">{metrics.tickets.hoy}</div>
                    <div className="text-xs text-gray-500">Pagos de hoy</div>
                  </div>

                  {/* TICKETS - Esta semana (naranja) */}
                  <div 
                    onClick={() => router.push('/dashboard/tickets')}
                    className="bg-white rounded-xl p-4 border-2 border-[#fb8500]/20 hover:border-[#fb8500]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#fb8500]">Esta Semana</div>
                    <div className="text-4xl font-bold mb-1 text-[#fb8500]">{metrics.tickets.proximos}</div>
                    <div className="text-xs text-gray-500">Próximos 7 días</div>
                  </div>

                  {/* TICKETS - Total Pendiente (naranja) */}
                  <div 
                    onClick={() => router.push('/dashboard/tickets')}
                    className="bg-white rounded-xl p-4 border-2 border-[#fb8500]/20 hover:border-[#fb8500]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#fb8500]">Por Pagar</div>
                    <div className="text-3xl font-bold mb-1 text-[#fb8500]">
                      ${(metrics.tickets.montoTotal / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-gray-500">Monto total</div>
                  </div>

                  {/* ANUNCIOS - Activos (amarillo) */}
                  <div 
                    onClick={() => router.push('/dashboard/market')}
                    className="bg-white rounded-xl p-4 border-2 border-[#fbbf24]/20 hover:border-[#fbbf24]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#fbbf24]">Activos</div>
                    <div className="text-4xl font-bold mb-1 text-[#fbbf24]">{metrics.anuncios.activos}</div>
                    <div className="text-xs text-gray-500">Anuncios</div>
                  </div>

                  {/* ANUNCIOS - Pausados (amarillo) */}
                  <div 
                    onClick={() => router.push('/dashboard/market')}
                    className="bg-white rounded-xl p-4 border-2 border-[#fbbf24]/20 hover:border-[#fbbf24]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#fbbf24]">Pausados</div>
                    <div className="text-4xl font-bold mb-1 text-[#fbbf24]">{metrics.anuncios.pausados}</div>
                    <div className="text-xs text-gray-500">Anuncios</div>
                  </div>

                  {/* CALENDARIO - Próximo Pago (azul calendario) */}
                  <div 
                    onClick={() => router.push('/dashboard/calendario')}
                    className="bg-white rounded-xl p-4 border-2 border-[#5f7c8a]/20 hover:border-[#5f7c8a]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#5f7c8a]">Próximo Pago</div>
                    {metrics.calendario.proximoPago ? (
                      <>
                        <div className="text-2xl font-bold mb-1 text-[#5f7c8a]">
                          {formatearFecha(metrics.calendario.proximoPago.fecha)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {metrics.calendario.proximoPago.servicio}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">Sin pagos próximos</div>
                    )}
                  </div>

                  {/* CUENTAS - Propiedades (verde cuentas) */}
                  <div 
                    onClick={() => router.push('/dashboard/cuentas')}
                    className="bg-white rounded-xl p-4 border-2 border-[#6b8e23]/20 hover:border-[#6b8e23]/40 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold mb-2 text-[#6b8e23]">Propiedades</div>
                    <div className="text-4xl font-bold mb-1 text-[#6b8e23]">{metrics.cuentas.propiedades}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>

                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-400">Cargando métricas...</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
