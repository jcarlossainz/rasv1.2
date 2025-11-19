/**
 * WIZARD TYPES
 * 
 * Tipos TypeScript específicos para el wizard de propiedades
 */

import { PropertyFormData } from '@/types/property';
import { WizardStepKey, WizardMode } from '../config/wizardConfig';

// ============================================================================
// WIZARD STATE
// ============================================================================

export interface WizardState {
  // Identificación
  mode: WizardMode;
  propertyId?: string;
  
  // Navegación
  currentStep: number;
  visitedSteps: number[];
  
  // Datos
  formData: PropertyFormData;
  initialData: PropertyFormData;
  
  // Estado de UI
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  
  // Validación
  validationErrors: Record<WizardStepKey, string[]>;
  touchedFields: Set<string>;
  
  // Progreso
  completedSteps: Set<number>;
  progress: number; // 0-100
}

// ============================================================================
// WIZARD ACTIONS
// ============================================================================

export type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'UPDATE_DATA'; payload: Partial<PropertyFormData> }
  | { type: 'SET_DATA'; payload: PropertyFormData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_VALIDATION_ERRORS'; payload: { step: WizardStepKey; errors: string[] } }
  | { type: 'CLEAR_VALIDATION_ERRORS'; payload: WizardStepKey }
  | { type: 'MARK_STEP_COMPLETE'; payload: number }
  | { type: 'MARK_STEP_INCOMPLETE'; payload: number }
  | { type: 'MARK_FIELD_TOUCHED'; payload: string }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'RESET_WIZARD' };

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props del WizardContainer principal
 */
export interface WizardContainerProps {
  mode?: WizardMode;
  propertyId?: string;
  initialData?: Partial<PropertyFormData>;
  onSave: (data: PropertyFormData) => Promise<void>;
  onSaveDraft?: (data: PropertyFormData) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Props del WizardModal (wrapper)
 */
export interface WizardModalProps {
  isOpen: boolean;
  mode: WizardMode;
  propertyId?: string;
  initialData?: Partial<PropertyFormData>;
  onClose: () => void;
  onSave: (data: PropertyFormData) => Promise<void>;
  onSaveDraft?: (data: PropertyFormData) => Promise<void>;
}

/**
 * Props de cada Step individual
 */
export interface WizardStepProps {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
  errors?: string[];
  mode?: WizardMode;
  isLoading?: boolean;
}

/**
 * Props del WizardProgress
 */
export interface WizardProgressProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepId: number) => void;
  progress: number;
}

/**
 * Props del WizardNavigation
 */
export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  isSaving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  mode: WizardMode;
}

/**
 * Props del WizardStepCard (wrapper de cada step)
 */
export interface WizardStepCardProps {
  step: number;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  errors?: string[];
  className?: string;
}

/**
 * Props del WizardFieldGroup (agrupación de campos)
 */
export interface WizardFieldGroupProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  optional?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type del hook useWizardData
 */
export interface UseWizardDataReturn {
  // Estado
  data: PropertyFormData;
  isDirty: boolean;
  isLoading: boolean;
  
  // Acciones
  updateData: (updates: Partial<PropertyFormData>) => void;
  resetData: () => void;
  loadData: (propertyId: string) => Promise<void>;
  
  // Guardado
  saveDraft: () => Promise<void>;
  saveProperty: () => Promise<void>;
}

/**
 * Return type del hook useWizardValidation
 */
export interface UseWizardValidationReturn {
  // Validación
  errors: Record<WizardStepKey, string[]>;
  touchedFields: Set<string>;
  
  // Métodos
  validateStep: (stepKey: WizardStepKey) => boolean;
  validateAll: () => boolean;
  getStepErrors: (stepKey: WizardStepKey) => string[];
  markFieldTouched: (fieldName: string) => void;
  clearErrors: (stepKey?: WizardStepKey) => void;
  
  // Estado
  isStepValid: (stepKey: WizardStepKey) => boolean;
  hasErrors: boolean;
}

/**
 * Return type del hook useWizardNavigation
 */
export interface UseWizardNavigationReturn {
  // Estado
  currentStep: number;
  currentStepKey: WizardStepKey;
  isFirstStep: boolean;
  isLastStep: boolean;
  visitedSteps: number[];
  completedSteps: Set<number>;
  progress: number;
  
  // Navegación
  goToStep: (stepId: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoToStep: (stepId: number) => boolean;
  
  // Estado de steps
  isStepComplete: (stepId: number) => boolean;
  isStepVisited: (stepId: number) => boolean;
}

/**
 * Return type del hook useWizard (hook principal)
 */
export interface UseWizardReturn {
  // Estado general
  state: WizardState;
  mode: WizardMode;
  
  // Datos
  data: UseWizardDataReturn;
  
  // Validación
  validation: UseWizardValidationReturn;
  
  // Navegación
  navigation: UseWizardNavigationReturn;
  
  // UI State
  isSaving: boolean;
  canSubmit: boolean;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export type StepChangeHandler = (newStep: number, oldStep: number) => void | Promise<void>;
export type DataChangeHandler = (data: PropertyFormData, changes: Partial<PropertyFormData>) => void;
export type ValidationErrorHandler = (stepKey: WizardStepKey, errors: string[]) => void;
export type SaveHandler = (data: PropertyFormData) => Promise<void>;
export type CancelHandler = () => void;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Resultado de una operación asíncrona del wizard
 */
export interface WizardOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Configuración de comportamiento del wizard
 */
export interface WizardBehaviorConfig {
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  autosaveEnabled?: boolean;
  autosaveDelay?: number;
  confirmBeforeExit?: boolean;
  allowStepSkipping?: boolean;
}

/**
 * Contexto del Wizard (para Context API si se usa)
 */
export interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  config: WizardBehaviorConfig;
}

// ============================================================================
// FORM FIELD TYPES
// ============================================================================

/**
 * Estado de un campo individual
 */
export interface FieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Metadata de un campo
 */
export interface FieldMetadata {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

// ============================================================================
// DRAFT MANAGEMENT
// ============================================================================

/**
 * Datos de borrador guardados
 */
export interface DraftData {
  id: string;
  data: PropertyFormData;
  currentStep: number;
  lastSaved: string;
  mode: WizardMode;
}

/**
 * Opciones para guardar borrador
 */
export interface SaveDraftOptions {
  silent?: boolean; // No mostrar notificación
  immediate?: boolean; // Ignorar delay de autosave
}