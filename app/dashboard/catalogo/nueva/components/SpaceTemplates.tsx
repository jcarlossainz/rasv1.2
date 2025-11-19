/**
 * SpaceTemplates.tsx
 * Plan C - Selector de plantillas predefinidas de espacios por tipo de propiedad
 * 
 * Funcionalidades:
 * - Plantillas listas para 10 tipos de propiedades diferentes
 * - Cada plantilla incluye espacios preconfigura dos con equipamiento típico
 * - Aplicación instantánea de toda la configuración de espacios
 * - Grid responsive que se adapta a diferentes tamaños de pantalla
 * - Generación automática de IDs únicos para cada espacio
 * 
 * Plantillas disponibles:
 * 1. Departamento - 2 hab, 1 baño, cocina, sala
 * 2. Casa - 3 hab, 2.5 baños, jardín
 * 3. Villa - 4 hab, 4.5 baños, alberca
 * 4. Condominio - 3 hab, 2.5 baños, jardín
 * 5. Penthouse - 3 hab, 2.5 baños, rooftop
 * 6. Loft - 1 hab, 1 baño, espacio abierto
 * 7. Estudio - Espacio integrado todo en uno
 * 8. Oficina - Espacio comercial básico
 * 9. Local Comercial - Local adaptable
 * 10. Bodega - Almacenamiento con oficina
 */

'use client';

import React from 'react';
import { Space } from '@/types/property';

/**
 * Interfaz para definir una plantilla de propiedad
 */
interface PropertyTemplate {
  id: string;
  name: string;
  description: string;
  spaces: Omit<Space, 'id'>[];
}

interface SpaceTemplatesProps {
  onAplicarTemplate: (espacios: Space[]) => void;
  onCerrar: () => void;
}

/**
 * Catálogo de plantillas predefinidas por tipo de propiedad
 * Cada plantilla incluye espacios con equipamiento típico y configuración de camas
 */
const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  {
    id: 'departamento',
    name: 'Departamento',
    description: '2 hab, 1 baño, cocina, sala',
    spaces: [
      { name: 'Habitación 1', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Queen', id: Date.now() + 1 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 2', type: 'Habitación', details: { equipamiento: ['Closet'], camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Baño', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Cocina', type: 'Cocina', details: { equipamiento: ['Estufa', 'Refrigerador'], camas: [], notas: '' }},
      { name: 'Sala', type: 'Sala', details: { equipamiento: ['Smart TV'], camas: [], notas: '' }},
      { name: 'Comedor', type: 'Comedor', details: { equipamiento: ['Mesa comedor'], camas: [], notas: '' }},
      { name: 'Cuarto de Lavado', type: 'Cuarto de lavado', details: { equipamiento: ['Lavadora'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'casa',
    name: 'Casa',
    description: '3 hab, 2.5 baños, jardín',
    spaces: [
      { name: 'Habitación 1', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor'], camas: [{ tipo: 'King', id: Date.now() + 1 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 2', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 3', type: 'Habitación', details: { equipamiento: ['Closet'], camas: [{ tipo: 'Individual', id: Date.now() + 3 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Baño Principal', type: 'Baño completo', details: { equipamiento: ['Regadera', 'Tocador'], camas: [], notas: '' }},
      { name: 'Baño Secundario', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Medio Baño', type: 'Medio baño', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Cocina', type: 'Cocina', details: { equipamiento: ['Estufa', 'Horno', 'Refrigerador'], camas: [], notas: '' }},
      { name: 'Patio', type: 'Patio', details: { equipamiento: ['Muebles de exterior'], camas: [], notas: '' }},
      { name: 'Jardín', type: 'Jardín', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Cuarto de Lavado', type: 'Cuarto de lavado', details: { equipamiento: ['Lavadora', 'Secadora'], camas: [], notas: '' }},
      { name: 'Estacionamiento', type: 'Estacionamiento', details: { equipamiento: ['Techado'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'villa',
    name: 'Villa',
    description: '4 hab, 4.5 baños, alberca',
    spaces: [
      { name: 'Habitación 1', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor', 'Balcón'], camas: [{ tipo: 'King', id: Date.now() + 1 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 2', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Queen', id: Date.now() + 2 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 3', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Queen', id: Date.now() + 3 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 4', type: 'Habitación', details: { equipamiento: ['Closet'], camas: [{ tipo: 'Matrimonial', id: Date.now() + 4 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Baño Principal', type: 'Baño completo', details: { equipamiento: ['Regadera', 'Tina', 'Doble lavabo'], camas: [], notas: '' }},
      { name: 'Baño 2', type: 'Baño completo', details: { equipamiento: ['Regadera', 'Tocador'], camas: [], notas: '' }},
      { name: 'Baño 3', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Baño 4', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Medio Baño', type: 'Medio baño', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Cocina', type: 'Cocina', details: { equipamiento: ['Estufa', 'Horno', 'Refrigerador', 'Lavavajillas', 'Isla'], camas: [], notas: '' }},
      { name: 'Patio', type: 'Patio', details: { equipamiento: ['Muebles de exterior', 'Asador'], camas: [], notas: '' }},
      { name: 'Jardín', type: 'Jardín', details: { equipamiento: ['Iluminación exterior'], camas: [], notas: '' }},
      { name: 'Alberca', type: 'Alberca', details: { equipamiento: ['Camastros', 'Regaderas exteriores'], camas: [], notas: '' }},
      { name: 'Cuarto de Lavado', type: 'Cuarto de lavado', details: { equipamiento: ['Lavadora', 'Secadora'], camas: [], notas: '' }},
      { name: 'Estacionamiento', type: 'Estacionamiento', details: { equipamiento: ['Techado', 'Portón automático'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'condominio',
    name: 'Condominio',
    description: '3 hab, 2.5 baños, jardín',
    spaces: [
      { name: 'Habitación 1', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor'], camas: [{ tipo: 'King', id: Date.now() + 1 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 2', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 3', type: 'Habitación', details: { equipamiento: ['Closet'], camas: [{ tipo: 'Individual', id: Date.now() + 3 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Baño Principal', type: 'Baño completo', details: { equipamiento: ['Regadera', 'Tocador'], camas: [], notas: '' }},
      { name: 'Baño Secundario', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Medio Baño', type: 'Medio baño', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Cocina', type: 'Cocina', details: { equipamiento: ['Estufa', 'Horno', 'Refrigerador'], camas: [], notas: '' }},
      { name: 'Patio', type: 'Patio', details: { equipamiento: ['Muebles de exterior'], camas: [], notas: '' }},
      { name: 'Jardín', type: 'Jardín', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Cuarto de Lavado', type: 'Cuarto de lavado', details: { equipamiento: ['Lavadora', 'Secadora'], camas: [], notas: '' }},
      { name: 'Estacionamiento', type: 'Estacionamiento', details: { equipamiento: ['Techado'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'penthouse',
    name: 'Penthouse',
    description: '3 hab, 2.5 baños, rooftop',
    spaces: [
      { name: 'Habitación 1', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor'], camas: [{ tipo: 'King', id: Date.now() + 1 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 2', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Habitación 3', type: 'Habitación', details: { equipamiento: ['Closet'], camas: [{ tipo: 'Individual', id: Date.now() + 3 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Baño Principal', type: 'Baño completo', details: { equipamiento: ['Regadera', 'Tocador'], camas: [], notas: '' }},
      { name: 'Baño Secundario', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Medio Baño', type: 'Medio baño', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Cocina', type: 'Cocina', details: { equipamiento: ['Estufa', 'Horno', 'Refrigerador'], camas: [], notas: '' }},
      { name: 'Patio', type: 'Patio', details: { equipamiento: ['Muebles de exterior'], camas: [], notas: '' }},
      { name: 'Jardín', type: 'Jardín', details: { equipamiento: [], camas: [], notas: '' }},
      { name: 'Rooftop', type: 'Rooftop', details: { equipamiento: ['Muebles de exterior', 'Asador'], camas: [], notas: '' }},
      { name: 'Cuarto de Lavado', type: 'Cuarto de lavado', details: { equipamiento: ['Lavadora', 'Secadora'], camas: [], notas: '' }},
      { name: 'Estacionamiento', type: 'Estacionamiento', details: { equipamiento: ['Techado'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'loft',
    name: 'Loft',
    description: '1 hab, 1 baño, espacio abierto',
    spaces: [
      { name: 'Habitación', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet'], camas: [{ tipo: 'Queen', id: Date.now() + 1 }], capacidadPersonas: 2, notas: '' }},
      { name: 'Baño', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }},
      { name: 'Cocina', type: 'Cocina', details: { equipamiento: ['Estufa', 'Refrigerador'], camas: [], notas: '' }},
      { name: 'Sala', type: 'Sala', details: { equipamiento: ['Smart TV'], camas: [], notas: '' }},
      { name: 'Comedor', type: 'Comedor', details: { equipamiento: ['Mesa comedor'], camas: [], notas: '' }},
      { name: 'Cuarto de Lavado', type: 'Cuarto de lavado', details: { equipamiento: ['Lavadora'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'estudio',
    name: 'Estudio',
    description: 'Espacio integrado todo en uno',
    spaces: [
      { name: 'Estudio', type: 'Habitación', details: { equipamiento: ['Aire acondicionado', 'Closet', 'Estufa', 'Refrigerador', 'Microondas'], camas: [{ tipo: 'Queen', id: Date.now() + 1 }], capacidadPersonas: 2, notas: 'Espacio integrado que incluye área de dormir, estar, cocina y comedor' }},
      { name: 'Baño', type: 'Baño completo', details: { equipamiento: ['Regadera'], camas: [], notas: '' }}
    ]
  },
  {
    id: 'oficina',
    name: 'Oficina',
    description: 'Espacio comercial',
    spaces: [
      { name: 'Área de Oficina', type: 'Oficina', details: { equipamiento: ['Aire acondicionado', 'Escritorio'], camas: [], notas: '' }},
      { name: 'Baño', type: 'Baño completo', details: { equipamiento: [], camas: [], notas: '' }}
    ]
  },
  {
    id: 'local-comercial',
    name: 'Local Comercial',
    description: 'Local adaptable',
    spaces: [
      { name: 'Área Comercial', type: 'Oficina', details: { equipamiento: ['Aire acondicionado'], camas: [], notas: '' }},
      { name: 'Baño', type: 'Medio baño', details: { equipamiento: [], camas: [], notas: '' }}
    ]
  },
  {
    id: 'bodega',
    name: 'Bodega',
    description: 'Almacenamiento',
    spaces: [
      { name: 'Área de Almacenamiento', type: 'Bodega', details: { equipamiento: ['Iluminación', 'Repisas'], camas: [], notas: '' }},
      { name: 'Oficina', type: 'Oficina', details: { equipamiento: ['Escritorio'], camas: [], notas: '' }},
      { name: 'Baño', type: 'Medio baño', details: { equipamiento: [], camas: [], notas: '' }}
    ]
  }
];

const SpaceTemplates: React.FC<SpaceTemplatesProps> = ({ onAplicarTemplate, onCerrar }) => {
  
  /**
   * Maneja la selección de una plantilla
   * Genera IDs únicos para cada espacio y aplica la plantilla
   * @param template - La plantilla seleccionada
   */
  const handleSelectTemplate = (template: PropertyTemplate) => {
    // Generar IDs únicos para cada espacio
    const espaciosConIds = template.spaces.map((espacio, index) => ({
      ...espacio,
      id: `space-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
    })) as Space[];

    onAplicarTemplate(espaciosConIds);
    onCerrar();
  };

  return (
    <div className="bg-white rounded-xl p-5">
      {/* Header con título e icono */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 font-poppins flex items-center gap-2">
          <svg className="w-5 h-5 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Templates Rápidos
        </h3>
        <p className="text-xs text-gray-600 font-roboto mt-1">
          Configura tu propiedad en segundos con plantillas predefinidas
        </p>
      </div>

      {/* Grid de plantillas - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PROPERTY_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className="group relative bg-gradient-to-br from-stone-100 to-stone-50 border-2 border-stone-300 rounded-lg p-4 text-left hover:from-stone-200 hover:to-stone-100 hover:border-ras-azul hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            {/* Título de la plantilla */}
            <h4 className="font-bold text-gray-800 text-base mb-2 font-poppins">
              {template.name}
            </h4>
            
            {/* Descripción */}
            <p className="text-xs text-gray-600 font-roboto">
              {template.description}
            </p>

            {/* Efecto de hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-ras-azul/5 to-ras-turquesa/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        ))}
      </div>

      {/* Footer informativo */}
      <div className="mt-4 pt-3 border-t border-gray-300">
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          Los templates agregan todos los espacios predefinidos. Puedes editarlos, duplicarlos o eliminarlos después.
        </p>
      </div>
    </div>
  );
};

export default SpaceTemplates;
