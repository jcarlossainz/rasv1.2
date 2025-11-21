'use client'

/**
 * COMPONENTE: Gestión de Cuentas Bancarias
 * Permite ver, crear, editar y eliminar cuentas bancarias de una propiedad
 */

import { useState, useEffect } from 'react'
import { obtenerCuentasPropiedad, crearCuenta, actualizarCuenta, eliminarCuenta } from '@/services/cuentas-api'
import type { CuentaBancaria, NuevaCuentaBancaria } from '@/types/property'

interface GestionCuentasProps {
  propiedadId: string
  propiedadNombre: string
  onCuentaSeleccionada?: (cuenta: CuentaBancaria) => void
}

export default function GestionCuentas({
  propiedadId,
  propiedadNombre,
  onCuentaSeleccionada
}: GestionCuentasProps) {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [cuentaEditando, setCuentaEditando] = useState<CuentaBancaria | null>(null)

  // Formulario
  const [nombre, setNombre] = useState('')
  const [tipoMoneda, setTipoMoneda] = useState<'MXN' | 'USD'>('MXN')
  const [tipoCuenta, setTipoCuenta] = useState<'Banco' | 'Tarjeta' | 'Efectivo'>('Banco')
  const [banco, setBanco] = useState('')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [balanceInicial, setBalanceInicial] = useState('0')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('#3B82F6')

  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarCuentas()
  }, [propiedadId])

  const cargarCuentas = async () => {
    try {
      setCargando(true)
      const data = await obtenerCuentasPropiedad(propiedadId)
      setCuentas(data)
    } catch (error) {
      console.error('Error cargando cuentas:', error)
    } finally {
      setCargando(false)
    }
  }

  const abrirModalNueva = () => {
    setCuentaEditando(null)
    setNombre('')
    setTipoMoneda('MXN')
    setTipoCuenta('Banco')
    setBanco('')
    setNumeroCuenta('')
    setBalanceInicial('0')
    setDescripcion('')
    setColor('#3B82F6')
    setMostrarModal(true)
  }

  const abrirModalEditar = (cuenta: CuentaBancaria) => {
    setCuentaEditando(cuenta)
    setNombre(cuenta.nombre)
    setTipoMoneda(cuenta.tipo_moneda)
    setTipoCuenta(cuenta.tipo_cuenta)
    setBanco(cuenta.banco || '')
    setNumeroCuenta(cuenta.numero_cuenta || '')
    setBalanceInicial(cuenta.balance_inicial.toString())
    setDescripcion(cuenta.descripcion || '')
    setColor(cuenta.color || '#3B82F6')
    setMostrarModal(true)
  }

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      alert('El nombre de la cuenta es obligatorio')
      return
    }

    if (parseFloat(balanceInicial) < 0) {
      alert('El balance inicial no puede ser negativo')
      return
    }

    setGuardando(true)

    try {
      const cuentaData: NuevaCuentaBancaria = {
        propiedad_id: propiedadId,
        nombre: nombre.trim(),
        tipo_moneda: tipoMoneda,
        tipo_cuenta: tipoCuenta,
        banco: banco.trim() || undefined,
        numero_cuenta: numeroCuenta.trim() || undefined,
        balance_inicial: parseFloat(balanceInicial),
        descripcion: descripcion.trim() || undefined,
        color: color || undefined
      }

      if (cuentaEditando) {
        await actualizarCuenta(cuentaEditando.id, cuentaData)
      } else {
        await crearCuenta(cuentaData)
      }

      await cargarCuentas()
      setMostrarModal(false)
    } catch (error: any) {
      console.error('Error guardando cuenta:', error)
      alert(error.message || 'Error al guardar la cuenta')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (cuentaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cuenta? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await eliminarCuenta(cuentaId)
      await cargarCuentas()
    } catch (error: any) {
      console.error('Error eliminando cuenta:', error)
      alert(error.message || 'Error al eliminar la cuenta')
    }
  }

  const formatoMoneda = (monto: number, moneda: 'MXN' | 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda
    }).format(monto)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cuentas Bancarias</h3>
          <p className="text-sm text-gray-500">Gestiona las cuentas de {propiedadNombre}</p>
        </div>
        <button
          onClick={abrirModalNueva}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Cuenta
        </button>
      </div>

      {/* Lista de cuentas */}
      {cuentas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cuentas registradas</h3>
          <p className="mt-1 text-sm text-gray-500">Comienza creando una cuenta bancaria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuentas.map(cuenta => (
            <div
              key={cuenta.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onCuentaSeleccionada?.(cuenta)}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cuenta.color || '#3B82F6' }}
                  />
                  <h4 className="font-semibold text-gray-900">{cuenta.nombre}</h4>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      abrirModalEditar(cuenta)
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEliminar(cuenta.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tipo y banco */}
              <div className="space-y-1 mb-3">
                <p className="text-xs text-gray-500">{cuenta.tipo_cuenta}</p>
                {cuenta.banco && (
                  <p className="text-xs text-gray-600">{cuenta.banco}</p>
                )}
                {cuenta.numero_cuenta && (
                  <p className="text-xs text-gray-500">•••• {cuenta.numero_cuenta}</p>
                )}
              </div>

              {/* Balance */}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500 mb-1">Balance actual</p>
                <p className={`text-xl font-bold ${cuenta.balance_actual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatoMoneda(cuenta.balance_actual, cuenta.tipo_moneda)}
                </p>
              </div>

              {cuenta.descripcion && (
                <p className="mt-2 text-xs text-gray-500 line-clamp-2">{cuenta.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {cuentaEditando ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </h2>
              <button
                onClick={() => setMostrarModal(false)}
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
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la cuenta *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Cuenta principal Casa Playa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tipo de cuenta y moneda */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de cuenta *
                  </label>
                  <select
                    value={tipoCuenta}
                    onChange={(e) => setTipoCuenta(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Banco">Banco</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda *
                  </label>
                  <select
                    value={tipoMoneda}
                    onChange={(e) => setTipoMoneda(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MXN">MXN (Pesos)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>
              </div>

              {/* Banco (solo si no es efectivo) */}
              {tipoCuenta !== 'Efectivo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    placeholder="Ej: BBVA, Santander, Banamex..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Número de cuenta */}
              {tipoCuenta !== 'Efectivo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Últimos 4 dígitos
                  </label>
                  <input
                    type="text"
                    value={numeroCuenta}
                    onChange={(e) => setNumeroCuenta(e.target.value)}
                    placeholder="1234"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Balance inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance inicial *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceInicial}
                  onChange={(e) => setBalanceInicial(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  El balance actual se calculará automáticamente con ingresos y egresos
                </p>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color (para identificación visual)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{color}</span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales sobre esta cuenta..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                disabled={guardando}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : cuentaEditando ? 'Actualizar' : 'Crear Cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
