/**
 * useDashboardChartData Hook
 * Obtiene y procesa datos para la gráfica de ingresos/egresos
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ChartData, ChartDataPoint } from '@/types/dashboard';
import { getDateRange, getPreviousDateRange } from '@/types/dashboard';
import { obtenerTodosLosMovimientos } from '@/services/cuentas-api';

interface UseDashboardChartDataReturn {
  chartData: ChartData | null;
  loading: boolean;
  error: string | null;
  refreshChartData: (days: number, showComparison: boolean) => Promise<void>;
}

export function useDashboardChartData(
  days: number = 15,
  showComparison: boolean = true
): UseDashboardChartDataReturn {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Procesar movimientos en datos de gráfica por día
   */
  const processMovementsToChartData = useCallback((
    movimientos: any[],
    startDate: Date,
    endDate: Date
  ): ChartDataPoint[] => {
    // Crear array de fechas en el rango
    const dateArray: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Agrupar movimientos por fecha
    const dataByDate = dateArray.map(date => {
      const dayMovements = movimientos.filter(m => {
        const movDate = new Date(m.fecha).toISOString().split('T')[0];
        return movDate === date;
      });

      const ingresos = dayMovements
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + m.monto, 0);

      const egresos = dayMovements
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.monto, 0);

      return {
        date,
        ingresos,
        egresos,
        balance: ingresos - egresos,
      };
    });

    return dataByDate;
  }, []);

  /**
   * Cargar datos de la gráfica
   */
  const loadChartData = useCallback(async (
    daysToShow: number,
    includeComparison: boolean
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Obtener rango de fechas actual
      const { startDate, endDate } = getDateRange(daysToShow);

      // Obtener movimientos del periodo actual
      const currentMovements = await obtenerTodosLosMovimientos(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Procesar datos del periodo actual
      const currentData = processMovementsToChartData(
        currentMovements,
        startDate,
        endDate
      );

      // Calcular resumen del periodo actual
      const totalIngresos = currentData.reduce((sum, d) => sum + d.ingresos, 0);
      const totalEgresos = currentData.reduce((sum, d) => sum + d.egresos, 0);
      const balance = totalIngresos - totalEgresos;

      let previousData: ChartDataPoint[] | undefined;
      let changeVsPrevious: number | undefined;

      // Obtener datos del periodo anterior si se solicita comparación
      if (includeComparison) {
        const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange(daysToShow);

        const previousMovements = await obtenerTodosLosMovimientos(
          prevStart.toISOString().split('T')[0],
          prevEnd.toISOString().split('T')[0]
        );

        previousData = processMovementsToChartData(
          previousMovements,
          prevStart,
          prevEnd
        );

        // Calcular cambio vs periodo anterior
        const prevTotalIngresos = previousData.reduce((sum, d) => sum + d.ingresos, 0);
        const prevTotalEgresos = previousData.reduce((sum, d) => sum + d.egresos, 0);
        const prevBalance = prevTotalIngresos - prevTotalEgresos;

        if (prevBalance !== 0) {
          changeVsPrevious = ((balance - prevBalance) / Math.abs(prevBalance)) * 100;
        } else if (balance !== 0) {
          changeVsPrevious = 100;
        } else {
          changeVsPrevious = 0;
        }
      }

      // Construir objeto de datos de gráfica
      const chartData: ChartData = {
        current: currentData,
        previous: previousData,
        summary: {
          totalIngresos,
          totalEgresos,
          balance,
          changeVsPrevious,
        },
      };

      setChartData(chartData);
    } catch (err: any) {
      console.error('Error cargando datos de gráfica:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [processMovementsToChartData]);

  /**
   * Refrescar datos de la gráfica
   */
  const refreshChartData = useCallback(async (
    daysToShow: number,
    includeComparison: boolean
  ) => {
    await loadChartData(daysToShow, includeComparison);
  }, [loadChartData]);

  // Cargar datos al montar o cuando cambian los parámetros
  useEffect(() => {
    loadChartData(days, showComparison);
  }, [days, showComparison, loadChartData]);

  return {
    chartData,
    loading,
    error,
    refreshChartData,
  };
}
