-- =====================================================
-- STORAGE: property-files bucket
-- Descripción: Bucket para almacenar documentos importantes
-- de propiedades (contratos, estados de cuenta, etc.)
-- =====================================================

-- Crear bucket para archivos de propiedades
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-files', 'property-files', false)
ON CONFLICT (id) DO NOTHING;

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
      AND propiedades.propietario_id = auth.uid()
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
      AND propiedades.propietario_id = auth.uid()
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
      AND propiedades.propietario_id = auth.uid()
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
      AND propiedades.propietario_id = auth.uid()
    )
  )
);

-- Comentarios
COMMENT ON TABLE storage.buckets IS 'Bucket property-files para documentos importantes de propiedades';
