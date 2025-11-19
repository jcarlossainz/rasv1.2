'use client';

import React, { useState, useEffect } from 'react';
import { PropertyFormData } from '@/types/property';
import Input from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface Step1Props {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
}

interface Profile {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

const TIPOS_PROPIEDAD = [
  'Departamento',
  'Casa',
  'Villa',
  'Condominio',
  'Penthouse',
  'Loft',
  'Estudio',
  'Oficina',
  'Local comercial',
  'Bodega'
];

const ESTADOS_PROPIEDAD = [
  'Renta largo plazo',
  'Renta vacacional',
  'Venta',
  'Mantenimiento',
  'Suspendido',
  'Propietario'
];

const OPCIONES_MOBILIARIO = [
  'Amueblada',
  'Semi-amueblada',
  'Sin amueblar'
];

// Modal simple para agregar correo
interface ModalAgregarCorreoProps {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (email: string) => void;
  tipo: 'propietario' | 'supervisor';
}

function ModalAgregarCorreo({ isOpen, onClose, onAgregar, tipo }: ModalAgregarCorreoProps) {
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
      setError(err.message || 'Error al agregar correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-8">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mb-4 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Agregar {tipo}
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

export default function Step1_DatosGenerales({ data, onUpdate }: Step1Props) {
  const [propietarios, setPropietarios] = useState<Profile[]>([]);
  const [supervisores, setSupervisores] = useState<Profile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [tipoModal, setTipoModal] = useState<'propietario' | 'supervisor' | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener empresa_id del usuario actual
      const { data: miProfile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!miProfile?.empresa_id) {
        logger.warn('Usuario sin empresa_id asignada');
        return;
      }

      // Cargar propietarios de mi empresa
      await cargarPropietarios(miProfile.empresa_id);

      // Cargar supervisores de mi empresa
      await cargarSupervisores(miProfile.empresa_id);

    } catch (error) {
      logger.error('Error al cargar datos:', error);
    }
  };

  const cargarPropietarios = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, rol')
        .eq('empresa_id', empresaId)
        .eq('rol', 'propietario')
        .order('nombre');

      if (error) throw error;

      setPropietarios(data || []);
      logger.log('Propietarios cargados:', data?.length || 0);
    } catch (error) {
      logger.error('Error al cargar propietarios:', error);
    }
  };

  const cargarSupervisores = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, rol')
        .eq('empresa_id', empresaId)
        .in('rol', ['admin', 'supervisor'])
        .order('nombre');

      if (error) throw error;

      setSupervisores(data || []);
      logger.log('Supervisores cargados:', data?.length || 0);
    } catch (error) {
      logger.error('Error al cargar supervisores:', error);
    }
  };

  const handleAbrirModal = (tipo: 'propietario' | 'supervisor') => {
    setTipoModal(tipo);
    setShowModal(true);
  };

  const handleAgregarCorreo = async (email: string) => {
    // Agregar el correo temporalmente a la lista
    const nuevoItem: Profile = {
      id: `temp_${Date.now()}`, // ID temporal
      nombre: email.split('@')[0],
      email: email,
      rol: tipoModal || 'propietario'
    };

    if (tipoModal === 'propietario') {
      setPropietarios([...propietarios, nuevoItem]);
      // Agregarlo a la selección actual usando emails
      const currentEmails = Array.isArray(data.propietarios_email) 
        ? data.propietarios_email 
        : [];
      handleChange('propietarios_email', [...currentEmails, email]);
    } else if (tipoModal === 'supervisor') {
      setSupervisores([...supervisores, nuevoItem]);
      // Agregarlo a la selección actual usando emails
      const currentEmails = Array.isArray(data.supervisores_email) 
        ? data.supervisores_email 
        : [];
      handleChange('supervisores_email', [...currentEmails, email]);
    }

    logger.log(`Correo agregado: ${email}`);
  };

  const handleChange = (field: keyof PropertyFormData, value: any) => {
    onUpdate({ [field]: value });
  };

  const toggleEstado = (estado: string) => {
    const newEstados = data.estados.includes(estado)
      ? data.estados.filter(e => e !== estado)
      : [...data.estados, estado];
    handleChange('estados', newEstados);
  };

  const getSafeNumberValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object' && 'valor' in value) {
      return value.valor?.toString() || '';
    }
    return '';
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
        {/* SECCIÓN: BÁSICOS */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 font-poppins flex items-center gap-2">
              <svg className="w-6 h-6 text-ras-azul" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Básicos</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre de la propiedad */}
            <div className="md:col-span-2">
              <Input
                id="nombre_propiedad"
                label="Nombre de la propiedad"
                type="text"
                value={data.nombre_propiedad}
                onChange={(e) => handleChange('nombre_propiedad', e.target.value)}
                placeholder="Ej: Departamento Laguna 305"
                required
              />
            </div>

            {/* Tipo de propiedad */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de propiedad
              </label>
              <select
                value={data.tipo_propiedad}
                onChange={(e) => handleChange('tipo_propiedad', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto"
              >
                {TIPOS_PROPIEDAD.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            {/* Mobiliario */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mobiliario
              </label>
              <select
                value={data.mobiliario}
                onChange={(e) => handleChange('mobiliario', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto"
              >
                {OPCIONES_MOBILIARIO.map(opcion => (
                  <option key={opcion} value={opcion}>{opcion}</option>
                ))}
              </select>
            </div>

            {/* Tamaño del terreno */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tamaño del terreno
              </label>
              <div className="flex gap-2">
                <Input
                  id="tamano_terreno"
                  type="number"
                  value={getSafeNumberValue(data.tamano_terreno)}
                  onChange={(e) => handleChange('tamano_terreno', e.target.value)}
                  placeholder="Ej: 150"
                  className="flex-1"
                />
                <select
                  value={data.tamano_terreno_unit}
                  onChange={(e) => handleChange('tamano_terreno_unit', e.target.value)}
                  className="w-20 px-2 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto"
                >
                  <option value="m²">m²</option>
                  <option value="ft²">ft²</option>
                </select>
              </div>
            </div>

            {/* Tamaño de construcción */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tamaño de construcción
              </label>
              <div className="flex gap-2">
                <Input
                  id="tamano_construccion"
                  type="number"
                  value={getSafeNumberValue(data.tamano_construccion)}
                  onChange={(e) => handleChange('tamano_construccion', e.target.value)}
                  placeholder="Ej: 120"
                  className="flex-1"
                />
                <select
                  value={data.tamano_construccion_unit}
                  onChange={(e) => handleChange('tamano_construccion_unit', e.target.value)}
                  className="w-20 px-2 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto"
                >
                  <option value="m²">m²</option>
                  <option value="ft²">ft²</option>
                </select>
              </div>
            </div>

            {/* Estado actual */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Estado actual
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ESTADOS_PROPIEDAD.map(estado => (
                  <label
                    key={estado}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all
                      ${data.estados.includes(estado)
                        ? 'border-ras-azul bg-ras-azul/5 text-ras-azul'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={data.estados.includes(estado)}
                      onChange={() => toggleEstado(estado)}
                      className="rounded text-ras-azul focus:ring-ras-azul"
                    />
                    <span className="text-sm font-medium">{estado}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: Asignaciones */}
        <div className="border-t-2 border-gray-100 pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📋 Asignaciones
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Propietario */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Propietario(s)
              </label>
              <div className="flex gap-2">
                <div className="flex-1 border-2 border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-ras-azul focus-within:border-transparent">
                  <div className="max-h-40 overflow-y-auto p-2">
                    {propietarios.length === 0 ? (
                      <p className="text-gray-400 text-sm py-2 px-2">No hay propietarios disponibles</p>
                    ) : (
                      propietarios.map((prop) => (
                        <label
                          key={prop.email}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Array.isArray(data.propietarios_email) 
                              ? data.propietarios_email.includes(prop.email)
                              : false
                            }
                            onChange={(e) => {
                              const currentEmails = Array.isArray(data.propietarios_email) 
                                ? data.propietarios_email 
                                : [];
                              
                              const newEmails = e.target.checked
                                ? [...currentEmails, prop.email]
                                : currentEmails.filter(email => email !== prop.email);
                              
                              handleChange('propietarios_email', newEmails);
                            }}
                            className="rounded text-ras-azul focus:ring-ras-azul"
                          />
                          <span className="text-sm">{prop.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAbrirModal('propietario')}
                  className="px-4 py-2.5 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90 transition-colors font-semibold"
                  title="Agregar propietario"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {propietarios.length === 0 
                  ? 'No hay propietarios. Agrega uno nuevo.' 
                  : `${Array.isArray(data.propietarios_email) ? data.propietarios_email.length : 0} seleccionado(s) de ${propietarios.length}`
                }
              </p>
            </div>

            {/* Supervisor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Supervisor(es)
              </label>
              <div className="flex gap-2">
                <div className="flex-1 border-2 border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-ras-azul focus-within:border-transparent">
                  <div className="max-h-40 overflow-y-auto p-2">
                    {supervisores.length === 0 ? (
                      <p className="text-gray-400 text-sm py-2 px-2">No hay supervisores disponibles</p>
                    ) : (
                      supervisores.map((sup) => (
                        <label
                          key={sup.email}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Array.isArray(data.supervisores_email) 
                              ? data.supervisores_email.includes(sup.email)
                              : false
                            }
                            onChange={(e) => {
                              const currentEmails = Array.isArray(data.supervisores_email) 
                                ? data.supervisores_email 
                                : [];
                              
                              const newEmails = e.target.checked
                                ? [...currentEmails, sup.email]
                                : currentEmails.filter(email => email !== sup.email);
                              
                              handleChange('supervisores_email', newEmails);
                            }}
                            className="rounded text-ras-azul focus:ring-ras-azul"
                          />
                          <span className="text-sm">{sup.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAbrirModal('supervisor')}
                  className="px-4 py-2.5 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90 transition-colors font-semibold"
                  title="Agregar supervisor"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {supervisores.length === 0 
                  ? 'No hay supervisores. Agrega uno nuevo.' 
                  : `${Array.isArray(data.supervisores_email) ? data.supervisores_email.length : 0} seleccionado(s) de ${supervisores.length}`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal simple para agregar correo */}
      {showModal && tipoModal && (
        <ModalAgregarCorreo
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setTipoModal(null);
          }}
          onAgregar={handleAgregarCorreo}
          tipo={tipoModal}
        />
      )}
    </>
  );
}