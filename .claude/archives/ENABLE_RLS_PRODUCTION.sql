-- ================================================================
-- 🔒 ENABLE RLS IN PRODUCTION - RAS v1.2
-- ================================================================
-- Sistema: Realty Administration System
-- Versión: 1.2.0
-- Fecha: 22 de Noviembre 2025
-- Descripción: Script completo para habilitar RLS en TODAS las tablas
--
-- ⚠️ CRÍTICO: Este script habilita seguridad en producción
--
-- INSTRUCCIONES:
-- 1. Ir a Supabase SQL Editor
-- 2. Copiar TODO este archivo
-- 3. Ejecutar en el proyecto RAS
-- 4. Verificar que no hay errores
-- 5. Probar funcionalidad básica
-- ================================================================

-- ================================================================
-- PASO 1: DROP EXISTING POLICIES (si existen)
-- ================================================================
-- Esto previene errores de "policy already exists"

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ================================================================
-- TABLA 1: propiedades
-- ================================================================

ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Propietario, colaboradores, Y público puede ver publicados
CREATE POLICY "propiedades_select_policy"
  ON propiedades
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Público puede ver propiedades publicadas
    estado_anuncio = 'publicado'
    OR
    -- Propietario puede ver sus propiedades
    (auth.uid() IS NOT NULL AND owner_id = auth.uid())
    OR
    -- Colaboradores pueden ver propiedades donde colaboran
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM propiedades_colaboradores
      WHERE propiedad_id = propiedades.id
        AND user_id = auth.uid()
    ))
  );

-- Policy: INSERT - Solo el usuario propietario
CREATE POLICY "propiedades_insert_as_owner"
  ON propiedades
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Policy: UPDATE - Solo dueño
CREATE POLICY "propiedades_update_only_owner"
  ON propiedades
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: DELETE - Solo dueño
CREATE POLICY "propiedades_delete_only_owner"
  ON propiedades
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ================================================================
-- TABLA 2: property_images
-- ================================================================

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Público ve imágenes de propiedades publicadas, propietarios ven las suyas
CREATE POLICY "property_images_select_policy"
  ON property_images
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Público puede ver imágenes de propiedades publicadas
    property_id IN (
      SELECT id FROM propiedades
      WHERE estado_anuncio = 'publicado'
    )
    OR
    -- Propietarios ven imágenes de sus propiedades
    (auth.uid() IS NOT NULL AND property_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    ))
    OR
    -- Colaboradores ven imágenes de propiedades donde colaboran
    (auth.uid() IS NOT NULL AND property_id IN (
      SELECT propiedad_id FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "property_images_insert_own_properties"
  ON property_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "property_images_update_own_properties"
  ON property_images
  FOR UPDATE
  TO authenticated
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
  TO authenticated
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
  TO authenticated
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
  TO authenticated
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "colaboradores_update_own_properties"
  ON propiedades_colaboradores
  FOR UPDATE
  TO authenticated
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
  TO authenticated
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
  TO authenticated
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
  TO authenticated
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "servicios_update_own_properties"
  ON servicios_inmueble
  FOR UPDATE
  TO authenticated
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
  TO authenticated
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
  TO authenticated
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
  TO authenticated
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "fechas_pago_update_own_properties"
  ON fechas_pago_servicios
  FOR UPDATE
  TO authenticated
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
  TO authenticated
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
  TO authenticated
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
  TO authenticated
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "tickets_update_own_properties_or_assigned"
  ON tickets
  FOR UPDATE
  TO authenticated
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
  TO authenticated
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
  TO authenticated
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
  TO authenticated
  WITH CHECK (
    propiedad_id IN (
      SELECT id FROM propiedades
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "documentos_update_own_properties"
  ON documentos
  FOR UPDATE
  TO authenticated
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
  TO authenticated
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
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "contactos_insert_own_only"
  ON contactos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contactos_update_own_only"
  ON contactos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contactos_delete_own_only"
  ON contactos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ================================================================
-- TABLA 9: profiles
-- ================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_collaborators"
  ON profiles
  FOR SELECT
  TO authenticated
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
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ================================================================
-- TABLA 10: cuentas (NUEVA - v1.2)
-- ================================================================

ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cuentas_select_own_only"
  ON cuentas
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cuentas_insert_own_only"
  ON cuentas
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cuentas_update_own_only"
  ON cuentas
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cuentas_delete_own_only"
  ON cuentas
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ================================================================
-- TABLA 11: ingresos (NUEVA - v1.2)
-- ================================================================

ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingresos_select_own_accounts"
  ON ingresos
  FOR SELECT
  TO authenticated
  USING (
    cuenta_id IN (
      SELECT id FROM cuentas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ingresos_insert_own_accounts"
  ON ingresos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    cuenta_id IN (
      SELECT id FROM cuentas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ingresos_update_own_accounts"
  ON ingresos
  FOR UPDATE
  TO authenticated
  USING (
    cuenta_id IN (
      SELECT id FROM cuentas
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    cuenta_id IN (
      SELECT id FROM cuentas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ingresos_delete_own_accounts"
  ON ingresos
  FOR DELETE
  TO authenticated
  USING (
    cuenta_id IN (
      SELECT id FROM cuentas
      WHERE user_id = auth.uid()
    )
  );

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

SELECT
  'RLS HABILITADO EXITOSAMENTE' AS resultado,
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ================================================================
-- FIN DEL SCRIPT
-- ================================================================
-- ✅ RLS habilitado en todas las tablas
-- ✅ Público puede ver propiedades e imágenes publicadas
-- ✅ Usuarios autenticados solo ven sus datos
-- ✅ Colaboradores tienen acceso apropiado
--
-- Tiempo de ejecución: ~10-15 segundos
-- Próximo paso: Probar funcionalidad en app
-- ================================================================
