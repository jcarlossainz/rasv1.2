'use client'

/**
 * ANUNCIO - Vista de Edición con Preview en Tiempo Real
 * Permite al propietario configurar título, descripción y estado del anuncio
 * con una vista previa en vivo del hero del anuncio
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import Button from '@/components/ui/button'
import Image from 'next/image'

interface PropertyImage {
  id: string
  url: string
  url_thumbnail: string | null
  is_cover: boolean
  order_index: number
}

interface Propiedad {
  id: string
  nombre_propiedad: string
  tipo_propiedad: string
  descripcion_anuncio: string | null
  estado_anuncio: 'borrador' | 'publicado' | 'pausado' | null
  anuncio_titulo: string | null
}

export default function AnuncioEditPage() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const { user, loading: authLoading } = useAuth()

  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)

  // Estados del formulario
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [estadoAnuncio, setEstadoAnuncio] = useState<'borrador' | 'publicado' | 'pausado'>('borrador')

  // Estado para imágenes del preview
  const [imagenes, setImagenes] = useState<PropertyImage[]>([])
  const [imagenActual, setImagenActual] = useState(0)

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

      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, descripcion_anuncio, estado_anuncio, anuncio_titulo')
        .eq('id', propiedadId)
        .single()

      if (propError) {
        console.error('Error cargando propiedad:', propError)
        toast.error('No se pudo cargar la propiedad')
        router.push('/dashboard/catalogo')
        return
      }

      setPropiedad(propData)
      setTitulo(propData.anuncio_titulo || '')
      setDescripcion(propData.descripcion_anuncio || '')
      setEstadoAnuncio(propData.estado_anuncio || 'borrador')

      // Cargar imágenes para el preview
      const { data: imagenesData } = await supabase
        .from('property_images')
        .select('id, url, url_thumbnail, is_cover, order_index')
        .eq('property_id', propiedadId)
        .order('order_index', { ascending: true })

      if (imagenesData && imagenesData.length > 0) {
        setImagenes(imagenesData)
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
          anuncio_titulo: titulo || null,
          descripcion_anuncio: descripcion,
          estado_anuncio: estadoAnuncio
        })
        .eq('id', propiedadId)

      if (error) {
        console.error('Error guardando cambios:', error)
        toast.error('Error al guardar cambios')
        return
      }

      toast.success('Cambios guardados correctamente')

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }, [propiedad, titulo, descripcion, estadoAnuncio, propiedadId, toast])

  const toggleEstado = useCallback((nuevoEstado: 'publicado' | 'pausado') => {
    setEstadoAnuncio(nuevoEstado)
  }, [])

  const verPreview = useCallback(() => {
    // Permitir vista previa en cualquier estado usando parámetro especial
    window.open(`/anuncio/${propiedadId}?preview=true`, '_blank')
  }, [propiedadId])

  // Auto-avance del carrusel en el preview
  useEffect(() => {
    if (imagenes.length > 1) {
      const interval = setInterval(() => {
        setImagenActual((prev) => (prev + 1) % imagenes.length)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [imagenes.length])

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Vista Previa en Tiempo Real */}
        <div className="mb-8 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
          <div className="relative h-64 sm:h-80 w-full">
            {/* Imagen de fondo */}
            {imagenes.length > 0 ? (
              <Image
                src={imagenes[imagenActual].url}
                alt="Vista previa"
                fill
                className="object-cover transition-opacity duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900" />
            )}

            {/* Overlay oscuro */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

            {/* Contenido del preview */}
            <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
              {/* Badge de estado */}
              <div className={`inline-block mb-3 px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border ${
                estadoAnuncio === 'publicado'
                  ? 'bg-green-500/20 border-green-400/30 text-green-100'
                  : estadoAnuncio === 'pausado'
                  ? 'bg-orange-500/20 border-orange-400/30 text-orange-100'
                  : 'bg-white/20 border-white/30 text-white'
              }`}>
                {estadoAnuncio === 'publicado' ? 'Publicado' : estadoAnuncio === 'pausado' ? 'Pausado' : 'Borrador'}
              </div>

              {/* Título en tiempo real */}
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 leading-tight max-w-2xl">
                {titulo || propiedad.nombre_propiedad || 'Título del anuncio'}
              </h1>

              {/* Tipo de propiedad */}
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                  {propiedad.tipo_propiedad}
                </span>
              </div>
            </div>

            {/* Indicadores de imagen */}
            {imagenes.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                {imagenes.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagenActual(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === imagenActual ? 'bg-white w-4' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Etiqueta de preview */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-xs text-white/70">
              Vista previa
            </div>
          </div>
        </div>

        {/* Título y Descripción */}
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value.slice(0, 60))}
              placeholder="Título del anuncio"
              maxLength={60}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent bg-transparent"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{titulo.length}/60 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={6}
              placeholder="Descripción del anuncio..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent resize-none bg-transparent"
            />
          </div>
        </div>

        {/* Controles de estado - Publicado / Pausado */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => toggleEstado('publicado')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
              estadoAnuncio === 'publicado'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-medium">Publicado</span>
          </button>

          <button
            onClick={() => toggleEstado('pausado')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
              estadoAnuncio === 'pausado'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span className="font-medium">Pausado</span>
          </button>
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

          <Button
            onClick={verPreview}
            variant="secondary"
            size="lg"
          >
            Vista Previa
          </Button>
        </div>

      </main>
    </div>
  )
}
