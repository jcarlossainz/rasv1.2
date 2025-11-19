'use client';

import React, { useState } from 'react';
import { PropertyFormData } from '@/types/property';
import Input from '@/components/ui/input';

interface Step4Props {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
  inquilinos?: Array<{
    id: string;
    nombre: string;
    email: string;
  }>;
  onAgregarInquilino?: (email: string) => Promise<void>;
}

// Modal para agregar inquilino
interface ModalAgregarInquilinoProps {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (email: string) => Promise<void>;
}

function ModalAgregarInquilino({ isOpen, onClose, onAgregar }: ModalAgregarInquilinoProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validar que el campo no esté vacío
    if (!email.trim()) {
      setError('Por favor ingresa un correo');
      return;
    }

    setLoading(true);
    try {
      await onAgregar(email);
      setEmail('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al agregar inquilino');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Agregar inquilino
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent"
              required
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const AMENIDADES_VACACIONAL = [
  'Wi-Fi',
  'Aire acondicionado',
  'Calefacción',
  'TV',
  'Cocina equipada',
  'Lavadora',
  'Secadora',
  'Estacionamiento',
  'Alberca',
  'Gimnasio',
  'Terraza',
  'Jardín',
  'BBQ/Asador',
  'Vista al mar',
  'Pet friendly'
];

const FRECUENCIA_PAGO = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' }
];

const DURACION_CONTRATO_UNIDAD = [
  { value: 'meses', label: 'Meses' },
  { value: 'años', label: 'Años' }
];

export default function Step4_Condicionales({ 
  data, 
  onUpdate, 
  inquilinos = [],
  onAgregarInquilino
}: Step4Props) {
  const [estaRentado, setEstaRentado] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Debug
  console.log('Step4 - showModal:', showModal);

  // Sincronizar el estado cuando cambie el inquilino_email desde fuera
  React.useEffect(() => {
    setEstaRentado(
      Array.isArray(data.inquilinos_email) && data.inquilinos_email.length > 0
    );
  }, [data.inquilinos_email]);

  const handleChange = (field: keyof PropertyFormData, value: any) => {
    onUpdate({ [field]: value });
  };

  // Helper para actualizar precios
  const handlePrecioChange = (tipo: 'mensual' | 'noche' | 'venta', value: string) => {
    const precioNumerico = value === '' ? null : parseFloat(value);
    onUpdate({ 
      precios: { 
        ...data.precios, 
        [tipo]: precioNumerico 
      } 
    });
  };

  const toggleAmenidad = (amenidad: string) => {
    const newAmenidades = data.amenidades_vacacional?.includes(amenidad)
      ? data.amenidades_vacacional.filter(a => a !== amenidad)
      : [...(data.amenidades_vacacional || []), amenidad];
    handleChange('amenidades_vacacional', newAmenidades);
  };

  const handleRentadoToggle = (checked: boolean) => {
    setEstaRentado(checked);
    if (!checked) {
      // Limpiar todos los campos relacionados con inquilino
      handleChange('inquilinos_email', []);
      handleChange('fecha_inicio_contrato', '');
      handleChange('duracion_contrato_valor', '');
      handleChange('duracion_contrato_unidad', 'meses');
      handlePrecioChange('mensual', '');
      handleChange('frecuencia_pago', 'mensual');
      handleChange('dia_pago', '');
    } else {
      // Limpiar campos de disponible
      handleChange('precio_renta_disponible', '');
      handleChange('requisitos_renta', []);
      handleChange('requisitos_renta_custom', []);
    }
  };

  const handleAgregarInquilinoModal = async (email: string) => {
    if (onAgregarInquilino) {
      await onAgregarInquilino(email);
    } else {
      // Comportamiento por defecto: solo cerrar el modal
      // El padre debe implementar onAgregarInquilino para guardar en BD
      console.warn('onAgregarInquilino no está implementado');
    }
  };

  const renderSection = (estado: string) => {
    switch (estado) {
      case 'Renta largo plazo':
        return (
          <div key={estado} className="space-y-5">
            <h3 className="font-bold text-gray-900 font-poppins text-lg mb-3">Renta Largo Plazo</h3>

            {/* Pregunta: ¿Está rentado? */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                ¿Propiedad rentada actualmente?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRentadoToggle(true)}
                  className={`
                    px-6 py-2 rounded-lg font-medium text-sm transition-all
                    ${estaRentado
                      ? 'bg-ras-azul text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => handleRentadoToggle(false)}
                  className={`
                    px-6 py-2 rounded-lg font-medium text-sm transition-all
                    ${!estaRentado
                      ? 'bg-ras-azul text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  No
                </button>
              </div>
            </div>

            {/* Campos solo si está rentado */}
            {estaRentado && (
              <div className="space-y-4 pt-2">
                {/* Grid de 2 columnas: Inquilino + Día de pago */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Inquilino */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Inquilino(s) *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 border-2 border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-ras-azul focus-within:border-transparent">
                        <div className="max-h-40 overflow-y-auto p-2">
                          {inquilinos.length === 0 ? (
                            <p className="text-gray-400 text-sm py-2 px-2">No hay inquilinos disponibles</p>
                          ) : (
                            inquilinos.map((inq) => (
                              <label
                                key={inq.email}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(data.inquilinos_email) 
                                    ? data.inquilinos_email.includes(inq.email)
                                    : false
                                  }
                                  onChange={(e) => {
                                    const currentEmails = Array.isArray(data.inquilinos_email) 
                                      ? data.inquilinos_email 
                                      : [];
                                    
                                    const newEmails = e.target.checked
                                      ? [...currentEmails, inq.email]
                                      : currentEmails.filter(email => email !== inq.email);
                                    
                                    handleChange('inquilinos_email', newEmails);
                                  }}
                                  className="rounded text-ras-azul focus:ring-ras-azul"
                                />
                                <span className="text-sm">{inq.email}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Abriendo modal de inquilino');
                          setShowModal(true);
                        }}
                        className="px-4 py-2.5 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90 transition-colors font-semibold"
                        title="Agregar inquilino"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {inquilinos.length === 0 
                        ? 'No hay inquilinos. Agrega uno nuevo.' 
                        : `${Array.isArray(data.inquilinos_email) ? data.inquilinos_email.length : 0} seleccionado(s) de ${inquilinos.length}`
                      }
                    </p>
                  </div>

                  {/* Día de pago */}
                  <div>
                    <Input
                      id="dia_pago"
                      label="Día de pago"
                      type="number"
                      value={data.dia_pago}
                      onChange={(e) => handleChange('dia_pago', e.target.value)}
                      placeholder="5"
                      min="1"
                      max="31"
                    />
                  </div>
                </div>

                {/* Grid de 2 columnas para otros campos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fecha de inicio */}
                  <div>
                    <Input
                      id="fecha_inicio_contrato"
                      label="Fecha de inicio"
                      type="date"
                      value={data.fecha_inicio_contrato}
                      onChange={(e) => handleChange('fecha_inicio_contrato', e.target.value)}
                    />
                  </div>

                  {/* Duración del contrato */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duración del contrato
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="duracion_contrato_valor"
                        type="number"
                        value={data.duracion_contrato_valor}
                        onChange={(e) => handleChange('duracion_contrato_valor', e.target.value)}
                        placeholder="12"
                        className="flex-1"
                      />
                      <select
                        value={data.duracion_contrato_unidad || 'meses'}
                        onChange={(e) => handleChange('duracion_contrato_unidad', e.target.value)}
                        className="w-32 px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm font-medium"
                      >
                        {DURACION_CONTRATO_UNIDAD.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Precio mensual */}
                  <div>
                    <Input
                      id="precio_mensual"
                      label="Precio mensual"
                      type="number"
                      value={data.precios?.mensual?.toString() || ''}
                      onChange={(e) => handlePrecioChange('mensual', e.target.value)}
                      placeholder="15000"
                      prefix="$"
                    />
                  </div>

                  {/* Frecuencia de pago */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Frecuencia de pago
                    </label>
                    <select
                      value={data.frecuencia_pago || 'mensual'}
                      onChange={(e) => handleChange('frecuencia_pago', e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm font-medium"
                    >
                      {FRECUENCIA_PAGO.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Campos solo si NO está rentado */}
            {!estaRentado && (
              <div className="space-y-4 pt-2">
                <div>
                  <Input
                    id="precio_renta_disponible"
                    label="Precio de renta mensual"
                    type="number"
                    value={data.precio_renta_disponible}
                    onChange={(e) => handleChange('precio_renta_disponible', e.target.value)}
                    placeholder="15000"
                    prefix="$"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'Renta vacacional':
        return (
          <div key={estado} className="space-y-5">
            <h3 className="font-bold text-gray-900 font-poppins text-lg">Renta Vacacional</h3>

            {/* Precio por noche */}
            <div>
              <Input
                id="precio_noche"
                label="Precio por noche"
                type="number"
                value={data.precios?.noche?.toString() || ''}
                onChange={(e) => handlePrecioChange('noche', e.target.value)}
                placeholder="1500"
                prefix="$"
              />
            </div>

            {/* Amenidades */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Amenidades
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AMENIDADES_VACACIONAL.map(amenidad => (
                  <label
                    key={amenidad}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                      ${data.amenidades_vacacional?.includes(amenidad)
                        ? 'border-ras-azul bg-ras-azul/5 text-ras-azul'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={data.amenidades_vacacional?.includes(amenidad)}
                      onChange={() => toggleAmenidad(amenidad)}
                      className="rounded text-ras-azul focus:ring-ras-azul"
                    />
                    <span className="font-medium">{amenidad}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Venta':
        return (
          <div key={estado} className="space-y-5">
            <h3 className="font-bold text-gray-900 font-poppins text-lg">Venta</h3>

            {/* Precio de venta */}
            <div>
              <Input
                id="precio_venta"
                label="Precio de venta"
                type="number"
                value={data.precios?.venta?.toString() || ''}
                onChange={(e) => handlePrecioChange('venta', e.target.value)}
                placeholder="3500000"
                prefix="$"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* SECCIÓN: DATOS ESPECÍFICOS POR ESTADO */}
        {data.estados && data.estados.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 font-poppins mb-5">
              Datos Específicos
            </h2>

            <div className="space-y-6">
              {data.estados.map(estado => renderSection(estado))}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
            <div className="text-blue-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-blue-900 mb-1">
              Selecciona al menos un estado
            </h3>
            <p className="text-sm text-blue-700">
              Ve al Paso 1 y selecciona uno o más estados para la propiedad (Renta largo plazo, Renta vacacional, Venta, etc.)
            </p>
          </div>
        )}
      </div>

      {/* Modal para agregar inquilino */}
      {showModal && (
        <ModalAgregarInquilino
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAgregar={handleAgregarInquilinoModal}
        />
      )}
    </>
  );
}