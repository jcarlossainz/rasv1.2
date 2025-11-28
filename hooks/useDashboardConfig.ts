/**
 * useDashboardConfig Hook
 * Maneja la configuración personalizable del dashboard
 * Sincroniza con Supabase en tiempo real
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type {
  DashboardConfig,
  WidgetId,
  ChartType,
  DEFAULT_DASHBOARD_CONFIG,
} from '@/types/dashboard';

interface UseDashboardConfigReturn {
  config: DashboardConfig | null;
  loading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<DashboardConfig>) => Promise<void>;
  reorderWidgets: (newOrder: WidgetId[]) => Promise<void>;
  toggleWidget: (widgetId: WidgetId) => Promise<void>;
  updateChartConfig: (
    chartType?: ChartType,
    chartDays?: 7 | 15 | 30 | 60 | 90,
    showComparison?: boolean
  ) => Promise<void>;
  resetToDefault: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

export function useDashboardConfig(): UseDashboardConfigReturn {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar configuración del usuario desde Supabase
   */
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Buscar configuración existente
      const { data: existingConfig, error: fetchError } = await supabase
        .from('user_dashboard_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, esto es OK
        throw fetchError;
      }

      // Si existe configuración, usarla
      if (existingConfig) {
        setConfig(existingConfig);
        return;
      }

      // Si no existe, crear configuración por defecto
      const defaultConfig = {
        user_id: user.id,
        visible_widgets: ['total_balance', 'total_properties', 'pending_tickets', 'monthly_income', 'monthly_expenses', 'tickets_today'] as WidgetId[],
        widget_order: ['total_balance', 'total_properties', 'pending_tickets', 'monthly_income', 'monthly_expenses', 'tickets_today'] as WidgetId[],
        chart_type: 'line' as ChartType,
        chart_days: 7 as const,
        show_comparison: true,
      };

      const { data: newConfig, error: createError } = await supabase
        .from('user_dashboard_config')
        .insert(defaultConfig)
        .select()
        .single();

      if (createError) throw createError;

      setConfig(newConfig);
    } catch (err: any) {
      console.error('Error cargando configuración del dashboard:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar configuración en Supabase
   */
  const updateConfig = useCallback(async (updates: Partial<DashboardConfig>) => {
    try {
      if (!config) {
        throw new Error('No hay configuración cargada');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Remover campos que no se deben actualizar directamente
      const { id, user_id, created_at, updated_at, ...validUpdates } = updates as any;

      const { data: updatedConfig, error: updateError } = await supabase
        .from('user_dashboard_config')
        .update(validUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setConfig(updatedConfig);
    } catch (err: any) {
      console.error('Error actualizando configuración:', err);
      setError(err.message || 'Error actualizando configuración');
      throw err;
    }
  }, [config]);

  /**
   * Reordenar widgets
   */
  const reorderWidgets = useCallback(async (newOrder: WidgetId[]) => {
    try {
      if (!config) return;

      await updateConfig({
        widget_order: newOrder,
      });
    } catch (err: any) {
      console.error('Error reordenando widgets:', err);
      throw err;
    }
  }, [config, updateConfig]);

  /**
   * Activar/desactivar un widget
   */
  const toggleWidget = useCallback(async (widgetId: WidgetId) => {
    try {
      if (!config) return;

      const currentVisible = config.visible_widgets || [];
      let newVisible: WidgetId[];

      if (currentVisible.includes(widgetId)) {
        // Desactivar widget (mínimo 1 widget debe estar visible)
        if (currentVisible.length === 1) {
          throw new Error('Debe haber al menos 1 widget visible');
        }
        newVisible = currentVisible.filter(id => id !== widgetId);
      } else {
        // Activar widget (máximo 6 widgets)
        if (currentVisible.length >= 6) {
          throw new Error('Máximo 6 widgets visibles');
        }
        newVisible = [...currentVisible, widgetId];
      }

      await updateConfig({
        visible_widgets: newVisible,
        widget_order: newVisible,
      });
    } catch (err: any) {
      console.error('Error toggling widget:', err);
      throw err;
    }
  }, [config, updateConfig]);

  /**
   * Actualizar configuración de la gráfica
   */
  const updateChartConfig = useCallback(async (
    chartType?: ChartType,
    chartDays?: 7 | 15 | 30 | 60 | 90,
    showComparison?: boolean
  ) => {
    try {
      if (!config) return;

      const updates: Partial<DashboardConfig> = {};

      if (chartType !== undefined) {
        updates.chart_type = chartType;
      }

      if (chartDays !== undefined) {
        updates.chart_days = chartDays;
      }

      if (showComparison !== undefined) {
        updates.show_comparison = showComparison;
      }

      await updateConfig(updates);
    } catch (err: any) {
      console.error('Error actualizando configuración de gráfica:', err);
      throw err;
    }
  }, [config, updateConfig]);

  /**
   * Resetear a configuración por defecto
   */
  const resetToDefault = useCallback(async () => {
    try {
      const defaultConfig = {
        visible_widgets: ['total_balance', 'total_properties', 'pending_tickets', 'monthly_income', 'monthly_expenses', 'tickets_today'] as WidgetId[],
        widget_order: ['total_balance', 'total_properties', 'pending_tickets', 'monthly_income', 'monthly_expenses', 'tickets_today'] as WidgetId[],
        chart_type: 'line' as ChartType,
        chart_days: 15 as const,
        show_comparison: true,
      };

      await updateConfig(defaultConfig);
    } catch (err: any) {
      console.error('Error reseteando configuración:', err);
      throw err;
    }
  }, [updateConfig]);

  /**
   * Refrescar configuración (útil después de cambios externos)
   */
  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Suscribirse a cambios en tiempo real (opcional)
  useEffect(() => {
    if (!config) return;

    let channel: any = null;

    const setupRealtimeSubscription = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      channel = supabase
        .channel('dashboard-config-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_dashboard_config',
            filter: `user_id=eq.${data.user.id}`,
          },
          (payload) => {
            setConfig(payload.new as DashboardConfig);
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [config]);

  return {
    config,
    loading,
    error,
    updateConfig,
    reorderWidgets,
    toggleWidget,
    updateChartConfig,
    resetToDefault,
    refreshConfig,
  };
}
