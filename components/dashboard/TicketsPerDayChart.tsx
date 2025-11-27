/**
 * TicketsPerDayChart Component
 * Gráfica de tickets por día con Recharts
 */

'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { formatShortDate } from '@/types/dashboard';
import type { TicketsChartData, TicketsChartDataPoint } from '@/hooks/useTicketsChartData';

interface TicketsPerDayChartProps {
  data: TicketsChartData | null;
  loading?: boolean;
  className?: string;
}

/**
 * Tooltip personalizado para la gráfica
 */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[180px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Componente principal de la gráfica de tickets
 */
export function TicketsPerDayChart({
  data,
  loading = false,
  className = '',
}: TicketsPerDayChartProps) {
  // Preparar datos para la gráfica
  const chartData = useMemo(() => {
    if (!data || !data.current) return [];

    return data.current.map((point: TicketsChartDataPoint) => ({
      date: formatShortDate(point.date),
      fullDate: point.date,
      Completados: point.completados,
      Pendientes: point.pendientes,
    }));
  }, [data]);

  // Estado de carga
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-md p-3 border border-gray-200 h-full flex flex-col ${className}`}>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
            <p className="text-gray-600 text-sm">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Sin datos
  if (!data || !data.current || data.current.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-md p-3 border border-gray-200 h-full flex flex-col ${className}`}>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-600 font-medium text-sm">No hay tickets</p>
            <p className="text-xs text-gray-500 mt-1">
              Los datos aparecerán cuando crees tickets
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Colores del tema
  const colors = {
    completados: '#10b981', // green-500
    pendientes: '#f59e0b',  // amber-500
    grid: '#f3f4f6',        // gray-100
    text: '#6b7280',        // gray-500
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-3 border border-gray-200 h-full flex flex-col ${className}`}>
      {/* Título simple */}
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-gray-600">Tickets por día</h3>
      </div>

      {/* Gráfica - se ajusta automáticamente */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.text }}
            />
            <YAxis
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.text }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar
              dataKey="Completados"
              fill={colors.completados}
              radius={[4, 4, 0, 0]}
              stackId="tickets"
            />
            <Bar
              dataKey="Pendientes"
              fill={colors.pendientes}
              radius={[4, 4, 0, 0]}
              stackId="tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
