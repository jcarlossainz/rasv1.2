-- =====================================================
-- MIGRACIÓN: Crear tabla calendar_events
-- Descripción: Etapa 1.1 del Plan de Integración de Calendarios
-- Fecha: 2024-11-24
-- =====================================================

-- Crear tabla para eventos de calendario consolidado
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  origen TEXT NOT NULL, -- 'airbnb', 'booking', 'expedia', 'manual', 'google_vr'
  reserva_id TEXT, -- ID de la reserva en la plataforma
  estado TEXT NOT NULL, -- 'bloqueado', 'reservado', 'disponible'
  titulo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT check_origen CHECK (origen IN ('airbnb', 'booking', 'expedia', 'manual', 'google_vr')),
  CONSTRAINT check_estado CHECK (estado IN ('bloqueado', 'reservado', 'disponible')),
  CONSTRAINT check_fechas CHECK (fecha_fin >= fecha_inicio)
);

-- Comentarios descriptivos
COMMENT ON TABLE calendar_events IS 'Tabla consolidada de eventos de calendario de todas las fuentes (Airbnb, Booking, Expedia, Google VR, Manual)';
COMMENT ON COLUMN calendar_events.propiedad_id IS 'Referencia a la propiedad asociada al evento';
COMMENT ON COLUMN calendar_events.fecha_inicio IS 'Fecha de inicio del evento (check-in o inicio de bloqueo)';
COMMENT ON COLUMN calendar_events.fecha_fin IS 'Fecha de fin del evento (check-out o fin de bloqueo)';
COMMENT ON COLUMN calendar_events.origen IS 'Fuente del evento: airbnb, booking, expedia, manual, google_vr';
COMMENT ON COLUMN calendar_events.reserva_id IS 'ID único de la reserva en la plataforma externa';
COMMENT ON COLUMN calendar_events.estado IS 'Estado del evento: bloqueado, reservado, disponible';
COMMENT ON COLUMN calendar_events.titulo IS 'Título o descripción corta del evento';
COMMENT ON COLUMN calendar_events.notas IS 'Notas adicionales sobre el evento';

-- Índices para optimización de queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_propiedad
ON calendar_events(propiedad_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_fechas
ON calendar_events(fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_calendar_events_origen
ON calendar_events(origen);

CREATE INDEX IF NOT EXISTS idx_calendar_events_estado
ON calendar_events(estado);

-- Índice compuesto para queries comunes (buscar eventos de una propiedad en un rango de fechas)
CREATE INDEX IF NOT EXISTS idx_calendar_events_propiedad_fechas
ON calendar_events(propiedad_id, fecha_inicio, fecha_fin);

-- Índice para búsqueda por reserva_id (útil para actualizaciones desde plataformas)
CREATE INDEX IF NOT EXISTS idx_calendar_events_reserva_id
ON calendar_events(reserva_id)
WHERE reserva_id IS NOT NULL;

-- =====================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_events_updated_at();

-- =====================================================
-- FUNCIÓN: Detectar conflictos de fechas
-- =====================================================

CREATE OR REPLACE FUNCTION detectar_conflictos_calendario(
    p_propiedad_id UUID,
    p_fecha_inicio DATE,
    p_fecha_fin DATE,
    p_evento_id UUID DEFAULT NULL
)
RETURNS TABLE(
    conflicto_id UUID,
    origen TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    titulo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.origen,
        ce.fecha_inicio,
        ce.fecha_fin,
        ce.titulo
    FROM calendar_events ce
    WHERE ce.propiedad_id = p_propiedad_id
      AND ce.estado IN ('bloqueado', 'reservado')
      AND (
          -- Casos de overlapping
          (ce.fecha_inicio <= p_fecha_fin AND ce.fecha_fin >= p_fecha_inicio)
      )
      AND (p_evento_id IS NULL OR ce.id != p_evento_id); -- Excluir el mismo evento si se está editando
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detectar_conflictos_calendario IS 'Detecta eventos que se traslapan con un rango de fechas dado';

-- =====================================================
-- FUNCIÓN: Obtener disponibilidad de propiedad
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_disponibilidad_propiedad(
    p_propiedad_id UUID,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflictos INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_conflictos
    FROM calendar_events
    WHERE propiedad_id = p_propiedad_id
      AND estado IN ('bloqueado', 'reservado')
      AND (
          fecha_inicio <= p_fecha_fin AND fecha_fin >= p_fecha_inicio
      );

    RETURN v_conflictos = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_disponibilidad_propiedad IS 'Verifica si una propiedad está disponible en un rango de fechas';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'calendar_events'
    ) THEN
        RAISE NOTICE '✅ Tabla calendar_events creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear la tabla calendar_events';
    END IF;
END $$;

-- Verificar índices
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM pg_indexes
    WHERE tablename = 'calendar_events';

    IF v_count >= 6 THEN
        RAISE NOTICE '✅ Índices creados correctamente (% índices)', v_count;
    ELSE
        RAISE WARNING '⚠️ Se esperaban al menos 6 índices, se encontraron %', v_count;
    END IF;
END $$;

-- Verificar funciones
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname IN ('detectar_conflictos_calendario', 'obtener_disponibilidad_propiedad')
    ) THEN
        RAISE NOTICE '✅ Funciones de calendario creadas correctamente';
    ELSE
        RAISE WARNING '⚠️ No se pudieron crear todas las funciones de calendario';
    END IF;
END $$;

-- =====================================================
-- DATOS DE EJEMPLO (Opcional - Solo para testing)
-- =====================================================

/*
-- Descomentar para insertar datos de prueba

-- Ejemplo de evento bloqueado manualmente
INSERT INTO calendar_events (propiedad_id, fecha_inicio, fecha_fin, origen, estado, titulo)
VALUES (
    'UUID-DE-TU-PROPIEDAD',
    '2024-12-01',
    '2024-12-05',
    'manual',
    'bloqueado',
    'Mantenimiento programado'
);

-- Ejemplo de reserva desde Airbnb
INSERT INTO calendar_events (propiedad_id, fecha_inicio, fecha_fin, origen, reserva_id, estado, titulo)
VALUES (
    'UUID-DE-TU-PROPIEDAD',
    '2024-12-10',
    '2024-12-15',
    'airbnb',
    'HMABCDEF123',
    'reservado',
    'Reserva Airbnb - Juan Pérez'
);

-- Verificar disponibilidad
SELECT obtener_disponibilidad_propiedad(
    'UUID-DE-TU-PROPIEDAD',
    '2024-12-01'::DATE,
    '2024-12-05'::DATE
); -- Debe retornar FALSE (no disponible)

-- Detectar conflictos
SELECT *
FROM detectar_conflictos_calendario(
    'UUID-DE-TU-PROPIEDAD',
    '2024-12-03'::DATE,
    '2024-12-07'::DATE
); -- Debe retornar el evento de mantenimiento
*/

-- =====================================================
-- NOTAS
-- =====================================================

/*
Esta migración crea la estructura para almacenar eventos de calendario
de múltiples fuentes (Airbnb, Booking, Expedia, Google VR, Manual).

CARACTERÍSTICAS:
- Consolidación de eventos de todas las plataformas
- Detección automática de conflictos
- Verificación de disponibilidad
- Índices optimizados para queries comunes
- Triggers para updated_at automático

PRÓXIMOS PASOS:
1. Ejecutar MIGRATION_ADD_ICAL_FIELDS.sql (si no se ha ejecutado)
2. Ejecutar esta migración
3. Implementar servicio de sincronización iCal
4. Implementar endpoints de API
5. Crear vista de calendario en frontend

REFERENCIAS:
- Ver: .claude/PLAN_INTEGRACION_CALENDARIOS.md
- Sección: 1.1 Modificaciones a Base de Datos (líneas 54-76)
*/
