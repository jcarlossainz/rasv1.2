// Templates de espacios para diferentes tipos de propiedad
// Ubicación: src/types/property-templates.ts o donde tengas tus types

import { Space } from '@/types/property';

export interface PropertyTemplate {
  id: string;
  name: string;
  description: string;
  spaces: Omit<Space, 'id'>[];
}

export const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  // ========== DEPARTAMENTO ==========
  {
    id: 'departamento',
    name: 'Departamento',
    description: '2 habitaciones, 1 baño, cocina, sala, comedor',
    spaces: [
      {
        name: 'Habitación 1',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Cortinas'],
          camas: [{ tipo: 'Queen', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 2',
        type: 'Habitación',
        details: {
          equipamiento: ['Closet', 'Ventilador de techo'],
          camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Baño',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera', 'Espejo con luz'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cocina',
        type: 'Cocina',
        details: {
          equipamiento: ['Estufa', 'Horno', 'Refrigerador', 'Microondas'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Sala',
        type: 'Sala',
        details: {
          equipamiento: ['Smart TV'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Comedor',
        type: 'Comedor',
        details: {
          equipamiento: ['Mesa comedor'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cuarto de Lavado',
        type: 'Cuarto de lavado',
        details: {
          equipamiento: ['Lavadora'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== CASA ==========
  {
    id: 'casa',
    name: 'Casa',
    description: '3 habitaciones, 2.5 baños, jardín, estacionamiento',
    spaces: [
      {
        name: 'Habitación 1',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor'],
          camas: [{ tipo: 'King', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 2',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet'],
          camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 3',
        type: 'Habitación',
        details: {
          equipamiento: ['Closet'],
          camas: [{ tipo: 'Individual', id: Date.now() + 3 }, { tipo: 'Individual', id: Date.now() + 4 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Baño Principal',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera', 'Tocador'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño Secundario',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Medio Baño',
        type: 'Medio baño',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cocina',
        type: 'Cocina',
        details: {
          equipamiento: ['Estufa', 'Horno', 'Refrigerador', 'Microondas'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Patio',
        type: 'Patio',
        details: {
          equipamiento: ['Muebles de exterior'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Jardín',
        type: 'Jardín',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cuarto de Lavado',
        type: 'Cuarto de lavado',
        details: {
          equipamiento: ['Lavadora', 'Secadora'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Estacionamiento',
        type: 'Estacionamiento',
        details: {
          equipamiento: ['Techado'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== VILLA ==========
  {
    id: 'villa',
    name: 'Villa',
    description: '4 habitaciones, 4.5 baños, alberca, jardín',
    spaces: [
      {
        name: 'Habitación 1',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor', 'Balcón'],
          camas: [{ tipo: 'King', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 2',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Balcón'],
          camas: [{ tipo: 'Queen', id: Date.now() + 2 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 3',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet'],
          camas: [{ tipo: 'Queen', id: Date.now() + 3 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 4',
        type: 'Habitación',
        details: {
          equipamiento: ['Closet'],
          camas: [{ tipo: 'Matrimonial', id: Date.now() + 4 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Baño Principal',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera', 'Tina', 'Doble lavabo', 'Tocador'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño 2',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera', 'Tocador'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño 3',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño 4',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Medio Baño',
        type: 'Medio baño',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cocina',
        type: 'Cocina',
        details: {
          equipamiento: ['Estufa', 'Horno', 'Refrigerador', 'Microondas', 'Lavavajillas', 'Isla'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Patio',
        type: 'Patio',
        details: {
          equipamiento: ['Muebles de exterior', 'Asador'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Jardín',
        type: 'Jardín',
        details: {
          equipamiento: ['Iluminación exterior'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Alberca',
        type: 'Alberca',
        details: {
          equipamiento: ['Camastros', 'Regaderas exteriores'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cuarto de Lavado',
        type: 'Cuarto de lavado',
        details: {
          equipamiento: ['Lavadora', 'Secadora'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Estacionamiento',
        type: 'Estacionamiento',
        details: {
          equipamiento: ['Techado', 'Portón automático'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== CONDOMINIO ==========
  {
    id: 'condominio',
    name: 'Condominio',
    description: '3 habitaciones, 2.5 baños, jardín, estacionamiento',
    spaces: [
      {
        name: 'Habitación 1',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor'],
          camas: [{ tipo: 'King', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 2',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet'],
          camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 3',
        type: 'Habitación',
        details: {
          equipamiento: ['Closet'],
          camas: [{ tipo: 'Individual', id: Date.now() + 3 }, { tipo: 'Individual', id: Date.now() + 4 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Baño Principal',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera', 'Tocador'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño Secundario',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Medio Baño',
        type: 'Medio baño',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cocina',
        type: 'Cocina',
        details: {
          equipamiento: ['Estufa', 'Horno', 'Refrigerador', 'Microondas'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Patio',
        type: 'Patio',
        details: {
          equipamiento: ['Muebles de exterior'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Jardín',
        type: 'Jardín',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cuarto de Lavado',
        type: 'Cuarto de lavado',
        details: {
          equipamiento: ['Lavadora', 'Secadora'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Estacionamiento',
        type: 'Estacionamiento',
        details: {
          equipamiento: ['Techado'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== PENTHOUSE ==========
  {
    id: 'penthouse',
    name: 'Penthouse',
    description: '3 habitaciones, 2.5 baños, rooftop',
    spaces: [
      {
        name: 'Habitación 1',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Vestidor'],
          camas: [{ tipo: 'King', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 2',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet'],
          camas: [{ tipo: 'Matrimonial', id: Date.now() + 2 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Habitación 3',
        type: 'Habitación',
        details: {
          equipamiento: ['Closet'],
          camas: [{ tipo: 'Individual', id: Date.now() + 3 }, { tipo: 'Individual', id: Date.now() + 4 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Baño Principal',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera', 'Tocador'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño Secundario',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Medio Baño',
        type: 'Medio baño',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cocina',
        type: 'Cocina',
        details: {
          equipamiento: ['Estufa', 'Horno', 'Refrigerador', 'Microondas'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Patio',
        type: 'Patio',
        details: {
          equipamiento: ['Muebles de exterior'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Jardín',
        type: 'Jardín',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Rooftop',
        type: 'Rooftop',
        details: {
          equipamiento: ['Muebles de exterior', 'Asador', 'Iluminación exterior'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cuarto de Lavado',
        type: 'Cuarto de lavado',
        details: {
          equipamiento: ['Lavadora', 'Secadora'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Estacionamiento',
        type: 'Estacionamiento',
        details: {
          equipamiento: ['Techado'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== LOFT ==========
  {
    id: 'loft',
    name: 'Loft',
    description: '1 habitación, 1 baño, espacio abierto',
    spaces: [
      {
        name: 'Habitación',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet'],
          camas: [{ tipo: 'Queen', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: ''
        }
      },
      {
        name: 'Baño',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cocina',
        type: 'Cocina',
        details: {
          equipamiento: ['Estufa', 'Refrigerador', 'Microondas'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Sala',
        type: 'Sala',
        details: {
          equipamiento: ['Smart TV'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Comedor',
        type: 'Comedor',
        details: {
          equipamiento: ['Mesa comedor'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Cuarto de Lavado',
        type: 'Cuarto de lavado',
        details: {
          equipamiento: ['Lavadora'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== ESTUDIO ==========
  {
    id: 'estudio',
    name: 'Estudio',
    description: 'Espacio único integrado con todo incluido',
    spaces: [
      {
        name: 'Estudio',
        type: 'Habitación',
        details: {
          equipamiento: ['Aire acondicionado', 'Closet', 'Estufa', 'Refrigerador', 'Microondas'],
          camas: [{ tipo: 'Queen', id: Date.now() + 1 }],
          capacidadPersonas: 2,
          tieneBanoPrivado: false,
          banoPrivadoId: null,
          notas: 'Espacio integrado que incluye área de dormir, estar, cocina y comedor en un mismo ambiente'
        }
      },
      {
        name: 'Baño',
        type: 'Baño completo',
        details: {
          equipamiento: ['Regadera'],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== OFICINA ==========
  {
    id: 'oficina',
    name: 'Oficina',
    description: 'Espacio comercial de oficina',
    spaces: [
      {
        name: 'Área de Oficina',
        type: 'Oficina',
        details: {
          equipamiento: ['Aire acondicionado', 'Escritorio', 'Iluminación LED'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño',
        type: 'Baño completo',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== LOCAL COMERCIAL ==========
  {
    id: 'local-comercial',
    name: 'Local Comercial',
    description: 'Espacio comercial adaptable',
    spaces: [
      {
        name: 'Área Comercial',
        type: 'Oficina',
        details: {
          equipamiento: ['Aire acondicionado', 'Iluminación LED'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño',
        type: 'Medio baño',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      }
    ]
  },

  // ========== BODEGA ==========
  {
    id: 'bodega-espacios',
    name: 'Bodega',
    description: 'Espacio de almacenamiento',
    spaces: [
      {
        name: 'Área de Almacenamiento',
        type: 'Bodega',
        details: {
          equipamiento: ['Iluminación', 'Repisas'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Oficina',
        type: 'Oficina',
        details: {
          equipamiento: ['Escritorio'],
          camas: [],
          notas: ''
        }
      },
      {
        name: 'Baño',
        type: 'Medio baño',
        details: {
          equipamiento: [],
          camas: [],
          notas: ''
        }
      }
    ]
  }
];