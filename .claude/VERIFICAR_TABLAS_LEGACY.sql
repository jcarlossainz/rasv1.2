-- ============================================================================
-- 🔍 VERIFICAR TABLAS LEGACY
-- ============================================================================
-- Verifica si existen tickets duplicados en la tabla legacy fechas_pago_servicios
-- ============================================================================

-- Verificar si existe la tabla fechas_pago_servicios
SELECT '📊 TABLA LEGACY: fechas_pago_servicios' as info;

SELECT
  COUNT(*) as total_registros,
  COUNT(DISTINCT servicio_id) as servicios_distintos,
  MIN(fecha_pago) as fecha_min,
  MAX(fecha_pago) as fecha_max
FROM fechas_pago_servicios;

-- Ver registros por servicio
SELECT
  s.nombre as servicio,
  p.nombre_propiedad,
  COUNT(fps.id) as registros_legacy,
  MIN(fps.fecha_pago) as primer_pago,
  MAX(fps.fecha_pago) as ultimo_pago
FROM fechas_pago_servicios fps
JOIN servicios_inmueble s ON s.id = fps.servicio_id
LEFT JOIN propiedades p ON p.id = fps.propiedad_id
GROUP BY s.id, s.nombre, p.nombre_propiedad
ORDER BY p.nombre_propiedad, s.nombre;

-- Comparar con tabla tickets actual
SELECT '📊 TABLA ACTUAL: tickets' as info;

SELECT
  COUNT(*) as total_registros,
  COUNT(DISTINCT servicio_id) as servicios_distintos,
  COUNT(CASE WHEN servicio_id IS NOT NULL THEN 1 END) as automaticos,
  COUNT(CASE WHEN servicio_id IS NULL THEN 1 END) as manuales,
  MIN(fecha_programada) as fecha_min,
  MAX(fecha_programada) as fecha_max
FROM tickets;

-- Ver tickets por servicio
SELECT
  s.nombre as servicio,
  p.nombre_propiedad,
  COUNT(t.id) as tickets_actuales,
  MIN(t.fecha_programada) as primer_ticket,
  MAX(t.fecha_programada) as ultimo_ticket
FROM tickets t
JOIN servicios_inmueble s ON s.id = t.servicio_id
LEFT JOIN propiedades p ON p.id = t.propiedad_id
WHERE t.servicio_id IS NOT NULL
GROUP BY s.id, s.nombre, p.nombre_propiedad
ORDER BY p.nombre_propiedad, s.nombre;

-- ============================================================================
-- Si hay registros en fechas_pago_servicios, esa es la tabla LEGACY
-- que está causando confusión. Se debe eliminar.
-- ============================================================================
