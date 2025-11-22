'use client'

import { useEffect, useState } from 'react'

interface ProveedorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProveedorFormData) => void
  proveedor?: {
    id: string
    nombre: string
    telefono: string
    correo: string
    categoria: string
  } | null
}

interface ProveedorFormData {
  nombre: string
  telefono: string
  correo: string
  categoria: string
}

const CATEGORIAS_PROVEEDOR = [
  'Limpieza',
  'Mantenimiento',
  'Jardinería',
  'Plomería',
  'Electricidad',
  'Pintura',
  'Carpintería',
  'Seguridad',
  'Fumigación',
  'Aire Acondicionado',
  'Otro'
]

export default function ProveedorModal({ isOpen, onClose, onSave, proveedor }: ProveedorModalProps) {
  const [formData, setFormData] = useState<ProveedorFormData>({
    nombre: '',
    telefono: '',
    correo: '',
    categoria: ''
  })

  const [errors, setErrors] = useState<Partial<ProveedorFormData>>({})

  // Cargar datos del proveedor si está en modo edición
  useEffect(() => {
    if (proveedor) {
      setFormData({
        nombre: proveedor.nombre,
        telefono: proveedor.telefono,
        correo: proveedor.correo,
        categoria: proveedor.categoria
      })
    } else {
      setFormData({
        nombre: '',
        telefono: '',
        correo: '',
        categoria: ''
      })
    }
    setErrors({})
  }, [proveedor, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Partial<ProveedorFormData> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido'
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.telefono)) {
      newErrors.telefono = 'Formato de teléfono inválido'
    }

    if (!formData.correo.trim()) {
      newErrors.correo = 'El correo es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'Formato de correo inválido'
    }

    if (!formData.categoria.trim()) {
      newErrors.categoria = 'La categoría es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSave({
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        correo: formData.correo.trim(),
        categoria: formData.categoria
      })
    }
  }

  const handleChange = (field: keyof ProveedorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-8">
      <div className="bg-white rounded-t-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-9" />
              <path d="M14 17H5" />
              <circle cx="17" cy="17" r="3" />
              <circle cx="7" cy="7" r="3" />
            </svg>
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-500 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Categoría */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors font-medium ${
                errors.categoria
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-400'
              }`}
            >
              <option value="">Seleccionar categoría</option>
              {CATEGORIAS_PROVEEDOR.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.categoria && (
              <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Juan Pérez - Plomería"
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                errors.nombre
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-400'
              }`}
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              placeholder="Ej: +52 998 123 4567"
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                errors.telefono
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-400'
              }`}
            />
            {errors.telefono && (
              <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
            )}
          </div>

          {/* Correo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Correo electrónico *
            </label>
            <input
              type="email"
              value={formData.correo}
              onChange={(e) => handleChange('correo', e.target.value)}
              placeholder="Ej: contacto@ejemplo.com"
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                errors.correo
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-400'
              }`}
            />
            {errors.correo && (
              <p className="mt-1 text-sm text-red-600">{errors.correo}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg"
            >
              {proveedor ? 'Guardar Cambios' : 'Agregar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}