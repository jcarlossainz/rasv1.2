-- =====================================================
-- VERIFICACIÓN Y CONFIGURACIÓN DE RLS PARA DIRECTORIO
-- =====================================================

-- PASO 1: Verificar si las políticas RLS existen
-- Ejecuta estos SELECT para ver las políticas actuales:

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('contactos', 'propiedades', 'propiedades_colaboradores')
ORDER BY tablename, policyname;

-- PASO 2: Verificar estructura de la tabla contactos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contactos'
ORDER BY ordinal_position;

-- =====================================================
-- PASO 3: CREAR/ACTUALIZAR POLÍTICAS RLS
-- =====================================================

-- 3A. HABILITAR RLS en tablas si no está habilitado
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades_colaboradores ENABLE ROW LEVEL SECURITY;

-- 3B. ELIMINAR políticas existentes si causan conflicto (opcional, comenta si no quieres borrar)
-- DROP POLICY IF EXISTS "contactos_select_policy" ON contactos;
-- DROP POLICY IF EXISTS "contactos_insert_policy" ON contactos;
-- DROP POLICY IF EXISTS "contactos_update_policy" ON contactos;
-- DROP POLICY IF EXISTS "contactos_delete_policy" ON contactos;

-- 3C. CREAR POLÍTICAS PARA CONTACTOS (proveedores)
-- Permitir SELECT a los usuarios para ver sus propios contactos
CREATE POLICY "contactos_select_policy"
ON contactos
FOR SELECT
USING (auth.uid() = user_id);

-- Permitir INSERT a los usuarios autenticados
CREATE POLICY "contactos_insert_policy"
ON contactos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permitir UPDATE a los usuarios para sus propios contactos
CREATE POLICY "contactos_update_policy"
ON contactos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permitir DELETE a los usuarios para sus propios contactos
CREATE POLICY "contactos_delete_policy"
ON contactos
FOR DELETE
USING (auth.uid() = user_id);

-- 3D. CREAR POLÍTICAS PARA PROPIEDADES
-- Permitir SELECT a los usuarios para ver sus propias propiedades
CREATE POLICY "propiedades_select_policy"
ON propiedades
FOR SELECT
USING (auth.uid() = user_id);

-- 3E. CREAR POLÍTICAS PARA PROPIEDADES_COLABORADORES
-- Permitir SELECT para colaboradores de propiedades del usuario
CREATE POLICY "propiedades_colaboradores_select_policy"
ON propiedades_colaboradores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM propiedades
    WHERE propiedades.id = propiedades_colaboradores.propiedad_id
    AND propiedades.user_id = auth.uid()
  )
);

-- Permitir INSERT para agregar colaboradores a propiedades del usuario
CREATE POLICY "propiedades_colaboradores_insert_policy"
ON propiedades_colaboradores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM propiedades
    WHERE propiedades.id = propiedades_colaboradores.propiedad_id
    AND propiedades.user_id = auth.uid()
  )
);

-- Permitir DELETE para eliminar colaboradores de propiedades del usuario
CREATE POLICY "propiedades_colaboradores_delete_policy"
ON propiedades_colaboradores
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM propiedades
    WHERE propiedades.id = propiedades_colaboradores.propiedad_id
    AND propiedades.user_id = auth.uid()
  )
);

-- =====================================================
-- PASO 4: VERIFICAR RESULTADO
-- =====================================================

-- Ejecuta este SELECT nuevamente para verificar que las políticas se crearon:
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('contactos', 'propiedades', 'propiedades_colaboradores')
ORDER BY tablename, policyname;
