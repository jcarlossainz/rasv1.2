/**
 * SpaceCategories.tsx
 * Plan C - Selector de tipos de espacios organizados por categorías
 * 
 * Funcionalidades:
 * - Organización en 5 categorías principales de espacios
 * - Grid responsive que se adapta a diferentes pantallas
 * - Opción "Otro" para tipos de espacios personalizados
 * - Validación y limpieza de inputs personalizados
 * - Iconos SVG inline para cada categoría
 * 
 * Categorías disponibles:
 * 1. Habitaciones - Habitación, Lock-off, Cuarto de servicio
 * 2. Baños - Baño completo, Medio baño
 * 3. Áreas Comunes - Cocina, Sala, Comedor, Cuarto de lavado
 * 4. Exteriores - Terraza, Rooftop, Patio, Jardín, Alberca
 * 5. Adicionales - Bodega, Estacionamiento, Gimnasio, Bar, Cine, Oficina, Otro
 */

'use client';

import React, { useState } from 'react';
import { SpaceType } from '@/types/property';

interface SpaceCategoriesProps {
  onSelectType: (type: SpaceType) => void;
}

/**
 * Definición de categorías con sus espacios y iconos SVG
 */
const CATEGORIES = [
  {
    id: 'habitaciones',
    name: 'Habitaciones',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    ),
    spaces: ['Habitación', 'Lock-off', 'Cuarto de servicio'] as SpaceType[]
  },
  {
    id: 'banos',
    name: 'Baños',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M8 16H6a2 2 0 01-2-2V6c0-1.1.9-2 2-2h2m0 12h10a2 2 0 002-2V6a2 2 0 00-2-2H8m0 12v4m10-16v16"/>
      </svg>
    ),
    spaces: ['Baño completo', 'Medio baño'] as SpaceType[]
  },
  {
    id: 'areas-comunes',
    name: 'Áreas Comunes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    ),
    spaces: ['Cocina', 'Sala', 'Comedor', 'Cuarto de lavado'] as SpaceType[]
  },
  {
    id: 'exteriores',
    name: 'Exteriores',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    spaces: ['Terraza', 'Rooftop', 'Patio', 'Jardín', 'Alberca'] as SpaceType[]
  },
  {
    id: 'adicionales',
    name: 'Adicionales',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    ),
    spaces: ['Bodega', 'Estacionamiento', 'Gimnasio', 'Bar', 'Cine / Tv Room', 'Oficina', 'Otro'] as SpaceType[]
  }
];

const SpaceCategories: React.FC<SpaceCategoriesProps> = ({ onSelectType }) => {
  // Estado para mostrar/ocultar input personalizado
  const [mostrarInputOtro, setMostrarInputOtro] = useState(false);
  const [nombreOtro, setNombreOtro] = useState('');

  /**
   * Maneja la selección de un tipo de espacio
   * Si es "Otro", muestra el input personalizado
   * @param spaceType - El tipo de espacio seleccionado
   */
  const handleSelectType = (spaceType: SpaceType) => {
    if (spaceType === 'Otro') {
      setMostrarInputOtro(true);
    } else {
      onSelectType(spaceType);
    }
  };

  /**
   * Agrega un tipo de espacio personalizado
   * Valida que no esté vacío antes de agregarlo
   */
  const handleAgregarOtro = () => {
    if (nombreOtro.trim()) {
      onSelectType(nombreOtro.trim() as SpaceType);
      setNombreOtro('');
      setMostrarInputOtro(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {CATEGORIES.map((category) => (
        <div
          key={category.id}
          className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all"
        >
          {/* Header de la categoría */}
          <div className="p-4 bg-gradient-to-br from-ras-azul/5 to-ras-turquesa/5 border-b border-gray-200 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="text-ras-azul">
                {category.icon}
              </div>
              <h4 className="font-bold text-gray-900 text-sm">
                {category.name}
              </h4>
            </div>
          </div>

          {/* Lista de tipos de espacios de la categoría */}
          <div className="p-3 space-y-2">
            {category.spaces.map((spaceType) => (
              <button
                key={spaceType}
                type="button"
                onClick={() => handleSelectType(spaceType)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  spaceType === 'Otro'
                    ? 'border-2 border-dashed border-gray-300 hover:border-ras-azul hover:bg-ras-azul/5 text-gray-600 hover:text-ras-azul'
                    : 'bg-gray-50 hover:bg-ras-azul text-gray-700 hover:text-white border border-transparent hover:border-ras-azul'
                }`}
              >
                {spaceType === 'Otro' ? '+ Otro' : spaceType}
              </button>
            ))}
          </div>

          {/* Input para tipo personalizado - Solo en categoría Adicionales */}
          {category.id === 'adicionales' && mostrarInputOtro && (
            <div className="px-3 pb-3 pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Especifica el tipo
              </label>
              <div className="space-y-2">
                {/* Input de texto */}
                <input
                  type="text"
                  value={nombreOtro}
                  onChange={(e) => setNombreOtro(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarOtro();
                    }
                  }}
                  placeholder="Ej: Estudio, Biblioteca..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul text-sm"
                  autoFocus
                />
                
                {/* Botones de acción */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAgregarOtro}
                    className="flex-1 px-3 py-1.5 bg-ras-azul text-white rounded-lg hover:bg-opacity-90 transition-all text-xs font-semibold"
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarInputOtro(false);
                      setNombreOtro('');
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SpaceCategories;
