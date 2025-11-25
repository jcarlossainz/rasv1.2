-- =====================================================
-- TABLA: property_archivos
-- Descripción: Archivero digital para documentos importantes
-- de cada propiedad (contratos, estados de cuenta, etc.)
-- =====================================================

-- Crear tabla para archivos de propiedades
CREATE TABLE IF NOT EXISTS property_archivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL, -- 'contrato', 'estado_cuenta', 'escritura', 'impuesto', 'mantenimiento', 'otro'
  file_path TEXT NOT NULL, -- Ruta en Supabase Storage
  file_size BIGINT, -- Tamaño del archivo en bytes
  file_type TEXT, -- Tipo MIME del archivo
  subido_por UUID REFERENCES auth.users(id),
  fecha_subida TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_categoria CHECK (categoria IN ('contrato', 'estado_cuenta', 'escritura', 'impuesto', 'mantenimiento', 'seguro', 'avaluo', 'otro'))
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_property_archivos_property_id ON property_archivos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_archivos_categoria ON property_archivos(categoria);
CREATE INDEX IF NOT EXISTS idx_property_archivos_fecha ON property_archivos(fecha_subida DESC);

-- RLS Policies
ALTER TABLE property_archivos ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver archivos de sus propiedades
CREATE POLICY "Users can view archivos from their properties"
  ON property_archivos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = property_archivos.property_id
      AND propiedades.owner_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden insertar archivos en sus propiedades
CREATE POLICY "Users can insert archivos to their properties"
  ON property_archivos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = property_archivos.property_id
      AND propiedades.owner_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden actualizar archivos de sus propiedades
CREATE POLICY "Users can update archivos from their properties"
  ON property_archivos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = property_archivos.property_id
      AND propiedades.owner_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden eliminar archivos de sus propiedades
CREATE POLICY "Users can delete archivos from their properties"
  ON property_archivos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM propiedades
      WHERE propiedades.id = property_archivos.property_id
      AND propiedades.owner_id = auth.uid()
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_property_archivos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_property_archivos_updated_at ON property_archivos;
CREATE TRIGGER trigger_update_property_archivos_updated_at
  BEFORE UPDATE ON property_archivos
  FOR EACH ROW
  EXECUTE FUNCTION update_property_archivos_updated_at();

-- Comentarios
COMMENT ON TABLE property_archivos IS 'Archivero digital para documentos importantes de propiedades';
COMMENT ON COLUMN property_archivos.categoria IS 'Categoría del archivo: contrato, estado_cuenta, escritura, impuesto, mantenimiento, seguro, avaluo, otro';
COMMENT ON COLUMN property_archivos.file_path IS 'Ruta del archivo en Supabase Storage (formato: property_id/archivos/filename)';
