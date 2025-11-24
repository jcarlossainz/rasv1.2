/**
 * IncomeExpenseChart Component
 * Gráfica profesional de ingresos y egresos con Recharts
 * Soporta comparación con periodo anterior
 */

'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import type { ChartType, ChartData, ChartDataPoint } from '@/types/dashboard';
import { formatCurrency, formatShortDate, formatPercentage } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IncomeExpenseChartProps {
  data: ChartData | null;
  chartType?: ChartType;
  showComparison?: boolean;
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[200px]">
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
              {formatCurrency(entry.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Componente de resumen estadístico
 */
function ChartSummary({ data }: { data: ChartData }) {
  const { summary } = data;

  const getTrendIcon = () => {
    if (!summary.changeVsPrevious) return <Minus className="w-4 h-4 text-gray-400" />;
    if (summary.changeVsPrevious > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (!summary.changeVsPrevious) return 'text-gray-600';
    if (summary.changeVsPrevious > 0) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Total Ingresos */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
        <p className="text-sm text-green-700 font-medium mb-1">Total Ingresos</p>
        <p className="text-2xl font-bold text-green-900">
          {formatCurrency(summary.totalIngresos)}
        </p>
      </div>

      {/* Total Egresos */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
        <p className="text-sm text-red-700 font-medium mb-1">Total Egresos</p>
        <p className="text-2xl font-bold text-red-900">
          {formatCurrency(summary.totalEgresos)}
        </p>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-700 font-medium mb-1">Balance Neto</p>
        <p className="text-2xl font-bold text-blue-900">
          {formatCurrency(summary.balance)}
        </p>
        {summary.changeVsPrevious !== undefined && (
          <div className={`flex items-center gap-1 mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-semibold">
              {formatPercentage(summary.changeVsPrevious)}
            </span>
            <span className="text-xs text-gray-600">vs anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente principal de la gráfica
 */
export function IncomeExpenseChart({
  data,
  chartType = 'line',
  showComparison = false,
  loading = false,
  className = '',
}: IncomeExpenseChartProps) {
  // Preparar datos para la gráfica
  const chartData = useMemo(() => {
    if (!data || !data.current) return [];

    return data.current.map((point: ChartDataPoint) => ({
      date: formatShortDate(point.date),
      fullDate: point.date,
      ingresos: point.ingresos,
      egresos: point.egresos,
      balance: point.balance,
    }));
  }, [data]);

  // Estado de carga
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Sin datos
  if (!data || !data.current || data.current.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600 font-medium">No hay datos disponibles</p>
            <p className="text-sm text-gray-500 mt-2">
              Los datos aparecerán cuando registres ingresos y egresos
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Colores del tema
  const colors = {
    ingresos: '#10b981', // green-500
    egresos: '#ef4444',  // red-500
    balance: '#3b82f6',  // blue-500
    grid: '#f3f4f6',     // gray-100
    text: '#6b7280',     // gray-500
  };

  // Renderizar gráfica según el tipo
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const commonAxisProps = {
      xAxis: {
        dataKey: 'date',
        stroke: colors.text,
        tick: { fill: colors.text, fontSize: 12 },
        tickLine: { stroke: colors.text },
      },
      yAxis: {
        stroke: colors.text,
        tick: { fill: colors.text, fontSize: 12 },
        tickLine: { stroke: colors.text },
        tickFormatter: (value: number) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
          return value.toString();
        },
      },
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis {...commonAxisProps.xAxis} />
        <YAxis {...commonAxisProps.yAxis} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
          formatter={(value) => {
            const labels: Record<string, string> = {
              ingresos: 'Ingresos',
              egresos: 'Egresos',
              balance: 'Balance',
            };
            return labels[value] || value;
          }}
        />
      </>
    );

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {commonElements}
            <Bar dataKey="ingresos" fill={colors.ingresos} radius={[8, 8, 0, 0]} />
            <Bar dataKey="egresos" fill={colors.egresos} radius={[8, 8, 0, 0]} />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.ingresos} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.ingresos} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.egresos} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.egresos} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke={colors.ingresos}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIngresos)"
            />
            <Area
              type="monotone"
              dataKey="egresos"
              stroke={colors.egresos}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEgresos)"
            />
          </AreaChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            {commonElements}
            <Line
              type="monotone"
              dataKey="ingresos"
              stroke={colors.ingresos}
              strokeWidth={3}
              dot={{ fill: colors.ingresos, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="egresos"
              stroke={colors.egresos}
              strokeWidth={3}
              dot={{ fill: colors.egresos, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-4 border border-gray-200 ${className}`}>
      {/* Título simple */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-700">Ingresos y Egresos (últimos {chartData.length} días)</h3>
      </div>

      {/* Gráfica */}
      <div className="w-full h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
