/**
 * useWizardValidation
 * 
 * Hook personalizado para manejar las validaciones del wizard
 * 
 * Responsabilidades:
 * - Validar steps individuales
 * - Validar todos los steps
 * - Gestionar errores de validación
 * - Tracking de campos tocados
 * - Verificar completitud de steps
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { PropertyFormData } from '@/types/property';
import { 
  WizardStepKey, 
  STEP_VALIDATION_RULES,
  getStepErrors as getStepErrorsFromConfig,
  isStepComplete
} from '../config/wizardConfig';
import { logger } from '@/lib/logger';

export interface UseWizardValidationReturn {
  // Estado de errores
  errors: Record<WizardStepKey, string[]>;
  touchedFields: Set<string>;
  hasErrors: boolean;
  
  // Métodos de validación
  validateStep: (stepKey: WizardStepKey, showToast?: boolean) => boolean;
  validateAll: () => boolean;
  getErrors: (stepKey: WizardStepKey) => string[];
  
  // Gestión de estado
  markFieldTouched: (fieldName: string) => void;
  clearErrors: (stepKey?: WizardStepKey) => void;
  setStepErrors: (stepKey: WizardStepKey, errors: string[]) => void;
  
  // Verificaciones
  isStepValid: (stepKey: WizardStepKey) => boolean;
  isFieldTouched: (fieldName: string) => boolean;
}

export interface UseWizardValidationProps {
  formData: PropertyFormData;
  onValidationError?: (stepKey: WizardStepKey, errors: string[]) => void;
}

export function useWizardValidation({
  formData,
  onValidationError
}: UseWizardValidationProps): UseWizardValidationReturn {
  
  // Estado de errores por step
  const [errors, setErrors] = useState<Record<WizardStepKey, string[]>>({
    general: [],
    ubicacion: [],
    espacios: [],
    detalles: [],
    servicios: []
  });
  
  // Campos que el usuario ha tocado/editado
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  /**
   * Verifica si hay algún error en cualquier step
   */
  const hasErrors = useMemo(() => {
    return Object.values(errors).some(stepErrors => stepErrors.length > 0);
  }, [errors]);
  
  /**
   * Marca un campo como tocado
   */
  const markFieldTouched = useCallback((fieldName: string) => {
    setTouchedFields(prev => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
  }, []);
  
  /**
   * Verifica si un campo ha sido tocado
   */
  const isFieldTouched = useCallback((fieldName: string): boolean => {
    return touchedFields.has(fieldName);
  }, [touchedFields]);
  
  /**
   * Limpia los errores de un step específico o de todos
   */
  const clearErrors = useCallback((stepKey?: WizardStepKey) => {
    if (stepKey) {
      setErrors(prev => ({
        ...prev,
        [stepKey]: []
      }));
    } else {
      setErrors({
        general: [],
        ubicacion: [],
        espacios: [],
        detalles: [],
        servicios: []
      });
    }
  }, []);
  
  /**
   * Establece los errores de un step específico
   */
  const setStepErrors = useCallback((stepKey: WizardStepKey, stepErrors: string[]) => {
    setErrors(prev => ({
      ...prev,
      [stepKey]: stepErrors
    }));
  }, []);
  
  /**
   * Obtiene los errores de un step específico
   */
  const getErrors = useCallback((stepKey: WizardStepKey): string[] => {
    return errors[stepKey] || [];
  }, [errors]);
  
  /**
   * Verifica si un step es válido (no tiene errores)
   */
  const isStepValid = useCallback((stepKey: WizardStepKey): boolean => {
    const stepErrors = errors[stepKey] || [];
    return stepErrors.length === 0 && isStepComplete(stepKey, formData);
  }, [errors, formData]);
  
  /**
   * Valida un step específico
   * @param stepKey - La key del step a validar
   * @param showToast - Si debe mostrar toast con errores
   * @returns true si el step es válido, false si tiene errores
   */
  const validateStep = useCallback((stepKey: WizardStepKey, showToast = false): boolean => {
    try {
      // Obtener errores desde la configuración
      const stepErrors = getStepErrorsFromConfig(stepKey, formData);
      
      // Actualizar estado de errores
      setStepErrors(stepKey, stepErrors);
      
      // Callback opcional
      if (stepErrors.length > 0 && onValidationError) {
        onValidationError(stepKey, stepErrors);
      }
      
      // Log para debug
      if (stepErrors.length > 0) {
        logger.warn(`Validación fallida en step ${stepKey}:`, stepErrors);
      } else {
        logger.debug(`Step ${stepKey} validado correctamente`);
      }
      
      return stepErrors.length === 0;
      
    } catch (error) {
      logger.error(`Error al validar step ${stepKey}:`, error);
      return false;
    }
  }, [formData, onValidationError, setStepErrors]);
  
  /**
   * Valida todos los steps del wizard
   * @returns true si todos los steps son válidos
   */
  const validateAll = useCallback((): boolean => {
    const allStepKeys: WizardStepKey[] = [
      'general',
      'ubicacion', 
      'espacios',
      'detalles',
      'servicios'
    ];
    
    let allValid = true;
    const allErrors: Record<WizardStepKey, string[]> = {
      general: [],
      ubicacion: [],
      espacios: [],
      detalles: [],
      servicios: []
    };
    
    // Validar cada step
    allStepKeys.forEach(stepKey => {
      const stepErrors = getStepErrorsFromConfig(stepKey, formData);
      allErrors[stepKey] = stepErrors;
      
      if (stepErrors.length > 0) {
        allValid = false;
        logger.warn(`Step ${stepKey} tiene errores:`, stepErrors);
      }
    });
    
    // Actualizar todos los errores de una vez
    setErrors(allErrors);
    
    // Log resumen
    if (allValid) {
      logger.info('✅ Todos los steps validados correctamente');
    } else {
      const errorCount = Object.values(allErrors).reduce(
        (sum, errs) => sum + errs.length, 
        0
      );
      logger.warn(`❌ Validación fallida: ${errorCount} errores encontrados`);
    }
    
    return allValid;
  }, [formData]);
  
  return {
    // Estado
    errors,
    touchedFields,
    hasErrors,
    
    // Métodos de validación
    validateStep,
    validateAll,
    getErrors,
    
    // Gestión de estado
    markFieldTouched,
    clearErrors,
    setStepErrors,
    
    // Verificaciones
    isStepValid,
    isFieldTouched
  };
}

/**
 * VALIDACIONES PERSONALIZADAS ADICIONALES
 * 
 * Estas funciones pueden usarse para validaciones específicas
 * que no están en la configuración
 */

/**
 * Valida que un email tenga formato válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que un teléfono tenga formato válido (México)
 */
export function isValidPhone(phone: string): boolean {
  // Acepta formatos: 1234567890, (123) 456-7890, 123-456-7890
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Valida que un código postal sea válido (México)
 */
export function isValidZipCode(zipCode: string): boolean {
  // México: 5 dígitos
  const zipRegex = /^\d{5}$/;
  return zipRegex.test(zipCode);
}

/**
 * Valida que una URL sea válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida que un número sea positivo
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * Valida que una fecha sea válida y no esté en el futuro
 */
export function isValidPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return !isNaN(date.getTime()) && date <= now;
}

/**
 * Valida que una fecha sea válida y esté en el futuro
 */
export function isValidFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return !isNaN(date.getTime()) && date > now;
}