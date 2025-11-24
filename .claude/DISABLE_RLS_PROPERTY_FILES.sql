-- =====================================================
-- DESACTIVAR RLS PARA PROPERTY-FILES
-- Descripción: Elimina todas las políticas y desactiva RLS
-- para desarrollo/testing
-- =====================================================

-- 1. Hacer el bucket público temporalmente
UPDATE storage.buckets
SET public = true
WHERE id = 'property-files';

-- 2. Listar todas las políticas activas (para verificar)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';

-- 3. Eliminar TODAS las políticas de storage.objects
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 4. Desactivar RLS en la tabla property_archivos
ALTER TABLE property_archivos DISABLE ROW LEVEL SECURITY;

-- 5. Verificar que no hay políticas en property_archivos
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'property_archivos';

-- 6. Eliminar políticas de property_archivos si existen
DROP POLICY IF EXISTS "Users can view archivos from their properties" ON property_archivos;
DROP POLICY IF EXISTS "Users can insert archivos to their properties" ON property_archivos;
DROP POLICY IF EXISTS "Users can update archivos from their properties" ON property_archivos;
DROP POLICY IF EXISTS "Users can delete archivos from their properties" ON property_archivos;

-- Verificación final
SELECT
  'property-files bucket' as item,
  CASE WHEN public THEN 'PUBLIC' ELSE 'PRIVATE' END as status
FROM storage.buckets
WHERE id = 'property-files'

UNION ALL

SELECT
  'property_archivos RLS' as item,
  CASE
    WHEN relrowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as status
FROM pg_class
WHERE relname = 'property_archivos';
