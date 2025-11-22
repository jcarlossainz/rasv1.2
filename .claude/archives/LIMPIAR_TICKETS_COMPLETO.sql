-- ============================================================================
-- 🧹 LIMPIEZA COMPLETA DE TICKETS
-- ============================================================================
-- Limpia TODAS las tablas de tickets para empezar de cero
-- SOLO ejecutar cuando quieras resetear completamente el sistema de tickets
-- ============================================================================

-- PASO 1: Ver cuántos tickets hay actualmente
SELECT 'ANTES DE LIMPIAR' as estado;

SELECT
  'tickets' as tabla,
  COUNT(*) as total,
  COUNT(CASE WHEN tipo_ticket = 'servicio' THEN 1 END) as servicios,
  COUNT(CASE WHEN tipo_ticket != 'servicio' THEN 1 END) as manuales
FROM tickets;

SELECT
  'fechas_pago_servicios' as tabla,
  COUNT(*) as total,
  COUNT(DISTINCT servicio_id) as servicios_unicos
FROM fechas_pago_servicios;

-- PASO 2: ELIMINAR TODOS los tickets
DELETE FROM tickets;
DELETE FROM fechas_pago_servicios;

-- Verificar que se eliminaron
SELECT 'DESPUÉS DE LIMPIAR' as estado;

SELECT COUNT(*) as tickets_restantes FROM tickets;
SELECT COUNT(*) as fechas_restantes FROM fechas_pago_servicios;

-- PASO 3: Ver servicios activos disponibles
SELECT 'SERVICIOS ACTIVOS DISPONIBLES' as info;

SELECT
  s.id,
  s.nombre,
  s.propiedad_id,
  p.nombre_propiedad,
  s.ultima_fecha_pago,
  s.frecuencia_valor,
  s.frecuencia_unidad,
  s.activo
FROM servicios_inmueble s
LEFT JOIN propiedades p ON s.propiedad_id = p.id
WHERE s.activo = true
ORDER BY p.nombre_propiedad, s.nombre;

-- PASO 4: REGENERAR tickets solo para servicios con última_fecha_pago
-- (Los que se crearon correctamente en el wizard)
DO $$
DECLARE
  servicio_record RECORD;
  tickets_generados INTEGER;
  total_tickets INTEGER := 0;
BEGIN
  -- Recorrer SOLO servicios activos con fecha válida
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
    -- Generar 12 meses de tickets
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

-- PASO 5: VERIFICAR resultados finales
SELECT 'VERIFICACIÓN FINAL' as info;

SELECT
  COUNT(*) as total_tickets,
  COUNT(DISTINCT servicio_id) as servicios_con_tickets,
  COUNT(DISTINCT propiedad_id) as propiedades_con_tickets,
  MIN(fecha_pago) as fecha_mas_cercana,
  MAX(fecha_pago) as fecha_mas_lejana
FROM fechas_pago_servicios;

-- Ver detalle por servicio
SELECT
  p.nombre_propiedad,
  s.nombre as servicio,
  s.frecuencia_valor || ' ' || s.frecuencia_unidad as frecuencia,
  COUNT(fps.id) as tickets_generados,
  MIN(fps.fecha_pago) as primer_ticket,
  MAX(fps.fecha_pago) as ultimo_ticket
FROM servicios_inmueble s
LEFT JOIN fechas_pago_servicios fps ON fps.servicio_id = s.id
LEFT JOIN propiedades p ON s.propiedad_id = p.id
WHERE s.activo = true
GROUP BY p.nombre_propiedad, s.nombre, s.frecuencia_valor, s.frecuencia_unidad
ORDER BY p.nombre_propiedad, s.nombre;

-- ============================================================================
-- ✅ LISTO! Sistema de tickets limpio y regenerado solo desde servicios válidos
-- ============================================================================
