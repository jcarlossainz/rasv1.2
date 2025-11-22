-- ============================================================================
-- 🧹 LIMPIEZA SIMPLE DE TICKETS
-- ============================================================================
-- SOLO limpia la tabla tickets (NO usa función RPC legacy)
-- Los servicios ya están en servicios_inmueble, los tickets se regenerarán
-- cuando crees una nueva propiedad o edites servicios
-- ============================================================================

-- PASO 1: Ver estado actual
SELECT '📊 ESTADO ACTUAL' as info;

SELECT
  'tickets' as tabla,
  COUNT(*) as total,
  COUNT(CASE WHEN servicio_id IS NOT NULL THEN 1 END) as automaticos,
  COUNT(CASE WHEN servicio_id IS NULL THEN 1 END) as manuales,
  MIN(fecha_programada) as fecha_min,
  MAX(fecha_programada) as fecha_max
FROM tickets;

-- Ver tickets por propiedad
SELECT
  p.nombre_propiedad,
  COUNT(t.id) as total_tickets,
  COUNT(CASE WHEN t.servicio_id IS NOT NULL THEN 1 END) as automaticos,
  COUNT(CASE WHEN t.servicio_id IS NULL THEN 1 END) as manuales
FROM propiedades p
LEFT JOIN tickets t ON t.propiedad_id = p.id
GROUP BY p.id, p.nombre_propiedad
ORDER BY p.nombre_propiedad;

-- PASO 2: ELIMINAR SOLO TICKETS AUTOMÁTICOS (de servicios)
-- Los tickets manuales se mantienen
DELETE FROM tickets WHERE servicio_id IS NOT NULL;

-- PASO 3: Verificar limpieza
SELECT '✅ DESPUÉS DE LIMPIAR' as info;

SELECT
  'tickets' as tabla,
  COUNT(*) as total_restantes,
  COUNT(CASE WHEN servicio_id IS NOT NULL THEN 1 END) as automaticos,
  COUNT(CASE WHEN servicio_id IS NULL THEN 1 END) as manuales
FROM tickets;

-- PASO 4: Ver servicios disponibles
SELECT '📋 SERVICIOS CONFIGURADOS' as info;

SELECT
  p.nombre_propiedad,
  s.nombre as servicio,
  s.frecuencia_valor || ' ' || s.frecuencia_unidad as frecuencia,
  s.ultima_fecha_pago,
  s.activo
FROM servicios_inmueble s
LEFT JOIN propiedades p ON s.propiedad_id = p.id
WHERE s.activo = true
ORDER BY p.nombre_propiedad, s.nombre;

-- ============================================================================
-- ✅ LISTO!
-- ============================================================================
-- Los tickets automáticos fueron eliminados.
-- Para regenerarlos, usa el wizard al crear/editar una propiedad.
-- El sistema ahora NO auto-regenera tickets al abrir el calendario.
-- ============================================================================

SELECT '✅ LIMPIEZA COMPLETADA' as status;
SELECT '🎯 Tickets manuales conservados, automáticos eliminados' as resultado;
SELECT '📝 Para regenerar: Edita una propiedad y actualiza sus servicios en el wizard' as siguiente_paso;
