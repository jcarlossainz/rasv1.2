'use client'

/**
 * 🎨 LANDING PAGE PÚBLICA - APPLE STYLE
 * Anuncio público de propiedad con diseño premium
 * - Glassmorphism
 * - Gradientes sutiles
 * - Multi-CTA flotante
 * - Animaciones suaves
 * - Responsive mobile-first
 */

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import Loading from '@/components/ui/loading'
import { motion, AnimatePresence } from 'framer-motion'
import { calcularCapacidadPersonas } from '@/types/property'

// ============================================================================
// TIPOS
// ============================================================================

interface PropiedadData {
  id: string
  nombre_propiedad: string
  anuncio_titulo: string | null
  anuncio_tagline: string | null
  anuncio_secciones_visibles: {
    precio: boolean
    ubicacion: boolean
    mapa: boolean
    dimensiones: boolean
    espacios: boolean
    amenidades: boolean
  }
  tipo_propiedad: string
  estados: string[]
  dimensiones: {
    terreno: {
      valor: number
      unidad: string
    }
    construccion: {
      valor: number
      unidad: string
    }
  } | null

  // Ubicación
  ubicacion: {
    colonia: string
    codigo_postal: string
    ciudad: string
    estado: string
  } | null

  // Precios
  precios: {
    venta: number
    mensual: number
    noche: number
  } | null

  // Espacios
  espacios: Array<{
    nombre: string
    categoria: string
    cantidad: number
  }> | null

  // Amenidades
  amenidades_vacacional: string[] | null

  // Datos básicos adicionales
  mobiliario: string | null

  // Anuncio
  descripcion_anuncio: string | null
  estado_anuncio: string | null

}

interface PropertyImage {
  id: string
  url: string
  url_thumbnail: string | null
  is_cover: boolean
  order_index: number
  caption: string | null
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AnuncioPublicoApple() {
  const params = useParams()
  const propiedadId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadData | null>(null)
  const [imagenes, setImagenes] = useState<PropertyImage[]>([])
  const [imagenActual, setImagenActual] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen] = useState(false)

  // Calcular capacidad de personas dinámicamente desde los espacios
  const capacidadPersonas = useMemo(() => {
    if (!propiedad?.espacios) return null
    return calcularCapacidadPersonas(propiedad.espacios)
  }, [propiedad?.espacios])

  useEffect(() => {
    if (propiedadId) {
      cargarDatos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propiedadId])

  const cargarDatos = async () => {
    try {
      // Cargar propiedad - solo anuncios publicados para público
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select(`
          id,
          nombre_propiedad,
          anuncio_titulo,
          anuncio_tagline,
          anuncio_secciones_visibles,
          tipo_propiedad,
          estados,
          dimensiones,
          ubicacion,
          precios,
          espacios,
          descripcion_anuncio,
          estado_anuncio,
          amenidades_vacacional,
          mobiliario
        `)
        .eq('id', propiedadId)
        .eq('estado_anuncio', 'publicado')
        .single()

      if (propError) {
        console.error('Error cargando propiedad:', propError)
        console.error('Property ID:', propiedadId)
        setError(`Anuncio no disponible: ${propError.message}`)
        setLoading(false)
        return
      }

      if (!propData) {
        console.error('No se encontró propiedad con ID:', propiedadId)
        setError('No se encontró la propiedad')
        setLoading(false)
        return
      }

      setPropiedad(propData)

      // Cargar imágenes
      const { data: imagenesData } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', propiedadId)
        .order('order_index', { ascending: true })

      if (imagenesData && imagenesData.length > 0) {
        setImagenes(imagenesData)
      }

      // Intentar cargar contacto del propietario
      // TODO: implementar carga de propietario desde tabla contactos

    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar el anuncio')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FUNCIONES DE CONTACTO
  // ============================================================================

  const contactarWhatsApp = () => {
    const telefono = '5215512345678' // TODO: obtener de propietario
    const mensaje = `Hola! Me interesa la propiedad: ${propiedad?.anuncio_titulo || propiedad?.nombre_propiedad}`
    const numero = telefono.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    window.open(whatsappUrl, '_blank')
  }

  const enviarCorreo = () => {
    // TODO: Obtener email del propietario desde tabla profiles o contactos
    const email = 'contacto@ejemplo.com'
    const asunto = `Interés en: ${propiedad?.anuncio_titulo || propiedad?.nombre_propiedad}`
    const cuerpo = `Hola,\n\nMe interesa obtener más información sobre esta propiedad.\n\nGracias.`
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    window.location.href = mailtoUrl
  }

  const llamar = () => {
    const telefono = '5215512345678' // TODO: obtener de propietario
    window.location.href = `tel:${telefono}`
  }

  const compartir = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: propiedad?.anuncio_titulo || propiedad?.nombre_propiedad || 'Propiedad',
          text: propiedad?.anuncio_tagline || 'Mira esta increíble propiedad',
          url: url
        })
      } catch {
        copiarLink()
      }
    } else {
      copiarLink()
    }
  }

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('✓ Link copiado al portapapeles')
    })
  }

  // ============================================================================
  // FUNCIONES DE GALERÍA
  // ============================================================================

  const siguienteImagen = () => {
    setImagenActual((prev) => (prev + 1) % imagenes.length)
  }

  const anteriorImagen = () => {
    setImagenActual((prev) => (prev - 1 + imagenes.length) % imagenes.length)
  }

  // Auto-advance carousel
  useEffect(() => {
    if (imagenes.length > 1 && !lightboxOpen) {
      const interval = setInterval(() => {
        setImagenActual((prev) => (prev + 1) % imagenes.length)
      }, 5000)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenes.length, lightboxOpen])

  // ============================================================================
  // RENDERS CONDICIONALES
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <Loading message="Cargando anuncio..." />
      </div>
    )
  }

  if (error || !propiedad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 p-12 max-w-md text-center"
        >
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Anuncio no disponible</h2>
          <p className="text-gray-600 leading-relaxed">{error || 'El anuncio que buscas no está publicado o no existe.'}</p>
        </motion.div>
      </div>
    )
  }

  const secciones = propiedad.anuncio_secciones_visibles || {
    precio: true,
    ubicacion: true,
    mapa: false,
    dimensiones: true,
    espacios: true,
    amenidades: true
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]">

      {/* ============================================================================ */}
      {/* HERO SECTION - FULLSCREEN CON GALERÍA */}
      {/* ============================================================================ */}

      <div className="relative h-screen w-full overflow-hidden">
        {/* Galería de fondo */}
        <AnimatePresence mode="wait">
          {imagenes.length > 0 ? (
            <motion.div
              key={imagenActual}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              <Image
                src={imagenes[imagenActual].url}
                alt={imagenes[imagenActual].caption || propiedad.nombre_propiedad}
                fill
                className="object-cover"
                priority={imagenActual === 0}
                quality={90}
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
          )}
        </AnimatePresence>

        {/* Overlay gradient oscuro */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

        {/* Glassmorphism overlay con contenido */}
        <div className="relative h-full flex flex-col items-center justify-center px-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-center max-w-4xl"
          >
            {/* Badge de disponibilidad */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="inline-block mb-6"
            >
              <div className="px-6 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-medium text-sm">
                ✨ Disponible ahora
              </div>
            </motion.div>

            {/* Título principal */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              {propiedad.anuncio_titulo || propiedad.nombre_propiedad}
            </h1>

            {/* Tagline */}
            {propiedad.anuncio_tagline && (
              <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
                {propiedad.anuncio_tagline}
              </p>
            )}

            {/* Características rápidas */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white">
                <div className="text-2xl font-bold">{propiedad.tipo_propiedad}</div>
                <div className="text-xs opacity-80">Tipo</div>
              </div>
              {capacidadPersonas && (
                <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white">
                  <div className="text-2xl font-bold">{capacidadPersonas}</div>
                  <div className="text-xs opacity-80">Personas</div>
                </div>
              )}
              {propiedad.dimensiones?.construccion && (
                <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white">
                  <div className="text-2xl font-bold">{propiedad.dimensiones.construccion.valor}</div>
                  <div className="text-xs opacity-80">{propiedad.dimensiones.construccion.unidad || 'm²'}</div>
                </div>
              )}
            </div>

            {/* CTA principal */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const contactoSection = document.getElementById('contacto')
                contactoSection?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-10 py-5 bg-white text-gray-900 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transition-all"
            >
              Contactar ahora
            </motion.button>

            {/* Indicador de scroll */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-8 h-12 rounded-full border-2 border-white/50 flex items-start justify-center p-2"
              >
                <div className="w-1 h-3 bg-white rounded-full" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Controles de galería */}
        {imagenes.length > 1 && (
          <>
            <button
              onClick={anteriorImagen}
              className="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 transition-all"
            >
              <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={siguienteImagen}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 transition-all"
            >
              <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Indicadores de puntos */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
              {imagenes.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setImagenActual(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === imagenActual
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ============================================================================ */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ============================================================================ */}

      <div className="max-w-6xl mx-auto px-4 py-20 -mt-32 relative z-10">

        {/* Grid con 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* COLUMNA PRINCIPAL (2/3) */}
          <div className="lg:col-span-2 space-y-8">

            {/* PRECIOS */}
            {secciones.precio && propiedad.precios && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Precios</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {propiedad.precios.venta > 0 && (
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl border border-orange-200/50">
                      <div className="text-sm text-orange-600 font-medium mb-2">VENTA</div>
                      <div className="text-4xl font-bold text-gray-900">
                        ${propiedad.precios.venta.toLocaleString('es-MX')}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">MXN</div>
                    </div>
                  )}

                  {propiedad.precios.mensual > 0 && (
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200/50">
                      <div className="text-sm text-emerald-600 font-medium mb-2">RENTA MENSUAL</div>
                      <div className="text-4xl font-bold text-gray-900">
                        ${propiedad.precios.mensual.toLocaleString('es-MX')}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">MXN / mes</div>
                    </div>
                  )}

                  {propiedad.precios.noche > 0 && (
                    <div className="p-6 bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-2xl border border-cyan-200/50">
                      <div className="text-sm text-cyan-600 font-medium mb-2">VACACIONAL</div>
                      <div className="text-4xl font-bold text-gray-900">
                        ${propiedad.precios.noche.toLocaleString('es-MX')}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">USD / noche</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* DESCRIPCIÓN */}
            {propiedad.descripcion_anuncio && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Descripción</h2>
                <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                  {propiedad.descripcion_anuncio}
                </p>
              </motion.div>
            )}

            {/* CARACTERÍSTICAS */}
            {secciones.dimensiones && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Características</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-2xl border border-blue-200/50">
                    <div className="text-3xl mb-2">🏠</div>
                    <div className="text-sm text-gray-600 mb-1">Tipo</div>
                    <div className="font-bold text-gray-900">{propiedad.tipo_propiedad}</div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/30 rounded-2xl border border-purple-200/50">
                    <div className="text-3xl mb-2">🛋️</div>
                    <div className="text-sm text-gray-600 mb-1">Mobiliario</div>
                    <div className="font-bold text-gray-900">{propiedad.mobiliario}</div>
                  </div>

                  {capacidadPersonas && (
                    <div className="p-5 bg-gradient-to-br from-green-50 to-green-100/30 rounded-2xl border border-green-200/50">
                      <div className="text-3xl mb-2">👥</div>
                      <div className="text-sm text-gray-600 mb-1">Capacidad</div>
                      <div className="font-bold text-gray-900">{capacidadPersonas} personas</div>
                    </div>
                  )}

                  {propiedad.dimensiones?.construccion && (
                    <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-2xl border border-amber-200/50">
                      <div className="text-3xl mb-2">📐</div>
                      <div className="text-sm text-gray-600 mb-1">Construcción</div>
                      <div className="font-bold text-gray-900">
                        {propiedad.dimensiones.construccion.valor} {propiedad.dimensiones.construccion.unidad}
                      </div>
                    </div>
                  )}

                  {propiedad.dimensiones?.terreno && (
                    <div className="p-5 bg-gradient-to-br from-teal-50 to-teal-100/30 rounded-2xl border border-teal-200/50">
                      <div className="text-3xl mb-2">🌳</div>
                      <div className="text-sm text-gray-600 mb-1">Terreno</div>
                      <div className="font-bold text-gray-900">
                        {propiedad.dimensiones.terreno.valor} {propiedad.dimensiones.terreno.unidad}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ESPACIOS */}
            {secciones.espacios && propiedad.espacios && propiedad.espacios.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Espacios</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {propiedad.espacios.map((espacio, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/30 hover:border-purple-300/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-700 font-bold text-lg">
                            {espacio.cantidad || 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{espacio.nombre}</p>
                          <p className="text-xs text-gray-600">{espacio.categoria}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AMENIDADES */}
            {secciones.amenidades && propiedad.amenidades_vacacional && propiedad.amenidades_vacacional.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Amenidades</h2>

                <div className="flex flex-wrap gap-3">
                  {propiedad.amenidades_vacacional.map((amenidad, idx) => (
                    <span
                      key={idx}
                      className="px-5 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-800 rounded-full font-medium border border-cyan-200/50 hover:border-cyan-300/50 transition-all"
                    >
                      {amenidad}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* UBICACIÓN */}
            {secciones.ubicacion && propiedad.ubicacion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Ubicación</h2>

                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xl text-gray-700 leading-relaxed">
                      {propiedad.ubicacion.colonia && `${propiedad.ubicacion.colonia}, `}
                      {propiedad.ubicacion.ciudad && `${propiedad.ubicacion.ciudad}, `}
                      {propiedad.ubicacion.estado}
                    </p>
                    {propiedad.ubicacion.codigo_postal && (
                      <p className="text-gray-600 mt-2">CP: {propiedad.ubicacion.codigo_postal}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* SIDEBAR - CONTACTO STICKY (1/3) */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              id="contacto"
              className="sticky top-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Te interesa?</h3>
                <p className="text-gray-600">Contáctanos ahora</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={contactarWhatsApp}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={llamar}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Llamar
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={enviarCorreo}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Email
                </motion.button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={compartir}
                  className="w-full px-4 py-3 bg-white/50 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 border border-gray-200 hover:bg-white/80 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Compartir
                </motion.button>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* ============================================================================ */}
      {/* FOOTER */}
      {/* ============================================================================ */}

      <footer className="bg-gradient-to-br from-[#1D1D1F] to-[#2D2D2F] text-white mt-32 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Ohana
            </div>
            <p className="text-gray-400 mb-2">
              Anuncio publicado con <span className="text-red-400">♥</span> usando Ohana v1.0
            </p>
            <p className="text-gray-500 text-sm">
              Sistema de Administración de Propiedades
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
