-- ============================================================================
-- 🎫 GENERAR TICKETS AUTOMÁTICOS DE SERVICIOS
-- ============================================================================
-- Descripción: Genera fechas de pago para todos los servicios activos
--              (ejecutar DESPUÉS de migrar servicios)
-- ============================================================================

-- Generar tickets para TODOS los servicios activos
DO $$
DECLARE
  servicio_record RECORD;
  tickets_generados INTEGER;
  total_tickets INTEGER := 0;
BEGIN
  -- Recorrer todos los servicios activos
  FOR servicio_record IN
    SELECT id, nombre, propiedad_id
    FROM servicios_inmueble
    WHERE activo = true
  LOOP
    -- Generar 12 meses de tickets para cada servicio
    SELECT generar_fechas_pago_servicio(servicio_record.id, 12)
    INTO tickets_generados;

    total_tickets := total_tickets + tickets_generados;

    RAISE NOTICE 'Servicio "%": % tickets generados', servicio_record.nombre, tickets_generados;
  END LOOP;

  RAISE NOTICE 'TOTAL: % tickets generados para todos los servicios', total_tickets;
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver resumen de tickets generados
SELECT
  COUNT(*) as total_tickets,
  SUM(CASE WHEN pagado = true THEN 1 ELSE 0 END) as pagados,
  SUM(CASE WHEN pagado = false THEN 1 ELSE 0 END) as pendientes,
  SUM(CASE WHEN fecha_pago < CURRENT_DATE AND pagado = false THEN 1 ELSE 0 END) as vencidos,
  SUM(CASE WHEN fecha_pago = CURRENT_DATE AND pagado = false THEN 1 ELSE 0 END) as hoy,
  SUM(CASE WHEN fecha_pago > CURRENT_DATE AND pagado = false THEN 1 ELSE 0 END) as proximos
FROM fechas_pago_servicios;

-- Ver tickets por servicio
SELECT
  s.nombre as servicio,
  p.nombre_propiedad,
  COUNT(fps.id) as tickets_generados,
  SUM(CASE WHEN fps.pagado = false THEN 1 ELSE 0 END) as pendientes
FROM servicios_inmueble s
LEFT JOIN fechas_pago_servicios fps ON fps.servicio_id = s.id
LEFT JOIN propiedades p ON s.propiedad_id = p.id
WHERE s.activo = true
GROUP BY s.id, s.nombre, p.nombre_propiedad
ORDER BY p.nombre_propiedad, s.nombre;

-- Ver próximos 20 tickets pendientes
SELECT
  p.nombre_propiedad,
  s.nombre as servicio,
  fps.fecha_pago,
  fps.monto_estimado,
  CASE
    WHEN fps.fecha_pago < CURRENT_DATE THEN 'VENCIDO'
    WHEN fps.fecha_pago = CURRENT_DATE THEN 'HOY'
    ELSE 'PRÓXIMO'
  END as estado
FROM fechas_pago_servicios fps
JOIN servicios_inmueble s ON fps.servicio_id = s.id
JOIN propiedades p ON fps.propiedad_id = p.id
WHERE fps.pagado = false
ORDER BY fps.fecha_pago ASC
LIMIT 20;
