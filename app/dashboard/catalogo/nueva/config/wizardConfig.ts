/**
 * WIZARD CONFIGURATION
 * 
 * Configuración centralizada del wizard de propiedades RAS
 * Define steps, iconos, validaciones y comportamiento
 */

import { PropertyFormData } from '@/types/property';

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

export interface StepConfig {
  id: number;
  key: WizardStepKey;
  name: string;
  shortName: string;
  icon: StepIcon;
  description: string;
  isOptional?: boolean;
}

export type WizardStepKey = 
  | 'general'
  | 'ubicacion'
  | 'espacios'
  | 'detalles'
  | 'servicios';

export interface StepIcon {
  svg: string; // SVG path
  emoji?: string; // Emoji alternativo
  color: string; // Color del ícono (Tailwind class)
}

// ============================================================================
// STEPS DEFINITION
// ============================================================================

export const WIZARD_STEPS: StepConfig[] = [
  {
    id: 1,
    key: 'general',
    name: 'General',
    shortName: 'General',
    icon: {
      svg: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      emoji: '🏠',
      color: 'text-ras-azul'
    },
    description: 'Información básica de la propiedad'
  },
  {
    id: 2,
    key: 'ubicacion',
    name: 'Ubicación',
    shortName: 'Ubicación',
    icon: {
      svg: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      emoji: '📍',
      color: 'text-ras-turquesa'
    },
    description: 'Dirección y datos de localización'
  },
  {
    id: 3,
    key: 'espacios',
    name: 'Espacios',
    shortName: 'Espacios',
    icon: {
      svg: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z',
      emoji: '🏗️',
      color: 'text-blue-600'
    },
    description: 'Espacios interiores y exteriores'
  },
  {
    id: 4,
    key: 'detalles',
    name: 'Detalles',
    shortName: 'Detalles',
    icon: {
      svg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      emoji: '📋',
      color: 'text-amber-600'
    },
    description: 'Datos condicionales según estado'
  },
  {
    id: 5,
    key: 'servicios',
    name: 'Servicios',
    shortName: 'Servicios',
    icon: {
      svg: 'M13 10V3L4 14h7v7l9-11h-7z',
      emoji: '⚡',
      color: 'text-purple-600'
    },
    description: 'Servicios de la propiedad',
    isOptional: true
  }
];

// ============================================================================
// VALIDATION RULES
// ============================================================================

export interface ValidationRule {
  field: keyof PropertyFormData;
  required: boolean;
  message?: string;
  validator?: (value: any, data: PropertyFormData) => boolean;
  errorMessage?: (value: any, data: PropertyFormData) => string;
}

export const STEP_VALIDATION_RULES: Record<WizardStepKey, ValidationRule[]> = {
  general: [
    {
      field: 'nombre_propiedad',
      required: true,
      message: 'El nombre de la propiedad es requerido',
      validator: (value) => value && value.trim().length >= 3,
      errorMessage: () => 'El nombre debe tener al menos 3 caracteres'
    }
    // TODO: Descomentar cuando estén listos los campos
    // {
    //   field: 'tipo_propiedad',
    //   required: true,
    //   message: 'Selecciona un tipo de propiedad'
    // },
    // {
    //   field: 'estados',
    //   required: true,
    //   message: 'Selecciona al menos un estado',
    //   validator: (value) => Array.isArray(value) && value.length > 0,
    //   errorMessage: () => 'Debes seleccionar al menos un estado de la propiedad'
    // },
    // {
    //   field: 'mobiliario',
    //   required: true,
    //   message: 'Selecciona el tipo de mobiliario'
    // },
    // {
    //   field: 'propietario_id',
    //   required: true,
    //   message: 'Asigna un propietario a la propiedad'
    // }
  ],
  
  ubicacion: [
    // TODO: Todas las validaciones de ubicación son opcionales por ahora
    // {
    //   field: 'ubicacion',
    //   required: false,
    //   validator: (ubicacion: any) => {
    //     if (!ubicacion) return true;
    //     return ubicacion.calle && ubicacion.ciudad && ubicacion.estado;
    //   },
    //   errorMessage: () => 'Si proporcionas ubicación, calle, ciudad y estado son requeridos'
    // }
  ],
  
  espacios: [
    // TODO: Habilitar cuando el sistema de espacios esté listo
    // {
    //   field: 'espacios',
    //   required: true,
    //   message: 'Debes agregar al menos un espacio',
    //   validator: (value) => Array.isArray(value) && value.length > 0,
    //   errorMessage: () => 'La propiedad debe tener al menos un espacio definido'
    // }
  ],
  
  detalles: [
    // TODO: Habilitar validaciones de precios cuando el sistema esté completo
    // {
    //   field: 'precios',
    //   required: true,
    //   validator: (precios: any, data: PropertyFormData) => {
    //     if (!data.estados || data.estados.length === 0) return false;
    //     
    //     const needsMensual = data.estados.includes('Renta largo plazo');
    //     const needsNoche = data.estados.includes('Renta vacacional');
    //     const needsVenta = data.estados.includes('Venta');
    //     
    //     if (needsMensual && !precios?.mensual) return false;
    //     if (needsNoche && !precios?.noche) return false;
    //     if (needsVenta && !precios?.venta) return false;
    //     
    //     return true;
    //   },
    //   errorMessage: (_: any, data: PropertyFormData) => {
    //     const missing = [];
    //     if (data.estados.includes('Renta largo plazo') && !data.precios?.mensual) {
    //       missing.push('precio mensual');
    //     }
    //     if (data.estados.includes('Renta vacacional') && !data.precios?.noche) {
    //       missing.push('precio por noche');
    //     }
    //     if (data.estados.includes('Venta') && !data.precios?.venta) {
    //       missing.push('precio de venta');
    //     }
    //     return `Falta: ${missing.join(', ')}`;
    //   }
    // }
  ],
  
  servicios: [
    // Servicios es opcional, no hay validaciones requeridas
  ]
};

// ============================================================================
// NAVIGATION BEHAVIOR
// ============================================================================

export interface NavigationConfig {
  allowSkipSteps: boolean;
  autosaveDraft: boolean;
  autosaveDelay: number; // milliseconds
  confirmBeforeExit: boolean;
  validateBeforeNext: boolean;
}

export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  allowSkipSteps: false,
  autosaveDraft: true,
  autosaveDelay: 2000,
  confirmBeforeExit: true,
  validateBeforeNext: true
};

// ============================================================================
// WIZARD MODES
// ============================================================================

export type WizardMode = 'create' | 'edit' | 'view';

export interface WizardModeConfig {
  mode: WizardMode;
  title: string;
  description: string;
  allowEdit: boolean;
  showDraftButton: boolean;
  showPublishButton: boolean;
}

export const WIZARD_MODE_CONFIGS: Record<WizardMode, WizardModeConfig> = {
  create: {
    mode: 'create',
    title: 'Nueva Propiedad',
    description: 'Completa los 5 pasos del formulario',
    allowEdit: true,
    showDraftButton: true,
    showPublishButton: true
  },
  edit: {
    mode: 'edit',
    title: 'Editar Propiedad',
    description: 'Modifica la información de la propiedad',
    allowEdit: true,
    showDraftButton: true,
    showPublishButton: true
  },
  view: {
    mode: 'view',
    title: 'Ver Propiedad',
    description: 'Información de la propiedad',
    allowEdit: false,
    showDraftButton: false,
    showPublishButton: false
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Obtiene la configuración de un step por su key
 */
export function getStepConfig(key: WizardStepKey): StepConfig | undefined {
  return WIZARD_STEPS.find(step => step.key === key);
}

/**
 * Obtiene la configuración de un step por su id
 */
export function getStepConfigById(id: number): StepConfig | undefined {
  return WIZARD_STEPS.find(step => step.id === id);
}

/**
 * Verifica si un step está completo
 */
export function isStepComplete(
  stepKey: WizardStepKey, 
  data: PropertyFormData
): boolean {
  const rules = STEP_VALIDATION_RULES[stepKey];
  
  return rules.every(rule => {
    const value = data[rule.field];
    
    if (!rule.required && !value) return true;
    if (rule.required && !value) return false;
    if (rule.validator) return rule.validator(value, data);
    
    return true;
  });
}

/**
 * Obtiene todos los errores de validación de un step
 */
export function getStepErrors(
  stepKey: WizardStepKey,
  data: PropertyFormData
): string[] {
  const rules = STEP_VALIDATION_RULES[stepKey];
  const errors: string[] = [];
  
  rules.forEach(rule => {
    const value = data[rule.field];
    
    // Si es requerido y no tiene valor
    if (rule.required && !value) {
      errors.push(rule.message || `${rule.field} es requerido`);
      return;
    }
    
    // Si tiene validador personalizado
    if (value && rule.validator && !rule.validator(value, data)) {
      const errorMsg = rule.errorMessage 
        ? rule.errorMessage(value, data)
        : (rule.message || `${rule.field} no es válido`);
      errors.push(errorMsg);
    }
  });
  
  return errors;
}

/**
 * Calcula el progreso general del wizard (0-100)
 */
export function calculateProgress(data: PropertyFormData): number {
  const completedSteps = WIZARD_STEPS.filter(step => 
    isStepComplete(step.key, data)
  ).length;
  
  return Math.round((completedSteps / WIZARD_STEPS.length) * 100);
}

/**
 * Obtiene el siguiente step incompleto
 */
export function getNextIncompleteStep(
  currentStepId: number,
  data: PropertyFormData
): StepConfig | null {
  const remainingSteps = WIZARD_STEPS.filter(step => step.id > currentStepId);
  
  for (const step of remainingSteps) {
    if (!isStepComplete(step.key, data)) {
      return step;
    }
  }
  
  return null;
}

/**
 * Verifica si todos los steps están completos
 */
export function isWizardComplete(data: PropertyFormData): boolean {
  return WIZARD_STEPS.every(step => 
    step.isOptional || isStepComplete(step.key, data)
  );
}