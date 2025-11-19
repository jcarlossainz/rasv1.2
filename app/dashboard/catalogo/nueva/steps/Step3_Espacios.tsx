'use client';

import React, { useState } from 'react';
import { PropertyFormData, Space } from '@/types/property';
import Button from '@/components/ui/button';
import SpaceCard from '../components/SpaceCard';
import SpaceCategories from '../components/SpaceCategories';
import SpaceTemplates from '../components/SpaceTemplates';

interface Step3Props {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
}

export default function Step3_Espacios({ data, onUpdate }: Step3Props) {
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const espacios = data.espacios || [];

  // Agregar espacio individual
  const agregarEspacio = (tipo: string) => {
    const nuevoEspacio: Space = {
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${tipo} ${espacios.filter(s => s.type === tipo).length + 1}`,
      type: tipo,
      details: {
        equipamiento: [],
        camas: [],
        tieneBanoPrivado: false,
        banoPrivadoId: null,
        notas: ''
      }
    };

    onUpdate({ espacios: [...espacios, nuevoEspacio] });
  };

  // Aplicar template
  const aplicarTemplate = (templateEspacios: Space[]) => {
    // Generar IDs únicos para cada espacio del template
    const espaciosConIds = templateEspacios.map(espacio => ({
      ...espacio,
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    onUpdate({ espacios: espaciosConIds });
    setMostrarTemplates(false);
  };

  // Actualizar espacio
  const actualizarEspacio = (id: string, updates: Partial<Space>) => {
    const nuevosEspacios = espacios.map(espacio =>
      espacio.id === id ? { ...espacio, ...updates } : espacio
    );
    onUpdate({ espacios: nuevosEspacios });
  };

  // Eliminar espacio
  const eliminarEspacio = (id: string) => {
    if (confirm('¿Eliminar este espacio?')) {
      const nuevosEspacios = espacios.filter(espacio => espacio.id !== id);
      onUpdate({ espacios: nuevosEspacios });
    }
  };

  // Duplicar espacio
  const duplicarEspacio = (espacio: Space) => {
    const espacioDuplicado: Space = {
      ...espacio,
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${espacio.name} (copia)`,
      details: {
        ...espacio.details,
        // Si tenía baño privado, resetear porque no puede ser el mismo
        tieneBanoPrivado: false,
        banoPrivadoId: null
      }
    };

    onUpdate({ espacios: [...espacios, espacioDuplicado] });
  };

  // Resumen de espacios
  const conteoEspacios = espacios.reduce((acc, espacio) => {
    acc[espacio.type] = (acc[espacio.type] || 0) + 1;
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
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Espacios de la Propiedad
            </h2>

            {/* Resumen */}
            {Object.keys(conteoEspacios).length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(conteoEspacios).map(([tipo, cantidad]) => (
                  <span
                    key={tipo}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-ras-azul/10 border border-ras-azul/30 rounded-full text-xs font-semibold text-ras-azul"
                  >
                    {cantidad} {tipo}{cantidad > 1 ? 's' : ''}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                Define todos los espacios: habitaciones, baños, áreas comunes y más
              </p>
            )}
          </div>

          {/* Botón de templates */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setMostrarTemplates(!mostrarTemplates)}
            className="whitespace-nowrap flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            {mostrarTemplates ? 'Cerrar' : 'Templates'}
          </Button>
        </div>

        {/* Templates */}
        {mostrarTemplates && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <SpaceTemplates
              onAplicarTemplate={aplicarTemplate}
              onCerrar={() => setMostrarTemplates(false)}
            />
          </div>
        )}
      </div>

      {/* Agregar espacios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          Agregar Espacios
        </h3>
        <SpaceCategories onSelectType={agregarEspacio} />
      </div>

      {/* Lista de espacios */}
      {espacios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Espacios Agregados ({espacios.length})
            </h3>
          </div>

          <div className="space-y-4">
            {espacios.map(espacio => (
              <SpaceCard
                key={espacio.id}
                space={espacio}
                allSpaces={espacios}
                onUpdate={actualizarEspacio}
                onDelete={eliminarEspacio}
                onDuplicate={duplicarEspacio}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
