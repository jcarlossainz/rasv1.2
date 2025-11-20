'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import CompartirPropiedad from '@/components/CompartirPropiedad'
import { getPropertyImages } from '@/lib/supabase/supabase-storage'
import type { PropertyImage } from '@/types/property'

// ⚡ LAZY LOADING: Modal pesado solo se carga cuando se necesita
const WizardModal = lazy(() => import('@/app/dashboard/catalogo/nueva/components/WizardModal'))

interface Espacio {
  id: string
  name: string
  type: string
  details?: {
    camas?: Array<{ id: number; tipo: string }>
    equipamiento?: string[]
    notas?: string
    capacidadPersonas?: number
    tieneBanoPrivado?: boolean
    banoPrivadoId?: string | null
  }
}

interface Ubicacion {
  calle?: string | null
  numero_exterior?: string | null
  numero_interior?: string | null
  colonia?: string | null
  codigo_postal?: string | null
  ciudad?: string | null
  estado?: string | null
  pais?: string | null
  referencias?: string | null
  google_maps_link?: string | null
  es_complejo?: boolean
  nombre_complejo?: string | null
  amenidades_complejo?: string[]
}

interface PropiedadData {
  id: string
  owner_id: string
  nombre_propiedad: string
  tipo_propiedad: string
  estados: string[]
  mobiliario: string
  capacidad_personas: number | null
  tamano_terreno: number | null
  tamano_construccion: number | null

  // ✅ NUEVO: Ubicación como JSON
  ubicacion: Ubicacion | null

  // ✅ NUEVO: Precios consolidados
  precios?: {
    mensual?: number | null
    noche?: number | null
    venta?: number | null
  }

  // ✅ NUEVO: Datos condicionales
  datos_renta_largo_plazo?: any | null
  datos_renta_vacacional?: any | null
  datos_venta?: any | null

  // Contactos (IDs)
  propietario_id: string | null
  supervisor_id: string | null
  inquilino_id: string | null

  // ✅ Emails directos (TEXT[])
  propietarios_email?: string[] | null
  supervisores_email?: string[] | null
  inquilinos_email?: string[] | null

  // Espacios
  espacios: Espacio[] | null

  // ✅ Servicios (JSONB[])
  servicios?: Array<{
    id?: string
    name?: string
    type?: string
    provider?: string
    cost?: number
    paymentFrequency?: string
    accountNumber?: string
    lastPaymentDate?: string
    notes?: string
  }> | null

  created_at: string
  updated_at: string
  es_propio: boolean
}

// Componente de Galería inline
function GaleriaPropiedad({ propiedadId, amenidades }: { propiedadId: string, amenidades?: string[] }) {
  const [photos, setPhotos] = useState<PropertyImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  useEffect(() => {
    const cargarFotos = async () => {
      try {
        setLoading(true)
        console.log('📸 Cargando fotos para propiedad:', propiedadId)
        const photosData = await getPropertyImages(propiedadId)
        console.log('📸 Fotos cargadas:', photosData.length)
        setPhotos(photosData)
      } catch (error) {
        console.error('❌ Error al cargar fotos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (propiedadId) {
      cargarFotos()
    }
  }, [propiedadId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-6">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 text-sm font-medium">No hay fotos disponibles</p>
      </div>
    )
  }

  const coverPhoto = photos.find(p => p.is_cover) || photos[0]

  return (
    <div>
      {/* Grid compacto de fotos */}
      <div className="grid grid-cols-6 gap-2">
        {photos.slice(0, 6).map((photo, idx) => (
          <div 
            key={photo.id} 
            className={`${idx === 0 ? 'col-span-2 row-span-2' : ''} aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-75 transition-opacity`}
            onClick={() => setSelectedPhoto(photo.url)}
          >
            <img 
              src={photo.url_thumbnail || photo.url} 
              alt={photo.caption || 'Foto de propiedad'}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {photos.length > 6 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          +{photos.length - 6} fotos más
        </p>
      )}

      {/* Modal de foto ampliada */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
            onClick={() => setSelectedPhoto(null)}
          >
            ×
          </button>
          <img 
            src={selectedPhoto} 
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  )
}

// Componente de Ubicación mejorado
function UbicacionCard({ ubicacion }: { ubicacion: Ubicacion }) {
  const direccionCompleta = [
    ubicacion.calle,
    ubicacion.numero_exterior,
    ubicacion.numero_interior,
    ubicacion.colonia,
    ubicacion.ciudad,
    ubicacion.estado,
    ubicacion.codigo_postal,
    ubicacion.pais
  ].filter(Boolean).join(', ')

  return (
    <div className="space-y-4">
      {direccionCompleta && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{direccionCompleta}</p>
            </div>
          </div>
        </div>
      )}

      {ubicacion.referencias && (
        <div className="text-sm text-gray-700">
          <span className="font-medium">Referencias: </span>
          {ubicacion.referencias}
        </div>
      )}

      {ubicacion.google_maps_link && (
        <a
          href={ubicacion.google_maps_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          Ver en Google Maps
        </a>
      )}

      {ubicacion.es_complejo && ubicacion.nombre_complejo && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm font-bold text-gray-900">{ubicacion.nombre_complejo}</span>
          </div>

          {ubicacion.amenidades_complejo && ubicacion.amenidades_complejo.length > 0 && (
            <div>
              <span className="text-xs text-gray-600 font-medium block mb-2">Amenidades del complejo:</span>
              <div className="flex flex-wrap gap-2">
                {ubicacion.amenidades_complejo.map((amenidad: string, idx: number) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-medium"
                  >
                    {amenidad}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HomePropiedad() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const confirm = useConfirm()
  const propiedadId = params?.id as string
  
  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadData | null>(null)
  const [user, setUser] = useState<any>(null)

  const [colaboradores, setColaboradores] = useState<Array<{
    id: string
    email: string
    pendiente: boolean
  }>>([])

  // Estados para modales
  const [showCompartir, setShowCompartir] = useState(false)
  const [showDuplicarModal, setShowDuplicarModal] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [nombreDuplicado, setNombreDuplicado] = useState('')
  const [duplicando, setDuplicando] = useState(false)

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser({ ...profile, id: authUser.id })
      await cargarPropiedad()
    } catch (error) {
      console.error('Error en checkUser:', error)
      toast.error('Error de autenticación')
      setLoading(false) // CRÍTICO: Siempre quitar el loading
    }
  }

  const cargarPropiedad = async () => {
    try {
      console.log('🔍 Cargando propiedad con ID:', propiedadId)

      // Traer todos los datos de la propiedad
      const { data: propData, error } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', propiedadId)
        .single()

      console.log('📦 Respuesta de Supabase:', { data: propData, error })

      if (error) {
        console.error('❌ Error al cargar propiedad:', error)
        console.error('   Código:', error.code)
        console.error('   Mensaje:', error.message)
        console.error('   Detalles:', error.details)
        throw error
      }

      if (!propData) {
        console.error('❌ No se encontraron datos para la propiedad')
        throw new Error('Propiedad no encontrada')
      }

      console.log('✅ Propiedad cargada exitosamente:', propData.nombre_propiedad)

      const { data: { user: authUser } } = await supabase.auth.getUser()
      const esPropio = propData.owner_id === authUser?.id
      
      logger.log('=== DATOS DE PROPIEDAD ===')
      logger.log('Propiedad completa:', propData)
      logger.log('Espacios:', propData.espacios)
      logger.log('Precios:', propData.precios)
      logger.log('Ubicación:', propData.ubicacion)
      logger.log('Servicios:', propData.servicios)

      // Debug de servicios
      if (propData.servicios && propData.servicios.length > 0) {
        console.log('📋 Servicios encontrados:', propData.servicios.length)
        propData.servicios.forEach((s: any, idx: number) => {
          console.log(`  Servicio ${idx + 1}:`, s)
          console.log(`    - Estructura completa:`, JSON.stringify(s, null, 2))
          console.log(`    - Keys disponibles:`, Object.keys(s))
        })
      } else {
        console.log('⚠️ No hay servicios o servicios es null/vacío')
      }
      
      let esColaborador = false
      if (!esPropio) {
        const { data: colabData } = await supabase
          .from('propiedades_colaboradores')
          .select('user_id')
          .eq('propiedad_id', propiedadId)
          .eq('user_id', authUser?.id)
          .single()

        esColaborador = !!colabData
      }

      setPropiedad({ ...propData, es_propio: esPropio })

      // Cargar colaboradores
      const { data: colabData } = await supabase
        .from('propiedades_colaboradores')
        .select('id, user_id, email_invitado')
        .eq('propiedad_id', propiedadId)

      if (colabData && colabData.length > 0) {
        const colaboradoresConDatos = await Promise.all(
          colabData.map(async (colab: any) => {
            if (colab.user_id) {
              // Usuario registrado
              const { data: perfil } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', colab.user_id)
                .maybeSingle()

              return {
                id: colab.id,
                email: perfil?.email || colab.email_invitado || 'Sin email',
                pendiente: false
              }
            } else {
              // Invitación pendiente
              return {
                id: colab.id,
                email: colab.email_invitado || 'Sin email',
                pendiente: true
              }
            }
          })
        )
        setColaboradores(colaboradoresConDatos)
      }

    } catch (error: any) {
      logger.error('Error al cargar propiedad:', error)
      toast.error('Error al cargar la propiedad')
    } finally {
      setLoading(false)
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

  const volverCatalogo = () => {
    router.push('/dashboard/catalogo')
  }

  const abrirCuentas = () => {
    router.push(`/dashboard/propiedad/${propiedadId}/cuentas`)
  }

  const editarPropiedad = () => {
    setShowEditarModal(true)
  }

  const duplicarPropiedad = async () => {
    if (!nombreDuplicado.trim()) {
      toast.error('Ingresa un nombre para la propiedad duplicada')
      return
    }

    setDuplicando(true)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        toast.error('Usuario no autenticado')
        setDuplicando(false)
        return
      }

      // Crear copia sin campos que no deben duplicarse
      const { id, es_propio, created_at, updated_at, ...datosPropiedad } = propiedad!

      const nuevaPropiedad = {
        ...datosPropiedad,
        nombre_propiedad: nombreDuplicado,
        owner_id: authUser.id, // Asignar al usuario actual
        wizard_completed: true,
        is_draft: false
      }

      const { data, error } = await supabase
        .from('propiedades')
        .insert(nuevaPropiedad)
        .select()
        .single()

      if (error) throw error

      toast.success('Propiedad duplicada correctamente')
      setShowDuplicarModal(false)
      setNombreDuplicado('')
      router.push(`/dashboard/catalogo/propiedad/${data.id}/home`)
    } catch (error: any) {
      logger.error('Error al duplicar propiedad:', error)
      toast.error('Error al duplicar la propiedad')
    } finally {
      setDuplicando(false)
    }
  }

  const eliminarPropiedad = async () => {
    const confirmed = await confirm.danger(
      `¿Eliminar "${propiedad?.nombre_propiedad}"?`,
      'Esta acción NO se puede deshacer. Se eliminarán todos los datos, colaboradores, fotos, tickets y todo el historial.'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('propiedades')
        .delete()
        .eq('id', propiedadId)

      if (error) throw error

      toast.success('Propiedad eliminada correctamente')
      router.push('/dashboard/catalogo')
    } catch (error: any) {
      logger.error('Error al eliminar propiedad:', error)
      toast.error('Error al eliminar la propiedad')
    }
  }

  if (loading) {
    return <Loading />
  }

  if (!propiedad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Propiedad no encontrada</h2>
          <button
            onClick={volverCatalogo}
            className="mt-4 px-6 py-2 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90"
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={propiedad.nombre_propiedad}
        showBackButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-5 py-6">
        
        {/* Header con badges */}
        <div className="mb-6">
          {/* Badges de estados y tipo */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
              {propiedad.tipo_propiedad}
            </span>
            
            {propiedad.estados && propiedad.estados.map((estado) => {
              const colorMap: Record<string, string> = {
                'Renta largo plazo': 'bg-green-100 text-green-700',
                'Renta vacacional': 'bg-blue-100 text-blue-700',
                'Venta': 'bg-purple-100 text-purple-700',
                'Mantenimiento': 'bg-orange-100 text-orange-700',
                'Suspendido': 'bg-red-100 text-red-700',
                'Propietario': 'bg-gray-100 text-gray-700'
              }
              return (
                <span 
                  key={estado}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${colorMap[estado] || 'bg-gray-100 text-gray-700'}`}
                >
                  {estado}
                </span>
              )
            })}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="space-y-6">
          
          {/* FILA 1: Datos Básicos y Precios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Datos Básicos */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Datos Básicos</h2>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Mobiliario:</span>
                  <span className="text-gray-900 font-semibold">{propiedad.mobiliario}</span>
                </div>
                
                {propiedad.espacios && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Habitaciones:</span>
                      <span className="text-gray-900 font-semibold">
                        {propiedad.espacios.filter(e => e.type === 'Habitación' || e.type === 'Lock-off').length}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Baños:</span>
                      <span className="text-gray-900 font-semibold">
                        {propiedad.espacios.filter(e => e.type === 'Baño completo' || e.type === 'Medio baño').length}
                      </span>
                    </div>
                  </>
                )}
                
                {propiedad.capacidad_personas && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Capacidad:</span>
                    <span className="text-gray-900 font-semibold">{propiedad.capacidad_personas} personas</span>
                  </div>
                )}
                
                {propiedad.tamano_terreno && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Terreno:</span>
                    <span className="text-gray-900 font-semibold">
                      {propiedad.tamano_terreno} m²
                    </span>
                  </div>
                )}
                
                {propiedad.tamano_construccion && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Construcción:</span>
                    <span className="text-gray-900 font-semibold">
                      {propiedad.tamano_construccion} m²
                    </span>
                  </div>
                )}

                {/* ✅ PRECIOS agregados aquí */}
                {propiedad.precios?.mensual && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Renta mensual:</span>
                    <span className="text-green-600 font-bold">
                      ${propiedad.precios.mensual.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                )}

                {propiedad.precios?.noche && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Precio por noche:</span>
                    <span className="text-blue-600 font-bold">
                      ${propiedad.precios.noche.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                )}

                {propiedad.precios?.venta && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Precio de venta:</span>
                    <span className="text-purple-600 font-bold">
                      ${propiedad.precios.venta.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN: Servicios de la propiedad */}
            {propiedad.servicios && propiedad.servicios.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 font-poppins">Servicios</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {propiedad.servicios.map((servicio, idx) => {
                    // La estructura real usa campos en inglés
                    const displayName = servicio.name || 'Servicio sin especificar'

                    return (
                      <div key={idx} className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-base font-bold text-gray-900 leading-tight">
                              {displayName}
                            </p>
                            {servicio.provider && (
                              <p className="text-sm text-gray-600 mt-1">
                                📍 {servicio.provider}
                              </p>
                            )}
                            {servicio.paymentFrequency && (
                              <p className="text-xs text-teal-700 mt-1 font-medium">
                                🔄 {servicio.paymentFrequency}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 font-poppins">Servicios</h2>
                </div>
                <p className="text-gray-500 text-center py-8 italic">No hay servicios registrados</p>
              </div>
            )}
          </div>

          {/* ✅ NUEVO: Información de Renta Vacacional */}
          {propiedad.datos_renta_vacacional && propiedad.datos_renta_vacacional.amenidades_vacacional?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Amenidades Vacacionales</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {propiedad.datos_renta_vacacional.amenidades_vacacional.map((amenidad: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <svg className="w-4 h-4 text-cyan-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-cyan-900">{amenidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FILA: Espacios (si existen) */}
          {propiedad.espacios && propiedad.espacios.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Espacios</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propiedad.espacios.map((espacio) => (
                  <div key={espacio.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-900">{espacio.name}</h3>
                    <span className="text-xs text-gray-600 font-medium">{espacio.type}</span>
                    
                    {espacio.details && (
                      <div className="mt-3 space-y-1 text-sm text-gray-700">
                        {espacio.details.capacidadPersonas && (
                          <p>Capacidad: {espacio.details.capacidadPersonas} personas</p>
                        )}
                        
                        {espacio.details.camas && espacio.details.camas.length > 0 && (
                          <p>Camas: {espacio.details.camas.map(c => c.tipo).join(', ')}</p>
                        )}
                        
                        {espacio.details.tieneBanoPrivado && (
                          <p>Baño privado</p>
                        )}
                        
                        {espacio.details.equipamiento && espacio.details.equipamiento.length > 0 && (
                          <p>Equipamiento: {espacio.details.equipamiento.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ Información de Renta Largo Plazo */}
          {propiedad.datos_renta_largo_plazo && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Renta Largo Plazo</h2>
              </div>

              <div className="space-y-3">
                {propiedad.datos_renta_largo_plazo.fecha_inicio_contrato && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Fecha de inicio:</span>
                    <span className="text-gray-900 font-semibold">
                      {new Date(propiedad.datos_renta_largo_plazo.fecha_inicio_contrato).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                )}

                {propiedad.datos_renta_largo_plazo.frecuencia_pago && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Frecuencia de pago:</span>
                    <span className="text-gray-900 font-semibold capitalize">
                      {propiedad.datos_renta_largo_plazo.frecuencia_pago}
                    </span>
                  </div>
                )}

                {propiedad.datos_renta_largo_plazo.dia_pago && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Día de pago:</span>
                    <span className="text-gray-900 font-semibold">
                      Día {propiedad.datos_renta_largo_plazo.dia_pago}
                    </span>
                  </div>
                )}

                {propiedad.datos_renta_largo_plazo.requisitos_renta && propiedad.datos_renta_largo_plazo.requisitos_renta.length > 0 && (
                  <div className="pt-2">
                    <span className="text-sm text-gray-600 font-medium block mb-2">Requisitos:</span>
                    <div className="flex flex-wrap gap-2">
                      {propiedad.datos_renta_largo_plazo.requisitos_renta.map((req: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!propiedad.datos_renta_largo_plazo.fecha_inicio_contrato &&
                 !propiedad.datos_renta_largo_plazo.frecuencia_pago &&
                 !propiedad.datos_renta_largo_plazo.dia_pago &&
                 (!propiedad.datos_renta_largo_plazo.requisitos_renta || propiedad.datos_renta_largo_plazo.requisitos_renta.length === 0) && (
                  <p className="text-gray-500 text-center py-8 italic">No hay información de renta registrada</p>
                )}
              </div>
            </div>
          )}

          {/* FILA: Asignaciones y Ubicación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Asignaciones */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Asignaciones</h2>
              </div>

              <div className="space-y-4">
                {/* Propietarios */}
                {propiedad.propietarios_email && propiedad.propietarios_email.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-xs text-blue-600 font-semibold uppercase block mb-2">Propietario{propiedad.propietarios_email.length > 1 ? 's' : ''}</span>
                    <div className="space-y-1">
                      {propiedad.propietarios_email.map((email, idx) => (
                        <p key={idx} className="text-sm text-gray-900">✉️ {email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supervisores */}
                {propiedad.supervisores_email && propiedad.supervisores_email.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-xs text-green-600 font-semibold uppercase block mb-2">Supervisor{propiedad.supervisores_email.length > 1 ? 'es' : ''}</span>
                    <div className="space-y-1">
                      {propiedad.supervisores_email.map((email, idx) => (
                        <p key={idx} className="text-sm text-gray-900">✉️ {email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inquilinos */}
                {propiedad.inquilinos_email && propiedad.inquilinos_email.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-xs text-amber-600 font-semibold uppercase block mb-2">Inquilino{propiedad.inquilinos_email.length > 1 ? 's' : ''}</span>
                    <div className="space-y-1">
                      {propiedad.inquilinos_email.map((email, idx) => (
                        <p key={idx} className="text-sm text-gray-900">✉️ {email}</p>
                      ))}
                    </div>
                  </div>
                )}

                {!propiedad.propietarios_email?.length && !propiedad.supervisores_email?.length && !propiedad.inquilinos_email?.length && (
                  <p className="text-gray-500 text-center py-8">No hay asignaciones registradas</p>
                )}
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Ubicación</h2>
              </div>
              
              {propiedad.ubicacion ? (
                <UbicacionCard ubicacion={propiedad.ubicacion} />
              ) : (
                <p className="text-gray-500 text-center py-8">No hay ubicación registrada</p>
              )}
            </div>
          </div>

          {/* ✅ MOVIDO AL FINAL: Galería de Fotos */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Galería de Fotos</h2>
            </div>
            
            <GaleriaPropiedad 
              propiedadId={propiedad.id}
              amenidades={propiedad.datos_renta_vacacional?.amenidades_vacacional}
            />
          </div>

          {/* Información del Sistema */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Información del Sistema</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600 font-medium">ID de Propiedad</span>
                <p className="text-gray-900 font-mono text-sm mt-1">{propiedad.id}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600 font-medium">Creada</span>
                <p className="text-gray-900 font-semibold mt-1">
                  {new Date(propiedad.created_at).toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600 font-medium">Última actualización</span>
                <p className="text-gray-900 font-semibold mt-1">
                  {new Date(propiedad.updated_at).toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {/* Colaboradores */}
            {colaboradores.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Compartido con:</h3>
                <div className="flex flex-wrap gap-2">
                  {colaboradores.map((colab) => (
                    <div
                      key={colab.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                        colab.pendiente
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span>{colab.email}</span>
                      {colab.pendiente && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-200 text-yellow-900 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowCompartir(true)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartir
                </button>

                <button
                  onClick={editarPropiedad}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>

                <button
                  onClick={() => setShowDuplicarModal(true)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Duplicar
                </button>
              </div>

              <button
                onClick={eliminarPropiedad}
                className="w-full mt-3 px-6 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border-2 border-red-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Eliminar propiedad
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Modal Compartir */}
      {showCompartir && (
        <CompartirPropiedad
          isOpen={showCompartir}
          onClose={() => setShowCompartir(false)}
          propiedadId={propiedadId}
          propiedadNombre={propiedad.nombre_propiedad}
          userId={user.id}
          esPropio={propiedad.es_propio}
        />
      )}

      {/* Modal Duplicar */}
      {showDuplicarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Duplicar Propiedad</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la nueva propiedad
              </label>
              <input
                type="text"
                value={nombreDuplicado}
                onChange={(e) => setNombreDuplicado(e.target.value)}
                placeholder={`Copia de ${propiedad.nombre_propiedad}`}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDuplicarModal(false)
                  setNombreDuplicado('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={duplicando}
              >
                Cancelar
              </button>
              <button
                onClick={duplicarPropiedad}
                disabled={duplicando || !nombreDuplicado.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {duplicando ? 'Duplicando...' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar - Wizard en modo edición */}
      {showEditarModal && (
        <Suspense fallback={<Loading />}>
          <WizardModal
            key={`edit-wizard-${propiedadId}`}
            isOpen={showEditarModal}
            onClose={() => setShowEditarModal(false)}
            mode="edit"
            propertyId={propiedadId}
            onComplete={async (id) => {
              setShowEditarModal(false)
              toast.success('Propiedad actualizada correctamente')
              await cargarPropiedad() // Recargar datos actualizados
            }}
          />
        </Suspense>
      )}
    </div>
  )
}