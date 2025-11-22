-- ============================================================================
-- 🔓 RLS POLICY: Permitir lectura pública de anuncios
-- ============================================================================
-- Este script crea una policy para permitir que cualquier persona
-- (incluso sin autenticación) pueda leer propiedades desde /anuncio/[id]
-- ============================================================================

-- OPCIÓN 1: Policy para lectura pública de TODAS las propiedades
-- (Útil para preview - permite ver incluso borradores)
-- ----------------------------------------------------------------------------

CREATE POLICY "Permitir lectura pública de propiedades"
ON propiedades
FOR SELECT
TO anon, authenticated
USING (true);

-- OPCIÓN 2: Si prefieres solo mostrar publicadas públicamente
-- (Más restrictivo - solo anuncios publicados son públicos)
-- ----------------------------------------------------------------------------

/*
CREATE POLICY "Permitir lectura pública solo de publicados"
ON propiedades
FOR SELECT
TO anon, authenticated
USING (estado_anuncio = 'publicado');
*/

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver todas las policies de la tabla propiedades
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'propiedades';

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- Si usas OPCIÓN 1: Cualquiera puede ver cualquier propiedad (incluso borradores)
--   ✅ Ventaja: Preview funciona para todos los estados
--   ⚠️ Consideración: URLs son "adivinables" si conoces el UUID
--
-- Si usas OPCIÓN 2: Solo propiedades publicadas son públicas
--   ✅ Ventaja: Más seguro, solo publicados son visibles
--   ❌ Desventaja: Preview NO funciona en borradores/pausados
--
-- RECOMENDACIÓN: Usar OPCIÓN 1 para desarrollo, considerar OPCIÓN 2 para producción
-- ============================================================================
