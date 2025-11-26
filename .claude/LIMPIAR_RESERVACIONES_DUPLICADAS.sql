-- ============================================================
-- SQL para limpiar reservaciones y tickets duplicados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Ver cuántos tickets de reservación hay (para diagnóstico)
SELECT
  propiedad_id,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN reserva_id LIKE '%_checkin' THEN 1 END) as checkins,
  COUNT(CASE WHEN reserva_id LIKE '%_checkout' THEN 1 END) as checkouts
FROM tickets
WHERE tipo_ticket = 'reservacion'
GROUP BY propiedad_id;

-- 2. Ver eventos de calendario por propiedad
SELECT
  propiedad_id,
  origen,
  COUNT(*) as total_eventos
FROM calendar_events
GROUP BY propiedad_id, origen;

-- 3. ELIMINAR todos los tickets de tipo reservación (para empezar limpio)
DELETE FROM tickets WHERE tipo_ticket = 'reservacion';

-- 4. ELIMINAR todos los eventos de calendario (para empezar limpio)
DELETE FROM calendar_events;

-- 5. Verificar que quedó limpio
SELECT COUNT(*) as tickets_reservacion FROM tickets WHERE tipo_ticket = 'reservacion';
SELECT COUNT(*) as calendar_events FROM calendar_events;

-- ============================================================
-- Después de ejecutar esto, vuelve a sincronizar los calendarios
-- ============================================================
