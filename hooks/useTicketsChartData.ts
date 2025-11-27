/**
 * useTicketsChartData Hook
 * Obtiene y procesa datos para la gráfica de tickets por día
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getDateRange } from '@/types/dashboard';

export interface TicketsChartDataPoint {
  date: string;
  total: number;
  completados: number;
  pendientes: number;
}

export interface TicketsChartData {
  current: TicketsChartDataPoint[];
  summary: {
    totalTickets: number;
    totalCompletados: number;
    totalPendientes: number;
  };
}

interface UseTicketsChartDataReturn {
  chartData: TicketsChartData | null;
  loading: boolean;
  error: string | null;
  refreshChartData: (days: number) => Promise<void>;
}

export function useTicketsChartData(days: number = 7): UseTicketsChartDataReturn {
  const [chartData, setChartData] = useState<TicketsChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChartData = useCallback(async (daysToShow: number) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener propiedades del usuario
      const { data: propiedades } = await supabase
        .from('propiedades')
        .select('id')
        .eq('owner_id', user.id);

      const propiedadIds = propiedades?.map(p => p.id) || [];

      if (propiedadIds.length === 0) {
        setChartData({
          current: [],
          summary: { totalTickets: 0, totalCompletados: 0, totalPendientes: 0 }
        });
        return;
      }

      // Obtener rango de fechas
      const { startDate, endDate } = getDateRange(daysToShow);

      // Obtener tickets del periodo
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, fecha_programada, pagado')
        .in('propiedad_id', propiedadIds)
        .gte('fecha_programada', startDate.toISOString().split('T')[0])
        .lte('fecha_programada', endDate.toISOString().split('T')[0]);

      if (ticketsError) throw ticketsError;

      // Crear array de fechas en el rango
      const dateArray: string[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        dateArray.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Agrupar tickets por fecha
      const dataByDate = dateArray.map(date => {
        const dayTickets = (tickets || []).filter(t => t.fecha_programada === date);
        const completados = dayTickets.filter(t => t.pagado).length;
        const pendientes = dayTickets.filter(t => !t.pagado).length;

        return {
          date,
          total: dayTickets.length,
          completados,
          pendientes,
        };
      });

      // Calcular resumen
      const totalTickets = (tickets || []).length;
      const totalCompletados = (tickets || []).filter(t => t.pagado).length;
      const totalPendientes = (tickets || []).filter(t => !t.pagado).length;

      setChartData({
        current: dataByDate,
        summary: {
          totalTickets,
          totalCompletados,
          totalPendientes,
        },
      });
    } catch (err: any) {
      console.error('Error cargando datos de tickets:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshChartData = useCallback(async (daysToShow: number) => {
    await loadChartData(daysToShow);
  }, [loadChartData]);

  useEffect(() => {
    loadChartData(days);
  }, [days, loadChartData]);

  return {
    chartData,
    loading,
    error,
    refreshChartData,
  };
}
