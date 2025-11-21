'use client';

import React, { useState, useEffect } from 'react';
import { PropertyFormData } from '@/types/property';
import Input from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import ModalAgregarPersona from '@/components/ModalAgregarPersona';

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

interface PersonaAsignada {
  email: string;
  rol: 'propietario' | 'supervisor';
}

export default function Step1_DatosGenerales({ data, onUpdate }: Step1Props) {
  const { user } = useAuth();
  const [personasAsignadas, setPersonasAsignadas] = useState<PersonaAsignada[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Sincronizar personasAsignadas con data al iniciar y cuando data cambia
  useEffect(() => {
    const propietarios = Array.isArray(data.propietarios_email)
      ? data.propietarios_email.map(email => ({ email, rol: 'propietario' as const }))
      : [];
    const supervisores = Array.isArray(data.supervisores_email)
      ? data.supervisores_email.map(email => ({ email, rol: 'supervisor' as const }))
      : [];
    setPersonasAsignadas([...propietarios, ...supervisores]);
  }, [data.propietarios_email, data.supervisores_email]);

  const handleAgregarPersona = async (email: string, rol: 'propietario' | 'supervisor' | 'promotor') => {
    // Verificar que no esté duplicado
    if (personasAsignadas.some(p => p.email === email)) {
      throw new Error('Esta persona ya fue agregada');
    }

    // En wizard solo manejamos propietario y supervisor (promotor no aplica aquí)
    if (rol === 'promotor') {
      throw new Error('No se puede asignar rol de Promotor en el wizard');
    }

    // Agregar a la lista
    const nuevasPersonas = [...personasAsignadas, { email, rol }];
    setPersonasAsignadas(nuevasPersonas);

    // Actualizar el data según el rol
    if (rol === 'propietario') {
      const propietariosEmails = nuevasPersonas
        .filter(p => p.rol === 'propietario')
        .map(p => p.email);
      handleChange('propietarios_email', propietariosEmails);
    } else {
      const supervisoresEmails = nuevasPersonas
        .filter(p => p.rol === 'supervisor')
        .map(p => p.email);
      handleChange('supervisores_email', supervisoresEmails);
    }

    logger.log(`Persona agregada: ${email} como ${rol}`);
  };

  const handleEliminarPersona = (email: string) => {
    const personaEliminar = personasAsignadas.find(p => p.email === email);
    if (!personaEliminar) return;

    const nuevasPersonas = personasAsignadas.filter(p => p.email !== email);
    setPersonasAsignadas(nuevasPersonas);

    // Actualizar el data según el rol
    if (personaEliminar.rol === 'propietario') {
      const propietariosEmails = nuevasPersonas
        .filter(p => p.rol === 'propietario')
        .map(p => p.email);
      handleChange('propietarios_email', propietariosEmails);
    } else {
      const supervisoresEmails = nuevasPersonas
        .filter(p => p.rol === 'supervisor')
        .map(p => p.email);
      handleChange('supervisores_email', supervisoresEmails);
    }
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
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-ras-azul text-white rounded-lg hover:bg-ras-azul/90 transition-colors font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Persona
            </button>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              👥 Asignaciones
            </h3>
          </div>

          {/* Listado de personas asignadas */}
          {personasAsignadas.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="text-sm">No hay personas asignadas aún</p>
              <p className="text-xs mt-1">Haz click en "Agregar Persona" para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {personasAsignadas.map((persona, index) => (
                <div
                  key={`${persona.email}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-ras-azul transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-ras-azul to-ras-turquesa rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {persona.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{persona.email}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          persona.rol === 'propietario'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {persona.rol === 'propietario' ? '🏠 Propietario' : '👤 Supervisor'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEliminarPersona(persona.email)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar persona"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            💡 Total: {personasAsignadas.length} persona(s) asignada(s)
            ({personasAsignadas.filter(p => p.rol === 'propietario').length} propietario(s), {personasAsignadas.filter(p => p.rol === 'supervisor').length} supervisor(es))
          </p>
        </div>
      </div>

      {/* Modal para agregar persona con rol */}
      {showModal && (
        <ModalAgregarPersona
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAgregar={handleAgregarPersona}
        />
      )}
    </>
  );
}