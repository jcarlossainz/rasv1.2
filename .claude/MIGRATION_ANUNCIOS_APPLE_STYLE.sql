-- ============================================================================
-- 🎨 MIGRATION: Sistema de Anuncios Apple-Style
-- ============================================================================
-- Agrega campos necesarios para el sistema de anuncios premium
-- Fecha: 2025-01-22
-- ============================================================================

-- PASO 1: Agregar nuevos campos a tabla propiedades
-- ----------------------------------------------------------------------------

-- Título personalizado del anuncio (diferente al nombre de la propiedad)
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS anuncio_titulo TEXT;

-- Tagline/subtítulo para el anuncio (ej: "Tu oasis en el corazón de Cancún")
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS anuncio_tagline TEXT;

-- Configuración de secciones visibles en el anuncio público
-- Por defecto todas las secciones están visibles excepto el mapa exacto
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS anuncio_secciones_visibles JSONB DEFAULT '{
  "precio": true,
  "ubicacion": true,
  "mapa": false,
  "dimensiones": true,
  "espacios": true,
  "amenidades": true
}'::jsonb;

-- Comentarios sobre los cambios
COMMENT ON COLUMN propiedades.anuncio_titulo IS 'Título personalizado para el anuncio público (máx 60 chars)';
COMMENT ON COLUMN propiedades.anuncio_tagline IS 'Subtítulo/tagline del anuncio (máx 100 chars)';
COMMENT ON COLUMN propiedades.anuncio_secciones_visibles IS 'JSON con flags de qué secciones mostrar en el anuncio público';

-- PASO 2: Crear índices de optimización
-- ----------------------------------------------------------------------------

-- Índice para búsquedas de anuncios publicados (muy común)
CREATE INDEX IF NOT EXISTS idx_propiedades_anuncio_publicado
  ON propiedades(estado_anuncio)
  WHERE estado_anuncio = 'publicado';

-- Índice para búsquedas combinadas (estado + usuario)
CREATE INDEX IF NOT EXISTS idx_propiedades_estado_anuncio_user
  ON propiedades(owner_id, estado_anuncio);

-- PASO 3: Actualizar índice de property_images para optimizar cargas
-- ----------------------------------------------------------------------------

-- Índice compuesto para cargar imágenes de una propiedad ordenadas
CREATE INDEX IF NOT EXISTS idx_property_images_property_order
  ON property_images(property_id, order_index)
  WHERE property_id IS NOT NULL;

-- PASO 4: Función helper para verificar si un anuncio está completo
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION es_anuncio_completo(propiedad_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  prop RECORD;
  tiene_fotos BOOLEAN;
  tiene_precio BOOLEAN;
BEGIN
  -- Obtener datos de la propiedad
  SELECT
    descripcion_anuncio,
    precios
  INTO prop
  FROM propiedades
  WHERE id = propiedad_id;

  -- Verificar si tiene al menos una foto
  SELECT EXISTS(
    SELECT 1 FROM property_images WHERE property_id = propiedad_id
  ) INTO tiene_fotos;

  -- Verificar si tiene al menos un precio configurado
  tiene_precio := (
    prop.precios IS NOT NULL AND (
      (prop.precios->>'venta')::NUMERIC > 0 OR
      (prop.precios->>'mensual')::NUMERIC > 0 OR
      (prop.precios->>'noche')::NUMERIC > 0
    )
  );

  -- Un anuncio está completo si tiene descripción, precio y fotos
  RETURN (
    prop.descripcion_anuncio IS NOT NULL AND
    prop.descripcion_anuncio != '' AND
    tiene_precio AND
    tiene_fotos
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION es_anuncio_completo IS 'Verifica si un anuncio tiene todos los datos mínimos para publicarse';

-- PASO 5: Vista materializada para anuncios públicos (OPCIONAL - para futuro)
-- ----------------------------------------------------------------------------
-- Comentado por ahora, descomentar cuando quieras activarla

/*
CREATE MATERIALIZED VIEW IF NOT EXISTS v_anuncios_publicos AS
SELECT
  p.id,
  p.nombre_propiedad,
  p.anuncio_titulo,
  p.anuncio_tagline,
  p.descripcion_anuncio,
  p.tipo_propiedad,
  p.estados,
  p.precios,
  p.ubicacion,
  p.espacios,
  p.amenidades_vacacional,
  p.capacidad_personas,
  p.anuncio_secciones_visibles,

  -- Imagen de portada
  (
    SELECT json_build_object(
      'id', i.id,
      'url', i.url,
      'url_thumbnail', i.url_thumbnail
    )
    FROM property_images i
    WHERE i.property_id = p.id AND i.is_cover = true
    LIMIT 1
  ) as imagen_portada,

  -- Total de imágenes
  (
    SELECT COUNT(*)
    FROM property_images i
    WHERE i.property_id = p.id
  ) as total_imagenes,

  p.created_at,
  p.updated_at
FROM propiedades p
WHERE p.estado_anuncio = 'publicado'
ORDER BY p.updated_at DESC;

CREATE UNIQUE INDEX ON v_anuncios_publicos (id);
CREATE INDEX ON v_anuncios_publicos USING gin (estados);
CREATE INDEX ON v_anuncios_publicos ((ubicacion->>'ciudad'));

COMMENT ON MATERIALIZED VIEW v_anuncios_publicos IS 'Vista optimizada de anuncios públicos - refrescar cada 5 minutos';
*/

-- PASO 6: Función para generar slug amigable (FUTURO)
-- ----------------------------------------------------------------------------
-- Para convertir URLs de /anuncio/uuid a /anuncio/departamento-laguna-cdmx

CREATE OR REPLACE FUNCTION generar_slug_anuncio(propiedad_id UUID)
RETURNS TEXT AS $$
DECLARE
  prop RECORD;
  slug TEXT;
BEGIN
  SELECT
    tipo_propiedad,
    nombre_propiedad,
    ubicacion->>'ciudad' as ciudad
  INTO prop
  FROM propiedades
  WHERE id = propiedad_id;

  -- Convertir a lowercase, reemplazar espacios con guiones, quitar acentos
  slug := lower(
    regexp_replace(
      unaccent(
        COALESCE(prop.tipo_propiedad, '') || '-' ||
        COALESCE(prop.nombre_propiedad, '') || '-' ||
        COALESCE(prop.ciudad, '')
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );

  -- Limpiar guiones duplicados y del inicio/fin
  slug := regexp_replace(slug, '-+', '-', 'g');
  slug := trim(both '-' from slug);

  RETURN slug;
END;
$$ LANGUAGE plpgsql STABLE;

-- PASO 7: Verificación de la migración
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  columnas_agregadas INTEGER;
BEGIN
  SELECT COUNT(*) INTO columnas_agregadas
  FROM information_schema.columns
  WHERE table_name = 'propiedades'
    AND column_name IN ('anuncio_titulo', 'anuncio_tagline', 'anuncio_secciones_visibles');

  IF columnas_agregadas = 3 THEN
    RAISE NOTICE '✅ Migración exitosa: % columnas agregadas a propiedades', columnas_agregadas;
  ELSE
    RAISE WARNING '⚠️ Verificar migración: solo % de 3 columnas encontradas', columnas_agregadas;
  END IF;
END $$;

-- ============================================================================
-- 🎉 FIN DE LA MIGRACIÓN
-- ============================================================================
-- Ejecutar este script en Supabase SQL Editor
-- ============================================================================
