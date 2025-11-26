-- ============================================================================
-- SISTEMA RLS (Row Level Security) - RASV1.2
-- ============================================================================
-- Fecha: 2025-11-26
-- Versión: 1.0 Producción
--
-- ROLES:
--   - administrador: Dueño de la propiedad, acceso total
--   - propietario: Todo excepto Config
--   - supervisor: Sin acceso a Config, Archivero, Balance
--   - promotor: Solo acceso a Anuncio (datos públicos)
-- ============================================================================

-- ============================================================================
-- PASO 0: LIMPIAR POLÍTICAS EXISTENTES (si las hay)
-- ============================================================================

-- Eliminar políticas existentes de profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_empresa" ON profiles;

-- Eliminar políticas existentes de propiedades
DROP POLICY IF EXISTS "propiedades_select" ON propiedades;
DROP POLICY IF EXISTS "propiedades_insert" ON propiedades;
DROP POLICY IF EXISTS "propiedades_update" ON propiedades;
DROP POLICY IF EXISTS "propiedades_delete" ON propiedades;

-- Eliminar políticas existentes de propiedades_colaboradores
DROP POLICY IF EXISTS "colaboradores_select" ON propiedades_colaboradores;
DROP POLICY IF EXISTS "colaboradores_insert" ON propiedades_colaboradores;
DROP POLICY IF EXISTS "colaboradores_update" ON propiedades_colaboradores;
DROP POLICY IF EXISTS "colaboradores_delete" ON propiedades_colaboradores;

-- Eliminar políticas existentes de tickets
DROP POLICY IF EXISTS "tickets_select" ON tickets;
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
DROP POLICY IF EXISTS "tickets_update" ON tickets;
DROP POLICY IF EXISTS "tickets_delete" ON tickets;

-- Eliminar políticas existentes de mensajes_tickets
DROP POLICY IF EXISTS "mensajes_tickets_select" ON mensajes_tickets;
DROP POLICY IF EXISTS "mensajes_tickets_insert" ON mensajes_tickets;

-- Eliminar políticas existentes de calendar_events
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

-- Eliminar políticas existentes de ical_sources
DROP POLICY IF EXISTS "ical_sources_select" ON ical_sources;
DROP POLICY IF EXISTS "ical_sources_insert" ON ical_sources;
DROP POLICY IF EXISTS "ical_sources_update" ON ical_sources;
DROP POLICY IF EXISTS "ical_sources_delete" ON ical_sources;

-- Eliminar políticas existentes de property_images
DROP POLICY IF EXISTS "property_images_select" ON property_images;
DROP POLICY IF EXISTS "property_images_insert" ON property_images;
DROP POLICY IF EXISTS "property_images_update" ON property_images;
DROP POLICY IF EXISTS "property_images_delete" ON property_images;

-- Eliminar políticas existentes de property_archivos
DROP POLICY IF EXISTS "property_archivos_select" ON property_archivos;
DROP POLICY IF EXISTS "property_archivos_insert" ON property_archivos;
DROP POLICY IF EXISTS "property_archivos_update" ON property_archivos;
DROP POLICY IF EXISTS "property_archivos_delete" ON property_archivos;

-- Eliminar políticas existentes de property_inventory
DROP POLICY IF EXISTS "property_inventory_select" ON property_inventory;
DROP POLICY IF EXISTS "property_inventory_insert" ON property_inventory;
DROP POLICY IF EXISTS "property_inventory_update" ON property_inventory;
DROP POLICY IF EXISTS "property_inventory_delete" ON property_inventory;

-- Eliminar políticas existentes de cuentas
DROP POLICY IF EXISTS "cuentas_select" ON cuentas;
DROP POLICY IF EXISTS "cuentas_insert" ON cuentas;
DROP POLICY IF EXISTS "cuentas_update" ON cuentas;
DROP POLICY IF EXISTS "cuentas_delete" ON cuentas;

-- Eliminar políticas existentes de ingresos
DROP POLICY IF EXISTS "ingresos_select" ON ingresos;
DROP POLICY IF EXISTS "ingresos_insert" ON ingresos;
DROP POLICY IF EXISTS "ingresos_update" ON ingresos;
DROP POLICY IF EXISTS "ingresos_delete" ON ingresos;

-- Eliminar políticas existentes de user_dashboard_config
DROP POLICY IF EXISTS "dashboard_config_select" ON user_dashboard_config;
DROP POLICY IF EXISTS "dashboard_config_insert" ON user_dashboard_config;
DROP POLICY IF EXISTS "dashboard_config_update" ON user_dashboard_config;
DROP POLICY IF EXISTS "dashboard_config_delete" ON user_dashboard_config;

-- Eliminar políticas existentes de proveedores
DROP POLICY IF EXISTS "proveedores_select" ON proveedores;
DROP POLICY IF EXISTS "proveedores_insert" ON proveedores;
DROP POLICY IF EXISTS "proveedores_update" ON proveedores;
DROP POLICY IF EXISTS "proveedores_delete" ON proveedores;

-- Eliminar políticas existentes de empresas
DROP POLICY IF EXISTS "empresas_select" ON empresas;
DROP POLICY IF EXISTS "empresas_update" ON empresas;

-- Eliminar funciones helper existentes (si las hay)
DROP FUNCTION IF EXISTS get_user_role_for_property(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_property_access(UUID);
DROP FUNCTION IF EXISTS user_has_role(UUID, TEXT[]);

-- ============================================================================
-- PASO 1: FUNCIÓN HELPER PARA VERIFICAR ROLES
-- ============================================================================

-- Función para obtener el rol de un usuario en una propiedad
CREATE OR REPLACE FUNCTION get_user_role_for_property(property_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Primero verificar si es el owner (administrador)
    IF EXISTS (
        SELECT 1 FROM propiedades
        WHERE id = property_uuid AND owner_id = user_uuid
    ) THEN
        RETURN 'administrador';
    END IF;

    -- Buscar rol en propiedades_colaboradores
    SELECT rol INTO user_role
    FROM propiedades_colaboradores
    WHERE propiedad_id = property_uuid
      AND (user_id = user_uuid OR email_invitado = (
          SELECT email FROM profiles WHERE id = user_uuid
      ))
    LIMIT 1;

    RETURN COALESCE(user_role, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si usuario tiene acceso a una propiedad
CREATE OR REPLACE FUNCTION user_has_property_access(property_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role_for_property(property_uuid, auth.uid()) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar roles específicos
CREATE OR REPLACE FUNCTION user_has_role(property_uuid UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    user_role := get_user_role_for_property(property_uuid, auth.uid());
    RETURN user_role = ANY(allowed_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 2: HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ical_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 3: POLÍTICAS PARA PROFILES
-- ============================================================================

-- Usuarios pueden ver su propio perfil
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Usuarios pueden ver perfiles de su misma empresa
CREATE POLICY "profiles_select_same_empresa" ON profiles
    FOR SELECT USING (
        empresa_id IS NOT NULL AND
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- PASO 4: POLÍTICAS PARA PROPIEDADES
-- ============================================================================

-- SELECT: Todos los roles pueden ver propiedades donde tienen acceso
CREATE POLICY "propiedades_select" ON propiedades
    FOR SELECT USING (
        owner_id = auth.uid() OR
        user_has_property_access(id)
    );

-- INSERT: Solo usuarios autenticados pueden crear propiedades
CREATE POLICY "propiedades_insert" ON propiedades
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        owner_id = auth.uid()
    );

-- UPDATE: Solo administrador y propietario pueden editar
CREATE POLICY "propiedades_update" ON propiedades
    FOR UPDATE USING (
        owner_id = auth.uid() OR
        user_has_role(id, ARRAY['propietario'])
    );

-- DELETE: Solo el owner (administrador) puede eliminar
CREATE POLICY "propiedades_delete" ON propiedades
    FOR DELETE USING (owner_id = auth.uid());

-- ============================================================================
-- PASO 5: POLÍTICAS PARA PROPIEDADES_COLABORADORES
-- ============================================================================

-- SELECT: Ver colaboradores de propiedades donde tengo acceso
CREATE POLICY "colaboradores_select" ON propiedades_colaboradores
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM propiedades
            WHERE id = propiedad_id AND owner_id = auth.uid()
        )
    );

-- INSERT: Solo el owner puede agregar colaboradores
CREATE POLICY "colaboradores_insert" ON propiedades_colaboradores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM propiedades
            WHERE id = propiedad_id AND owner_id = auth.uid()
        )
    );

-- UPDATE: Solo el owner puede modificar colaboradores
CREATE POLICY "colaboradores_update" ON propiedades_colaboradores
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM propiedades
            WHERE id = propiedad_id AND owner_id = auth.uid()
        )
    );

-- DELETE: Solo el owner puede eliminar colaboradores
CREATE POLICY "colaboradores_delete" ON propiedades_colaboradores
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM propiedades
            WHERE id = propiedad_id AND owner_id = auth.uid()
        )
    );

-- ============================================================================
-- PASO 6: POLÍTICAS PARA TICKETS
-- ============================================================================
-- Acceso: administrador, propietario, supervisor (NO promotor)

-- SELECT
CREATE POLICY "tickets_select" ON tickets
    FOR SELECT USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- INSERT
CREATE POLICY "tickets_insert" ON tickets
    FOR INSERT WITH CHECK (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- UPDATE
CREATE POLICY "tickets_update" ON tickets
    FOR UPDATE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- DELETE: Solo administrador y propietario
CREATE POLICY "tickets_delete" ON tickets
    FOR DELETE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 7: POLÍTICAS PARA MENSAJES_TICKETS
-- ============================================================================
-- Acceso: administrador, propietario, supervisor (NO promotor)

-- SELECT
CREATE POLICY "mensajes_tickets_select" ON mensajes_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND user_has_role(t.property_id, ARRAY['administrador', 'propietario', 'supervisor'])
        )
    );

-- INSERT
CREATE POLICY "mensajes_tickets_insert" ON mensajes_tickets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND user_has_role(t.property_id, ARRAY['administrador', 'propietario', 'supervisor'])
        )
    );

-- ============================================================================
-- PASO 8: POLÍTICAS PARA CALENDAR_EVENTS
-- ============================================================================
-- Acceso: administrador, propietario, supervisor (NO promotor)

-- SELECT
CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- INSERT
CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT WITH CHECK (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- UPDATE
CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- DELETE
CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 9: POLÍTICAS PARA ICAL_SOURCES
-- ============================================================================
-- Acceso: administrador, propietario (CRUD), supervisor (solo lectura)

-- SELECT
CREATE POLICY "ical_sources_select" ON ical_sources
    FOR SELECT USING (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- INSERT
CREATE POLICY "ical_sources_insert" ON ical_sources
    FOR INSERT WITH CHECK (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- UPDATE
CREATE POLICY "ical_sources_update" ON ical_sources
    FOR UPDATE USING (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- DELETE
CREATE POLICY "ical_sources_delete" ON ical_sources
    FOR DELETE USING (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 10: POLÍTICAS PARA PROPERTY_IMAGES
-- ============================================================================
-- Acceso: TODOS los roles pueden ver (para Anuncio), solo admin/propietario editan

-- SELECT: Todos los roles
CREATE POLICY "property_images_select" ON property_images
    FOR SELECT USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor', 'promotor'])
    );

-- INSERT: Solo administrador y propietario
CREATE POLICY "property_images_insert" ON property_images
    FOR INSERT WITH CHECK (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- UPDATE: Solo administrador y propietario
CREATE POLICY "property_images_update" ON property_images
    FOR UPDATE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- DELETE: Solo administrador y propietario
CREATE POLICY "property_images_delete" ON property_images
    FOR DELETE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 11: POLÍTICAS PARA PROPERTY_ARCHIVOS (Archivero)
-- ============================================================================
-- Acceso: SOLO administrador y propietario (NO supervisor, NO promotor)

-- SELECT
CREATE POLICY "property_archivos_select" ON property_archivos
    FOR SELECT USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- INSERT
CREATE POLICY "property_archivos_insert" ON property_archivos
    FOR INSERT WITH CHECK (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- UPDATE
CREATE POLICY "property_archivos_update" ON property_archivos
    FOR UPDATE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- DELETE
CREATE POLICY "property_archivos_delete" ON property_archivos
    FOR DELETE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 12: POLÍTICAS PARA PROPERTY_INVENTORY
-- ============================================================================
-- Acceso: administrador, propietario, supervisor (NO promotor)

-- SELECT
CREATE POLICY "property_inventory_select" ON property_inventory
    FOR SELECT USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- INSERT
CREATE POLICY "property_inventory_insert" ON property_inventory
    FOR INSERT WITH CHECK (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- UPDATE
CREATE POLICY "property_inventory_update" ON property_inventory
    FOR UPDATE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario', 'supervisor'])
    );

-- DELETE
CREATE POLICY "property_inventory_delete" ON property_inventory
    FOR DELETE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 13: POLÍTICAS PARA CUENTAS (Balance)
-- ============================================================================
-- Acceso: SOLO administrador y propietario (NO supervisor, NO promotor)

-- SELECT
CREATE POLICY "cuentas_select" ON cuentas
    FOR SELECT USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- INSERT
CREATE POLICY "cuentas_insert" ON cuentas
    FOR INSERT WITH CHECK (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- UPDATE
CREATE POLICY "cuentas_update" ON cuentas
    FOR UPDATE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- DELETE
CREATE POLICY "cuentas_delete" ON cuentas
    FOR DELETE USING (
        user_has_role(property_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 14: POLÍTICAS PARA INGRESOS (Balance)
-- ============================================================================
-- Acceso: SOLO administrador y propietario (NO supervisor, NO promotor)

-- SELECT
CREATE POLICY "ingresos_select" ON ingresos
    FOR SELECT USING (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- INSERT
CREATE POLICY "ingresos_insert" ON ingresos
    FOR INSERT WITH CHECK (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- UPDATE
CREATE POLICY "ingresos_update" ON ingresos
    FOR UPDATE USING (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- DELETE
CREATE POLICY "ingresos_delete" ON ingresos
    FOR DELETE USING (
        user_has_role(propiedad_id, ARRAY['administrador', 'propietario'])
    );

-- ============================================================================
-- PASO 15: POLÍTICAS PARA USER_DASHBOARD_CONFIG (Config)
-- ============================================================================
-- Acceso: SOLO el propio usuario (administrador de su cuenta)

-- SELECT: Solo el propio usuario
CREATE POLICY "dashboard_config_select" ON user_dashboard_config
    FOR SELECT USING (user_id = auth.uid());

-- INSERT: Solo el propio usuario
CREATE POLICY "dashboard_config_insert" ON user_dashboard_config
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: Solo el propio usuario
CREATE POLICY "dashboard_config_update" ON user_dashboard_config
    FOR UPDATE USING (user_id = auth.uid());

-- DELETE: Solo el propio usuario
CREATE POLICY "dashboard_config_delete" ON user_dashboard_config
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PASO 16: POLÍTICAS PARA PROVEEDORES
-- ============================================================================
-- Acceso: administrador, propietario, supervisor (NO promotor)

-- SELECT
CREATE POLICY "proveedores_select" ON proveedores
    FOR SELECT USING (
        -- Proveedores de propiedades donde tengo acceso
        EXISTS (
            SELECT 1 FROM propiedades p
            WHERE p.id = propiedad_id
            AND user_has_role(p.id, ARRAY['administrador', 'propietario', 'supervisor'])
        )
        OR
        -- Proveedores de mi empresa
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    );

-- INSERT
CREATE POLICY "proveedores_insert" ON proveedores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM propiedades p
            WHERE p.id = propiedad_id
            AND user_has_role(p.id, ARRAY['administrador', 'propietario'])
        )
        OR
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    );

-- UPDATE
CREATE POLICY "proveedores_update" ON proveedores
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM propiedades p
            WHERE p.id = propiedad_id
            AND user_has_role(p.id, ARRAY['administrador', 'propietario'])
        )
        OR
        empresa_id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    );

-- DELETE
CREATE POLICY "proveedores_delete" ON proveedores
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM propiedades p
            WHERE p.id = propiedad_id
            AND user_has_role(p.id, ARRAY['administrador', 'propietario'])
        )
    );

-- ============================================================================
-- PASO 17: POLÍTICAS PARA EMPRESAS
-- ============================================================================

-- SELECT: Usuarios pueden ver su empresa
CREATE POLICY "empresas_select" ON empresas
    FOR SELECT USING (
        id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
    );

-- UPDATE: Solo admins de la empresa pueden actualizar
CREATE POLICY "empresas_update" ON empresas
    FOR UPDATE USING (
        id = (SELECT empresa_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================================================
-- PASO 18: POLÍTICAS PARA SERVICE ROLE (Backend)
-- ============================================================================
-- El service_role siempre tiene acceso completo (bypass RLS)
-- Esto ya está configurado por defecto en Supabase

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Query para verificar que RLS está habilitado en todas las tablas
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'propiedades',
    'propiedades_colaboradores',
    'profiles',
    'tickets',
    'mensajes_tickets',
    'calendar_events',
    'ical_sources',
    'property_images',
    'property_archivos',
    'property_inventory',
    'cuentas',
    'ingresos',
    'user_dashboard_config',
    'proveedores',
    'empresas'
);

-- Query para listar todas las políticas creadas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
