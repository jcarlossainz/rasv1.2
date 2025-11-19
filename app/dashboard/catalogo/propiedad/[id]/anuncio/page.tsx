'use client'

/**
 * ANUNCIO - Vista de Edición
 * Permite al propietario configurar y publicar el anuncio de su propiedad
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

interface Propiedad {
  id: string
  nombre_propiedad: string
  tipo_propiedad: string
  descripcion_anuncio: string | null
  estado_anuncio: 'borrador' | 'publicado' | 'pausado' | null
  precios?: {
    venta?: number | null
    mensual?: number | null
    noche?: number | null
  } | null
  foto_portada?: string | null
}

interface Foto {
  url: string
  url_thumbnail: string
  is_cover: boolean
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

      // Cargar propiedad
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, descripcion_anuncio, estado_anuncio, precios')
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

      // Cargar todas las fotos
      const { data: fotosData } = await supabase
        .from('property_images')
        .select('url, url_thumbnail, is_cover')
        .eq('property_id', propiedadId)
        .order('is_cover', { ascending: false })
        .order('created_at', { ascending: true })

      if (fotosData) {
        setFotos(fotosData)
      }

      setPropiedad(propData)
      setDescripcion(propData.descripcion_anuncio || '')
      setEstadoAnuncio(propData.estado_anuncio || 'borrador')

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
          estado_anuncio: estadoAnuncio
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
  }, [propiedad, descripcion, estadoAnuncio, propiedadId, toast, cargarDatos])

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
    if (estadoAnuncio !== 'publicado') {
      toast.info('El anuncio debe estar publicado para verlo')
      return
    }
    window.open(`/anuncio/${propiedadId}`, '_blank')
  }, [estadoAnuncio, propiedadId, toast])

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
        showBackButton
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
              {estadoAnuncio === 'publicado' && (
                <Button
                  onClick={verAnuncioPublico}
                  variant="secondary"
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver anuncio
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Preview de la portada */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-gray-200">
          <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
            {propiedad.foto_portada ? (
              <img
                src={propiedad.foto_portada}
                alt="Portada"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/800x400/f3f4f6/9ca3af?text=Sin+portada"
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <svg className="w-16 h-16 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-sm">Sin foto de portada</p>
                <button
                  onClick={() => router.push(`/dashboard/catalogo/propiedad/${propiedadId}/galeria`)}
                  className="mt-2 text-ras-azul hover:text-ras-turquesa text-sm font-semibold"
                >
                  Ir a Galería →
                </button>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} en total
            </p>
          </div>
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

        {/* Botón guardar */}
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

          {estadoAnuncio === 'publicado' && (
            <Button
              onClick={verAnuncioPublico}
              variant="success"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver anuncio público
            </Button>
          )}
        </div>

      </main>
    </div>
  )
}
