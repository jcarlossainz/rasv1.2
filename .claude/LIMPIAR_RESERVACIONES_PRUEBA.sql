-- ============================================================
-- SQL para eliminar reservaciones de prueba (no manuales)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Ver qué hay antes de eliminar
SELECT origen, COUNT(*) as total FROM calendar_events GROUP BY origen;
SELECT proveedor, COUNT(*) as total FROM tickets WHERE tipo_ticket = 'reservacion' GROUP BY proveedor;

-- 2. ELIMINAR tickets de reservaciones que NO son manuales
DELETE FROM tickets
WHERE tipo_ticket = 'reservacion'
AND proveedor IN ('airbnb', 'booking', 'expedia');

-- 3. ELIMINAR eventos de calendario que NO son manuales
DELETE FROM calendar_events
WHERE origen IN ('airbnb', 'booking', 'expedia', 'google_vr');

-- 4. Verificar que solo quedan manuales
SELECT origen, COUNT(*) as total FROM calendar_events GROUP BY origen;
SELECT proveedor, COUNT(*) as total FROM tickets WHERE tipo_ticket = 'reservacion' GROUP BY proveedor;

-- ============================================================
-- Después de esto solo quedarán las reservaciones manuales
-- ============================================================
