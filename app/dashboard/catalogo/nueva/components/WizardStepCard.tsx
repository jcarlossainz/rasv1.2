/**
 * WizardStepCard
 * 
 * Componente wrapper estandarizado para cada step del wizard
 * Proporciona UI consistente con título, descripción, iconos y manejo de errores
 * 
 * Features:
 * - Header con título e ícono SVG
 * - Descripción opcional
 * - Visualización de errores de validación
 * - Indicador de progreso del step
 * - Estilos RAS consistentes
 * - Responsive design
 */

'use client';

import React from 'react';

export interface WizardStepCardProps {
  /** Número del step (1-5) */
  step: number;
  
  /** Título del step */
  title: string;
  
  /** Descripción corta del step */
  description?: string;
  
  /** Ícono SVG path */
  icon?: string;
  
  /** Color del ícono (clase Tailwind) */
  iconColor?: string;
  
  /** Errores de validación del step */
  errors?: string[];
  
  /** Contenido del step */
  children: React.ReactNode;
  
  /** Clase CSS adicional para el container */
  className?: string;
  
  /** Si el step está completo */
  isComplete?: boolean;
  
  /** Si mostrar indicador de completitud */
  showCompleteIndicator?: boolean;
}

export default function WizardStepCard({
  step,
  title,
  description,
  icon,
  iconColor = 'text-ras-azul',
  errors = [],
  children,
  className = '',
  isComplete = false,
  showCompleteIndicator = true
}: WizardStepCardProps) {
  
  const hasErrors = errors.length > 0;
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${
      hasErrors 
        ? 'border-red-300 bg-red-50/30' 
        : isComplete 
        ? 'border-green-300 bg-green-50/30'
        : 'border-gray-200'
    } transition-all duration-300 ${className}`}>
      
      {/* Header del Step */}
      <div className={`px-6 py-4 border-b-2 rounded-t-xl ${
        hasErrors 
          ? 'border-red-200 bg-gradient-to-r from-red-50 to-red-100/50' 
          : isComplete
          ? 'border-green-200 bg-gradient-to-r from-green-50 to-green-100/50'
          : 'border-gray-200 bg-gradient-to-r from-ras-azul/5 to-ras-turquesa/5'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Ícono */}
            {icon && (
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${
                hasErrors
                  ? 'bg-red-100 text-red-600'
                  : isComplete
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gradient-to-br from-ras-azul/10 to-ras-turquesa/10'
              } flex items-center justify-center transition-all`}>
                <svg 
                  className={`w-6 h-6 ${hasErrors ? 'text-red-600' : isComplete ? 'text-green-600' : iconColor}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            
            {/* Título y descripción */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 font-poppins">
                  {title}
                </h2>
                
                {/* Badge de step */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  hasErrors
                    ? 'bg-red-200 text-red-700'
                    : isComplete
                    ? 'bg-green-200 text-green-700'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  Paso {step}
                </span>
              </div>
              
              {description && (
                <p className="text-sm text-gray-600 mt-1 font-roboto">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {/* Indicador de completitud */}
          {showCompleteIndicator && (
            <div className="flex-shrink-0">
              {isComplete ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-bold text-green-700">Completo</span>
                </div>
              ) : hasErrors ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-bold text-red-700">{errors.length} Error{errors.length > 1 ? 'es' : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-bold text-amber-700">Pendiente</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Errores en el header (si existen) */}
        {hasErrors && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800 mb-1">
                  Por favor corrige los siguientes errores:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700 font-roboto">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Contenido del Step */}
      <div className="p-6">
        {children}
      </div>
      
      {/* Footer informativo (opcional) */}
      {isComplete && !hasErrors && (
        <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-green-100/50 border-t border-green-200 rounded-b-xl">
          <p className="text-xs text-green-700 flex items-center gap-2 font-roboto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Este paso está completo. Puedes continuar al siguiente paso o volver a editarlo cuando quieras.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Variante compacta del WizardStepCard (sin header elaborado)
 */
export function WizardStepCardCompact({
  title,
  children,
  errors = [],
  className = ''
}: {
  title: string;
  children: React.ReactNode;
  errors?: string[];
  className?: string;
}) {
  const hasErrors = errors.length > 0;
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${
      hasErrors ? 'border-red-300' : 'border-gray-200'
    } p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4 font-poppins">
        {title}
      </h3>
      
      {hasErrors && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700 font-roboto">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {children}
    </div>
  );
}