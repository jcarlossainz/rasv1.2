-- ============================================================================
-- 🧹 LIMPIAR Y REGENERAR TICKETS AUTOMÁTICOS
-- ============================================================================
-- Ejecuta estos comandos en orden para limpiar duplicados y regenerar
-- ============================================================================

-- PASO 1: Ver cuántos tickets/fechas hay actualmente
SELECT
  'fechas_pago_servicios' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT servicio_id) as servicios_unicos
FROM fechas_pago_servicios;

-- PASO 2: ELIMINAR TODAS las fechas de pago generadas automáticamente
DELETE FROM fechas_pago_servicios;

-- Verificar que se eliminaron
SELECT COUNT(*) as fechas_restantes FROM fechas_pago_servicios;

-- PASO 3: Ver servicios activos que tienen propiedades
SELECT
  s.id,
  s.nombre,
  s.propiedad_id,
  p.nombre_propiedad,
  s.ultima_fecha_pago,
  s.frecuencia_valor,
  s.frecuencia_unidad
FROM servicios_inmueble s
LEFT JOIN propiedades p ON s.propiedad_id = p.id
WHERE s.activo = true
ORDER BY p.nombre_propiedad, s.nombre;

-- PASO 4: REGENERAR fechas para TODOS los servicios activos (12 meses)
DO $$
DECLARE
  servicio_record RECORD;
  tickets_generados INTEGER;
  total_tickets INTEGER := 0;
BEGIN
  -- Recorrer todos los servicios activos
  FOR servicio_record IN
    SELECT
      s.id,
      s.nombre,
      p.nombre_propiedad
    FROM servicios_inmueble s
    LEFT JOIN propiedades p ON s.propiedad_id = p.id
    WHERE s.activo = true
      AND s.ultima_fecha_pago IS NOT NULL
  LOOP
    -- Generar 12 meses de tickets para cada servicio
    BEGIN
      SELECT generar_fechas_pago_servicio(servicio_record.id, 12)
      INTO tickets_generados;

      total_tickets := total_tickets + tickets_generados;

      RAISE NOTICE '✅ Propiedad: % | Servicio: % | Tickets: %',
        servicio_record.nombre_propiedad,
        servicio_record.nombre,
        tickets_generados;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR en servicio: % (%) - %',
          servicio_record.nombre,
          servicio_record.id,
          SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ REGENERACIÓN COMPLETADA';
  RAISE NOTICE '📊 TOTAL: % tickets generados', total_tickets;
  RAISE NOTICE '========================================';
END $$;

-- PASO 5: VERIFICAR resultados
-- Ver resumen de tickets generados
SELECT
  'RESUMEN FINAL' as info,
  COUNT(*) as total_tickets,
  COUNT(DISTINCT servicio_id) as servicios_con_tickets,
  COUNT(DISTINCT propiedad_id) as propiedades_con_tickets,
  MIN(fecha_pago) as fecha_mas_cercana,
  MAX(fecha_pago) as fecha_mas_lejana
FROM fechas_pago_servicios;

-- Ver tickets por servicio
SELECT
  p.nombre_propiedad,
  s.nombre as servicio,
  s.frecuencia_valor,
  s.frecuencia_unidad,
  COUNT(fps.id) as tickets_generados,
  MIN(fps.fecha_pago) as primer_ticket,
  MAX(fps.fecha_pago) as ultimo_ticket
FROM servicios_inmueble s
LEFT JOIN fechas_pago_servicios fps ON fps.servicio_id = s.id
LEFT JOIN propiedades p ON s.propiedad_id = p.id
WHERE s.activo = true
GROUP BY p.nombre_propiedad, s.nombre, s.frecuencia_valor, s.frecuencia_unidad
ORDER BY p.nombre_propiedad, s.nombre;

-- Ver próximos 20 tickets pendientes
SELECT
  p.nombre_propiedad,
  s.nombre as servicio,
  fps.fecha_pago,
  fps.monto_estimado,
  CASE
    WHEN fps.fecha_pago < CURRENT_DATE THEN '⚠️ VENCIDO'
    WHEN fps.fecha_pago = CURRENT_DATE THEN '📅 HOY'
    ELSE '📆 PRÓXIMO'
  END as estado
FROM fechas_pago_servicios fps
JOIN servicios_inmueble s ON fps.servicio_id = s.id
JOIN propiedades p ON fps.propiedad_id = p.id
WHERE fps.pagado = false
ORDER BY fps.fecha_pago ASC
LIMIT 20;

-- ============================================================================
-- ✅ LISTO! Los tickets están regenerados sin duplicados
-- ============================================================================
