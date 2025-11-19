-- ================================================================
-- ÍNDICES OPTIMIZADOS PARA SISTEMA RAS
-- ================================================================
-- Este archivo contiene todos los índices necesarios para optimizar
-- el rendimiento del sistema con 10,000+ propiedades y 1000+ usuarios
--
-- IMPORTANTE: Ejecutar estos índices EN ORDEN en Supabase SQL Editor
-- ================================================================

-- ================================================================
-- 1. ÍNDICES PARA TABLA: propiedades
-- ================================================================

-- Índice para búsqueda por owner_id (query más frecuente)
CREATE INDEX IF NOT EXISTS idx_propiedades_owner_id
ON propiedades(owner_id);

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_propiedades_created_at
ON propiedades(created_at DESC);

-- Índice compuesto para queries combinadas (owner + fecha)
CREATE INDEX IF NOT EXISTS idx_propiedades_owner_created
ON propiedades(owner_id, created_at DESC);

-- Índice para búsqueda por nombre (con LOWER para case-insensitive)
CREATE INDEX IF NOT EXISTS idx_propiedades_nombre
ON propiedades(LOWER(nombre_propiedad) text_pattern_ops);

-- Índice para estado de publicación
CREATE INDEX IF NOT EXISTS idx_propiedades_published
ON propiedades(published_at)
WHERE published_at IS NOT NULL;

-- ================================================================
-- 2. ÍNDICES PARA TABLA: propiedades_colaboradores
-- ================================================================

-- Índice para buscar colaboraciones por usuario
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id
ON propiedades_colaboradores(user_id);

-- Índice para buscar colaboradores de una propiedad
CREATE INDEX IF NOT EXISTS idx_colaboradores_propiedad_id
ON propiedades_colaboradores(propiedad_id);

-- Índice compuesto para joins frecuentes
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_propiedad
ON propiedades_colaboradores(user_id, propiedad_id);

-- ================================================================
-- 3. ÍNDICES PARA TABLA: property_images
-- ================================================================

-- Índice para buscar imágenes de una propiedad
CREATE INDEX IF NOT EXISTS idx_images_property_id
ON property_images(property_id);

-- Índice para foto de portada (query muy frecuente)
CREATE INDEX IF NOT EXISTS idx_images_cover
ON property_images(property_id, is_cover)
WHERE is_cover = true;

-- Índice para orden de fotos
CREATE INDEX IF NOT EXISTS idx_images_order
ON property_images(property_id, order_index);

-- ================================================================
-- 4. ÍNDICES PARA TABLA: property_inventory
-- ================================================================
-- NOTA: Solo crear si la tabla existe

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'property_inventory') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_property_id ON property_inventory(property_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_space_type ON property_inventory(space_type);
        CREATE INDEX IF NOT EXISTS idx_inventory_property_space ON property_inventory(property_id, space_type);
        RAISE NOTICE 'Índices para property_inventory creados exitosamente';
    ELSE
        RAISE NOTICE 'Tabla property_inventory no existe - índices omitidos';
    END IF;
END $$;

-- ================================================================
-- 5. ÍNDICES PARA TABLA: tickets
-- ================================================================
-- NOTA: Solo crear si la tabla existe

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_propiedad_id ON tickets(propiedad_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
        CREATE INDEX IF NOT EXISTS idx_tickets_pagado ON tickets(pagado) WHERE pagado = false;
        CREATE INDEX IF NOT EXISTS idx_tickets_fecha ON tickets(fecha_programada);
        CREATE INDEX IF NOT EXISTS idx_tickets_propiedad_estado ON tickets(propiedad_id, estado);
        RAISE NOTICE 'Índices para tickets creados exitosamente';
    ELSE
        RAISE NOTICE 'Tabla tickets no existe - índices omitidos';
    END IF;
END $$;

-- ================================================================
-- 6. ÍNDICES PARA TABLA: fechas_pago_servicios
-- ================================================================
-- NOTA: Solo crear si la tabla existe

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fechas_pago_servicios') THEN
        CREATE INDEX IF NOT EXISTS idx_pagos_propiedad_id ON fechas_pago_servicios(propiedad_id);
        CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON fechas_pago_servicios(fecha_pago);
        CREATE INDEX IF NOT EXISTS idx_pagos_pagado ON fechas_pago_servicios(pagado) WHERE pagado = false;
        CREATE INDEX IF NOT EXISTS idx_pagos_propiedad_pendientes ON fechas_pago_servicios(propiedad_id, pagado, fecha_pago) WHERE pagado = false;
        RAISE NOTICE 'Índices para fechas_pago_servicios creados exitosamente';
    ELSE
        RAISE NOTICE 'Tabla fechas_pago_servicios no existe - índices omitidos';
    END IF;
END $$;

-- ================================================================
-- 7. ÍNDICES PARA TABLA: servicios_inmueble
-- ================================================================
-- NOTA: Solo crear si la tabla existe

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'servicios_inmueble') THEN
        CREATE INDEX IF NOT EXISTS idx_servicios_propiedad_id ON servicios_inmueble(propiedad_id);
        CREATE INDEX IF NOT EXISTS idx_servicios_activo ON servicios_inmueble(activo) WHERE activo = true;
        RAISE NOTICE 'Índices para servicios_inmueble creados exitosamente';
    ELSE
        RAISE NOTICE 'Tabla servicios_inmueble no existe - índices omitidos';
    END IF;
END $$;

-- ================================================================
-- 8. ÍNDICES PARA TABLA: contactos
-- ================================================================
-- NOTA: Solo crear si la tabla existe

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contactos') THEN
        CREATE INDEX IF NOT EXISTS idx_contactos_user_id ON contactos(user_id);
        CREATE INDEX IF NOT EXISTS idx_contactos_tipo ON contactos(tipo);
        CREATE INDEX IF NOT EXISTS idx_contactos_nombre ON contactos(LOWER(nombre) text_pattern_ops);
        RAISE NOTICE 'Índices para contactos creados exitosamente';
    ELSE
        RAISE NOTICE 'Tabla contactos no existe - índices omitidos';
    END IF;
END $$;

-- ================================================================
-- 9. ÍNDICES PARA TABLA: profiles
-- ================================================================
-- NOTA: Solo crear si la tabla existe

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(LOWER(email) text_pattern_ops);
        CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON profiles(empresa_id) WHERE empresa_id IS NOT NULL;
        RAISE NOTICE 'Índices para profiles creados exitosamente';
    ELSE
        RAISE NOTICE 'Tabla profiles no existe - índices omitidos';
    END IF;
END $$;

-- ================================================================
-- 10. ESTADÍSTICAS Y ANÁLISIS
-- ================================================================
-- Actualizar estadísticas solo para tablas que existen

DO $$
BEGIN
    -- Tablas principales (estas SÍ deben existir)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'propiedades') THEN
        EXECUTE 'ANALYZE propiedades';
        RAISE NOTICE 'ANALYZE ejecutado en propiedades';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'propiedades_colaboradores') THEN
        EXECUTE 'ANALYZE propiedades_colaboradores';
        RAISE NOTICE 'ANALYZE ejecutado en propiedades_colaboradores';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'property_images') THEN
        EXECUTE 'ANALYZE property_images';
        RAISE NOTICE 'ANALYZE ejecutado en property_images';
    END IF;

    -- Tablas opcionales
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'property_inventory') THEN
        EXECUTE 'ANALYZE property_inventory';
        RAISE NOTICE 'ANALYZE ejecutado en property_inventory';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tickets') THEN
        EXECUTE 'ANALYZE tickets';
        RAISE NOTICE 'ANALYZE ejecutado en tickets';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fechas_pago_servicios') THEN
        EXECUTE 'ANALYZE fechas_pago_servicios';
        RAISE NOTICE 'ANALYZE ejecutado en fechas_pago_servicios';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'servicios_inmueble') THEN
        EXECUTE 'ANALYZE servicios_inmueble';
        RAISE NOTICE 'ANALYZE ejecutado en servicios_inmueble';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contactos') THEN
        EXECUTE 'ANALYZE contactos';
        RAISE NOTICE 'ANALYZE ejecutado en contactos';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        EXECUTE 'ANALYZE profiles';
        RAISE NOTICE 'ANALYZE ejecutado en profiles';
    END IF;
END $$;

-- ================================================================
-- VERIFICACIÓN DE ÍNDICES
-- ================================================================
-- Ejecuta esta query para verificar todos los índices creados:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'propiedades',
    'propiedades_colaboradores',
    'property_images',
    'property_inventory',
    'tickets',
    'fechas_pago_servicios',
    'servicios_inmueble',
    'contactos',
    'profiles'
  )
ORDER BY tablename, indexname;
*/

-- ================================================================
-- NOTAS IMPORTANTES
-- ================================================================
/*
1. IMPACTO ESPERADO:
   - Queries de catálogo: 10x más rápidas
   - Joins: 5-10x más rápidos
   - Búsquedas: 20x más rápidas
   - Dashboard: 5x más rápido

2. MANTENIMIENTO:
   - Los índices se mantienen automáticamente
   - Ejecutar ANALYZE mensualmente si hay mucho cambio de datos

3. MONITOREO:
   - Usar EXPLAIN ANALYZE para verificar que los índices se usan
   - Ejemplo: EXPLAIN ANALYZE SELECT * FROM propiedades WHERE owner_id = 'xxx';

4. ORDEN DE EJECUCIÓN:
   - Ejecutar índices de propiedades primero
   - Luego índices de tablas relacionadas
   - Finalmente ANALYZE

5. TIEMPO DE CREACIÓN:
   - Con base de datos vacía: < 1 segundo
   - Con 10,000 propiedades: 5-10 segundos
   - Con 100,000 registros: 30-60 segundos
*/
