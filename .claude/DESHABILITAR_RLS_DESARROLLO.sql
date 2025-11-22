-- =====================================================
-- DESHABILITAR RLS PARA DESARROLLO
-- =====================================================
-- IMPORTANTE: Solo para desarrollo, NO usar en producción

-- Deshabilitar RLS en las tablas necesarias para Directorio
ALTER TABLE contactos DISABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades DISABLE ROW LEVEL SECURITY;
ALTER TABLE propiedades_colaboradores DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó correctamente:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('contactos', 'propiedades', 'propiedades_colaboradores');

-- Si rowsecurity = false, significa que RLS está deshabilitado correctamente
