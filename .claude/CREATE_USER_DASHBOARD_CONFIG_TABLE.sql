-- ================================================================
-- 📊 CREAR TABLA user_dashboard_config - RAS v1.2
-- ================================================================
-- Sistema: Realty Administration System
-- Versión: 1.2.0
-- Fecha: 23 de Noviembre 2025
-- Descripción: Tabla de configuración personalizable del dashboard
--
-- FUNCIONALIDAD:
-- - Almacena widgets visibles por usuario
-- - Guarda posiciones y orden de widgets
-- - Permite personalización completa del dashboard
-- - Sincronización en tiempo real
-- ================================================================

-- ================================================================
-- TABLA: user_dashboard_config
-- ================================================================

CREATE TABLE IF NOT EXISTS user_dashboard_config (
  -- ===== IDENTIFICACIÓN =====
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ===== RELACIONES =====
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ===== CONFIGURACIÓN DE WIDGETS =====
  -- Array de widgets visibles en el lado izquierdo (máximo 4)
  visible_widgets JSONB DEFAULT '["total_balance", "total_properties", "pending_tickets", "monthly_income"]'::jsonb,

  -- Orden de los widgets (array de IDs)
  widget_order JSONB DEFAULT '["total_balance", "total_properties", "pending_tickets", "monthly_income"]'::jsonb,

  -- ===== CONFIGURACIÓN DE GRÁFICAS =====
  -- Tipo de gráfica: 'line' | 'bar' | 'area'
  chart_type TEXT DEFAULT 'line',

  -- Días a mostrar en la gráfica (7, 15, 30, 60, 90)
  chart_days INTEGER DEFAULT 7,

  -- Mostrar comparación con periodo anterior
  show_comparison BOOLEAN DEFAULT true,

  -- ===== METADATA =====
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- ===== CONSTRAINTS =====
  CONSTRAINT valid_chart_type CHECK (chart_type IN ('line', 'bar', 'area')),
  CONSTRAINT valid_chart_days CHECK (chart_days IN (7, 15, 30, 60, 90)),
  CONSTRAINT valid_widget_count CHECK (jsonb_array_length(visible_widgets) <= 4),
  CONSTRAINT unique_user_config UNIQUE (user_id)
);

-- ================================================================
-- ÍNDICES
-- ================================================================

-- Índice principal: búsqueda por usuario (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_config_user
ON user_dashboard_config(user_id);

-- ================================================================
-- TRIGGER: Actualizar updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION update_dashboard_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboard_config_timestamp
  BEFORE UPDATE ON user_dashboard_config
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_config_timestamp();

-- ================================================================
-- COMENTARIOS EN TABLA (Documentación)
-- ================================================================

COMMENT ON TABLE user_dashboard_config IS 'Configuración personalizable del dashboard por usuario';
COMMENT ON COLUMN user_dashboard_config.id IS 'Identificador único de la configuración';
COMMENT ON COLUMN user_dashboard_config.user_id IS 'FK a auth.users - usuario propietario';
COMMENT ON COLUMN user_dashboard_config.visible_widgets IS 'Array JSON de IDs de widgets visibles (máx 4)';
COMMENT ON COLUMN user_dashboard_config.widget_order IS 'Array JSON con el orden de los widgets';
COMMENT ON COLUMN user_dashboard_config.chart_type IS 'Tipo de gráfica: line, bar, area';
COMMENT ON COLUMN user_dashboard_config.chart_days IS 'Días a mostrar en gráfica: 7, 15, 30, 60, 90';
COMMENT ON COLUMN user_dashboard_config.show_comparison IS 'Mostrar comparación con periodo anterior';

-- ================================================================
-- WIDGETS DISPONIBLES (Referencia)
-- ================================================================

/*
WIDGETS DISPONIBLES:

1. total_balance - Balance Total
2. total_properties - Total de Propiedades
3. pending_tickets - Tickets Pendientes
4. monthly_income - Ingresos del Mes
5. monthly_expenses - Egresos del Mes
6. occupancy_rate - Tasa de Ocupación
7. pending_payments - Pagos Pendientes
8. properties_published - Propiedades Publicadas
9. active_services - Servicios Activos
10. recent_activity - Actividad Reciente

USUARIO PUEDE ELEGIR CUALQUIER 4 DE ESTOS WIDGETS
*/

-- ================================================================
-- DATOS DE EJEMPLO
-- ================================================================

/*
Ejemplo de configuración:

{
  "user_id": "uuid-del-usuario",
  "visible_widgets": [
    "total_balance",
    "total_properties",
    "pending_tickets",
    "monthly_income"
  ],
  "widget_order": [
    "total_balance",
    "total_properties",
    "pending_tickets",
    "monthly_income"
  ],
  "chart_type": "line",
  "chart_days": 7,
  "show_comparison": true
}
*/

-- ================================================================
-- FUNCIÓN HELPER: Crear configuración por defecto
-- ================================================================

CREATE OR REPLACE FUNCTION create_default_dashboard_config(p_user_id UUID)
RETURNS user_dashboard_config AS $$
DECLARE
  v_config user_dashboard_config;
BEGIN
  INSERT INTO user_dashboard_config (
    user_id,
    visible_widgets,
    widget_order,
    chart_type,
    chart_days,
    show_comparison
  ) VALUES (
    p_user_id,
    '["total_balance", "total_properties", "pending_tickets", "monthly_income"]'::jsonb,
    '["total_balance", "total_properties", "pending_tickets", "monthly_income"]'::jsonb,
    'line',
    7,
    true
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_config;

  RETURN v_config;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_dashboard_config IS 'Crea configuración por defecto para un usuario nuevo';

-- ================================================================
-- RLS (Row Level Security) - OPCIONAL
-- ================================================================

/*
-- Habilitar RLS
ALTER TABLE user_dashboard_config ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver/editar su propia configuración
CREATE POLICY "dashboard_config_own_data"
ON user_dashboard_config
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
*/

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Verificar que la tabla se creó correctamente
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_dashboard_config'
ORDER BY ordinal_position;

-- Verificar índices
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_dashboard_config';

-- Verificar triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'user_dashboard_config';

-- Verificar constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_dashboard_config';

-- ================================================================
-- QUERIES ÚTILES
-- ================================================================

-- Obtener configuración de un usuario
/*
SELECT * FROM user_dashboard_config
WHERE user_id = 'uuid-del-usuario';
*/

-- Actualizar widgets visibles
/*
UPDATE user_dashboard_config
SET visible_widgets = '["total_balance", "monthly_income", "pending_tickets", "occupancy_rate"]'::jsonb
WHERE user_id = 'uuid-del-usuario';
*/

-- Cambiar tipo de gráfica
/*
UPDATE user_dashboard_config
SET chart_type = 'bar', chart_days = 30
WHERE user_id = 'uuid-del-usuario';
*/

-- Resetear a configuración por defecto
/*
UPDATE user_dashboard_config
SET
  visible_widgets = '["total_balance", "total_properties", "pending_tickets", "monthly_income"]'::jsonb,
  widget_order = '["total_balance", "total_properties", "pending_tickets", "monthly_income"]'::jsonb,
  chart_type = 'line',
  chart_days = 15,
  show_comparison = true
WHERE user_id = 'uuid-del-usuario';
*/

-- ================================================================
-- FIN DEL SCRIPT
-- ================================================================
-- ✅ Tabla user_dashboard_config creada
-- ✅ Índice único por usuario creado
-- ✅ Trigger de updated_at configurado
-- ✅ Constraints de validación aplicadas
-- ✅ Función helper create_default_dashboard_config creada
--
-- Tiempo de ejecución: ~3-5 segundos
-- Próximo paso: Ejecutar en Supabase SQL Editor
-- ================================================================
