/**
 * useDashboardWidgets Hook
 * Obtiene y calcula datos para todos los widgets del dashboard
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { WidgetId, WidgetData } from '@/types/dashboard';
import {
  obtenerBalanceTotalUsuario,
  obtenerTodosLosMovimientos,
} from '@/services/cuentas-api';

interface UseDashboardWidgetsReturn {
  widgets: Record<WidgetId, WidgetData>;
  loading: boolean;
  error: string | null;
  refreshWidgets: () => Promise<void>;
  refreshWidget: (widgetId: WidgetId) => Promise<void>;
}

export function useDashboardWidgets(): UseDashboardWidgetsReturn {
  const [widgets, setWidgets] = useState<Record<WidgetId, WidgetData>>({} as Record<WidgetId, WidgetData>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcular datos de un widget específico
   */
  const calculateWidgetData = useCallback(async (widgetId: WidgetId): Promise<WidgetData> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Calcular según el tipo de widget
      switch (widgetId) {
        case 'total_balance': {
          const balance = await obtenerBalanceTotalUsuario();
          const totalMXN = balance.balance_total_mxn;
          const totalUSD = balance.balance_total_usd;

          return {
            id: 'total_balance',
            value: totalMXN,
            loading: false,
          };
        }

        case 'total_properties': {
          const { count, error } = await supabase
            .from('propiedades')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id);

          if (error) throw error;

          return {
            id: 'total_properties',
            value: count || 0,
            loading: false,
          };
        }

        case 'pending_tickets': {
          // Obtener propiedades del usuario
          const { data: propiedades } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const propiedadIds = propiedades?.map(p => p.id) || [];

          if (propiedadIds.length === 0) {
            return {
              id: 'pending_tickets',
              value: 0,
              loading: false,
            };
          }

          // Contar tickets pendientes (tabla unificada)
          const { count: ticketsCount, error: ticketsError } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .in('propiedad_id', propiedadIds)
            .eq('pagado', false);

          if (ticketsError) throw ticketsError;

          return {
            id: 'pending_tickets',
            value: ticketsCount || 0,
            loading: false,
          };
        }

        case 'monthly_income': {
          // Calcular ingresos del mes actual
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          const movimientos = await obtenerTodosLosMovimientos(
            firstDay.toISOString().split('T')[0],
            lastDay.toISOString().split('T')[0]
          );

          const totalIngresos = movimientos
            .filter(m => m.tipo === 'ingreso')
            .reduce((sum, m) => sum + m.monto, 0);

          // Calcular cambio vs mes anterior
          const prevFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0);

          const prevMovimientos = await obtenerTodosLosMovimientos(
            prevFirstDay.toISOString().split('T')[0],
            prevLastDay.toISOString().split('T')[0]
          );

          const prevTotalIngresos = prevMovimientos
            .filter(m => m.tipo === 'ingreso')
            .reduce((sum, m) => sum + m.monto, 0);

          const change = prevTotalIngresos > 0
            ? ((totalIngresos - prevTotalIngresos) / prevTotalIngresos) * 100
            : 0;

          return {
            id: 'monthly_income',
            value: totalIngresos,
            change,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            loading: false,
          };
        }

        case 'monthly_expenses': {
          // Calcular egresos del mes actual
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          const movimientos = await obtenerTodosLosMovimientos(
            firstDay.toISOString().split('T')[0],
            lastDay.toISOString().split('T')[0]
          );

          const totalEgresos = movimientos
            .filter(m => m.tipo === 'egreso')
            .reduce((sum, m) => sum + m.monto, 0);

          // Calcular cambio vs mes anterior
          const prevFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0);

          const prevMovimientos = await obtenerTodosLosMovimientos(
            prevFirstDay.toISOString().split('T')[0],
            prevLastDay.toISOString().split('T')[0]
          );

          const prevTotalEgresos = prevMovimientos
            .filter(m => m.tipo === 'egreso')
            .reduce((sum, m) => sum + m.monto, 0);

          const change = prevTotalEgresos > 0
            ? ((totalEgresos - prevTotalEgresos) / prevTotalEgresos) * 100
            : 0;

          return {
            id: 'monthly_expenses',
            value: totalEgresos,
            change,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            loading: false,
          };
        }

        case 'occupancy_rate': {
          // Calcular tasa de ocupación (propiedades publicadas / total)
          const { data: totalProps } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const { data: publishedProps } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id)
            .eq('estado_anuncio', 'publicado');

          const total = totalProps?.length || 0;
          const published = publishedProps?.length || 0;

          const rate = total > 0 ? (published / total) * 100 : 0;

          return {
            id: 'occupancy_rate',
            value: `${rate.toFixed(0)}%`,
            loading: false,
          };
        }

        case 'pending_payments': {
          // Obtener propiedades del usuario
          const { data: propiedades } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const propiedadIds = propiedades?.map(p => p.id) || [];

          if (propiedadIds.length === 0) {
            return {
              id: 'pending_payments',
              value: 0,
              loading: false,
            };
          }

          // Sumar montos de tickets pendientes (tabla unificada)
          const { data: tickets } = await supabase
            .from('tickets')
            .select('monto_estimado')
            .in('propiedad_id', propiedadIds)
            .eq('pagado', false);

          const totalTickets = tickets?.reduce((sum, t) => sum + (t.monto_estimado || 0), 0) || 0;

          return {
            id: 'pending_payments',
            value: totalTickets,
            loading: false,
          };
        }

        case 'properties_published': {
          const { count, error } = await supabase
            .from('propiedades')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id)
            .eq('estado_anuncio', 'publicado');

          if (error) throw error;

          return {
            id: 'properties_published',
            value: count || 0,
            loading: false,
          };
        }

        case 'active_services': {
          // Obtener propiedades del usuario
          const { data: propiedades } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const propiedadIds = propiedades?.map(p => p.id) || [];

          if (propiedadIds.length === 0) {
            return {
              id: 'active_services',
              value: 0,
              loading: false,
            };
          }

          const { count, error } = await supabase
            .from('servicios_inmueble')
            .select('id', { count: 'exact', head: true })
            .in('propiedad_id', propiedadIds)
            .eq('activo', true);

          if (error) throw error;

          return {
            id: 'active_services',
            value: count || 0,
            loading: false,
          };
        }

        case 'recent_activity': {
          // Contar movimientos de los últimos 7 días
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const movimientos = await obtenerTodosLosMovimientos(
            sevenDaysAgo.toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          );

          return {
            id: 'recent_activity',
            value: movimientos.length,
            loading: false,
          };
        }

        case 'tickets_today': {
          // Tickets para hoy
          const { data: propiedades } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const propiedadIds = propiedades?.map(p => p.id) || [];

          if (propiedadIds.length === 0) {
            return { id: 'tickets_today', value: 0, loading: false };
          }

          const today = new Date().toISOString().split('T')[0];

          const { count } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .in('propiedad_id', propiedadIds)
            .eq('fecha_programada', today)
            .eq('pagado', false);

          return {
            id: 'tickets_today',
            value: count || 0,
            loading: false,
          };
        }

        case 'tickets_next_7_days': {
          // Tickets próximos 7 días
          const { data: propiedades } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const propiedadIds = propiedades?.map(p => p.id) || [];

          if (propiedadIds.length === 0) {
            return { id: 'tickets_next_7_days', value: 0, loading: false };
          }

          const today = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(today.getDate() + 7);

          const { count } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .in('propiedad_id', propiedadIds)
            .gte('fecha_programada', today.toISOString().split('T')[0])
            .lte('fecha_programada', nextWeek.toISOString().split('T')[0])
            .eq('pagado', false);

          return {
            id: 'tickets_next_7_days',
            value: count || 0,
            loading: false,
          };
        }

        case 'tickets_completed': {
          // Tickets completados (pagados)
          const { data: propiedades } = await supabase
            .from('propiedades')
            .select('id')
            .eq('owner_id', user.id);

          const propiedadIds = propiedades?.map(p => p.id) || [];

          if (propiedadIds.length === 0) {
            return { id: 'tickets_completed', value: 0, loading: false };
          }

          const { count } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .in('propiedad_id', propiedadIds)
            .eq('pagado', true);

          return {
            id: 'tickets_completed',
            value: count || 0,
            loading: false,
          };
        }

        case 'yearly_income': {
          // Total ingresos del año
          const now = new Date();
          const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

          const movimientos = await obtenerTodosLosMovimientos(
            firstDayOfYear.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          );

          const totalIngresos = movimientos
            .filter(m => m.tipo === 'ingreso')
            .reduce((sum, m) => sum + m.monto, 0);

          return {
            id: 'yearly_income',
            value: totalIngresos,
            loading: false,
          };
        }

        case 'yearly_expenses': {
          // Total egresos del año
          const now = new Date();
          const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

          const movimientos = await obtenerTodosLosMovimientos(
            firstDayOfYear.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          );

          const totalEgresos = movimientos
            .filter(m => m.tipo === 'egreso')
            .reduce((sum, m) => sum + m.monto, 0);

          return {
            id: 'yearly_expenses',
            value: totalEgresos,
            loading: false,
          };
        }

        default:
          return {
            id: widgetId,
            value: 0,
            loading: false,
          };
      }
    } catch (err: any) {
      console.error(`Error calculando widget ${widgetId}:`, err);
      return {
        id: widgetId,
        value: 0,
        loading: false,
        error: err.message,
      };
    }
  }, []);

  /**
   * Refrescar todos los widgets
   */
  const refreshWidgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Lista de todos los widgets disponibles
      const allWidgetIds: WidgetId[] = [
        'total_balance',
        'total_properties',
        'pending_tickets',
        'monthly_income',
        'monthly_expenses',
        'occupancy_rate',
        'pending_payments',
        'properties_published',
        'active_services',
        'recent_activity',
        'tickets_today',
        'tickets_next_7_days',
        'tickets_completed',
        'yearly_income',
        'yearly_expenses',
      ];

      // Calcular datos de todos los widgets en paralelo
      const widgetDataPromises = allWidgetIds.map(id => calculateWidgetData(id));
      const widgetDataArray = await Promise.all(widgetDataPromises);

      // Convertir a objeto
      const widgetsObject = widgetDataArray.reduce((acc, widget) => {
        acc[widget.id] = widget;
        return acc;
      }, {} as Record<WidgetId, WidgetData>);

      setWidgets(widgetsObject);
    } catch (err: any) {
      console.error('Error refrescando widgets:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [calculateWidgetData]);

  /**
   * Refrescar un widget específico
   */
  const refreshWidget = useCallback(async (widgetId: WidgetId) => {
    try {
      const widgetData = await calculateWidgetData(widgetId);
      setWidgets(prev => ({
        ...prev,
        [widgetId]: widgetData,
      }));
    } catch (err: any) {
      console.error(`Error refrescando widget ${widgetId}:`, err);
    }
  }, [calculateWidgetData]);

  // Cargar widgets al montar
  useEffect(() => {
    refreshWidgets();
  }, [refreshWidgets]);

  return {
    widgets,
    loading,
    error,
    refreshWidgets,
    refreshWidget,
  };
}
