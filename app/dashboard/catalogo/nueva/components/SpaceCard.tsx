/**
 * SpaceCard.tsx
 * Plan C - Tarjeta individual de espacio con configuración completa
 * 
 * Funcionalidades principales:
 * - Tarjeta editable para cada espacio de la propiedad
 * - Configuración específica según tipo de espacio
 * - Sistema de equipamiento con opciones predefinidas y personalizadas
 * - Gestión de camas para habitaciones (tipos, cantidad, capacidad)
 * - Vinculación de baños privados a habitaciones
 * - Configuración especial para albercas (tamaño, tratamiento)
 * - Duplicación y eliminación de espacios
 * - Notas adicionales por espacio
 * 
 * Características especiales por tipo:
 * - Habitaciones: Camas, ocupantes, baño privado opcional
 * - Albercas: Tamaño en m³, tipo de tratamiento (Cloro/Sal)
 * - Todos: Equipamiento específico según tipo de espacio
 */

'use client';

import React from 'react';
import { Space, SpaceType } from '@/types/property';

interface SpaceCardProps {
  space: Space;
  allSpaces: Space[];
  onUpdate: (id: string, updates: Partial<Space>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (space: Space) => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({
  space,
  allSpaces,
  onUpdate,
  onDelete,
  onDuplicate
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(space.id, { name: e.target.value });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Nombre o ID
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={space.name}
              onChange={handleNameChange}
              placeholder="Puedes renombrarlo"
              className="flex-1 px-3 py-2 border-2 border-ras-azul/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul/30 font-medium"
            />
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-ras-azul/10 to-ras-turquesa/10 border border-ras-azul/30 rounded-lg text-xs font-bold text-ras-azul whitespace-nowrap">
              {space.type}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-6">
          <button
            onClick={() => onDuplicate(space)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 border border-sky-300 text-sky-700 rounded-lg text-xs font-semibold hover:bg-sky-100 transition-colors"
            title="Duplicar espacio"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicar
          </button>

          <button
            onClick={() => onDelete(space.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
            title="Eliminar espacio"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SpaceDetails space={space} allSpaces={allSpaces} onUpdate={onUpdate} />
      </div>
    </div>
  );
};

/**
 * Componente de detalles específicos según el tipo de espacio
 */
const SpaceDetails: React.FC<{
  space: Space;
  allSpaces: Space[];
  onUpdate: (id: string, updates: Partial<Space>) => void;
}> = ({ space, allSpaces, onUpdate }) => {
  const [nuevoEquipamiento, setNuevoEquipamiento] = React.useState('');
  const [mostrarInputOtro, setMostrarInputOtro] = React.useState('');

  /**
   * Retorna opciones de equipamiento según tipo de espacio
   */
  const getEquipamientoOptions = (spaceType: string) => {
    const common = ['Accesible con silla de ruedas'];
    
    switch(spaceType) {
      case 'Habitación':
      case 'Lock-off':
      case 'Cuarto de servicio':
        return [...common, 'Aire acondicionado', 'Ventilador de techo', 'Persianas', 'Cortinas', 'Lámpara de noche', 'Closet', 'Vestidor', 'Balcón', 'Sillón', 'Terraza privada'];
      
      case 'Baño completo':
      case 'Medio baño':
        return [...common, 'Tina', 'Regadera', 'Regadera extensible', 'Doble lavabo', 'Bidet', 'Tocador', 'Espejo con luz'];
      
      case 'Cocina':
        return [...common, 'Estufa', 'Horno', 'Microondas', 'Refrigerador', 'Lavavajillas', 'Cafetera', 'Licuadora', 'Barra desayunador', 'Isla'];
      
      case 'Sala':
      case 'Comedor':
        return [...common, 'Aire acondicionado', 'Ventilador de techo', 'Smart TV', 'Sillón', 'Sofá cama', 'Mesa comedor', 'Balcón', 'Terraza'];
      
      case 'Terraza':
      case 'Rooftop':
      case 'Patio':
      case 'Jardín':
        return [...common, 'Muebles de exterior', 'Asador', 'Fogata', 'Jacuzzi', 'Pérgola', 'Sombrilla', 'Iluminación exterior'];
      
      case 'Alberca':
        return ['Accesible con silla de ruedas', 'Climatizada', 'Infinity pool', 'Regaderas exteriores', 'Camastros', 'Jacuzzi integrado', 'Bar de alberca'];
      
      case 'Cuarto de lavado':
        return [...common, 'Lavadora', 'Secadora', 'Tendedero', 'Plancha', 'Mesa para planchar', 'Tarja'];
      
      case 'Bodega':
      case 'Estacionamiento':
        return [...common, 'Iluminación', 'Repisas', 'Portón automático', 'Cerrado', 'Techado'];
      
      case 'Gimnasio':
        return [...common, 'Aire acondicionado', 'Espejos', 'Pesas', 'Caminadora', 'Bicicleta fija', 'Yoga mat', 'Sonido'];
      
      case 'Bar':
      case 'Cine / Tv Room':
      case 'Oficina':
        return [...common, 'Aire acondicionado', 'Smart TV', 'Sistema de sonido', 'Iluminación LED', 'Escritorio', 'Sillones'];
      
      default:
        return [...common, 'Aire acondicionado', 'Ventilador', 'Iluminación'];
    }
  };

  const tiposCama = ['Individual', 'Matrimonial', 'Queen', 'King', 'Sofá cama'];
  const equipamientoOptions = getEquipamientoOptions(space.type);

  const updateDetail = (key: string, value: any) => {
    onUpdate(space.id, {
      details: { ...space.details, [key]: value }
    });
  };

  const toggleEquipamiento = (item: string) => {
    const current = space.details.equipamiento || [];
    const updated = current.includes(item)
      ? current.filter((i: string) => i !== item)
      : [...current, item];
    updateDetail('equipamiento', updated);
  };

  const agregarEquipamientoPersonalizado = () => {
    if (!nuevoEquipamiento.trim()) return;
    
    const current = space.details.equipamiento || [];
    if (!current.includes(nuevoEquipamiento.trim())) {
      updateDetail('equipamiento', [...current, nuevoEquipamiento.trim()]);
    }
    
    setNuevoEquipamiento('');
    setMostrarInputOtro('');
  };

  const eliminarEquipamientoPersonalizado = (item: string) => {
    const current = space.details.equipamiento || [];
    updateDetail('equipamiento', current.filter((i: string) => i !== item));
  };

  const equipamientoPersonalizado = (space.details.equipamiento || []).filter(
    (item: string) => !equipamientoOptions.includes(item)
  );

  const agregarCama = (tipo: string) => {
    const camas = space.details.camas || [];
    updateDetail('camas', [...camas, { tipo, id: Date.now() }]);
  };

  const eliminarCama = (camaId: number) => {
    const camas = space.details.camas || [];
    updateDetail('camas', camas.filter((c: any) => c.id !== camaId));
  };

  const isHabitacion = space.type === 'Habitación' || space.type === 'Lock-off' || space.type === 'Cuarto de servicio';
  const isAlberca = space.type === 'Alberca';
  
  return (
    <div className="space-y-4">
      {/* SECCIÓN ESPECIAL PARA HABITACIONES */}
      {isHabitacion && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-4">
          <h4 className="font-bold text-blue-900 text-sm mb-3">
            Configuración de Habitación
          </h4>

          {/* Lista de camas */}
          {(space.details.camas || []).length > 0 && (
            <div className="space-y-2 mb-3">
              {(space.details.camas || []).map((cama: any) => (
                <div 
                  key={cama.id}
                  className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-800">{cama.tipo}</span>
                  <button
                    type="button"
                    onClick={() => eliminarCama(cama.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar cama */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Agregar cama
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm mb-3"
              onChange={(e) => {
                if (e.target.value) {
                  agregarCama(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Seleccionar tipo...</option>
              {tiposCama.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Ocupantes y Baño privado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cantidad de ocupantes
              </label>
              <input
                type="number"
                min="1"
                value={space.details.capacidadPersonas || ''}
                onChange={(e) => updateDetail('capacidadPersonas', parseInt(e.target.value) || '')}
                placeholder="Ej: 2"
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Baño privado
              </label>
              <label className="flex items-center gap-3 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-ras-azul transition-all h-[42px]">
                <input
                  type="checkbox"
                  checked={space.details.banoPrivado || false}
                  onChange={(e) => {
                    updateDetail('banoPrivado', e.target.checked);
                    if (!e.target.checked) {
                      updateDetail('banoPrivadoId', null);
                    }
                  }}
                  className="w-5 h-5 text-ras-azul focus:ring-ras-azul rounded"
                />
                <span className="text-sm font-medium text-gray-700">Tiene baño propio</span>
              </label>
            </div>
          </div>

          {/* Selector de baño privado */}
          {space.details.banoPrivado && (
            <div className="space-y-3">
              {(() => {
                const banosDisponibles = allSpaces.filter(s => 
                  s.type === 'Baño completo' || s.type === 'Medio baño'
                );

                if (banosDisponibles.length === 0) {
                  return (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                        No hay baños agregados aún. Primero agrega un baño completo o medio baño.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ¿Cuál baño es privado de esta habitación?
                      </label>
                      <select
                        value={space.details.banoPrivadoId || ''}
                        onChange={(e) => updateDetail('banoPrivadoId', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm bg-white"
                      >
                        <option value="">Selecciona un baño...</option>
                        {banosDisponibles.map(bano => (
                          <option key={bano.id} value={bano.id}>
                            {bano.name} ({bano.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {space.details.banoPrivadoId && (() => {
                      const banoSeleccionado = banosDisponibles.find(
                        b => b.id === space.details.banoPrivadoId
                      );

                      if (!banoSeleccionado) return null;

                      const equipamiento = banoSeleccionado.details.equipamiento || [];
                      
                      if (equipamiento.length === 0) {
                        return (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-xs text-gray-600">
                              Este baño no tiene equipamiento configurado aún.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-semibold text-blue-900 mb-2">
                            Características del baño:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {equipamiento.map((item: string) => (
                              <span
                                key={item}
                                className="inline-flex items-center px-2 py-1 bg-white border border-blue-300 rounded text-xs font-medium text-blue-800"
                              >
                                ✓ {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN ESPECIAL PARA ALBERCA */}
      {isAlberca && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tamaño (m³)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={space.details.tamanoAlberca || ''}
                onChange={(e) => updateDetail('tamanoAlberca', parseFloat(e.target.value) || '')}
                placeholder="Ej: 50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de tratamiento
              </label>
              <select
                value={space.details.tipoTratamientoAlberca || ''}
                onChange={(e) => updateDetail('tipoTratamientoAlberca', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm"
              >
                <option value="">Seleccionar...</option>
                <option value="Cloro">Cloro</option>
                <option value="Sal">Sal</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPAMIENTO ESPECÍFICO */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Equipamiento y características
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {equipamientoOptions.map(item => (
            <label 
              key={item} 
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all
                ${(space.details.equipamiento || []).includes(item)
                  ? 'border-ras-azul bg-ras-azul/5 text-ras-azul'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
              `}
            >
              <input
                type="checkbox"
                className="rounded text-ras-azul focus:ring-ras-azul"
                checked={(space.details.equipamiento || []).includes(item)}
                onChange={() => toggleEquipamiento(item)}
              />
              <span className="text-xs font-medium">{item}</span>
            </label>
          ))}

          <button
            type="button"
            onClick={() => setMostrarInputOtro(mostrarInputOtro ? '' : 'show')}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-ras-azul hover:bg-ras-azul/5 text-gray-600 hover:text-ras-azul transition-all"
          >
            <span className="text-xs font-medium">+ Otro</span>
          </button>
        </div>

        {mostrarInputOtro && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={nuevoEquipamiento}
              onChange={(e) => setNuevoEquipamiento(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarEquipamientoPersonalizado();
                }
              }}
              placeholder="Ej: Cafetera, Microondas..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={agregarEquipamientoPersonalizado}
              className="px-4 py-2 bg-ras-azul text-white rounded-lg hover:bg-opacity-90 transition-all text-sm font-semibold"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarInputOtro('');
                setNuevoEquipamiento('');
              }}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {equipamientoPersonalizado.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {equipamientoPersonalizado.map((item: string) => (
              <div
                key={item}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-ras-azul bg-ras-azul/5 text-ras-azul"
              >
                <span className="text-xs font-medium flex-1">{item}</span>
                <button
                  type="button"
                  onClick={() => eliminarEquipamientoPersonalizado(item)}
                  className="text-ras-azul hover:text-red-600 transition-colors font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas adicionales */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notas adicionales
        </label>
        <textarea
          value={space.details.notas || ''}
          onChange={(e) => updateDetail('notas', e.target.value)}
          placeholder="Agrega cualquier información adicional sobre este espacio..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm"
          rows={3}
        />
      </div>
    </div>
  );
};

export default SpaceCard;
