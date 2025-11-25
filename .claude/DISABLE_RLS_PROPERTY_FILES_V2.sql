-- =====================================================
-- DESACTIVAR RLS PARA PROPERTY-FILES (V2 - PERMISIVO)
-- Descripción: Crea políticas completamente permisivas
-- que permiten TODO sin restricciones
-- =====================================================

-- 1. Hacer el bucket público
UPDATE storage.buckets
SET public = true
WHERE id = 'property-files';

-- 2. Eliminar TODAS las políticas existentes de storage.objects
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

-- 3. Crear políticas completamente permisivas (sin restricciones)
-- Estas políticas permiten TODO a TODOS los usuarios autenticados

CREATE POLICY "Allow all authenticated users to SELECT"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-files');

CREATE POLICY "Allow all authenticated users to INSERT"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-files');

CREATE POLICY "Allow all authenticated users to UPDATE"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-files')
WITH CHECK (bucket_id = 'property-files');

CREATE POLICY "Allow all authenticated users to DELETE"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-files');

-- También para usuarios anónimos (si es necesario)
CREATE POLICY "Allow anon SELECT"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'property-files');

CREATE POLICY "Allow anon INSERT"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'property-files');

-- 4. Desactivar RLS en la tabla property_archivos
ALTER TABLE property_archivos DISABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas de property_archivos
DROP POLICY IF EXISTS "Users can view archivos from their properties" ON property_archivos;
DROP POLICY IF EXISTS "Users can insert archivos to their properties" ON property_archivos;
DROP POLICY IF EXISTS "Users can update archivos from their properties" ON property_archivos;
DROP POLICY IF EXISTS "Users can delete archivos from their properties" ON property_archivos;

-- Verificación
SELECT 'Bucket status:' as info, public::text as value
FROM storage.buckets
WHERE id = 'property-files'

UNION ALL

SELECT 'RLS on property_archivos:' as info,
  CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as value
FROM pg_class
WHERE relname = 'property_archivos'

UNION ALL

SELECT 'Storage policies count:' as info, COUNT(*)::text as value
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
