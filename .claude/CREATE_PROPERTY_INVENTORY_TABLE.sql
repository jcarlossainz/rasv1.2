-- ================================================================
-- 📦 CREAR TABLA property_inventory - RAS v1.2
-- ================================================================
-- Sistema: Realty Administration System
-- Versión: 1.2.0
-- Fecha: 22 de Noviembre 2025
-- Descripción: Tabla de inventario de objetos detectados por IA
--
-- FUNCIONALIDAD:
-- - Almacena múltiples objetos por imagen
-- - Información editable por usuario
-- - Rastreable (created_at, updated_at)
-- - Integración con Google Vision API
-- ================================================================

-- ================================================================
-- TABLA: property_inventory
-- ================================================================

CREATE TABLE IF NOT EXISTS property_inventory (
  -- ===== IDENTIFICACIÓN =====
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ===== RELACIONES =====
  property_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES property_images(id) ON DELETE CASCADE,

  -- ===== DATOS DEL OBJETO =====
  object_name TEXT NOT NULL,
  space_type TEXT,  -- Tipo de espacio (Cocina, Habitación, etc.)

  -- ===== DATOS DE IA =====
  detectado_por_ia BOOLEAN DEFAULT true,
  confidence NUMERIC(5,2),  -- 0.00 - 1.00 (confianza de detección)
  labels TEXT,  -- Etiquetas adicionales separadas por comas
  image_url TEXT,  -- URL de la imagen (desnormalizado para performance)

  -- ===== DATOS EDITABLES POR USUARIO =====
  categoria TEXT,  -- Mueble, Electrodoméstico, Decoración, etc.
  estado TEXT,  -- Excelente, Bueno, Regular, Malo
  valor_estimado NUMERIC(10,2),  -- Valor monetario estimado
  notas TEXT,  -- Notas adicionales del usuario

  -- ===== METADATA =====
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- ===== CONSTRAINTS =====
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT valid_estado CHECK (estado IN ('Excelente', 'Bueno', 'Regular', 'Malo', NULL))
);

-- ================================================================
-- ÍNDICES
-- ================================================================

-- Índice principal: búsqueda por propiedad
CREATE INDEX IF NOT EXISTS idx_inventory_property
ON property_inventory(property_id);

-- Índice: búsqueda por imagen (para mostrar todos los objetos de una foto)
CREATE INDEX IF NOT EXISTS idx_inventory_image
ON property_inventory(image_id);

-- Índice: búsqueda por tipo de espacio
CREATE INDEX IF NOT EXISTS idx_inventory_space_type
ON property_inventory(property_id, space_type)
WHERE space_type IS NOT NULL;

-- Índice: objetos detectados por IA vs manuales
CREATE INDEX IF NOT EXISTS idx_inventory_detectado_ia
ON property_inventory(property_id, detectado_por_ia);

-- Índice: búsqueda por nombre de objeto (para filtros)
CREATE INDEX IF NOT EXISTS idx_inventory_object_name
ON property_inventory(property_id, object_name);

-- ================================================================
-- TRIGGER: Actualizar updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION update_property_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_timestamp
  BEFORE UPDATE ON property_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_property_inventory_timestamp();

-- ================================================================
-- COMENTARIOS EN TABLA (Documentación)
-- ================================================================

COMMENT ON TABLE property_inventory IS 'Inventario de objetos en propiedades detectados por Google Vision API';
COMMENT ON COLUMN property_inventory.id IS 'Identificador único del objeto';
COMMENT ON COLUMN property_inventory.property_id IS 'FK a propiedades';
COMMENT ON COLUMN property_inventory.image_id IS 'FK a property_images - imagen donde se detectó';
COMMENT ON COLUMN property_inventory.object_name IS 'Nombre del objeto (ej: Silla, Mesa, Refrigerador)';
COMMENT ON COLUMN property_inventory.space_type IS 'Tipo de espacio donde se encuentra (Cocina, Habitación, etc.)';
COMMENT ON COLUMN property_inventory.detectado_por_ia IS 'true si fue detectado por IA, false si se agregó manualmente';
COMMENT ON COLUMN property_inventory.confidence IS 'Nivel de confianza de la detección (0.00 a 1.00)';
COMMENT ON COLUMN property_inventory.labels IS 'Etiquetas adicionales separadas por comas';
COMMENT ON COLUMN property_inventory.image_url IS 'URL de la imagen (desnormalizado para performance)';
COMMENT ON COLUMN property_inventory.categoria IS 'Categoría editable por usuario (Mueble, Electrodoméstico, etc.)';
COMMENT ON COLUMN property_inventory.estado IS 'Estado del objeto: Excelente, Bueno, Regular, Malo';
COMMENT ON COLUMN property_inventory.valor_estimado IS 'Valor monetario estimado del objeto';
COMMENT ON COLUMN property_inventory.notas IS 'Notas adicionales del usuario';

-- ================================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ================================================================

-- Descomentar para insertar datos de ejemplo:
/*
INSERT INTO property_inventory (
  property_id,
  image_id,
  object_name,
  space_type,
  detectado_por_ia,
  confidence,
  labels,
  categoria,
  estado
) VALUES (
  'property-uuid-aqui',
  'image-uuid-aqui',
  'Refrigerador',
  'Cocina',
  true,
  0.95,
  'Electrodoméstico, Blanco, Grande',
  'Electrodoméstico',
  'Bueno'
);
*/

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Verificar que la tabla se creó correctamente
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'property_inventory'
ORDER BY ordinal_position;

-- Verificar índices
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'property_inventory';

-- Verificar triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'property_inventory';

-- ================================================================
-- ESTADÍSTICAS ESPERADAS
-- ================================================================

/*
CON 10,000 PROPIEDADES Y 30 IMÁGENES POR PROPIEDAD:
- Total imágenes: 300,000
- Objetos por imagen: ~3-5 promedio
- Total objetos inventario: ~900,000 - 1,500,000

ESPACIO ESTIMADO:
- Tabla: ~150 MB (con 1M objetos)
- Índices: ~80 MB
- Total: ~230 MB

RENDIMIENTO:
- Query por propiedad (10-15 objetos): <50ms
- Query por imagen (3-5 objetos): <10ms
- INSERT batch (100 objetos): <200ms
*/

-- ================================================================
-- FIN DEL SCRIPT
-- ================================================================
-- ✅ Tabla property_inventory creada
-- ✅ 5 índices optimizados creados
-- ✅ Trigger de updated_at configurado
-- ✅ Constraints de validación aplicadas
--
-- Tiempo de ejecución: ~5-10 segundos
-- Próximo paso: Ejecutar en Supabase SQL Editor
-- ================================================================
