/**
 * DashboardWidget Component
 * Widget card reutilizable para el dashboard
 * Soporta drag & drop, loading states, y animaciones
 */

'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { WidgetId, WidgetData } from '@/types/dashboard';
import { AVAILABLE_WIDGETS, formatCurrency, formatPercentage } from '@/types/dashboard';

interface DashboardWidgetProps {
  widgetId: WidgetId;
  data?: WidgetData;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
  compact?: boolean; // Modo compacto para grid 2x2
}

export function DashboardWidget({
  widgetId,
  data,
  onClick,
  className = '',
  isDragging = false,
  compact = false,
}: DashboardWidgetProps) {
  const metadata = AVAILABLE_WIDGETS[widgetId];

  if (!metadata) {
    return null;
  }

  // Obtener icono de Lucide
  const IconComponent = (LucideIcons as any)[metadata.icon] || LucideIcons.HelpCircle;

  // Estado de carga
  if (data?.loading) {
    return (
      <div
        className={`
          bg-white rounded-2xl shadow-lg p-6 border border-gray-100
          transition-all duration-200 hover:shadow-xl
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${className}
        `}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="w-16 h-6 bg-gray-200 rounded" />
          </div>
          <div className="w-24 h-8 bg-gray-200 rounded mb-2" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Color del icono según la categoría
  const iconColors = {
    financial: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
    properties: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
    operations: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white',
  };

  const iconColor = iconColors[metadata.category];

  // Color del trend
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  const trendColor = data?.trend ? trendColors[data.trend] : 'text-gray-600 bg-gray-50';

  // Formatear valor
  const formatValue = (value: string | number) => {
    if (typeof value === 'string') return value;

    // Si es un widget financiero, formatear como moneda
    if (metadata.category === 'financial' && metadata.id !== 'occupancy_rate') {
      return formatCurrency(value);
    }

    // Si es un número, formatear con separadores
    return value.toLocaleString('es-MX');
  };

  // Modo compacto (para grid 2x2)
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          bg-white rounded-xl p-4 border-2 hover:shadow-md transition-all cursor-pointer
          ${isDragging ? 'opacity-50 scale-95' : ''}
          border-gray-200
          ${className}
        `}
      >
        <div className="text-xs font-medium text-gray-500 mb-1">{metadata.title}</div>
        <div className="text-xl font-bold text-gray-900">
          {data ? formatValue(data.value) : '---'}
        </div>
      </div>
    );
  }

  // Modo normal (original)
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl shadow-lg p-6 border border-gray-100
        transition-all duration-200 hover:shadow-xl cursor-pointer
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'}
        ${className}
      `}
    >
      {/* Header con icono */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
          <IconComponent className="w-6 h-6" />
        </div>

        {/* Badge de cambio */}
        {data?.change !== undefined && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${trendColor}`}>
            {formatPercentage(data.change, 1)}
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">
          {data ? formatValue(data.value) : '---'}
        </div>
      </div>

      {/* Título */}
      <div className="text-sm font-medium text-gray-600">
        {metadata.title}
      </div>

      {/* Error */}
      {data?.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          Error al cargar
        </div>
      )}
    </div>
  );
}

/**
 * Widget skeleton para loading
 */
export function DashboardWidgetSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          <div className="w-16 h-6 bg-gray-200 rounded-full" />
        </div>
        <div className="w-32 h-8 bg-gray-200 rounded mb-2" />
        <div className="w-40 h-4 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

/**
 * Empty widget placeholder (para modo edición)
 */
export function DashboardWidgetPlaceholder({
  onAddWidget,
  className = '',
}: {
  onAddWidget?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onAddWidget}
      className={`
        bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300
        p-6 cursor-pointer
        transition-all duration-200 hover:border-blue-400 hover:bg-blue-50
        ${className}
      `}
    >
      <div className="flex flex-col items-center justify-center h-full text-center">
        <LucideIcons.Plus className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-600">Agregar Widget</p>
        <p className="text-xs text-gray-500 mt-1">Haz clic para elegir</p>
      </div>
    </div>
  );
}
