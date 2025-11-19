/**
 * Step5_Servicios - Gestión de servicios del inmueble
 * 
 * NOTA DE VALIDACIÓN:
 * Este componente incluye una función validarServicios() que debes llamar
 * antes de permitir avanzar al siguiente step del wizard.
 * 
 * Ejemplo en tu wizard principal:
 * 
 * const step5Ref = useRef<any>(null);
 * 
 * const handleNext = () => {
 *   if (currentStep === 5) {
 *     // No hay forma de exponer validarServicios, así que valida manualmente:
 *     const servicios = formData.servicios || [];
 *     let esValido = true;
 *     
 *     if (servicios.length > 0) {
 *       for (const servicio of servicios) {
 *         if (!servicio.name || !servicio.name.trim()) {
 *           toast.error('❌ Todos los servicios necesitan un nombre');
 *           esValido = false;
 *           break;
 *         }
 *         if (!servicio.lastPaymentDate) {
 *           toast.error(`❌ "${servicio.name}" necesita una fecha de último pago`);
 *           esValido = false;
 *           break;
 *         }
 *       }
 *     }
 *     
 *     if (!esValido) return;
 *   }
 *   
 *   setCurrentStep(currentStep + 1);
 * };
 */

'use client';

import React, { useState } from 'react';
import { PropertyFormData, Service } from '@/types/property';
import { useToast } from '@/hooks/useToast';

interface Step5Props {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
}

// Categorías de servicios con sus opciones
const CATEGORIAS_SERVICIOS = [
  {
    titulo: 'Servicios Básicos',
    icono: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    servicios: ['Agua', 'Luz', 'Gas', 'Internet', 'Teléfono', 'Streaming TV']
  },
  {
    titulo: 'Administración',
    icono: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
    ),
    servicios: ['Predial', 'Condominio', 'Seguro', 'Administración']
  },
  {
    titulo: 'Mantenimiento',
    icono: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    servicios: [
      'Limpieza',
      'Jardinería',
      'Fumigación',
      'Pintura',
      'Plomería',
      'Electricidad',
      'Carpintería',
      'Aire Acondicionado',
      'Calefacción',
      'Impermeabilización',
      'Elevador',
      'Cisterna',
      'Alberca'
    ],
    columnas: 2 // Para dividir en 2 columnas internas
  },
  {
    titulo: 'Seguridad y Adicionales',
    icono: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
      </svg>
    ),
    servicios: [
      'CCTV',
      'Alarma',
      'Vigilancia',
      'Acceso Controlado',
      'Gimnasio',
      'Otro'
    ]
  }
];

export default function Step5_Servicios({ data, onUpdate }: Step5Props) {
  const servicios = data.servicios || [];
  const [servicioSeleccionado, setServicioSeleccionado] = useState<string | null>(null);
  const toast = useToast();

  // Agregar servicio
  const agregarServicio = (nombre: string) => {
    const nuevoServicio: Service = {
      id: `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nombre.toLowerCase().replace(/\s+/g, '-'),
      name: nombre,
      provider: '',
      accountNumber: '',
      cost: 0,
      montoTipo: 'fijo',
      frecuenciaCantidad: 1,
      frecuenciaUnidad: 'mes',
      paymentFrequency: 'mensual',
      lastPaymentDate: '',
      notes: ''
    };

    onUpdate({ servicios: [...servicios, nuevoServicio] });
    setServicioSeleccionado(nuevoServicio.id);
    toast.success(`✅ Servicio "${nombre}" agregado`);
  };

  // Calcular próximo pago
  const calcularProximoPago = (lastPaymentDate: string, cantidad: number, unidad: string): string => {
    if (!lastPaymentDate) return '';
    
    const fecha = new Date(lastPaymentDate + 'T00:00:00');
    
    if (unidad === 'dia') {
      fecha.setDate(fecha.getDate() + cantidad);
    } else if (unidad === 'mes') {
      fecha.setMonth(fecha.getMonth() + cantidad);
    } else if (unidad === 'año') {
      fecha.setFullYear(fecha.getFullYear() + cantidad);
    }
    
    return fecha.toISOString().split('T')[0];
  };

  // Actualizar servicio
  const actualizarServicio = (id: string, updates: Partial<Service>) => {
    const nuevosServicios = servicios.map(servicio =>
      servicio.id === id ? { ...servicio, ...updates } : servicio
    );
    onUpdate({ servicios: nuevosServicios });
  };

  // Eliminar servicio
  const eliminarServicio = (id: string) => {
    const servicio = servicios.find(s => s.id === id);
    const nombreServicio = servicio?.name || 'este servicio';
    
    if (window.confirm(`¿Eliminar "${nombreServicio}"?`)) {
      const nuevosServicios = servicios.filter(servicio => servicio.id !== id);
      onUpdate({ servicios: nuevosServicios });
      
      if (servicioSeleccionado === id) {
        setServicioSeleccionado(null);
      }
      
      toast.success(`✅ Servicio eliminado`);
    }
  };

  // Resumen de servicios
  const conteoServicios = servicios.reduce((acc, servicio) => {
    const categoria = CATEGORIAS_SERVICIOS.find(cat => 
      cat.servicios.includes(servicio.name)
    )?.titulo || 'Otros';
    acc[categoria] = (acc[categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 font-poppins mb-2 flex items-center gap-3">
              <svg className="w-7 h-7 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Servicios de la Propiedad
            </h2>

            {/* Resumen */}
            {Object.keys(conteoServicios).length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(conteoServicios).map(([categoria, cantidad]) => (
                  <span
                    key={categoria}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-ras-azul/10 border border-ras-azul/30 rounded-full text-xs font-semibold text-ras-azul"
                  >
                    {cantidad} {categoria}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                Define todos los servicios asociados a la propiedad
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Agregar servicios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          Agregar Servicios
        </h3>
        
        {/* Grid de columnas de categorías */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIAS_SERVICIOS.map((categoria, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
              {/* Header de categoría con ícono */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-200">
                <div className="text-ras-azul">
                  {categoria.icono}
                </div>
                <h4 className="text-sm font-bold text-gray-800">
                  {categoria.titulo}
                </h4>
              </div>

              {/* Lista vertical de servicios */}
              <div className="space-y-2">
                {categoria.servicios.map((servicio) => {
                  const yaAgregado = servicios.some(s => s.name === servicio);
                  return (
                    <button
                      key={servicio}
                      onClick={() => !yaAgregado && agregarServicio(servicio)}
                      disabled={yaAgregado}
                      className={`
                        w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                        ${yaAgregado
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-ras-azul hover:text-white shadow-sm'
                        }
                      `}
                    >
                      {yaAgregado && '✓ '}{servicio}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de servicios agregados */}
      {servicios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Servicios Agregados ({servicios.length})
            </h3>
          </div>

          <div className="space-y-3">
            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Header del servicio */}
                <div
                  onClick={() => setServicioSeleccionado(servicioSeleccionado === servicio.id ? null : servicio.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-ras-azul/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{servicio.name}</h4>
                      <p className="text-sm text-gray-600">
                        {servicio.provider || 'Sin proveedor'} • ${servicio.cost || 0} • {servicio.montoTipo === 'fijo' ? 'Fijo' : 'Variable'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {servicio.lastPaymentDate && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Próximo pago</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(calcularProximoPago(
                            servicio.lastPaymentDate,
                            servicio.frecuenciaCantidad || 1,
                            servicio.frecuenciaUnidad || 'mes'
                          )).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    )}
                    
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${servicioSeleccionado === servicio.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>

                {/* Detalles expandibles */}
                {servicioSeleccionado === servicio.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="space-y-4">
                      {/* Grid de campos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre del Servicio */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nombre del Servicio
                          </label>
                          <input
                            type="text"
                            value={servicio.name}
                            onChange={(e) => actualizarServicio(servicio.id, { name: e.target.value })}
                            placeholder="Ej: Luz - Depto 101, Internet Fibra Óptica..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-azul focus:border-transparent font-medium"
                          />
                        </div>

                        {/* Proveedor */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Proveedor
                          </label>
                          <input
                            type="text"
                            value={servicio.provider}
                            onChange={(e) => actualizarServicio(servicio.id, { provider: e.target.value })}
                            placeholder="Ej: CFE, PEMEX, Telmex..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-azul focus:border-transparent"
                          />
                        </div>

                        {/* Número de cuenta */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de cuenta
                          </label>
                          <input
                            type="text"
                            value={servicio.accountNumber}
                            onChange={(e) => actualizarServicio(servicio.id, { accountNumber: e.target.value })}
                            placeholder="Número de referencia"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-azul focus:border-transparent"
                          />
                        </div>

                        {/* Costo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Costo
                          </label>
                          <input
                            type="number"
                            value={servicio.cost}
                            onChange={(e) => actualizarServicio(servicio.id, { cost: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-azul focus:border-transparent"
                          />
                        </div>

                        {/* Tipo de Monto */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ¿Monto Fijo o Variable?
                          </label>
                          <select
                            value={servicio.montoTipo || 'fijo'}
                            onChange={(e) => actualizarServicio(servicio.id, { montoTipo: e.target.value as 'fijo' | 'variable' })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-azul focus:border-transparent"
                          >
                            <option value="fijo">Fijo</option>
                            <option value="variable">Variable</option>
                          </select>
                        </div>

                        {/* Frecuencia Personalizada */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Frecuencia de Pago
                          </label>
                          <div className="flex gap-3">
                            <div className="w-32">
                              <input
                                type="number"
                                min="1"
                                value={servicio.frecuenciaCantidad || 1}
                                onChange={(e) => actualizarServicio(servicio.id, { frecuenciaCantidad: parseInt(e.target.value) || 1 })}
                                placeholder="1"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
                              />
                            </div>
                            <div className="flex-1">
                              <select
                                value={servicio.frecuenciaUnidad || 'mes'}
                                onChange={(e) => actualizarServicio(servicio.id, { frecuenciaUnidad: e.target.value as 'dia' | 'mes' | 'año' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
                              >
                                <option value="dia">Día(s)</option>
                                <option value="mes">Mes(es)</option>
                                <option value="año">Año(s)</option>
                              </select>
                            </div>
                            <div className="flex items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 min-w-fit">
                              Cada {servicio.frecuenciaCantidad || 1} {servicio.frecuenciaUnidad || 'mes'}{(servicio.frecuenciaCantidad || 1) > 1 ? (servicio.frecuenciaUnidad === 'mes' ? 'es' : 's') : ''}
                            </div>
                          </div>
                        </div>

                        {/* Fecha del último pago */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📅 Fecha del último pago
                          </label>
                          <div className="flex gap-3 items-start">
                            <input
                              type="date"
                              value={servicio.lastPaymentDate || ''}
                              onChange={(e) => actualizarServicio(servicio.id, { lastPaymentDate: e.target.value })}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
                            />
                            {servicio.lastPaymentDate && (
                              <div className="flex-1 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                                <p className="text-xs font-medium text-green-900 mb-1">✅ Próximo pago calculado:</p>
                                <p className="text-sm font-bold text-green-700">
                                  {new Date(calcularProximoPago(
                                    servicio.lastPaymentDate,
                                    servicio.frecuenciaCantidad || 1,
                                    servicio.frecuenciaUnidad || 'mes'
                                  )).toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notas adicionales
                          </label>
                          <textarea
                            value={servicio.notes}
                            onChange={(e) => actualizarServicio(servicio.id, { notes: e.target.value })}
                            placeholder="Información adicional sobre este servicio..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ras-azul focus:border-transparent resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => eliminarServicio(servicio.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                          Eliminar Servicio
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}