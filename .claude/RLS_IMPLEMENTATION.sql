-- ================================================================
-- RLS IMPLEMENTATION SCRIPT - RAS v1.2
-- ================================================================
-- Sistema: Realty Administration System
-- Versión: 1.0.0
-- Fecha: 20 de Noviembre 2025
-- Descripción: Script completo para habilitar RLS en todas las tablas
-- 
-- INSTRUCCIONES:
-- 1. Ir a Supabase SQL Editor
-- 2. Copiar TODO este archivo
-- 3. Ejecutar en el proyecto RAS
-- 4. Verificar que no hay errores
-- 5. Correr tests en TEST_RLS_POLICIES.sql
-- ================================================================

-- ================================================================
-- TABLA 1: propiedades
-- ================================================================

ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuario ve sus propiedades + colaboraciones
CREATE POLICY "propiedades_select_owner_or_collaborator"
  ON propiedades
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM propiedades_colaboradores
      WHERE propiedad_id = propiedades.id
        AND user_id = auth.uid()
    )
  );

-- Policy: INSERT - Solo el usuario propietario
CREATE POLICY "propiedades_insert_as_owner"
  ON propiedades
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy: UPDATE - Solo dueño
CREATE POLICY "propiedades_update_only_owner"
  ON propiedades
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: DELETE - Solo dueño
CREATE POLICY "propiedades_delete_only_owner"
  ON propiedades
  FOR DELETE
  USING (owner_id = auth.uid());

-- ================================================================
-- TABLA 2: property_images
-- ================================================================

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_images_select_owner_or_collaborator"
  ON property_images
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    property_id IN (
      SELECT propiedad_id FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "property_images_insert_own_properties"
  ON property_images
  FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "property_images_update_own_properties"
  ON property_images
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "property_images_delete_own_properties"
  ON property_images
  FOR DELETE
  USING (
    property_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

-- ================================================================
-- TABLA 3: propiedades_colaboradores
-- ================================================================

ALTER TABLE propiedades_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaboradores_select_own_or_is_collaborator"
  ON propiedades_colaboradores
  FOR SELECT
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

CREATE POLICY "colaboradores_insert_own_properties"
  ON propiedades_colaboradores
  FOR INSERT
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "colaboradores_update_own_properties"
  ON propiedades_colaboradores
  FOR UPDATE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "colaboradores_delete_own_properties"
  ON propiedades_colaboradores
  FOR DELETE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

-- ================================================================
-- TABLA 4: servicios_inmueble
-- ================================================================

ALTER TABLE servicios_inmueble ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servicios_select_own_properties"
  ON servicios_inmueble
  FOR SELECT
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    propiedad_id IN (
      SELECT propiedad_id FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "servicios_insert_own_properties"
  ON servicios_inmueble
  FOR INSERT
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "servicios_update_own_properties"
  ON servicios_inmueble
  FOR UPDATE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "servicios_delete_own_properties"
  ON servicios_inmueble
  FOR DELETE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

-- ================================================================
-- TABLA 5: fechas_pago_servicios
-- ================================================================

ALTER TABLE fechas_pago_servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fechas_pago_select_own_properties"
  ON fechas_pago_servicios
  FOR SELECT
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    propiedad_id IN (
      SELECT propiedad_id FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "fechas_pago_insert_own_properties"
  ON fechas_pago_servicios
  FOR INSERT
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "fechas_pago_update_own_properties"
  ON fechas_pago_servicios
  FOR UPDATE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "fechas_pago_delete_own_properties"
  ON fechas_pago_servicios
  FOR DELETE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

-- ================================================================
-- TABLA 6: tickets
-- ================================================================

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select_own_properties"
  ON tickets
  FOR SELECT
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    propiedad_id IN (
      SELECT propiedad_id FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
    OR
    asignado_a = auth.uid()
    OR
    creado_por = auth.uid()
  );

CREATE POLICY "tickets_insert_own_properties"
  ON tickets
  FOR INSERT
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "tickets_update_own_properties_or_assigned"
  ON tickets
  FOR UPDATE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    asignado_a = auth.uid()
  )
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    asignado_a = auth.uid()
  );

CREATE POLICY "tickets_delete_own_properties"
  ON tickets
  FOR DELETE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

-- ================================================================
-- TABLA 7: documentos
-- ================================================================

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_select_own_properties"
  ON documentos
  FOR SELECT
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
    OR
    propiedad_id IN (
      SELECT propiedad_id FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "documentos_insert_own_properties"
  ON documentos
  FOR INSERT
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "documentos_update_own_properties"
  ON documentos
  FOR UPDATE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "documentos_delete_own_properties"
  ON documentos
  FOR DELETE
  USING (
    propiedad_id IN (
      SELECT id FROM propiedades 
      WHERE owner_id = auth.uid()
    )
  );

-- ================================================================
-- TABLA 8: contactos
-- ================================================================

ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contactos_select_own_only"
  ON contactos
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "contactos_insert_own_only"
  ON contactos
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contactos_update_own_only"
  ON contactos
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contactos_delete_own_only"
  ON contactos
  FOR DELETE
  USING (user_id = auth.uid());

-- ================================================================
-- TABLA 9: profiles
-- ================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_collaborators"
  ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR
    id IN (
      SELECT DISTINCT user_id FROM propiedades_colaboradores
      WHERE propiedad_id IN (
        SELECT id FROM propiedades WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "profiles_update_own_only"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

SELECT
  'Políticas RLS Implementadas' AS resultado,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- ================================================================
-- FIN DEL SCRIPT
-- ================================================================
-- Tiempo de ejecución: ~5-10 segundos
-- Próximo paso: Ejecutar TEST_RLS_POLICIES.sql
-- ================================================================

