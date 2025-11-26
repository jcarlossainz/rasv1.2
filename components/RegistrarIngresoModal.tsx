'use client'

/**
 * MODAL REGISTRAR INGRESO
 * Modal profesional para registrar ingresos (rentas, depósitos, etc.)
 * Incluye: fecha, tipo, propiedad, cuenta, monto, archivo, factura
 */

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { crearIngreso, registrarMovimientoYActualizarSaldo } from '@/services/cuentas-api'
import type { CuentaBancaria } from '@/types/property'

interface RegistrarIngresoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  propiedades: { id: string; nombre: string }[]
  cuentas: CuentaBancaria[]
  propiedadPreseleccionada?: string
  cuentaPreseleccionada?: string
}

export default function RegistrarIngresoModal({
  isOpen,
  onClose,
  onSuccess,
  propiedades,
  cuentas,
  propiedadPreseleccionada,
  cuentaPreseleccionada
}: RegistrarIngresoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados del formulario
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])
  const [propiedadId, setPropiedadId] = useState(propiedadPreseleccionada || '')
  const [cuentaId, setCuentaId] = useState(cuentaPreseleccionada || '')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [tipoIngreso, setTipoIngreso] = useState<'Renta' | 'Depósito' | 'Venta' | 'Otro'>('Renta')
  const [metodoPago, setMetodoPago] = useState('Transferencia')
  const [referenciaPago, setReferenciaPago] = useState('')
  const [tieneFactura, setTieneFactura] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [notas, setNotas] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null)

  // Estados de UI
  const [guardando, setGuardando] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)

  // Filtrar cuentas por propiedad seleccionada
  const cuentasFiltradas = propiedadId
    ? cuentas.filter(c => c.propiedad_id === propiedadId || c.propietario_id !== null)
    : cuentas

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo no debe superar 5MB')
        return
      }

      // Validar tipo
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!tiposPermitidos.includes(file.type)) {
        alert('Solo se permiten imágenes (JPG, PNG) o PDF')
        return
      }

      setArchivo(file)

      // Preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setArchivoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setArchivoPreview(null)
      }
    }
  }

  const handleRemoverArchivo = () => {
    setArchivo(null)
    setArchivoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const subirArchivo = async (userId: string): Promise<string | null> => {
    if (!archivo) return null

    setSubiendoArchivo(true)
    try {
      const extension = archivo.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`
      const filePath = `comprobantes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, archivo, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error subiendo archivo:', error)
      return null
    } finally {
      setSubiendoArchivo(false)
    }
  }

  const handleGuardar = async () => {
    // Validaciones
    if (!fechaIngreso) {
      alert('La fecha es obligatoria')
      return
    }

    if (!propiedadId) {
      alert('Debes seleccionar una propiedad')
      return
    }

    if (!concepto.trim()) {
      alert('El concepto es obligatorio')
      return
    }

    if (!monto || parseFloat(monto) <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    if (tieneFactura && !numeroFactura.trim()) {
      alert('Si tiene factura, debes indicar el número')
      return
    }

    setGuardando(true)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Usuario no autenticado')

      // Subir archivo si existe
      let urlComprobante: string | null = null
      if (archivo) {
        urlComprobante = await subirArchivo(authUser.id)
        if (!urlComprobante) {
          throw new Error('Error al subir el comprobante')
        }
      }

      // Crear ingreso
      await crearIngreso({
        propiedad_id: propiedadId,
        cuenta_id: cuentaId || undefined,
        concepto,
        monto: parseFloat(monto),
        fecha_ingreso: fechaIngreso,
        tipo_ingreso: tipoIngreso,
        metodo_pago: metodoPago as any,
        referencia_pago: referenciaPago || undefined,
        tiene_factura: tieneFactura,
        numero_factura: tieneFactura ? numeroFactura : undefined,
        comprobante_url: urlComprobante || undefined,
        notas: notas || undefined
      })

      // ACTUALIZAR SALDO DE LA CUENTA (si se seleccionó una)
      if (cuentaId) {
        try {
          await registrarMovimientoYActualizarSaldo(cuentaId, parseFloat(monto), 'ingreso')
        } catch {
          // El ingreso ya se registró, no propagamos error
        }
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error guardando ingreso:', error)
      alert(error.message || 'Error al guardar el ingreso')
    } finally {
      setGuardando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Registrar Ingreso</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={guardando}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Fecha y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de ingreso *
              </label>
              <input
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de ingreso *
              </label>
              <select
                value={tipoIngreso}
                onChange={(e) => setTipoIngreso(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Renta">Renta</option>
                <option value="Depósito">Depósito</option>
                <option value="Venta">Venta</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Propiedad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propiedad *
            </label>
            <select
              value={propiedadId}
              onChange={(e) => {
                setPropiedadId(e.target.value)
                setCuentaId('') // Reset cuenta al cambiar propiedad
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!propiedadPreseleccionada}
            >
              <option value="">Seleccionar propiedad</option>
              {propiedades.map(prop => (
                <option key={prop.id} value={prop.id}>{prop.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cuenta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuenta destino (opcional)
            </label>
            <select
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin cuenta específica</option>
              {cuentasFiltradas.map(cuenta => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} ({cuenta.tipo_moneda}) - {cuenta.tipo_cuenta}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Si seleccionas una cuenta, el balance se actualizará automáticamente
            </p>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Renta mensual de Febrero 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Cheque">Cheque</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Referencia (si no es efectivo) */}
          {metodoPago !== 'Efectivo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia / No. de operación
              </label>
              <input
                type="text"
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder="Número de referencia"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Factura */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={tieneFactura}
                onChange={(e) => setTieneFactura(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Tiene factura</span>
            </label>

            {tieneFactura && (
              <input
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="Número de factura"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas / Observaciones
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Archivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comprobante (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleArchivoChange}
              className="hidden"
            />

            {!archivo ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-600"
              >
                📎 Adjuntar comprobante (JPG, PNG o PDF, máx 5MB)
              </button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                {archivoPreview ? (
                  <img src={archivoPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-xs">PDF</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
                  <p className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoverArchivo}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || subiendoArchivo}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </>
            ) : (
              '✓ Guardar Ingreso'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
