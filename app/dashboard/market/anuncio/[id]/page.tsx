'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Loading from '@/components/ui/loading'

interface PropiedadData {
  id: string
  nombre: string
  tipo_propiedad: string
  estados: string[]
  mobiliario: string
  capacidad_personas: number | null
  tamano_terreno: number | null
  tamano_terreno_unit: string | null
  tamano_construccion: number | null
  tamano_construccion_unit: string | null
  
  // Ubicación
  colonia: string | null
  codigo_postal: string | null
  ciudad: string | null
  estado: string | null
  
  // Comercial
  costo_renta_mensual: number | null
  precio_noche: number | null
  amenidades_vacacional: string[] | null
  precio_venta: number | null
  
  // Espacios
  espacios: any[] | null
  
  // Anuncio
  descripcion_anuncio: string | null
  estado_anuncio: string | null
}

interface Contacto {
  nombre: string
  telefono: string
  email: string
}

export default function AnuncioPublico() {
  const params = useParams()
  const propiedadId = params?.id as string
  
  const [loading, setLoading] = useState(true)
  const [propiedad, setPropiedad] = useState<PropiedadData | null>(null)
  const [propietario, setPropietario] = useState<Contacto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarPropiedad()
  }, [])

  const cargarPropiedad = async () => {
    try {
      // Cargar propiedad sin autenticación
      const { data: propData, error: propError } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', propiedadId)
        .eq('estado_anuncio', 'publicado') // Solo mostrar si está publicado
        .single()

      if (propError) {
        setError('Anuncio no disponible o no publicado')
        setLoading(false)
        return
      }
      
      setPropiedad(propData)
      
      // Cargar información del propietario si existe
      if (propData.propietario_id) {
        const { data: propietarioData } = await supabase
          .from('contactos')
          .select('nombre, telefono, email')
          .eq('id', propData.propietario_id)
          .single()
        
        if (propietarioData) {
          setPropietario(propietarioData)
        }
      }
      
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar el anuncio')
    } finally {
      setLoading(false)
    }
  }

  const contactarWhatsApp = () => {
    if (!propietario?.telefono) {
      alert('No hay teléfono de contacto disponible')
      return
    }
    
    const mensaje = `Hola, me interesa la propiedad: ${propiedad?.nombre}`
    const numero = propietario.telefono.replace(/\D/g, '') // Eliminar todo excepto números
    const whatsappUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    window.open(whatsappUrl, '_blank')
  }

  const enviarCorreo = () => {
    if (!propietario?.email) {
      alert('No hay email de contacto disponible')
      return
    }
    
    const asunto = `Interés en: ${propiedad?.nombre}`
    const cuerpo = `Hola, me interesa obtener más información sobre esta propiedad.`
    const mailtoUrl = `mailto:${propietario.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    window.location.href = mailtoUrl
  }

  const llamar = () => {
    if (!propietario?.telefono) {
      alert('No hay teléfono de contacto disponible')
      return
    }
    
    window.location.href = `tel:${propietario.telefono}`
  }

  const compartir = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: propiedad?.nombre || 'Propiedad en venta/renta',
          text: `Mira esta propiedad: ${propiedad?.nombre}`,
          url: url
        })
      } catch (error) {
        copiarLink()
      }
    } else {
      copiarLink()
    }
  }

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('¡Link copiado! 📋')
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loading message="Cargando anuncio..." />
      </div>
    )
  }

  if (error || !propiedad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Anuncio no disponible</h2>
          <p className="text-gray-600">{error || 'El anuncio que buscas no está publicado o no existe.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      
      {/* Header fijo con acciones */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Propiedad en oferta</p>
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-xs md:max-w-md">
                {propiedad.nombre}
              </h1>
            </div>
          </div>
          
          <button
            onClick={compartir}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Hero - Galería de fotos placeholder */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden mb-8">
          <div className="relative h-96 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <p className="text-gray-500">Galería de fotos próximamente</p>
            </div>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Precios destacados */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Precio</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propiedad.precio_venta && (
                  <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      <span className="text-orange-700 font-semibold">VENTA</span>
                    </div>
                    <p className="text-4xl font-bold text-orange-900">
                      ${propiedad.precio_venta.toLocaleString('es-MX')}
                    </p>
                    <p className="text-orange-700 text-sm mt-1">MXN</p>
                  </div>
                )}
                
                {propiedad.costo_renta_mensual && (
                  <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                      <span className="text-emerald-700 font-semibold">RENTA MENSUAL</span>
                    </div>
                    <p className="text-4xl font-bold text-emerald-900">
                      ${propiedad.costo_renta_mensual.toLocaleString('es-MX')}
                    </p>
                    <p className="text-emerald-700 text-sm mt-1">MXN / mes</p>
                  </div>
                )}
                
                {propiedad.precio_noche && (
                  <div className="p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border-2 border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-cyan-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                      </svg>
                      <span className="text-cyan-700 font-semibold">RENTA VACACIONAL</span>
                    </div>
                    <p className="text-4xl font-bold text-cyan-900">
                      ${propiedad.precio_noche.toLocaleString('es-MX')}
                    </p>
                    <p className="text-cyan-700 text-sm mt-1">MXN / noche</p>
                  </div>
                )}
              </div>
            </div>

            {/* Descripción */}
            {propiedad.descripcion_anuncio && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Descripción</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {propiedad.descripcion_anuncio}
                </p>
              </div>
            )}

            {/* Características principales */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Características</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    <span className="text-xs text-blue-700 font-medium">Tipo</span>
                  </div>
                  <p className="font-bold text-gray-900">{propiedad.tipo_propiedad}</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                    <span className="text-xs text-purple-700 font-medium">Mobiliario</span>
                  </div>
                  <p className="font-bold text-gray-900">{propiedad.mobiliario}</p>
                </div>
                
                {propiedad.capacidad_personas && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span className="text-xs text-green-700 font-medium">Capacidad</span>
                    </div>
                    <p className="font-bold text-gray-900">{propiedad.capacidad_personas} personas</p>
                  </div>
                )}
                
                {propiedad.tamano_construccion && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                      <span className="text-xs text-amber-700 font-medium">Construcción</span>
                    </div>
                    <p className="font-bold text-gray-900">
                      {propiedad.tamano_construccion} {propiedad.tamano_construccion_unit}
                    </p>
                  </div>
                )}
                
                {propiedad.tamano_terreno && (
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                      <span className="text-xs text-teal-700 font-medium">Terreno</span>
                    </div>
                    <p className="font-bold text-gray-900">
                      {propiedad.tamano_terreno} {propiedad.tamano_terreno_unit}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Espacios */}
            {propiedad.espacios && propiedad.espacios.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Espacios</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {propiedad.espacios.map((espacio: any, idx: number) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-700 font-bold">
                            {espacio.cantidad || 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{espacio.nombre}</p>
                          <p className="text-xs text-gray-600">{espacio.categoria}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenidades vacacionales */}
            {propiedad.amenidades_vacacional && propiedad.amenidades_vacacional.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenidades</h2>
                
                <div className="flex flex-wrap gap-2">
                  {propiedad.amenidades_vacacional.map((amenidad, idx) => (
                    <span key={idx} className="px-4 py-2 bg-cyan-50 text-cyan-800 rounded-full text-sm font-medium border border-cyan-200">
                      {amenidad}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ubicación */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ubicación</h2>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-gray-700 leading-relaxed">
                    {propiedad.colonia && `${propiedad.colonia}, `}
                    {propiedad.ciudad && `${propiedad.ciudad}, `}
                    {propiedad.estado}
                    {propiedad.codigo_postal && (
                      <>
                        <br />
                        <span className="text-gray-600 text-sm">CP: {propiedad.codigo_postal}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar - Contacto */}
          <div className="space-y-6">
            
            {/* Card de contacto sticky */}
            <div className="sticky top-24 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-200 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Te interesa?</h3>
                <p className="text-gray-600">Contáctanos para más información</p>
              </div>
              
              {propietario && (
                <div className="bg-white rounded-xl p-4 mb-6 border-2 border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Contacto</p>
                  <p className="font-bold text-gray-900 text-lg">{propietario.nombre}</p>
                  {propietario.telefono && (
                    <p className="text-gray-700 text-sm mt-2">📱 {propietario.telefono}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={contactarWhatsApp}
                  className="w-full px-5 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                
                <button
                  onClick={llamar}
                  className="w-full px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Llamar
                </button>
                
                <button
                  onClick={enviarCorreo}
                  className="w-full px-5 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Enviar Email
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-green-200">
                <button
                  onClick={compartir}
                  className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2 border-2 border-gray-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Compartir anuncio
                </button>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Anuncio publicado con <span className="text-red-400">♥</span> usando RAS V_1.0
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Sistema de Administración de Propiedades
          </p>
        </div>
      </footer>

    </div>
  )
}
