'use client'

/**
 * ANUNCIO - Vista de Edición Premium
 * Permite al propietario configurar y publicar el anuncio de su propiedad
 * con título personalizado, tagline, ordenamiento de fotos y control de secciones
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/components/ui/confirm-modal'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import Button from '@/components/ui/button'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Propiedad {
  id: string
  nombre_propiedad: string
  tipo_propiedad: string
  descripcion_anuncio: string | null
  estado_anuncio: 'borrador' | 'publicado' | 'pausado' | null
  anuncio_titulo: string | null
  anuncio_tagline: string | null
  anuncio_secciones_visibles: {
    precio: boolean
    ubicacion: boolean
    mapa: boolean
    dimensiones: boolean
    espacios: boolean
    amenidades: boolean
  } | null
  precios?: {
    venta?: number | null
    mensual?: number | null
    noche?: number | null
  } | null
  foto_portada?: string | null
}

interface Foto {
  id: string
  url: string
  url_thumbnail: string
  is_cover: boolean
  order_index?: number
}

// Componente para item sortable (drag & drop)
function SortableFotoItem({ foto, index }: { foto: Foto; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: foto.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white rounded-lg border-2 ${
        foto.is_cover ? 'border-ras-turquesa' : 'border-gray-200'
      } overflow-hidden group`}
      {...attributes}
      {...listeners}
    >
      <div className="aspect-video relative">
        <img
          src={foto.url_thumbnail || foto.url}
          alt={`Foto ${index + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Error"
          }}
        />

        {/* Badge de portada */}
        {foto.is_cover && (
          <div className="absolute top-2 left-2 bg-ras-turquesa text-white px-2 py-1 rounded text-xs font-semibold">
            ★ Portada
          </div>
        )}

        {/* Indicador de orden */}
        <div className="absolute top-2 right-2 bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>

        {/* Icono de arrastre */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          ⋮⋮ Arrastra
        </div>
      </div>
    </div>
  )
}

export default function AnuncioEditPage() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()

  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])

  // Estados del formulario
  const [descripcion, setDescripcion] = useState('')
  const [estadoAnuncio, setEstadoAnuncio] = useState<'borrador' | 'publicado' | 'pausado'>('borrador')

  // Nuevos campos premium
  const [titulo, setTitulo] = useState('')
  const [tagline, setTagline] = useState('')
  const [seccionesVisibles, setSeccionesVisibles] = useState({
    precio: true,
    ubicacion: true,
    mapa: false,
    dimensiones: true,
    espacios: true,
    amenidades: true
  })

  // Sensors para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (!authLoading && user) {
      cargarDatos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const cargarDatos = useCallback(async () => {
    if (!propiedadId) return

    try {
      setLoading(true)

      // Cargar propiedad con nuevos campos premium
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, descripcion_anuncio, estado_anuncio, precios, anuncio_titulo, anuncio_tagline, anuncio_secciones_visibles')
        .eq('id', propiedadId)
        .single()

      if (propError) {
        console.error('Error cargando propiedad:', propError)
        toast.error('No se pudo cargar la propiedad')
        router.push('/dashboard/catalogo')
        return
      }

      // Cargar foto de portada
      const { data: fotoPortada } = await supabase
        .from('property_images')
        .select('url, url_thumbnail, is_cover')
        .eq('property_id', propiedadId)
        .eq('is_cover', true)
        .single()

      propData.foto_portada = fotoPortada?.url_thumbnail || null

      // Cargar todas las fotos con id y order_index
      const { data: fotosData } = await supabase
        .from('property_images')
        .select('id, url, url_thumbnail, is_cover, order_index')
        .eq('property_id', propiedadId)
        .order('order_index', { ascending: true })

      if (fotosData) {
        setFotos(fotosData)
      }

      setPropiedad(propData)
      setDescripcion(propData.descripcion_anuncio || '')
      setEstadoAnuncio(propData.estado_anuncio || 'borrador')

      // Nuevos campos premium
      setTitulo(propData.anuncio_titulo || '')
      setTagline(propData.anuncio_tagline || '')
      if (propData.anuncio_secciones_visibles) {
        setSeccionesVisibles(propData.anuncio_secciones_visibles)
      }

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar anuncio')
    } finally {
      setLoading(false)
    }
  }, [propiedadId, toast, router])

  const guardarCambios = useCallback(async () => {
    if (!propiedad) return

    setGuardando(true)

    try {
      const { error } = await supabase
        .from('propiedades')
        .update({
          descripcion_anuncio: descripcion,
          estado_anuncio: estadoAnuncio,
          anuncio_titulo: titulo || null,
          anuncio_tagline: tagline || null,
          anuncio_secciones_visibles: seccionesVisibles
        })
        .eq('id', propiedadId)

      if (error) {
        console.error('Error guardando cambios:', error)
        toast.error('Error al guardar cambios')
        return
      }

      toast.success('Cambios guardados correctamente')
      await cargarDatos()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }, [propiedad, descripcion, estadoAnuncio, titulo, tagline, seccionesVisibles, propiedadId, toast, cargarDatos])

  const cambiarEstado = useCallback(async (nuevoEstado: 'borrador' | 'publicado' | 'pausado') => {
    if (!propiedad) return

    // Validaciones antes de publicar
    if (nuevoEstado === 'publicado') {
      if (!descripcion?.trim()) {
        toast.error('Agrega una descripción antes de publicar')
        return
      }

      if (fotos.length === 0) {
        const continuar = await confirm.warning(
          'No tienes fotos',
          '¿Deseas publicar el anuncio sin fotos? Recomendamos agregar al menos una foto.'
        )
        if (!continuar) return
      }

      if (!propiedad.precios?.venta && !propiedad.precios?.mensual && !propiedad.precios?.noche) {
        toast.error('Configura al menos un precio antes de publicar')
        return
      }
    }

    setEstadoAnuncio(nuevoEstado)

    // Guardar inmediatamente
    try {
      const { error } = await supabase
        .from('propiedades')
        .update({
          estado_anuncio: nuevoEstado,
          descripcion_anuncio: descripcion
        })
        .eq('id', propiedadId)

      if (error) {
        console.error('Error:', error)
        toast.error('Error al cambiar estado')
        return
      }

      const mensajes = {
        'publicado': '¡Anuncio publicado! Ya está visible al público',
        'pausado': 'Anuncio pausado. No es visible al público',
        'borrador': 'Anuncio guardado como borrador'
      }

      toast.success(mensajes[nuevoEstado])
      await cargarDatos()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cambiar estado')
    }
  }, [propiedad, descripcion, fotos, propiedadId, toast, confirm, cargarDatos])

  const verAnuncioPublico = useCallback(() => {
    window.open(`/anuncio/${propiedadId}`, '_blank')
  }, [propiedadId])

  const verPreview = useCallback(() => {
    if (estadoAnuncio !== 'publicado') {
      toast.warning('Debes publicar el anuncio para ver el preview público. Publica primero y luego podrás ver cómo se verá.')
      return
    }
    toast.info('Abriendo vista previa del anuncio...')
    window.open(`/anuncio/${propiedadId}`, '_blank')
  }, [estadoAnuncio, propiedadId, toast])

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  // Handler para drag & drop de fotos
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setFotos((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newOrder = arrayMove(items, oldIndex, newIndex)

      // Actualizar order_index en base de datos
      newOrder.forEach(async (foto, index) => {
        await supabase
          .from('property_images')
          .update({ order_index: index })
          .eq('id', foto.id)
      })

      toast.success('Orden de fotos actualizado')
      return newOrder
    })
  }, [toast])

  // Toggle de sección visible
  const toggleSeccion = useCallback((seccion: keyof typeof seccionesVisibles) => {
    setSeccionesVisibles(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }))
  }, [])

  if (loading || authLoading) {
    return <Loading message="Cargando anuncio..." />
  }

  if (!propiedad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No se pudo cargar la propiedad</p>
        </div>
      </div>
    )
  }

  const getEstadoBadge = () => {
    const badges = {
      'publicado': { text: 'PUBLICADO', bg: 'bg-green-100', text_color: 'text-green-700', border: 'border-green-300' },
      'pausado': { text: 'PAUSADO', bg: 'bg-orange-100', text_color: 'text-orange-700', border: 'border-orange-300' },
      'borrador': { text: 'BORRADOR', bg: 'bg-gray-100', text_color: 'text-gray-700', border: 'border-gray-300' }
    }
    return badges[estadoAnuncio]
  }

  const badge = getEstadoBadge()

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title={`Anuncio - ${propiedad.nombre_propiedad}`}
        showHomeButton
        showBackButton
        showAddButton
        onBackClick={volverCatalogo}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Estado y acciones rápidas */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">Estado del anuncio</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text_color} ${badge.border}`}>
                  {badge.text}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {estadoAnuncio === 'publicado' && 'Tu anuncio está visible al público'}
                {estadoAnuncio === 'pausado' && 'Tu anuncio está oculto temporalmente'}
                {estadoAnuncio === 'borrador' && 'Tu anuncio no está visible aún'}
              </p>
            </div>

            <div className="flex gap-2">
              {/* Botón Vista Previa - SIEMPRE visible */}
              <Button
                onClick={verPreview}
                variant="secondary"
                size="sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Vista Previa
              </Button>

              {/* Link público - Solo si está publicado */}
              {estadoAnuncio === 'publicado' && (
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/anuncio/${propiedadId}`)
                    toast.success('Link copiado al portapapeles')
                  }}
                  variant="success"
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar Link
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Título y Tagline Premium */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold text-gray-900 font-poppins">Título personalizado</h3>
            <span className="bg-gradient-to-r from-ras-turquesa to-ras-azul text-white px-2 py-0.5 rounded text-xs font-semibold">
              PREMIUM
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del anuncio (opcional)
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value.slice(0, 60))}
                placeholder={propiedad.nombre_propiedad}
                maxLength={60}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>Máximo 60 caracteres</span>
                <span className={titulo.length > 50 ? 'text-orange-500' : ''}>{titulo.length}/60</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtítulo / Tagline (opcional)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                placeholder="Ej: Tu oasis en el corazón de la ciudad"
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>Máximo 100 caracteres</span>
                <span className={tagline.length > 80 ? 'text-orange-500' : ''}>{tagline.length}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Control de secciones visibles */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold text-gray-900 font-poppins">Secciones del anuncio</h3>
            <span className="bg-gradient-to-r from-ras-turquesa to-ras-azul text-white px-2 py-0.5 rounded text-xs font-semibold">
              PREMIUM
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Elige qué información mostrar en tu anuncio público
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'precio' as const, label: 'Precios', icon: '💰' },
              { key: 'ubicacion' as const, label: 'Ubicación', icon: '📍' },
              { key: 'mapa' as const, label: 'Mapa exacto', icon: '🗺️' },
              { key: 'dimensiones' as const, label: 'Dimensiones', icon: '📐' },
              { key: 'espacios' as const, label: 'Espacios', icon: '🏠' },
              { key: 'amenidades' as const, label: 'Amenidades', icon: '✨' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => toggleSeccion(key)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  seccionesVisibles[key]
                    ? 'border-ras-turquesa bg-ras-turquesa/10'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-sm font-semibold text-gray-900">{label}</div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${
                    seccionesVisibles[key] ? 'bg-ras-turquesa' : 'bg-gray-300'
                  } relative`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      seccionesVisibles[key] ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Galería de fotos con drag & drop */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 font-poppins">Galería de fotos</h3>
              <span className="bg-gradient-to-r from-ras-turquesa to-ras-azul text-white px-2 py-0.5 rounded text-xs font-semibold">
                DRAG & DROP
              </span>
            </div>
            <button
              onClick={() => router.push(`/dashboard/catalogo/propiedad/${propiedadId}/galeria`)}
              className="text-sm text-ras-azul hover:text-ras-turquesa font-semibold"
            >
              Administrar fotos →
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Arrastra las fotos para cambiar su orden en el anuncio público
          </p>

          {fotos.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fotos.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {fotos.map((foto, index) => (
                    <SortableFotoItem key={foto.id} foto={foto} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 mb-2">No tienes fotos aún</p>
              <button
                onClick={() => router.push(`/dashboard/catalogo/propiedad/${propiedadId}/galeria`)}
                className="text-ras-azul hover:text-ras-turquesa font-semibold"
              >
                Agregar fotos →
              </button>
            </div>
          )}
        </div>

        {/* Precios configurados */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-poppins">Precios configurados</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${propiedad.precios?.venta ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Precio de venta</div>
              <div className={`text-2xl font-bold ${propiedad.precios?.venta ? 'text-blue-600' : 'text-gray-400'}`}>
                {propiedad.precios?.venta ? `$${propiedad.precios.venta.toLocaleString('es-MX')}` : 'No configurado'}
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${propiedad.precios?.mensual ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Renta mensual</div>
              <div className={`text-2xl font-bold ${propiedad.precios?.mensual ? 'text-purple-600' : 'text-gray-400'}`}>
                {propiedad.precios?.mensual ? `$${propiedad.precios.mensual.toLocaleString('es-MX')}` : 'No configurado'}
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${propiedad.precios?.noche ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Precio por noche</div>
              <div className={`text-2xl font-bold ${propiedad.precios?.noche ? 'text-green-600' : 'text-gray-400'}`}>
                {propiedad.precios?.noche ? `USD ${propiedad.precios.noche.toFixed(2)}` : 'No configurado'}
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/dashboard/catalogo/propiedad/${propiedadId}/home`)}
            className="mt-4 text-sm text-ras-azul hover:text-ras-turquesa font-semibold"
          >
            Editar precios en la página principal →
          </button>
        </div>

        {/* Descripción del anuncio */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <label className="block text-lg font-bold text-gray-900 mb-2 font-poppins">
            Descripción del anuncio
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Describe tu propiedad de manera atractiva. Incluye detalles importantes, características especiales y lo que la hace única.
          </p>

          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={8}
            placeholder="Ej: Hermosa casa con acabados de lujo, ubicada en zona residencial tranquila. Cuenta con 3 recámaras amplias, 2.5 baños, cocina integral, jardín y estacionamiento para 2 autos..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent resize-none"
          />

          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{descripcion.length} caracteres</span>
            <span>{descripcion.trim() ? '✓ Con descripción' : '⚠ Sin descripción'}</span>
          </div>
        </div>

        {/* Controles de estado */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-poppins">Controles de publicación</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => cambiarEstado('borrador')}
              className={`p-4 rounded-lg border-2 transition-all ${
                estadoAnuncio === 'borrador'
                  ? 'border-gray-400 bg-gray-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📝</div>
                <div className="font-bold text-gray-900">Borrador</div>
                <div className="text-xs text-gray-600 mt-1">No visible al público</div>
              </div>
            </button>

            <button
              onClick={() => cambiarEstado('publicado')}
              className={`p-4 rounded-lg border-2 transition-all ${
                estadoAnuncio === 'publicado'
                  ? 'border-green-400 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="font-bold text-green-700">Publicado</div>
                <div className="text-xs text-gray-600 mt-1">Visible al público</div>
              </div>
            </button>

            <button
              onClick={() => cambiarEstado('pausado')}
              className={`p-4 rounded-lg border-2 transition-all ${
                estadoAnuncio === 'pausado'
                  ? 'border-orange-400 bg-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">⏸️</div>
                <div className="font-bold text-orange-700">Pausado</div>
                <div className="text-xs text-gray-600 mt-1">Oculto temporalmente</div>
              </div>
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button
            onClick={guardarCambios}
            variant="primary"
            size="lg"
            disabled={guardando}
            className="flex-1"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>

          {/* Botón Vista Previa - siempre visible */}
          <Button
            onClick={verPreview}
            variant="secondary"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Vista Previa
          </Button>
        </div>

      </main>
    </div>
  )
}
