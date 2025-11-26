/**
 * WizardContainer - VERSIÓN CON TUS COMPONENTES ORIGINALES
 * 
 * ✅ Usa WizardProgress.tsx y WizardNavigation.tsx tal como están
 * ✅ Backend simplificado con usePropertyDatabase
 * ✅ Sin cambios en tu UI
 * 
 * @version 5.0 - Respetando componentes originales
 */

'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { PropertyFormData, INITIAL_PROPERTY_DATA } from '@/types/property';
import { usePropertyDatabase } from '../hooks/usePropertyDatabase';
import { useToast } from '@/hooks/useToast';

// Steps
import Step1_DatosGenerales from '../steps/Step1_DatosGenerales';
import Step2_Ubicacion from '../steps/Step2_Ubicacion';
import Step3_Espacios from '../steps/Step3_Espacios';
import Step4_Condicionales from '../steps/Step4_Condicionales';
import Step5_Servicios from '../steps/Step5_Servicios';

// Componentes de navegación (TUS originales)
import WizardProgress from './WizardProgress';
import WizardNavigation from './WizardNavigation';

export interface WizardContainerProps {
  mode?: 'create' | 'edit';
  propertyId?: string;
  onComplete?: (propertyId: string) => void;
  onCancel?: () => void;
}

export default function WizardContainer({
  mode = 'create',
  propertyId: initialPropertyId,
  onComplete,
  onCancel
}: WizardContainerProps) {

  // ============================================================================
  // HOOKS
  // ============================================================================

  const toast = useToast();
  const { saveProperty, loadProperty, isSaving, isLoading } = usePropertyDatabase();

  // ============================================================================
  // ESTADO
  // ============================================================================

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_PROPERTY_DATA);
  const [propertyId, setPropertyId] = useState<string | null>(initialPropertyId || null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const hasLoadedRef = React.useRef(false);

  const totalSteps = 5;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  // ============================================================================
  // CARGAR PROPIEDAD EN MODO EDICIÓN
  // ============================================================================

  useEffect(() => {
    if (mode === 'edit' && initialPropertyId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;

      const loadData = async () => {
        const result = await loadProperty(initialPropertyId);

        if (result.success && result.data) {
          setFormData(result.data);
          setPropertyId(initialPropertyId);

          // Marcar steps completados basado en wizard_step
          const stepNumber = result.data.wizard_step || 1;
          const completed = new Set<number>();
          for (let i = 1; i < stepNumber; i++) {
            completed.add(i);
          }
          setCompletedSteps(completed);
          setCurrentStep(stepNumber);

          toast.success('✅ Propiedad cargada correctamente');
        } else {
          toast.error(`❌ Error al cargar: ${result.error}`);
        }
      };

      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialPropertyId]);
  
  // ============================================================================
  // ACTUALIZAR DATOS DEL FORMULARIO
  // ============================================================================
  
  const updateData = useCallback((updates: Partial<PropertyFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);
  
  // ============================================================================
  // GUARDAR PROPIEDAD
  // ============================================================================
  
  const handleSave = useCallback(async (): Promise<boolean> => {
    // Actualizar wizard_step antes de guardar
    const dataToSave: PropertyFormData = {
      ...formData,
      wizard_step: currentStep,
      wizard_completed: currentStep === totalSteps,
      is_draft: currentStep < totalSteps
    };
    
    const result = await saveProperty(dataToSave, propertyId || undefined);
    
    if (result.success) {
      // Si es la primera vez que se guarda, guardar el ID
      if (!propertyId && result.propertyId) {
        setPropertyId(result.propertyId);
      }
      
      toast.success('✅ Cambios guardados correctamente');
      return true;
    } else {
      toast.error(`❌ Error al guardar: ${result.error}`);
      return false;
    }
  }, [formData, currentStep, propertyId, saveProperty, toast, totalSteps]);
  
  // ============================================================================
  // NAVEGACIÓN
  // ============================================================================
  
  const handleStepClick = useCallback((stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps && stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalSteps, currentStep]);
  
  const handleNext = useCallback(async () => {
    // 1. Guardar antes de avanzar
    const saved = await handleSave();
    
    if (!saved) {
      return; // No avanzar si falla el guardado
    }
    
    // 2. Marcar step actual como completado
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(currentStep);
      return newSet;
    });
    
    // 3. Avanzar al siguiente step
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, totalSteps, handleSave]);
  
  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);
  
  const handleSaveAndClose = useCallback(async () => {
    const saved = await handleSave();
    
    if (saved && onCancel) {
      onCancel();
    }
  }, [handleSave, onCancel]);
  
  const handleFinalSave = useCallback(async () => {
    // Marcar como completado y publicado
    const dataToSave: PropertyFormData = {
      ...formData,
      wizard_step: totalSteps,
      wizard_completed: true,
      is_draft: false,
      published_at: new Date().toISOString()
    };
    
    const result = await saveProperty(dataToSave, propertyId || undefined);
    
    if (result.success) {
      toast.success('✅ Propiedad guardada y publicada correctamente');
      
      if (onComplete && (propertyId || result.propertyId)) {
        onComplete(propertyId || result.propertyId!);
      }
    } else {
      toast.error(`❌ Error al publicar: ${result.error}`);
    }
  }, [formData, propertyId, saveProperty, toast, totalSteps, onComplete]);
  
  // ============================================================================
  // RENDERIZAR STEP ACTUAL
  // ============================================================================
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_DatosGenerales
            data={formData}
            onUpdate={updateData}
          />
        );
        
      case 2:
        return (
          <Step2_Ubicacion
            data={formData}
            onUpdate={updateData}
          />
        );
        
      case 3:
        return (
          <Step3_Espacios
            data={formData}
            onUpdate={updateData}
          />
        );
        
      case 4:
        return (
          <Step4_Condicionales
            data={formData}
            onUpdate={updateData}
          />
        );
        
      case 5:
        return (
          <Step5_Servicios
            data={formData}
            onUpdate={updateData}
          />
        );
        
      default:
        return null;
    }
  };
  
  // ============================================================================
  // CALCULAR PROGRESO
  // ============================================================================
  
  const progress = Math.round((completedSteps.size / totalSteps) * 100);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ras-azul mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando propiedad...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* TU Componente de Progreso Original */}
      <WizardProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        progress={progress}
      />
      
      {/* Contenedor principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header con título y ID (opcional) */}
        {propertyId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-poppins">
                  {mode === 'create' ? 'Nueva Propiedad' : 'Editar Propiedad'}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  ID de Propiedad
                </div>
                <div className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded">
                  {propertyId.substring(0, 8)}...
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Contenido del step actual */}
        <div className="mb-6">
          {renderCurrentStep()}
        </div>
        
        {/* TU Componente de Navegación Original */}
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          canGoNext={true}
          canGoPrev={!isFirstStep}
          isLoading={isLoading}
          isSaving={isSaving}
          progress={progress}
          completedSteps={completedSteps}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveAndClose={handleSaveAndClose}
          onFinalSave={handleFinalSave}
          showProgress={false}
          showKeyboardHints={true}
          enableKeyboardShortcuts={true}
        />
      </div>
    </div>
  );
}