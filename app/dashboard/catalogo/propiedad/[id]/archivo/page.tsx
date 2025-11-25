'use client'

/**
 * ARCHIVERO DE PROPIEDAD
 * Sistema de gestión de documentos importantes
 * (contratos, estados de cuenta, escrituras, etc.)
 * Los archivos se comprimen automáticamente antes de subirlos
 */

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { compressFile, formatFileSize as formatSize } from '@/lib/supabase/file-compression'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import Button from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import { logger } from '@/lib/logger'

interface PropertyArchivo {
  id: string
  property_id: string
  nombre_archivo: string
  descripcion: string | null
  categoria: string
  file_path: string
  file_size: number | null
  file_type: string | null
  subido_por: string | null
  fecha_subida: string
  created_at: string
  updated_at: string
}

interface Property {
  id: string
  nombre_propiedad: string
}

const CATEGORIAS = [
  { value: 'all', label: 'Todas las categorías', icon: '📋', color: 'gray' },
  { value: 'contrato', label: 'Contratos', icon: '📄', color: 'blue' },
  { value: 'estado_cuenta', label: 'Estados de cuenta', icon: '💰', color: 'green' },
  { value: 'escritura', label: 'Escrituras', icon: '📜', color: 'purple' },
  { value: 'impuesto', label: 'Impuestos', icon: '💼', color: 'red' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧', color: 'orange' },
  { value: 'seguro', label: 'Seguros', icon: '🛡️', color: 'indigo' },
  { value: 'avaluo', label: 'Avalúos', icon: '📊', color: 'teal' },
  { value: 'otro', label: 'Otros', icon: '📁', color: 'gray' },
]

export default function ArchivoPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [archivos, setArchivos] = useState<PropertyArchivo[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

  // Estados para el modal de subir archivo
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNombre, setUploadNombre] = useState('')
  const [uploadDescripcion, setUploadDescripcion] = useState('')
  const [uploadCategoria, setUploadCategoria] = useState('contrato')

  useEffect(() => {
    if (!authLoading && user && propertyId) {
      loadProperty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, propertyId])

  const loadProperty = useCallback(async () => {
    try {
      setLoading(true)

      // Cargar propiedad
      const { data: propertyData, error: propertyError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('id', propertyId)
        .single()

      if (propertyError) throw propertyError

      setProperty(propertyData)

      // Cargar archivos
      await loadArchivos()

    } catch (error) {
      logger.error('Error cargando propiedad:', error)
      toast.error('Error al cargar la propiedad')
    } finally {
      setLoading(false)
    }
  }, [propertyId, toast])

  const loadArchivos = async () => {
    try {
      const { data, error } = await supabase
        .from('property_archivos')
        .select('*')
        .eq('property_id', propertyId)
        .order('fecha_subida', { ascending: false })

      if (error) throw error

      setArchivos(data || [])
    } catch (error) {
      logger.error('Error cargando archivos:', error)
      toast.error('Error al cargar archivos')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño (máximo 50MB antes de compresión)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 50MB.')
      return
    }

    setUploadFile(file)
    // Mantener el nombre original (sin .zip), se agregará automáticamente al comprimir
    setUploadNombre(file.name)
    setShowUploadModal(true)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadNombre || !uploadCategoria) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setIsUploading(true)

      // 1. Comprimir archivo automáticamente
      toast.info('Comprimiendo archivo...')
      const { compressed, originalSize, compressedSize, compressionRatio } = await compressFile(uploadFile)

      logger.log(`📦 Compresión: ${formatSize(originalSize)} → ${formatSize(compressedSize)} (${compressionRatio.toFixed(1)}% reducción)`)

      // 2. Generar nombre único para el archivo comprimido
      const timestamp = Date.now()
      const baseNombre = uploadNombre.replace(/\.[^/.]+$/, '') // Quitar extensión original
      const fileName = `${timestamp}_${baseNombre.replace(/[^a-zA-Z0-9._-]/g, '_')}.zip`
      const filePath = `${propertyId}/archivos/${fileName}`

      // 3. Subir archivo comprimido a Supabase Storage
      toast.info('Subiendo archivo...')
      const { error: uploadError } = await supabase.storage
        .from('property-files')
        .upload(filePath, compressed, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/zip'
        })

      if (uploadError) throw uploadError

      // 4. Guardar metadata en la base de datos
      const { error: dbError } = await supabase
        .from('property_archivos')
        .insert({
          property_id: propertyId,
          nombre_archivo: uploadNombre, // Nombre original sin .zip
          descripcion: uploadDescripcion || null,
          categoria: uploadCategoria,
          file_path: filePath,
          file_size: compressedSize, // Tamaño comprimido
          file_type: 'application/zip',
          subido_por: user?.id
        })

      if (dbError) throw dbError

      toast.success(`Archivo subido (${compressionRatio.toFixed(0)}% reducción)`)
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadNombre('')
      setUploadDescripcion('')
      setUploadCategoria('contrato')
      await loadArchivos()

    } catch (error) {
      logger.error('Error subiendo archivo:', error)
      toast.error('Error al subir el archivo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (archivo: PropertyArchivo) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-files')
        .download(archivo.file_path)

      if (error) throw error

      // Crear URL para descargar
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = archivo.nombre_archivo
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Archivo descargado')
    } catch (error) {
      logger.error('Error descargando archivo:', error)
      toast.error('Error al descargar el archivo')
    }
  }

  const handleDelete = async (archivo: PropertyArchivo) => {
    const confirmed = await confirm({
      title: '¿Eliminar archivo?',
      message: `¿Estás seguro de que deseas eliminar "${archivo.nombre_archivo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    })

    if (!confirmed) return

    try {
      // Eliminar de storage
      const { error: storageError } = await supabase.storage
        .from('property-files')
        .remove([archivo.file_path])

      if (storageError) logger.warn('Error eliminando de storage:', storageError)

      // Eliminar de BD
      const { error: dbError } = await supabase
        .from('property_archivos')
        .delete()
        .eq('id', archivo.id)

      if (dbError) throw dbError

      toast.success('Archivo eliminado')
      await loadArchivos()

    } catch (error) {
      logger.error('Error eliminando archivo:', error)
      toast.error('Error al eliminar el archivo')
    }
  }

  const volverCatalogo = () => {
    router.push('/dashboard/catalogo')
  }

  const handleLogout = async () => {
    if (confirm({ title: '¿Cerrar sesión?', message: '¿Estás seguro?' })) {
      await logout()
    }
  }

  // Filtrar archivos
  const archivosFiltrados = archivos.filter(archivo => {
    const matchCategoria = selectedCategoria === 'all' || archivo.categoria === selectedCategoria
    const matchBusqueda = archivo.nombre_archivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          archivo.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategoria && matchBusqueda
  })

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    return formatSize(bytes)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoriaInfo = (categoria: string) => {
    return CATEGORIAS.find(c => c.value === categoria) || CATEGORIAS[CATEGORIAS.length - 1]
  }

  if (authLoading || loading) {
    return <Loading message="Cargando archivero..." />
  }

  if (!property) {
    return <div>Propiedad no encontrada</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title={`Archivero - ${property.nombre_propiedad}`}
        showHomeButton={true}
        showBackButton={true}
        showAddButton={true}
        onBackClick={volverCatalogo}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header con filtros y botón de subida */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Filtro de categoría */}
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {CATEGORIAS.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          {/* Búsqueda */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar archivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botón subir archivo */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Subir archivo
            </div>
          </label>
        </div>

        {/* Contador */}
        <div className="text-sm text-gray-600">
          {archivosFiltrados.length} archivo{archivosFiltrados.length !== 1 ? 's' : ''}
          {selectedCategoria !== 'all' && ` en ${getCategoriaInfo(selectedCategoria).label.toLowerCase()}`}
        </div>

        {/* Listado de archivos */}
        {archivosFiltrados.length === 0 ? (
          <EmptyState
            title="No hay archivos"
            description={searchQuery ? "No se encontraron archivos con ese criterio de búsqueda." : "Sube tu primer documento. Se comprimirá automáticamente."}
            icon="📁"
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {archivosFiltrados.map((archivo) => {
                    const catInfo = getCategoriaInfo(archivo.categoria)
                    return (
                      <tr key={archivo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{catInfo.icon}</div>
                            <div>
                              <div className="font-medium text-gray-900">{archivo.nombre_archivo}</div>
                              {archivo.descripcion && (
                                <div className="text-sm text-gray-500 mt-1">{archivo.descripcion}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${catInfo.color}-100 text-${catInfo.color}-800`}>
                            {catInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatFileSize(archivo.file_size)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(archivo.fecha_subida)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownload(archivo)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Descargar"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(archivo)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal de subir archivo */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Subir archivo</h2>

            <div className="space-y-4">
              {/* Nombre del archivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del archivo *
                </label>
                <input
                  type="text"
                  value={uploadNombre}
                  onChange={(e) => setUploadNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Contrato de arrendamiento 2024"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  value={uploadCategoria}
                  onChange={(e) => setUploadCategoria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIAS.filter(c => c.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={uploadDescripcion}
                  onChange={(e) => setUploadDescripcion(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Agrega detalles sobre este documento..."
                />
              </div>

              {/* Info del archivo */}
              {uploadFile && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Archivo seleccionado:</span>
                    <span className="font-medium">{uploadFile.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600">Tamaño:</span>
                    <span className="font-medium">{formatFileSize(uploadFile.size)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadNombre('')
                  setUploadDescripcion('')
                }}
                disabled={isUploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !uploadNombre || !uploadCategoria}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Subiendo...' : 'Subir archivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
