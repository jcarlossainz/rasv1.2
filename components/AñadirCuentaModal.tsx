'use client'

/**
 * MODAL: Añadir/Editar Cuenta Bancaria
 * Permite crear y editar cuentas bancarias o de efectivo
 * Fecha: 2025-11-20
 * Repositorio: rasv1.2
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/modal'
import {
  Cuenta,
  CuentaFormData,
  TipoCuenta,
  Moneda,
  TIPOS_CUENTA_OPCIONES,
  MONEDA_OPCIONES,
  DIAS_CORTE_OPCIONES
} from '@/types/cuenta'
import { cuentaSchema } from '@/lib/validations/cuenta.schema'
import { logger } from '@/lib/logger'

interface AñadirCuentaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (cuenta: Cuenta) => void
  cuentaId?: string // Para edición
  propiedadIdPrecargada?: string // Si se abre desde una propiedad específica
  userId: string
}

interface Propiedad {
  id: string
  nombre_propiedad: string
}

export default function AñadirCuentaModal({
  isOpen,
  onClose,
  onSuccess,
  cuentaId,
  propiedadIdPrecargada,
  userId
}: AñadirCuentaModalProps) {
  const toast = useToast()

  // Estados del formulario
  const [formData, setFormData] = useState<CuentaFormData>({
    nombre_cuenta: '',
    descripcion: '',
    saldo_inicial: 0,
    moneda: 'MXN',
    tipo_cuenta: 'bancaria',
    banco: '',
    numero_cuenta: '',
    clabe: '',
    propietarios_ids: [],
    propiedades_ids: propiedadIdPrecargada ? [propiedadIdPrecargada] : [],
    fecha_corte_dia: 1,
    genera_estados_cuenta: false
  })

  // Estados de UI
  const [loading, setLoading] = useState(false)
  const [propiedadesDisponibles, setPropiedadesDisponibles] = useState<Propiedad[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar propiedades del usuario
  useEffect(() => {
    if (isOpen) {
      cargarPropiedades()
      if (cuentaId) {
        cargarCuenta(cuentaId)
      }
    }
  }, [isOpen, cuentaId])

  const cargarPropiedades = async () => {
    try {
      // Cargar propiedades propias
      const { data: propsPropias } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)
        .order('nombre_propiedad')

      // Cargar propiedades compartidas
      const { data: propsCompartidas } = await supabase
        .from('propiedades_colaboradores')
        .select('propiedad_id')
        .eq('user_id', userId)

      let propsCompartidasData: Propiedad[] = []
      if (propsCompartidas && propsCompartidas.length > 0) {
        const ids = propsCompartidas.map(p => p.propiedad_id)
        const { data } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .in('id', ids)
          .order('nombre_propiedad')
        propsCompartidasData = data as Propiedad[] || []
      }

      const todasPropiedades = [
        ...(propsPropias as Propiedad[] || []),
        ...propsCompartidasData
      ]

      setPropiedadesDisponibles(todasPropiedades)
    } catch (error) {
      logger.error('Error cargando propiedades:', error)
      toast.error('Error al cargar propiedades')
    }
  }

  const cargarCuenta = async (id: string) => {
    try {
      const { data: cuenta, error } = await supabase
        .from('cuentas')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (cuenta) {
        setFormData({
          nombre_cuenta: cuenta.nombre_cuenta,
          descripcion: cuenta.descripcion || '',
          saldo_inicial: cuenta.saldo_inicial,
          moneda: cuenta.moneda,
          tipo_cuenta: cuenta.tipo_cuenta,
          banco: cuenta.banco || '',
          numero_cuenta: cuenta.numero_cuenta || '',
          clabe: cuenta.clabe || '',
          propietarios_ids: cuenta.propietarios_ids || [],
          propiedades_ids: cuenta.propiedades_ids || [],
          fecha_corte_dia: cuenta.fecha_corte_dia,
          genera_estados_cuenta: cuenta.genera_estados_cuenta
        })
      }
    } catch (error) {
      logger.error('Error cargando cuenta:', error)
      toast.error('Error al cargar datos de la cuenta')
    }
  }

  const handleChange = (field: keyof CuentaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo al editarlo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const togglePropiedad = (propiedadId: string) => {
    setFormData(prev => {
      const propiedadesActuales = prev.propiedades_ids
      if (propiedadesActuales.includes(propiedadId)) {
        return {
          ...prev,
          propiedades_ids: propiedadesActuales.filter(id => id !== propiedadId)
        }
      } else {
        return {
          ...prev,
          propiedades_ids: [...propiedadesActuales, propiedadId]
        }
      }
    })
  }

  const validarFormulario = (): boolean => {
    try {
      // Por ahora, los propietarios_ids serán igual al user_id (temporal)
      const dataToValidate = {
        ...formData,
        propietarios_ids: [userId] // Temporal: usar el mismo userId como propietario
      }

      cuentaSchema.parse(dataToValidate)
      setErrors({})
      return true
    } catch (error: any) {
      const newErrors: Record<string, string> = {}
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path[0]
          newErrors[field] = err.message
        })
      }
      setErrors(newErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validarFormulario()) {
      toast.error('Por favor corrige los errores del formulario')
      return
    }

    setLoading(true)

    try {
      // Preparar datos para Supabase
      const dataToSave = {
        user_id: userId,
        nombre_cuenta: formData.nombre_cuenta,
        descripcion: formData.descripcion || null,
        saldo_inicial: formData.saldo_inicial,
        saldo_actual: formData.saldo_inicial, // Inicialmente igual
        moneda: formData.moneda,
        tipo_cuenta: formData.tipo_cuenta,
        banco: formData.tipo_cuenta === 'bancaria' ? formData.banco : null,
        numero_cuenta: formData.tipo_cuenta === 'bancaria' ? formData.numero_cuenta : null,
        clabe: formData.tipo_cuenta === 'bancaria' && formData.moneda === 'MXN' ? formData.clabe : null,
        propietarios_ids: [userId], // Temporal: usar el mismo userId
        propiedades_ids: formData.propiedades_ids,
        fecha_corte_dia: formData.fecha_corte_dia,
        genera_estados_cuenta: formData.genera_estados_cuenta,
        activa: true
      }

      if (cuentaId) {
        // ACTUALIZAR cuenta existente
        const { data, error } = await supabase
          .from('cuentas')
          .update(dataToSave)
          .eq('id', cuentaId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) throw error

        toast.success('Cuenta actualizada exitosamente')
        if (onSuccess && data) onSuccess(data as Cuenta)
      } else {
        // CREAR nueva cuenta
        const { data, error } = await supabase
          .from('cuentas')
          .insert(dataToSave)
          .select()
          .single()

        if (error) throw error

        toast.success('Cuenta creada exitosamente')
        if (onSuccess && data) onSuccess(data as Cuenta)
      }

      handleClose()
    } catch (error: any) {
      logger.error('Error guardando cuenta:', error)
      toast.error(error.message || 'Error al guardar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      nombre_cuenta: '',
      descripcion: '',
      saldo_inicial: 0,
      moneda: 'MXN',
      tipo_cuenta: 'bancaria',
      banco: '',
      numero_cuenta: '',
      clabe: '',
      propietarios_ids: [],
      propiedades_ids: propiedadIdPrecargada ? [propiedadIdPrecargada] : [],
      fecha_corte_dia: 1,
      genera_estados_cuenta: false
    })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={cuentaId ? 'Editar Cuenta' : 'Añadir Nueva Cuenta'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECCIÓN 1: Información Básica */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
            Información Básica
          </h3>

          <div className="space-y-4">
            {/* Nombre de la cuenta */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre de la Cuenta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre_cuenta}
                onChange={(e) => handleChange('nombre_cuenta', e.target.value)}
                placeholder="ej: Cuenta Efectivo MXN - Casa Playa"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.nombre_cuenta
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-ras-turquesa'
                }`}
              />
              {errors.nombre_cuenta && (
                <p className="text-xs text-red-600 mt-1">{errors.nombre_cuenta}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Descripción adicional de la cuenta..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-turquesa resize-none"
              />
            </div>

            {/* Grid: Tipo y Moneda */}
            <div className="grid grid-cols-2 gap-4">
              {/* Tipo de Cuenta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tipo de Cuenta <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo_cuenta}
                  onChange={(e) => handleChange('tipo_cuenta', e.target.value as TipoCuenta)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.tipo_cuenta
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-ras-turquesa'
                  }`}
                >
                  {TIPOS_CUENTA_OPCIONES.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.tipo_cuenta && (
                  <p className="text-xs text-red-600 mt-1">{errors.tipo_cuenta}</p>
                )}
              </div>

              {/* Moneda */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Moneda <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.moneda}
                  onChange={(e) => handleChange('moneda', e.target.value as Moneda)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.moneda
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-ras-turquesa'
                  }`}
                >
                  {MONEDA_OPCIONES.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.simbolo} {opt.label}
                    </option>
                  ))}
                </select>
                {errors.moneda && (
                  <p className="text-xs text-red-600 mt-1">{errors.moneda}</p>
                )}
              </div>
            </div>

            {/* Saldo Inicial */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Saldo Inicial <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                  {MONEDA_OPCIONES.find(m => m.value === formData.moneda)?.simbolo}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.saldo_inicial}
                  onChange={(e) => handleChange('saldo_inicial', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.saldo_inicial
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-ras-turquesa'
                  }`}
                />
              </div>
              {errors.saldo_inicial && (
                <p className="text-xs text-red-600 mt-1">{errors.saldo_inicial}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: Información Bancaria (Condicional) */}
        {formData.tipo_cuenta === 'bancaria' && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-700 mb-3 uppercase tracking-wide">
              Información Bancaria
            </h3>

            <div className="space-y-4">
              {/* Banco */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.banco}
                  onChange={(e) => handleChange('banco', e.target.value)}
                  placeholder="ej: BBVA, Santander, Banorte..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.banco
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.banco && (
                  <p className="text-xs text-red-600 mt-1">{errors.banco}</p>
                )}
              </div>

              {/* Número de Cuenta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={formData.numero_cuenta}
                  onChange={(e) => handleChange('numero_cuenta', e.target.value)}
                  placeholder="Últimos 4 dígitos: ****1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* CLABE (solo para MXN) */}
              {formData.moneda === 'MXN' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    CLABE Interbancaria
                  </label>
                  <input
                    type="text"
                    value={formData.clabe}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      if (value.length <= 18) {
                        handleChange('clabe', value)
                      }
                    }}
                    placeholder="18 dígitos"
                    maxLength={18}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono ${
                      errors.clabe
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.clabe && (
                    <p className="text-xs text-red-600 mt-1">{errors.clabe}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.clabe.length}/18 dígitos
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN 3: Asociaciones */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 className="text-sm font-bold text-green-700 mb-3 uppercase tracking-wide">
            Propiedades Asociadas
          </h3>

          {propiedadesDisponibles.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No tienes propiedades disponibles. Crea una propiedad primero.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {propiedadesDisponibles.map(prop => (
                <label
                  key={prop.id}
                  className="flex items-center p-2 hover:bg-green-100 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.propiedades_ids.includes(prop.id)}
                    onChange={() => togglePropiedad(prop.id)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {prop.nombre_propiedad}
                  </span>
                </label>
              ))}
            </div>
          )}

          {errors.propiedades_ids && (
            <p className="text-xs text-red-600 mt-2">{errors.propiedades_ids}</p>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Seleccionadas: {formData.propiedades_ids.length}
          </p>
        </div>

        {/* SECCIÓN 4: Configuración */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h3 className="text-sm font-bold text-purple-700 mb-3 uppercase tracking-wide">
            Configuración
          </h3>

          <div className="space-y-4">
            {/* Día de Corte */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Día de Corte (para estados de cuenta)
              </label>
              <select
                value={formData.fecha_corte_dia}
                onChange={(e) => handleChange('fecha_corte_dia', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {DIAS_CORTE_OPCIONES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Generar Estados de Cuenta */}
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.genera_estados_cuenta}
                  onChange={(e) => handleChange('genera_estados_cuenta', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Generar estados de cuenta automáticamente
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-7 mt-1">
                Se generará un reporte mensual según el día de corte
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-ras-azul to-ras-turquesa rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </span>
            ) : (
              cuentaId ? 'Actualizar Cuenta' : 'Crear Cuenta'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
