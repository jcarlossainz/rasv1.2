-- =====================================================
-- MIGRACIÓN: Agregar campos iCal a tabla propiedades
-- Descripción: Etapa 1.1 del Plan de Integración de Calendarios
-- Fecha: 2024-11-24
-- =====================================================

-- Agregar campos de iCal a tabla propiedades
ALTER TABLE propiedades
ADD COLUMN IF NOT EXISTS ical_airbnb_url TEXT,
ADD COLUMN IF NOT EXISTS ical_booking_url TEXT,
ADD COLUMN IF NOT EXISTS ical_expedia_url TEXT,
ADD COLUMN IF NOT EXISTS ultimo_sync_ical TIMESTAMPTZ;

-- Comentarios descriptivos
COMMENT ON COLUMN propiedades.ical_airbnb_url IS 'URL del feed iCal de Airbnb para sincronización de calendario';
COMMENT ON COLUMN propiedades.ical_booking_url IS 'URL del feed iCal de Booking.com para sincronización de calendario';
COMMENT ON COLUMN propiedades.ical_expedia_url IS 'URL del feed iCal de Expedia para sincronización de calendario';
COMMENT ON COLUMN propiedades.ultimo_sync_ical IS 'Timestamp de la última sincronización exitosa de calendarios';

-- Crear índice para consultas de sincronización
CREATE INDEX IF NOT EXISTS idx_propiedades_ultimo_sync_ical
ON propiedades(ultimo_sync_ical)
WHERE ultimo_sync_ical IS NOT NULL;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las columnas se agregaron correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'propiedades'
        AND column_name IN ('ical_airbnb_url', 'ical_booking_url', 'ical_expedia_url', 'ultimo_sync_ical')
    ) THEN
        RAISE NOTICE '✅ Columnas iCal agregadas correctamente a tabla propiedades';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudieron agregar las columnas iCal';
    END IF;
END $$;

-- Verificar el índice
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'propiedades'
        AND indexname = 'idx_propiedades_ultimo_sync_ical'
    ) THEN
        RAISE NOTICE '✅ Índice idx_propiedades_ultimo_sync_ical creado correctamente';
    ELSE
        RAISE WARNING '⚠️ Índice idx_propiedades_ultimo_sync_ical no se pudo crear';
    END IF;
END $$;

-- =====================================================
-- NOTAS
-- =====================================================

/*
Esta migración es parte de la Etapa 1 del Plan de Integración de Calendarios.

PRÓXIMOS PASOS:
1. Ejecutar esta migración en Supabase
2. Crear tabla calendar_events (ver MIGRATION_CREATE_CALENDAR_EVENTS.sql)
3. Implementar servicio de sincronización iCal (lib/calendar/ical-sync.ts)
4. Implementar endpoints de API (/api/calendar/sync)

REFERENCIAS:
- Ver: .claude/PLAN_INTEGRACION_CALENDARIOS.md
- Sección: 1.1 Modificaciones a Base de Datos
*/
