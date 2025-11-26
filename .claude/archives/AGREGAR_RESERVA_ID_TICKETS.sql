-- ============================================================
-- SQL para agregar soporte de reservaciones a la tabla tickets
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna reserva_id para vincular tickets con reservaciones de iCal
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS reserva_id TEXT;

-- 2. Crear índice para búsquedas rápidas por reserva_id
CREATE INDEX IF NOT EXISTS idx_tickets_reserva_id
ON tickets(reserva_id)
WHERE reserva_id IS NOT NULL;

-- 3. Crear índice compuesto para búsquedas por propiedad y reserva
CREATE INDEX IF NOT EXISTS idx_tickets_propiedad_reserva
ON tickets(propiedad_id, reserva_id)
WHERE reserva_id IS NOT NULL;

-- 4. Comentario en la columna para documentación
COMMENT ON COLUMN tickets.reserva_id IS 'ID de reservación externa (Airbnb, Booking, etc.) para vincular con calendar_events';

-- ============================================================
-- Verificación
-- ============================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'tickets' AND column_name = 'reserva_id';
