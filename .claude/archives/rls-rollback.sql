-- ============================================================================
-- ROLLBACK RLS - RASV1.2
-- ============================================================================
-- Usar este script para deshabilitar RLS en caso de emergencia
-- ============================================================================

-- PASO 1: Eliminar todas las políticas
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_empresa" ON profiles;

DROP POLICY IF EXISTS "propiedades_select" ON propiedades;
DROP POLICY IF EXISTS "propiedades_insert" ON propiedades;
DROP POLICY IF EXISTS "propiedades_update" ON propiedades;
DROP POLICY IF EXISTS "propiedades_delete" ON propiedades;

DROP POLICY IF EXISTS "colaboradores_select" ON propiedades_colaboradores;
DROP POLICY IF EXISTS "colaboradores_insert" ON propiedades_colaboradores;
DROP POLICY IF EXISTS "colaboradores_update" ON propiedades_colaboradores;
DROP POLICY IF EXISTS "colaboradores_delete" ON propiedades_colaboradores;

DROP POLICY IF EXISTS "tickets_select" ON tickets;
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
DROP POLICY IF EXISTS "tickets_update" ON tickets;
DROP POLICY IF EXISTS "tickets_delete" ON tickets;

DROP POLICY IF EXISTS "mensajes_tickets_select" ON mensajes_tickets;
DROP POLICY IF EXISTS "mensajes_tickets_insert" ON mensajes_tickets;

DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

DROP POLICY IF EXISTS "ical_sources_select" ON ical_sources;
DROP POLICY IF EXISTS "ical_sources_insert" ON ical_sources;
DROP POLICY IF EXISTS "ical_sources_update" ON ical_sources;
DROP POLICY IF EXISTS "ical_sources_delete" ON ical_sources;

DROP POLICY IF EXISTS "property_images_select" ON property_images;
DROP POLICY IF EXISTS "property_images_insert" ON property_images;
DROP POLICY IF EXISTS "property_images_update" ON property_images;
DROP POLICY IF EXISTS "property_images_delete" ON property_images;

DROP POLICY IF EXISTS "property_archivos_select" ON property_archivos;
DROP POLICY IF EXISTS "property_archivos_insert" ON property_archivos;
DROP POLICY IF EXISTS "property_archivos_update" ON property_archivos;
DROP POLICY IF EXISTS "property_archivos_delete" ON property_archivos;

DROP POLICY IF EXISTS "property_inventory_select" ON property_inventory;
DROP POLICY IF EXISTS "property_inventory_insert" ON property_inventory;
DROP POLICY IF EXISTS "property_inventory_update" ON property_inventory;
DROP POLICY IF EXISTS "property_inventory_delete" ON property_inventory;

DROP POLICY IF EXISTS "cuentas_select" ON cuentas;
DROP POLICY IF EXISTS "cuentas_insert" ON cuentas;
DROP POLICY IF EXISTS "cuentas_update" ON cuentas;
DROP POLICY IF EXISTS "cuentas_delete" ON cuentas;

DROP POLICY IF EXISTS "ingresos_select" ON ingresos;
DROP POLICY IF EXISTS "ingresos_insert" ON ingresos;
DROP POLICY IF EXISTS "ingresos_update" ON ingresos;
DROP POLICY IF EXISTS "ingresos_delete" ON ingresos;

DROP POLICY IF EXISTS "dashboard_config_select" ON user_dashboard_config;
DROP POLICY IF EXISTS "dashboard_config_insert" ON user_dashboard_config;
DROP POLICY IF EXISTS "dashboard_config_update" ON user_dashboard_config;
DROP POLICY IF EXISTS "dashboard_config_delete" ON user_dashboard_config;

DROP POLICY IF EXISTS "proveedores_select" ON proveedores;
DROP POLICY IF EXISTS "proveedores_insert" ON proveedores;
DROP POLICY IF EXISTS "proveedores_update" ON proveedores;
DROP POLICY IF EXISTS "proveedores_delete" ON proveedores;

DROP POLICY IF EXISTS "empresas_select" ON empresas;
DROP POLICY IF EXISTS "empresas_update" ON empresas;

-- PASO 2: Deshabilitar RLS en todas las tablas
ALTER TABLE propiedades DISABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades_colaboradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE ical_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_archivos DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;

-- PASO 3: Eliminar funciones helper
DROP FUNCTION IF EXISTS get_user_role_for_property(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_property_access(UUID);
DROP FUNCTION IF EXISTS user_has_role(UUID, TEXT[]);

-- Verificar estado final
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
