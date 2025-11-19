'use client'

import { useEffect, useState } from 'react'

interface ContactoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ContactoFormData) => void
  contacto?: {
    id: string
    nombre: string
    telefono: string
    correo: string
    tipo: 'inquilino' | 'propietario' | 'proveedor' | 'supervisor'
    provider_category?: string
  } | null
}

interface ContactoFormData {
  nombre: string
  telefono: string
  correo: string
  tipo: 'inquilino' | 'propietario' | 'proveedor' | 'supervisor'
  provider_category?: string
}

export default function ContactoModal({ isOpen, onClose, onSave, contacto }: ContactoModalProps) {
  const [formData, setFormData] = useState<ContactoFormData>({
    nombre: '',
    telefono: '',
    correo: '',
    tipo: 'inquilino',
    provider_category: ''
  })

  const [errors, setErrors] = useState<Partial<ContactoFormData>>({})

  // Cargar datos del contacto si está en modo edición
  useEffect(() => {
    if (contacto) {
      setFormData({
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        correo: contacto.correo,
        tipo: contacto.tipo,
        provider_category: contacto.provider_category || ''
      })
    } else {
      setFormData({
        nombre: '',
        telefono: '',
        correo: '',
        tipo: 'inquilino',
        provider_category: ''
      })
    }
    setErrors({})
  }, [contacto, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactoFormData> = {}

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

    // Validar categoría de proveedor si el tipo es proveedor
    if (formData.tipo === 'proveedor' && !formData.provider_category?.trim()) {
      newErrors.provider_category = 'La categoría es requerida para proveedores'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Preparar datos en el formato correcto
      const dataToSave: ContactoFormData = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        correo: formData.correo.trim(),
        tipo: formData.tipo
      }

      // Solo incluir provider_category si es proveedor
      if (formData.tipo === 'proveedor' && formData.provider_category) {
        dataToSave.provider_category = formData.provider_category
      }

      onSave(dataToSave)
    }
  }

  const handleChange = (field: keyof ContactoFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Si cambia el tipo y no es proveedor, limpiar provider_category
      if (field === 'tipo' && value !== 'proveedor') {
        newData.provider_category = ''
      }
      
      return newData
    })
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-700/80 to-rose-800/80 backdrop-blur-sm px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">
            {contacto ? '✏️ Editar Contacto' : '➕ Nuevo Contacto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-600 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo de contacto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de contacto *
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value as ContactoFormData['tipo'])}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-rose-400 transition-colors font-medium"
            >
              <option value="inquilino">Inquilino</option>
              <option value="propietario">Propietario</option>
              <option value="proveedor">Proveedor</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          {/* Subcategoría - solo para proveedores */}
          {formData.tipo === 'proveedor' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Categoría del proveedor *
              </label>
              <select
                value={formData.provider_category || ''}
                onChange={(e) => handleChange('provider_category', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors font-medium ${
                  errors.provider_category
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-rose-400'
                }`}
              >
                <option value="">Seleccionar categoría</option>
                <option value="limpieza">Limpieza</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="servicio">Servicio</option>
                <option value="jardineria">Jardinería</option>
                <option value="seguridad">Seguridad</option>
                <option value="plomeria">Plomería</option>
                <option value="electricidad">Electricidad</option>
                <option value="pintura">Pintura</option>
                <option value="otro">Otro</option>
              </select>
              {errors.provider_category && (
                <p className="mt-1 text-sm text-red-600">{errors.provider_category}</p>
              )}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Juan Pérez"
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                errors.nombre
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-rose-400'
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
                  : 'border-gray-200 focus:border-rose-400'
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
                  : 'border-gray-200 focus:border-rose-400'
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
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-700/80 to-rose-800/80 text-white font-bold hover:from-rose-700 hover:to-rose-800 transition-all shadow-md hover:shadow-lg"
            >
              {contacto ? 'Guardar Cambios' : 'Agregar Contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}