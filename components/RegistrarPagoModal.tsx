'use client'

/**
 * MODAL REGISTRAR PAGO
 * Modal profesional para registrar pagos concretados
 * Incluye: fecha, tipo, propiedad, monto, archivo, factura
 */

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { obtenerCuentasPropiedad, registrarMovimientoYActualizarSaldo } from '@/services/cuentas-api'
import { useToast } from '@/hooks/useToast'
import type { CuentaBancaria } from '@/types/property'

interface RegistrarPagoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  propiedades: { id: string; nombre: string }[]
  pagoExistente?: {
    id: string
    fecha_pago: string
    monto_estimado: number
    propiedad_id: string
    servicio_nombre: string
    servicio_id?: string | null // Si tiene servicio_id, es un ticket generado desde un servicio
  } | null
}

export default function RegistrarPagoModal({
  isOpen,
  onClose,
  onSuccess,
  propiedades,
  pagoExistente
}: RegistrarPagoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // Estados del formulario
  const [fechaPago, setFechaPago] = useState(
    pagoExistente?.fecha_pago || new Date().toISOString().split('T')[0]
  )
  const [propiedadId, setPropiedadId] = useState(pagoExistente?.propiedad_id || '')
  const [monto, setMonto] = useState(pagoExistente?.monto_estimado.toString() || '')
  const [referenciaPago, setReferenciaPago] = useState('')
  const [responsablePago, setResponsablePago] = useState<'Administrador' | 'Propietario' | 'Inquilino' | ''>('')
  const [tieneFactura, setTieneFactura] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [notas, setNotas] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null)
  const [mostrarAlertaDiferencia, setMostrarAlertaDiferencia] = useState(false)

  // Estados para cuentas bancarias
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cuentaId, setCuentaId] = useState('')
  const [cargandoCuentas, setCargandoCuentas] = useState(false)

  // Estados de UI
  const [guardando, setGuardando] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)

  // Actualizar valores cuando cambie pagoExistente (cuando se abre el modal con nuevo ticket)
  useEffect(() => {
    if (pagoExistente) {
      console.log('🔄 Actualizando modal con pagoExistente:', pagoExistente)
      setFechaPago(pagoExistente.fecha_pago || new Date().toISOString().split('T')[0])
      setPropiedadId(pagoExistente.propiedad_id || '')
      setMonto(pagoExistente.monto_estimado.toString() || '')
    }
  }, [pagoExistente])

  // Cargar cuentas cuando cambie la propiedad
  useEffect(() => {
    console.log('🔍 RegistrarPagoModal - propiedadId:', propiedadId)
    if (propiedadId) {
      cargarCuentasPropiedad(propiedadId)
    } else {
      console.log('⚠️ No hay propiedadId, limpiando cuentas')
      setCuentas([])
      setCuentaId('')
    }
  }, [propiedadId])

  // Detectar diferencia en el monto
  useEffect(() => {
    if (pagoExistente && monto) {
      const montoPagado = parseFloat(monto)
      const montoEsperado = pagoExistente.monto_estimado
      if (montoPagado !== montoEsperado) {
        setMostrarAlertaDiferencia(true)
      } else {
        setMostrarAlertaDiferencia(false)
      }
    }
  }, [monto, pagoExistente])

  const cargarCuentasPropiedad = async (propId: string) => {
    try {
      console.log('📥 Cargando cuentas para propiedad:', propId)
      setCargandoCuentas(true)
      const cuentasPropiedad = await obtenerCuentasPropiedad(propId)
      console.log('✅ Cuentas cargadas:', cuentasPropiedad.length, cuentasPropiedad)
      setCuentas(cuentasPropiedad)
    } catch (error) {
      console.error('❌ Error cargando cuentas:', error)
      setCuentas([])
    } finally {
      setCargandoCuentas(false)
    }
  }

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar 5MB')
        return
      }

      // Validar tipo
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!tiposPermitidos.includes(file.type)) {
        toast.error('Solo se permiten imágenes (JPG, PNG) o PDF')
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
    if (!fechaPago) {
      toast.error('La fecha de pago es obligatoria')
      return
    }

    if (!monto || parseFloat(monto) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    if (cuentas.length > 0 && !cuentaId) {
      toast.error('Debes seleccionar una cuenta para registrar el pago')
      return
    }

    // Validar diferencia de monto (si es diferente, requiere nota)
    if (pagoExistente && mostrarAlertaDiferencia) {
      const montoPagado = parseFloat(monto)
      const montoEsperado = pagoExistente.monto_estimado

      if (!notas.trim()) {
        toast.error(`El monto difiere del esperado ($${montoEsperado.toFixed(2)} vs $${montoPagado.toFixed(2)}). Agrega una nota explicando la diferencia.`)
        return
      }
    }

    if (tieneFactura && !numeroFactura.trim()) {
      toast.error('Si tiene factura, debes indicar el número')
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

      // Si es un pago existente (marcar como pagado)
      if (pagoExistente) {
        const montoPagado = parseFloat(monto)
        // Determinar automáticamente si es pago completo o anticipo
        const esPagoCompleto = montoPagado >= pagoExistente.monto_estimado

        // ACTUALIZAR TABLA tickets (unificada - incluye manuales y de servicios)
        const updateData: any = {
          pagado: esPagoCompleto,
          fecha_pago_real: fechaPago,
          monto_real: montoPagado,
          cuenta_id: cuentaId || null,
          estado: esPagoCompleto ? 'completado' : 'en_progreso',
          updated_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('tickets')
          .update(updateData)
          .eq('id', pagoExistente.id)

        if (error) throw error
        console.log('✅ Ticket actualizado en tabla tickets (unificada)')

        // ACTUALIZAR SALDO DE LA CUENTA (si se seleccionó una)
        if (cuentaId) {
          try {
            await registrarMovimientoYActualizarSaldo(cuentaId, montoPagado, 'egreso')
            console.log('✅ Saldo de cuenta actualizado (egreso)')
          } catch (saldoError) {
            console.error('⚠️ Error actualizando saldo de cuenta:', saldoError)
            // No lanzamos error porque el pago ya se registró
          }
        }

        // Mensaje según si es completo o anticipo
        if (!esPagoCompleto) {
          const montoRestante = pagoExistente.monto_estimado - montoPagado
          toast.warning(`💰 Anticipo registrado: $${montoPagado.toFixed(2)}. El ticket permanece pendiente. Monto restante: $${montoRestante.toFixed(2)}`)
        } else {
          toast.success('✅ Pago registrado correctamente')
        }
      } else {
        // Crear nuevo registro de pago
        // TODO: Aquí necesitarás definir la estructura para pagos manuales
        // Por ahora solo funciona para marcar tickets existentes como pagados
        throw new Error('Funcionalidad de pagos manuales próximamente')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error guardando pago:', error)
      toast.error(error.message || 'Error al guardar el pago')
    } finally {
      setGuardando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-ras-azul to-ras-turquesa rounded-t-2xl">
            <h2 className="text-xl font-bold text-white font-poppins">
              {pagoExistente ? '✓ Marcar como Pagado' : '+ Registrar Pago'}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Info del Servicio (solo lectura) */}
            {pagoExistente && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-2 font-poppins">Información del Servicio</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div><strong>Servicio:</strong> {pagoExistente.servicio_nombre}</div>
                  <div><strong>Monto Esperado:</strong> ${pagoExistente.monto_estimado.toFixed(2)}</div>
                  <div><strong>Fecha Programada:</strong> {new Date(pagoExistente.fecha_pago).toLocaleDateString('es-MX')}</div>
                </div>
                <p className="text-xs text-blue-700 mt-2 font-semibold">
                  💡 Si pagas menos del monto esperado, se registrará como anticipo
                </p>
              </div>
            )}

            {/* Fecha de Pago */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Fecha de Pago <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm"
              />
            </div>

            {/* Forma de Pago (Cuentas Bancarias) - SIEMPRE VISIBLE */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Forma de Pago {cuentas.length > 0 && <span className="text-red-500">*</span>}
              </label>

              {!propiedadId ? (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-xs text-red-800 font-semibold">
                    ❌ Error: No se pudo identificar la propiedad del ticket
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Por favor cierra este modal e intenta de nuevo. Si el problema persiste, contacta al administrador.
                  </p>
                </div>
              ) : cargandoCuentas ? (
                <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                  <p className="text-xs text-blue-800 font-semibold">
                    ⏳ Cargando cuentas bancarias...
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={cuentaId}
                    onChange={(e) => setCuentaId(e.target.value)}
                    disabled={cuentas.length === 0}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {cuentas.length === 0 ? 'No hay cuentas disponibles' : 'Seleccionar forma de pago...'}
                    </option>
                    {cuentas.map(cuenta => (
                      <option key={cuenta.id} value={cuenta.id}>
                        💳 {cuenta.nombre_cuenta} ({cuenta.moneda}) - {cuenta.tipo_cuenta}
                        {cuenta.banco ? ` - ${cuenta.banco}` : ''} - Saldo: ${cuenta.saldo_actual?.toFixed(2) || '0.00'}
                      </option>
                    ))}
                  </select>
                  {cuentas.length === 0 ? (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                      <p className="text-xs text-amber-800 font-semibold mb-1">
                        ⚠️ No hay cuentas bancarias vinculadas a esta propiedad
                      </p>
                      <p className="text-xs text-amber-700">
                        Ve a <strong>Balance</strong> de esta propiedad para crear y vincular una cuenta bancaria.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      💰 El balance de la cuenta se actualizará automáticamente
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Monto a Pagar <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                  $
                </span>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm"
                />
              </div>
              {/* Alerta de diferencia de monto */}
              {mostrarAlertaDiferencia && pagoExistente && (
                <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-xs text-red-800 font-semibold mb-1">
                    ⚠️ El monto difiere del monto esperado
                  </p>
                  <p className="text-xs text-red-700">
                    Esperado: ${pagoExistente.monto_estimado.toFixed(2)} | Ingresado: ${parseFloat(monto || '0').toFixed(2)}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    <strong>IMPORTANTE:</strong> Debes agregar una nota explicando la diferencia.
                  </p>
                </div>
              )}
            </div>

            {/* Responsable de Pago */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Responsable de Pago (Opcional)
              </label>
              <select
                value={responsablePago}
                onChange={(e) => setResponsablePago(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm"
              >
                <option value="">Seleccionar responsable...</option>
                <option value="Administrador">🏢 Administrador</option>
                <option value="Propietario">👤 Propietario</option>
                <option value="Inquilino">🏠 Inquilino</option>
              </select>
            </div>

            {/* Referencia de Pago */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Referencia / No. de Operación (Opcional)
              </label>
              <input
                type="text"
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder="Ej: REF123456 o últimos 4 dígitos"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm"
              />
            </div>

            {/* Factura */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="tieneFactura"
                  checked={tieneFactura}
                  onChange={(e) => setTieneFactura(e.target.checked)}
                  className="w-5 h-5 text-ras-turquesa border-gray-300 rounded focus:ring-ras-turquesa"
                />
                <label htmlFor="tieneFactura" className="text-sm font-semibold text-gray-700 font-poppins cursor-pointer">
                  ¿Este pago tiene factura?
                </label>
              </div>

              {tieneFactura && (
                <div className="mt-3 pl-8">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                    Número de Factura <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="Ej: A-1234"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm"
                  />
                </div>
              )}
            </div>

            {/* Notas Adicionales */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Notas / Observaciones {mostrarAlertaDiferencia && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={mostrarAlertaDiferencia
                  ? "OBLIGATORIO: Explica la razón de la diferencia en el monto..."
                  : "Agrega cualquier información adicional relevante..."}
                rows={3}
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-ras-turquesa text-sm resize-none ${
                  mostrarAlertaDiferencia ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {mostrarAlertaDiferencia && (
                <p className="mt-1 text-xs text-red-600">
                  💡 Ejemplo: "Aumento en tarifa", "Pago con descuento", "Recargo por pago tardío"
                </p>
              )}
            </div>

            {/* Archivo/Comprobante */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Comprobante de Pago (Opcional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Puedes subir una imagen o PDF del ticket/comprobante. Máximo 5MB.
              </p>

              {!archivo ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-ras-turquesa hover:bg-ras-turquesa/5 transition-all group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-400 group-hover:text-ras-turquesa transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-ras-turquesa transition-colors">
                      Click para subir archivo
                    </span>
                    <span className="text-xs text-gray-500">
                      JPG, PNG o PDF (máx. 5MB)
                    </span>
                  </div>
                </button>
              ) : (
                <div className="border-2 border-ras-turquesa rounded-lg p-4 bg-ras-turquesa/5">
                  <div className="flex items-start gap-4">
                    {archivoPreview ? (
                      <img 
                        src={archivoPreview} 
                        alt="Preview" 
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {archivo.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(archivo.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={handleRemoverArchivo}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                      title="Eliminar archivo"
                    >
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleArchivoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={guardando || subiendoArchivo}
              className="px-6 py-2.5 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando || subiendoArchivo}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-ras-azul to-ras-turquesa text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(guardando || subiendoArchivo) ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{subiendoArchivo ? 'Subiendo...' : 'Guardando...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Pago</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}