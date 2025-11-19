/**
 * WizardFieldGroup
 * 
 * Componente para agrupar campos relacionados dentro de un step
 * Proporciona título, descripción opcional, ícono y collapse functionality
 * 
 * Features:
 * - Título y descripción
 * - Ícono SVG opcional
 * - Colapsable (opcional)
 * - Badge de "opcional"
 * - Ayuda contextual
 * - Estilos RAS consistentes
 */

'use client';

import React, { useState } from 'react';

export interface WizardFieldGroupProps {
  /** Título del grupo */
  title: string;
  
  /** Descripción del grupo */
  description?: string;
  
  /** Ícono SVG path */
  icon?: React.ReactNode;
  
  /** Color del ícono */
  iconColor?: string;
  
  /** Si el grupo es opcional */
  optional?: boolean;
  
  /** Si el grupo puede colapsarse */
  collapsible?: boolean;
  
  /** Si el grupo inicia colapsado */
  defaultCollapsed?: boolean;
  
  /** Texto de ayuda contextual */
  helpText?: string;
  
  /** Contenido del grupo */
  children: React.ReactNode;
  
  /** Clase CSS adicional */
  className?: string;
  
  /** Callback cuando se colapsa/expande */
  onToggle?: (isCollapsed: boolean) => void;
}

export default function WizardFieldGroup({
  title,
  description,
  icon,
  iconColor = 'text-ras-azul',
  optional = false,
  collapsible = false,
  defaultCollapsed = false,
  helpText,
  children,
  className = '',
  onToggle
}: WizardFieldGroupProps) {
  
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onToggle?.(newState);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header del grupo */}
      <div className={`flex items-start justify-between gap-3 ${
        collapsible ? 'cursor-pointer' : ''
      }`}
        onClick={collapsible ? handleToggle : undefined}
      >
        <div className="flex items-start gap-3 flex-1">
          {/* Ícono */}
          {icon && (
            <div className={`flex-shrink-0 ${iconColor} mt-1`}>
              {icon}
            </div>
          )}
          
          {/* Título y descripción */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 font-poppins">
                {title}
              </h3>
              
              {/* Badge opcional */}
              {optional && (
                <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-600">
                  Opcional
                </span>
              )}
            </div>
            
            {/* Descripción */}
            {description && (
              <p className="text-sm text-gray-600 mt-1 font-roboto">
                {description}
              </p>
            )}
            
            {/* Ayuda contextual */}
            {helpText && !isCollapsed && (
              <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-xs text-blue-700 font-roboto">
                  {helpText}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Botón colapsar/expandir */}
        {collapsible && (
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label={isCollapsed ? 'Expandir' : 'Colapsar'}
          >
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Contenido del grupo */}
      {!isCollapsed && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Variante con borde del WizardFieldGroup
 */
export function WizardFieldGroupBordered({
  title,
  description,
  icon,
  children,
  optional = false,
  className = ''
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={`border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white ${className}`}>
      <div className="mb-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0 text-ras-azul">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 font-poppins">
                {title}
              </h3>
              {optional && (
                <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-600">
                  Opcional
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-600 mt-1 font-roboto">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Variante compacta sin header elaborado
 */
export function WizardFieldGroupCompact({
  title,
  children,
  className = ''
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-bold text-gray-700 font-poppins uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Divisor visual entre grupos
 */
export function WizardFieldDivider({ 
  text,
  className = '' 
}: { 
  text?: string;
  className?: string;
}) {
  return (
    <div className={`relative my-6 ${className}`}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t-2 border-gray-200" />
      </div>
      {text && (
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-sm font-semibold text-gray-500 font-poppins">
            {text}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Helper component para campos en grid
 */
export function WizardFieldGrid({
  columns = 2,
  children,
  className = ''
}: {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };
  
  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Helper component para campos inline
 */
export function WizardFieldInline({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {children}
    </div>
  );
}