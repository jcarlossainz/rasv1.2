'use client'

/**
 * GALERÍA DE PROPIEDAD
 * Sistema completo de gestión de fotos con lightbox
 * Optimizado con useAuth y useCallback
 */

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getPropertyImages } from '@/lib/supabase/supabase-storage'
import { supabase } from '@/lib/supabase/client'
import { compressImageDual } from '@/lib/supabase/image-compression'
import { uploadPropertyImageDual } from '@/lib/supabase/supabase-storage'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import type { PropertyFormData, PropertyImage } from '@/types/property'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

export default function GaleriaPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()

  const [property, setProperty] = useState<PropertyFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<PropertyImage[]>([])
  const [selectedSpace, setSelectedSpace] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState('')

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    if (!authLoading && user && propertyId) {
      loadProperty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, propertyId])

  const loadProperty = useCallback(async () => {
    try {
      setLoading(true)

      // Cargar propiedad desde tabla propiedades
      const { data: propertyData, error: propertyError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, estados, espacios')
        .eq('id', propertyId)
        .single()

      if (propertyError) throw propertyError

      // Cargar fotos
      const photosData = await getPropertyImages(propertyId)

      // Preparar espacios desde la BD
      let propertySpaces = []

      if (
        propertyData?.espacios &&
        Array.isArray(propertyData.espacios) &&
        propertyData.espacios.length > 0
      ) {
        propertySpaces = propertyData.espacios.map((espacio: any) => ({
          id: espacio.id || espacio.type,
          name: espacio.name,
          type: espacio.type,
          icon: getEspacioIcon(espacio.type)
        }))
      } else {
        propertySpaces = [
          { id: 'sala', name: 'Sala', type: 'Sala', icon: '🛋️' },
          { id: 'cocina', name: 'Cocina', type: 'Cocina', icon: '🍳' },
          { id: 'recamara', name: 'Recámara', type: 'Habitación', icon: '🛏️' },
          { id: 'bano', name: 'Baño', type: 'Baño completo', icon: '🚿' }
        ]
      }

      const espaciosConOpciones = [
        { id: 'all', name: 'Todos', type: 'all', icon: '📋' },
        { id: 'sin-espacio', name: 'Sin espacio', type: 'sin-espacio', icon: '📦' },
        { id: 'general', name: 'General', type: 'general', icon: '🏠' },
        ...propertySpaces
      ]

      const propertyComplete: Partial<PropertyFormData> = {
        id: propertyId,
        nombre_propiedad: propertyData?.nombre_propiedad || 'Mi Propiedad',
        tipo_propiedad: propertyData?.tipo_propiedad || 'Casa',
        estados: propertyData?.estados || ['Disponible'],
        photos: photosData,
        espacios: espaciosConOpciones
      }

      setProperty(propertyComplete as PropertyFormData)
      setPhotos(photosData)
    } catch (error) {
      logger.error('Error al cargar propiedad:', error)
      toast.error('Error al cargar la propiedad')
      router.push('/dashboard/catalogo')
    } finally {
      setLoading(false)
    }
  }, [propertyId, toast, router])

  // Función helper para obtener iconos según el tipo de espacio
  const getEspacioIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'Habitación': '🛏️',
      'Baño completo': '🚿',
      'Medio baño': '🚽',
      'Cocina': '🍳',
      'Sala': '🛋️',
      'Comedor': '🍽️',
      'Cuarto de lavado': '🧺',
      'Estacionamiento': '🚗',
      'Terraza': '🌿',
      'Jardín': '🌳',
      'Piscina': '🏊',
      'Gimnasio': '💪',
      'Oficina': '💼',
      'Estudio': '📚',
      'Bodega': '📦',
      'Garaje': '🚙',
    };
    return iconMap[type] || '📍';
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    document.body.style.overflow = 'auto'
  }, [])

  const nextImage = useCallback(() => {
    const currentFiltered = photos.filter(photo => {
      const matchesSpace = selectedSpace === 'all' || photo.space_type === selectedSpace
      const matchesSearch =
        photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
      return matchesSpace && (searchQuery === '' || matchesSearch)
    })
    setLightboxIndex(prev => (prev + 1) % currentFiltered.length)
  }, [photos, selectedSpace, searchQuery])

  const prevImage = useCallback(() => {
    const currentFiltered = photos.filter(photo => {
      const matchesSpace = selectedSpace === 'all' || photo.space_type === selectedSpace
      const matchesSearch =
        photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
      return matchesSpace && (searchQuery === '' || matchesSearch)
    })
    setLightboxIndex(prev => (prev - 1 + currentFiltered.length) % currentFiltered.length)
  }, [photos, selectedSpace, searchQuery])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      // Verificar límite de 30 fotos
      const currentPhotoCount = photos.length
      const maxPhotos = 30
      const availableSlots = maxPhotos - currentPhotoCount

      if (availableSlots <= 0) {
        toast.error(`Has alcanzado el límite máximo de ${maxPhotos} fotos por propiedad`)
        return
      }

      if (files.length > availableSlots) {
        toast.warning(`Solo puedes subir ${availableSlots} foto(s) más. Límite: ${maxPhotos} fotos por propiedad`)
        return
      }

      setIsUploading(true)
      setUploadProgress({ current: 0, total: files.length })

      try {
        const newPhotos: PropertyImage[] = []

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setUploadProgress({ current: i + 1, total: files.length })

          try {
            const compressed = await compressImageDual(file)
            const uploaded = await uploadPropertyImageDual(
              compressed.thumbnail,
              compressed.display,
              propertyId,
              file.name
            )

            newPhotos.push({
              id: uploaded.id,
              url: uploaded.urls.display,
              url_thumbnail: uploaded.urls.thumbnail,
              is_cover: photos.length === 0 && i === 0,
              caption: file.name,
              created_at: new Date().toISOString(),
              space_type: 'sin-espacio',
              property_id: propertyId
            })
          } catch (fileError) {
            logger.error(`Error con archivo ${file.name}:`, fileError)
            toast.error(`Error al subir ${file.name}`)
          }
        }

        if (newPhotos.length > 0) {
          setPhotos([...photos, ...newPhotos])
          toast.success(`${newPhotos.length} foto(s) subida(s) exitosamente`)
        }
      } catch (error) {
        logger.error('Error al subir fotos:', error)
        toast.error('Error al subir las fotos. Intenta nuevamente')
      } finally {
        setIsUploading(false)
        setUploadProgress({ current: 0, total: 0 })
      }
    },
    [propertyId, photos, toast]
  )

  const handleSetCover = useCallback(
    async (photoId: string) => {
      try {
        await supabase
          .from('property_images')
          .update({ is_cover: false })
          .eq('property_id', propertyId)

        await supabase.from('property_images').update({ is_cover: true }).eq('id', photoId)

        setPhotos(
          photos.map(photo => ({
            ...photo,
            is_cover: photo.id === photoId
          }))
        )

        toast.success('Foto de portada actualizada')
      } catch (error) {
        logger.error('Error al establecer portada:', error)
        toast.error('Error al establecer la foto de portada')
      }
    },
    [propertyId, photos, toast]
  )

  const handleDelete = useCallback(
    async (photoId: string) => {
      const confirmed = await confirm.danger(
        '¿Eliminar esta foto?',
        'Esta acción no se puede deshacer'
      )

      if (!confirmed) return

      try {
        await supabase.from('property_images').delete().eq('id', photoId)

        setPhotos(photos.filter(p => p.id !== photoId))

        toast.success('Foto eliminada correctamente')
      } catch (error) {
        logger.error('Error al eliminar foto:', error)
        toast.error('Error al eliminar la foto')
      }
    },
    [photos, confirm, toast]
  )

  const handleAssignSpace = useCallback(
    async (photoId: string, spaceType: string) => {
      try {
        await supabase.from('property_images').update({ space_type: spaceType }).eq('id', photoId)

        setPhotos(
          photos.map(photo => (photo.id === photoId ? { ...photo, space_type: spaceType } : photo))
        )

        const espacioNombre =
          property?.espacios?.find(e => e.id === spaceType)?.name || spaceType

        toast.success(`Foto asignada a: ${espacioNombre}`)
      } catch (error) {
        logger.error('Error al asignar espacio:', error)
        toast.error('Error al asignar espacio')
      }
    },
    [photos, property, toast]
  )

  const handleStartEdit = useCallback((photo: PropertyImage) => {
    setEditingPhotoId(photo.id)
    setEditingCaption(photo.caption || '')
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingPhotoId(null)
    setEditingCaption('')
  }, [])

  const handleSaveCaption = useCallback(
    async (photoId: string) => {
      if (!editingCaption.trim()) {
        toast.warning('El nombre no puede estar vacío')
        return
      }

      try {
        await supabase
          .from('property_images')
          .update({ caption: editingCaption.trim() })
          .eq('id', photoId)

        setPhotos(
          photos.map(photo =>
            photo.id === photoId ? { ...photo, caption: editingCaption.trim() } : photo
          )
        )

        setEditingPhotoId(null)
        setEditingCaption('')

        toast.success('Nombre actualizado correctamente')
      } catch (error) {
        logger.error('Error al actualizar nombre:', error)
        toast.error('Error al actualizar el nombre')
      }
    },
    [editingCaption, photos, toast]
  )

  const volverCatalogo = useCallback(() => {
    router.push('/dashboard/catalogo')
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  // Filtrado de fotos
  const filteredPhotos = photos.filter(photo => {
    const matchesSpace = selectedSpace === 'all' || photo.space_type === selectedSpace
    const matchesSearch =
      photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
    return matchesSpace && (searchQuery === '' || matchesSearch)
  })

  if (authLoading || loading) {
    return <Loading message="Cargando galería..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={`Galería - ${property?.nombre_propiedad || 'Propiedad'}`}
        showHomeButton={true}
        showBackButton={true}
        showAddButton={true}
        onBackClick={volverCatalogo}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header con filtros y botón de subida */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Buscador */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar fotos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-ras-turquesa focus:outline-none transition-colors bg-white"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>

          {/* Filtro por espacio */}
          <select
            value={selectedSpace}
            onChange={(e) => setSelectedSpace(e.target.value)}
            className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-2.5 pr-10 font-medium text-gray-700 hover:border-ras-turquesa focus:border-ras-turquesa focus:outline-none transition-colors cursor-pointer"
          >
            {property?.espacios?.map((espacio) => (
              <option key={espacio.id} value={espacio.id}>
                {espacio.icon} {espacio.name}
              </option>
            ))}
          </select>

          {/* Botón subir fotos */}
          {photos.length > 0 && photos.length < 30 && (
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              <div className="px-6 py-2.5 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105 active:scale-95 whitespace-nowrap text-center">
                📸 Subir fotos ({photos.length}/30)
              </div>
            </label>
          )}
        </div>

        {/* Contenedor principal de galería */}
        {filteredPhotos.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {/* Grid simple de fotos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredPhotos.map((photo, index) => (
                <div key={photo.id} className="group relative">
                  {/* Imagen */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={photo.url_thumbnail || photo.url}
                      alt={photo.caption || 'Foto'}
                      className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-110"
                      onClick={() => openLightbox(index)}
                    />

                    {/* Badge de portada */}
                    {photo.is_cover && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                        ⭐
                      </div>
                    )}

                    {/* Overlay con acciones */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      {/* Botones de acción */}
                      <div className="flex gap-1">
                        {!photo.is_cover && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetCover(photo.id); }}
                            className="w-8 h-8 rounded bg-yellow-500 hover:bg-yellow-600 text-white flex items-center justify-center transition-colors"
                            title="Establecer como portada"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(photo); }}
                          className="w-8 h-8 rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                          className="w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>

                      {/* Selector de espacio */}
                      <select
                        value={photo.space_type || 'sin-espacio'}
                        onChange={(e) => { e.stopPropagation(); handleAssignSpace(photo.id, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-white/95 text-xs rounded border-0 focus:outline-none focus:ring-2 focus:ring-ras-turquesa"
                      >
                        {property?.espacios?.map((espacio) => (
                          <option key={espacio.id} value={espacio.id}>
                            {espacio.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Caption editable */}
                  {editingPhotoId === photo.id ? (
                    <div className="absolute inset-0 bg-white rounded-lg p-2 flex flex-col gap-1 z-10">
                      <input
                        type="text"
                        value={editingCaption}
                        onChange={(e) => setEditingCaption(e.target.value)}
                        className="w-full px-2 py-1 border border-ras-turquesa rounded text-xs focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleSaveCaption(photo.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveCaption(photo.id); }}
                          className="flex-1 px-2 py-1 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded text-xs font-semibold"
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                          className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-600 truncate text-center">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState 
            icon={
              <svg className="w-12 h-12 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            }
            title={photos.length === 0 ? "No hay fotos en la galería" : "No se encontraron resultados"}
            description={photos.length === 0 ? "Sube la primera foto de tu propiedad" : "Intenta con otra búsqueda o cambia los filtros"}
            actionLabel={photos.length === 0 ? "📸 Subir Fotos" : undefined}
            onAction={photos.length === 0 ? () => document.querySelector('input[type="file"]')?.click() : undefined}
          />
        )}

        {/* Input oculto para cuando no hay fotos */}
        {photos.length === 0 && (
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
        )}
      </main>

      {/* Lightbox */}
      {lightboxOpen && filteredPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Botón cerrar */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Botón anterior */}
          {filteredPhotos.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation()
                prevImage()
              }}
              className="absolute left-4 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Botón siguiente */}
          {filteredPhotos.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation()
                nextImage()
              }}
              className="absolute right-4 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Imagen */}
          <div className="relative max-w-7xl max-h-screen w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <img
              src={filteredPhotos[lightboxIndex]?.url}
              alt={filteredPhotos[lightboxIndex]?.caption || 'Foto'}
              className="w-full h-full object-contain"
            />

            {/* Info de la imagen */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <p className="text-white text-lg font-semibold mb-1">
                {filteredPhotos[lightboxIndex]?.caption}
              </p>
              <p className="text-white/60 text-sm">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de loading durante subida */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              {/* Spinner animado */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-ras-turquesa border-l-ras-azul rounded-full animate-spin"></div>
              </div>

              {/* Texto */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  📸 Cargando fotos...
                </h3>
                <p className="text-gray-600">
                  {uploadProgress.current} de {uploadProgress.total}
                </p>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ras-azul to-ras-turquesa transition-all duration-300 ease-out"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                  }}
                />
              </div>

              <p className="text-sm text-gray-500">
                Por favor espera, no cierres esta ventana
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}