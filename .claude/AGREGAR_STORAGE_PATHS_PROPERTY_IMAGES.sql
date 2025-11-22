-- ============================================================================
-- MIGRACIÓN: Agregar columnas storage_path a property_images
-- ============================================================================
-- Fecha: 21 Noviembre 2025
-- Descripción: Agregar columnas para almacenar rutas de Storage
-- ============================================================================

-- Agregar columnas storage_path_display y storage_path_thumbnail
ALTER TABLE property_images
ADD COLUMN IF NOT EXISTS storage_path_display TEXT,
ADD COLUMN IF NOT EXISTS storage_path_thumbnail TEXT;

-- Actualizar columnas existentes para que dimensions y file_size sean opcionales
-- (ya son JSONB pero vamos a asegurarnos que no sean NOT NULL)

-- Verificar la estructura actualizada
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'property_images'
ORDER BY ordinal_position;

-- Comentarios para documentación
COMMENT ON COLUMN property_images.storage_path_display IS 'Ruta del archivo display en Supabase Storage (e.g. propiedades/{id}/display/file.jpg)';
COMMENT ON COLUMN property_images.storage_path_thumbnail IS 'Ruta del archivo thumbnail en Supabase Storage (e.g. propiedades/{id}/thumbnails/file.jpg)';
