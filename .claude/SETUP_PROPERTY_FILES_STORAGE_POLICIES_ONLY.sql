-- =====================================================
-- STORAGE: property-files bucket - SOLO POLÍTICAS
-- Descripción: Políticas RLS para el bucket property-files
-- NOTA: El bucket debe crearse manualmente desde Supabase Dashboard
-- =====================================================

-- IMPORTANTE: Antes de ejecutar este archivo, crea el bucket manualmente:
-- 1. Ve a Storage en Supabase Dashboard
-- 2. Crea un nuevo bucket llamado "property-files"
-- 3. Marca como PRIVADO (public = false)
-- 4. Luego ejecuta este archivo

-- Política: Los usuarios pueden ver archivos de sus propiedades
CREATE POLICY "Users can view files from their properties"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-files'
  AND (
    -- El path debe comenzar con el property_id que pertenece al usuario
    EXISTS (
      SELECT 1
      FROM propiedades
      WHERE propiedades.id::text = split_part(storage.objects.name, '/', 1)
      AND propiedades.owner_id = auth.uid()
    )
  )
);

-- Política: Los usuarios pueden subir archivos a sus propiedades
CREATE POLICY "Users can upload files to their properties"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-files'
  AND (
    -- El path debe comenzar con el property_id que pertenece al usuario
    EXISTS (
      SELECT 1
      FROM propiedades
      WHERE propiedades.id::text = split_part(storage.objects.name, '/', 1)
      AND propiedades.owner_id = auth.uid()
    )
  )
);

-- Política: Los usuarios pueden actualizar archivos de sus propiedades
CREATE POLICY "Users can update files from their properties"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-files'
  AND (
    EXISTS (
      SELECT 1
      FROM propiedades
      WHERE propiedades.id::text = split_part(storage.objects.name, '/', 1)
      AND propiedades.owner_id = auth.uid()
    )
  )
);

-- Política: Los usuarios pueden eliminar archivos de sus propiedades
CREATE POLICY "Users can delete files from their properties"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-files'
  AND (
    EXISTS (
      SELECT 1
      FROM propiedades
      WHERE propiedades.id::text = split_part(storage.objects.name, '/', 1)
      AND propiedades.owner_id = auth.uid()
    )
  )
);
