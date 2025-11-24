// ================================================================
// 📊 DASHBOARD TYPES - RAS v1.2
// ================================================================
// Sistema: Realty Administration System
// Versión: 1.2.0
// Fecha: 23 de Noviembre 2025
// Descripción: Tipos TypeScript para dashboard personalizable
// ================================================================

// ================================================================
// WIDGET TYPES
// ================================================================

/**
 * IDs de widgets disponibles en el dashboard
 */
export type WidgetId =
  | 'total_balance'
  | 'total_properties'
  | 'pending_tickets'
  | 'monthly_income'
  | 'monthly_expenses'
  | 'occupancy_rate'
  | 'pending_payments'
  | 'properties_published'
  | 'active_services'
  | 'recent_activity';

/**
 * Metadata de un widget individual
 */
export interface WidgetMetadata {
  id: WidgetId;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  category: 'financial' | 'properties' | 'operations';
}

/**
 * Datos de un widget
 */
export interface WidgetData {
  id: WidgetId;
  value: string | number;
  change?: number; // Porcentaje de cambio vs periodo anterior
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  error?: string;
}

// ================================================================
// DASHBOARD CONFIG TYPES
// ================================================================

/**
 * Tipo de gráfica
 */
export type ChartType = 'line' | 'bar' | 'area';

/**
 * Configuración del dashboard almacenada en BD
 */
export interface DashboardConfig {
  id: string;
  user_id: string;
  visible_widgets: WidgetId[];
  widget_order: WidgetId[];
  chart_type: ChartType;
  chart_days: 7 | 15 | 30 | 60 | 90;
  show_comparison: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Configuración por defecto del dashboard
 */
const DEFAULT_DASHBOARD_CONFIG: Omit<DashboardConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  visible_widgets: ['total_balance', 'total_properties', 'pending_tickets', 'monthly_income'],
  widget_order: ['total_balance', 'total_properties', 'pending_tickets', 'monthly_income'],
  chart_type: 'line',
  chart_days: 7,
  show_comparison: true,
};

// ================================================================
// CHART DATA TYPES
// ================================================================

/**
 * Punto de datos en la gráfica
 */
export interface ChartDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  ingresos: number;
  egresos: number;
  balance: number;
}

/**
 * Datos completos de la gráfica con comparación
 */
export interface ChartData {
  current: ChartDataPoint[];
  previous?: ChartDataPoint[];
  summary: {
    totalIngresos: number;
    totalEgresos: number;
    balance: number;
    changeVsPrevious?: number;
  };
}

// ================================================================
// WIDGET CATALOG
// ================================================================

/**
 * Catálogo completo de widgets disponibles
 */
const AVAILABLE_WIDGETS: Record<WidgetId, WidgetMetadata> = {
  total_balance: {
    id: 'total_balance',
    title: 'Balance Total',
    description: 'Saldo total de todas las cuentas',
    icon: 'Wallet',
    category: 'financial',
  },
  total_properties: {
    id: 'total_properties',
    title: 'Total de Propiedades',
    description: 'Número total de propiedades gestionadas',
    icon: 'Building2',
    category: 'properties',
  },
  pending_tickets: {
    id: 'pending_tickets',
    title: 'Tickets Pendientes',
    description: 'Tickets de pago pendientes de procesar',
    icon: 'FileText',
    category: 'operations',
  },
  monthly_income: {
    id: 'monthly_income',
    title: 'Ingresos del Mes',
    description: 'Total de ingresos en el mes actual',
    icon: 'TrendingUp',
    category: 'financial',
  },
  monthly_expenses: {
    id: 'monthly_expenses',
    title: 'Egresos del Mes',
    description: 'Total de egresos en el mes actual',
    icon: 'TrendingDown',
    category: 'financial',
  },
  occupancy_rate: {
    id: 'occupancy_rate',
    title: 'Tasa de Ocupación',
    description: 'Porcentaje de propiedades ocupadas',
    icon: 'Home',
    category: 'properties',
  },
  pending_payments: {
    id: 'pending_payments',
    title: 'Pagos Pendientes',
    description: 'Monto total de pagos pendientes',
    icon: 'DollarSign',
    category: 'financial',
  },
  properties_published: {
    id: 'properties_published',
    title: 'Propiedades Publicadas',
    description: 'Propiedades activas en el catálogo público',
    icon: 'Eye',
    category: 'properties',
  },
  active_services: {
    id: 'active_services',
    title: 'Servicios Activos',
    description: 'Servicios configurados y activos',
    icon: 'Settings',
    category: 'operations',
  },
  recent_activity: {
    id: 'recent_activity',
    title: 'Actividad Reciente',
    description: 'Últimas acciones realizadas',
    icon: 'Activity',
    category: 'operations',
  },
};

// ================================================================
// HELPER TYPES
// ================================================================

/**
 * Estado de carga del dashboard
 */
export interface DashboardState {
  config: DashboardConfig | null;
  widgets: WidgetData[];
  chartData: ChartData | null;
  isLoading: boolean;
  isEditing: boolean;
  error: string | null;
}

/**
 * Acciones para actualizar el dashboard
 */
export type DashboardAction =
  | { type: 'SET_CONFIG'; payload: DashboardConfig }
  | { type: 'UPDATE_WIDGET_DATA'; payload: WidgetData }
  | { type: 'UPDATE_CHART_DATA'; payload: ChartData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REORDER_WIDGETS'; payload: WidgetId[] }
  | { type: 'TOGGLE_WIDGET'; payload: WidgetId }
  | { type: 'UPDATE_CHART_CONFIG'; payload: Partial<Pick<DashboardConfig, 'chart_type' | 'chart_days' | 'show_comparison'>> };

// ================================================================
// API RESPONSE TYPES
// ================================================================

/**
 * Respuesta de la API al obtener configuración
 */
export interface GetDashboardConfigResponse {
  success: boolean;
  data?: DashboardConfig;
  error?: string;
}

/**
 * Respuesta de la API al actualizar configuración
 */
export interface UpdateDashboardConfigResponse {
  success: boolean;
  data?: DashboardConfig;
  error?: string;
}

/**
 * Respuesta de la API al obtener datos de gráfica
 */
export interface GetChartDataResponse {
  success: boolean;
  data?: ChartData;
  error?: string;
}

/**
 * Respuesta de la API al obtener datos de widget
 */
export interface GetWidgetDataResponse {
  success: boolean;
  data?: WidgetData;
  error?: string;
}

// ================================================================
// VALIDATION HELPERS
// ================================================================

/**
 * Valida que un ID sea un widget válido
 */
function isValidWidgetId(id: string): id is WidgetId {
  return id in AVAILABLE_WIDGETS;
}

/**
 * Valida que un tipo de gráfica sea válido
 */
function isValidChartType(type: string): type is ChartType {
  return ['line', 'bar', 'area'].includes(type);
}

/**
 * Valida que los días de gráfica sean válidos
 */
function isValidChartDays(days: number): days is 7 | 15 | 30 | 60 | 90 {
  return [7, 15, 30, 60, 90].includes(days);
}

/**
 * Valida que el array de widgets tenga máximo 4 elementos
 */
function validateWidgetCount(widgets: WidgetId[]): boolean {
  return widgets.length <= 4 && widgets.length >= 1;
}

/**
 * Valida que todos los IDs en el array sean widgets válidos
 */
function validateWidgetIds(widgets: string[]): widgets is WidgetId[] {
  return widgets.every(isValidWidgetId);
}

// ================================================================
// FORMATTING HELPERS
// ================================================================

/**
 * Formatea un número como moneda
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un porcentaje
 */
function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Formatea una fecha corta
 */
function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/**
 * Obtiene el rango de fechas para la gráfica
 */
function getDateRange(days: number): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate };
}

/**
 * Obtiene el rango de fechas del periodo anterior
 */
function getPreviousDateRange(days: number): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - days - 1);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days * 2) - 1);

  return { startDate, endDate };
}

// ================================================================
// EXPORT ALL
// ================================================================

export type {
  WidgetMetadata,
  WidgetData,
  DashboardConfig,
  ChartDataPoint,
  ChartData,
  DashboardState,
  DashboardAction,
  GetDashboardConfigResponse,
  UpdateDashboardConfigResponse,
  GetChartDataResponse,
  GetWidgetDataResponse,
};

export {
  AVAILABLE_WIDGETS,
  DEFAULT_DASHBOARD_CONFIG,
  isValidWidgetId,
  isValidChartType,
  isValidChartDays,
  validateWidgetCount,
  validateWidgetIds,
  formatCurrency,
  formatPercentage,
  formatShortDate,
  getDateRange,
  getPreviousDateRange,
};
