/**
 * WIZARD PROGRESS
 * 
 * Componente que muestra el progreso visual del wizard
 * - Barra de progreso horizontal
 * - Indicadores de steps completados
 * - Navegación entre steps (click)
 */

'use client';

import React from 'react';
import { WIZARD_STEPS, getStepConfigById } from '../config/wizardConfig';
import { WizardProgressProps } from '../types/wizard.types';

export default function WizardProgress({
  currentStep,
  completedSteps,
  onStepClick,
  progress
}: WizardProgressProps) {
  
  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4">
        
        {/* Barra de progreso superior */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Progreso general
            </span>
            <span className="text-sm font-bold text-ras-azul">
              {progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ras-azul to-ras-turquesa rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps horizontales */}
        <div className="relative">
          {/* Línea conectora */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
          
          <div className="relative flex justify-between items-start">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = completedSteps.has(step.id);
              const isPast = step.id < currentStep;
              const isClickable = onStepClick && (isPast || isCompleted);
              
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / WIZARD_STEPS.length}%` }}
                >
                  {/* Círculo del step */}
                  <button
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    className={`
                      relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300 font-bold text-sm
                      ${isActive 
                        ? 'bg-gradient-to-br from-ras-azul to-ras-turquesa text-white shadow-lg scale-110 ring-4 ring-ras-azul/20' 
                        : isCompleted || isPast
                        ? 'bg-gradient-to-br from-ras-turquesa to-ras-azul text-white shadow-md hover:scale-105'
                        : 'bg-white text-gray-400 border-2 border-gray-300'
                      }
                      ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                    `}
                  >
                    {isCompleted ? (
                      // Checkmark para steps completados
                      <svg 
                        className="w-6 h-6" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3"
                      >
                        <path 
                          d="M5 13l4 4L19 7" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      // Número del step
                      <span>{step.id}</span>
                    )}
                  </button>

                  {/* Label del step */}
                  <div className="mt-3 text-center">
                    <p className={`
                      text-sm font-semibold transition-colors
                      ${isActive 
                        ? 'text-ras-azul' 
                        : isCompleted || isPast
                        ? 'text-ras-turquesa'
                        : 'text-gray-500'
                      }
                    `}>
                      {step.name}
                    </p>
                    
                    {/* Descripción solo en step activo en pantallas grandes */}
                    {isActive && (
                      <p className="hidden md:block text-xs text-gray-500 mt-1 max-w-[120px]">
                        {step.description}
                      </p>
                    )}
                  </div>

                  {/* Ícono opcional (solo en step activo) */}
                  {isActive && (
                    <div className="hidden lg:block mt-2">
                      <div className={`${step.icon.color}`}>
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <path 
                            d={step.icon.svg} 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Información del step actual (mobile) */}
        <div className="md:hidden mt-4 p-3 bg-ras-crema/30 rounded-lg border border-ras-azul/20">
          <div className="flex items-center gap-2">
            {(() => {
              const currentStepConfig = getStepConfigById(currentStep);
              if (!currentStepConfig) return null;
              
              return (
                <>
                  <svg 
                    className={`w-5 h-5 ${currentStepConfig.icon.color}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path 
                      d={currentStepConfig.icon.svg} 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ras-azul">
                      {currentStepConfig.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {currentStepConfig.description}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}