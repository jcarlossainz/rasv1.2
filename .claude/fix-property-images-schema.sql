-- ============================================================================
-- FIX: Actualizar schema de property_images para coincidir con el código
-- ============================================================================

-- Eliminar tabla existente y recrear con el schema correcto
DROP TABLE IF EXISTS property_images CASCADE;

CREATE TABLE property_images (
  -- IDENTIFICACIÓN
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id             UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- URLs DE IMAGEN
  url                     TEXT NOT NULL, -- URL display (imagen grande)
  url_thumbnail           TEXT, -- URL thumbnail (300x300)

  -- STORAGE PATHS (para poder eliminar archivos)
  storage_path_display    TEXT NOT NULL,
  storage_path_thumbnail  TEXT,

  -- METADATA DE FOTO
  is_cover                BOOLEAN DEFAULT FALSE,
  order_index             INTEGER DEFAULT 0,
  caption                 TEXT,

  -- DIMENSIONES Y TAMAÑOS (columnas individuales en vez de JSONB)
  file_size_display       INTEGER, -- bytes
  file_size_thumbnail     INTEGER, -- bytes
  width_display           INTEGER, -- pixels
  height_display          INTEGER, -- pixels
  width_thumbnail         INTEGER DEFAULT 300, -- pixels
  height_thumbnail        INTEGER DEFAULT 300, -- pixels

  -- INVENTARIO (Phase 4.4 - AI)
  object_name             TEXT, -- Nombre del objeto detectado por IA
  labels                  TEXT, -- Etiquetas separadas por comas
  space_type              TEXT, -- ID del espacio asignado

  -- TIMESTAMPS
  uploaded_at             TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_property_images_property ON property_images(property_id);
CREATE INDEX idx_property_images_cover ON property_images(is_cover);
CREATE INDEX idx_property_images_order ON property_images(order_index);
CREATE INDEX idx_property_images_space ON property_images(space_type);
CREATE INDEX idx_property_images_object ON property_images(object_name);

-- RLS Policies
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver imágenes de propiedades que les pertenecen o que están compartidas con ellos
CREATE POLICY "Users can view images of their properties or shared properties"
  ON property_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM propiedades p
      WHERE p.id = property_images.property_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM propiedades_colaboradores pc
          WHERE pc.propiedad_id = p.id
          AND pc.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Los usuarios pueden insertar imágenes en sus propiedades
CREATE POLICY "Users can insert images to their properties"
  ON property_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM propiedades p
      WHERE p.id = property_images.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden actualizar imágenes de sus propiedades
CREATE POLICY "Users can update images of their properties"
  ON property_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM propiedades p
      WHERE p.id = property_images.property_id
      AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM propiedades p
      WHERE p.id = property_images.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden eliminar imágenes de sus propiedades
CREATE POLICY "Users can delete images from their properties"
  ON property_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM propiedades p
      WHERE p.id = property_images.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- ✅ DONE: Schema de property_images actualizado y con RLS configurado
