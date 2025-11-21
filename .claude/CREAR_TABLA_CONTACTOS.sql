-- =====================================================
-- CREAR TABLA CONTACTOS PARA PROVEEDORES
-- =====================================================

-- Primero, eliminar la tabla si existe (CUIDADO: esto borrará todos los datos)
-- Comenta esta línea si ya tienes datos importantes en contactos
DROP TABLE IF EXISTS contactos;

-- Crear la tabla contactos con la estructura correcta
CREATE TABLE contactos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('inquilino', 'propietario', 'proveedor', 'supervisor')),
  categoria_proveedor TEXT,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_contactos_user_id ON contactos(user_id);
CREATE INDEX idx_contactos_tipo ON contactos(tipo);
CREATE INDEX idx_contactos_activo ON contactos(activo);

-- Agregar comentarios para documentación
COMMENT ON TABLE contactos IS 'Tabla de contactos (principalmente proveedores). Los colaboradores (propietarios, supervisores, etc.) están en propiedades_colaboradores';
COMMENT ON COLUMN contactos.tipo IS 'Tipo de contacto: proveedor (principal), inquilino, propietario, supervisor';
COMMENT ON COLUMN contactos.categoria_proveedor IS 'Categoría del proveedor: Limpieza, Mantenimiento, Jardinería, etc.';

-- Verificar que la tabla se creó correctamente
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contactos'
ORDER BY ordinal_position;
