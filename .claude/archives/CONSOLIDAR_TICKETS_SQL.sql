-- ============================================================================
-- CONSOLIDACIÓN DE TICKETS: fechas_pago_servicios → tickets
-- ============================================================================
--
-- Este script actualiza los objetos SQL para usar la tabla unificada 'tickets'
-- en lugar de la tabla legacy 'fechas_pago_servicios'.
--
-- EJECUTAR EN ORDEN:
-- 1. Primero: Recrear la vista v_proximos_pagos
-- 2. Segundo: (Opcional) Migrar datos existentes
-- 3. Tercero: (Opcional) Eliminar tabla legacy
-- ============================================================================

-- ============================================================================
-- PASO 1: RECREAR VISTA v_proximos_pagos USANDO TABLA 'tickets'
-- ============================================================================

-- Eliminar vista anterior
DROP VIEW IF EXISTS v_proximos_pagos;

-- Crear nueva vista usando tabla unificada 'tickets'
CREATE OR REPLACE VIEW v_proximos_pagos AS
SELECT
  t.id,
  t.propiedad_id,
  t.servicio_id,
  t.titulo,
  t.descripcion,
  t.fecha_programada AS fecha_pago,
  t.monto_estimado,
  t.monto_real,
  t.pagado,
  t.fecha_pago_real,
  t.cuenta_id,
  t.tipo_ticket,
  t.estado,
  t.prioridad,
  p.nombre_propiedad,
  p.owner_id,
  -- Estado de urgencia calculado
  CASE
    WHEN t.fecha_programada < CURRENT_DATE AND t.pagado = FALSE THEN 'vencido'
    WHEN t.fecha_programada = CURRENT_DATE AND t.pagado = FALSE THEN 'hoy'
    WHEN t.fecha_programada <= CURRENT_DATE + INTERVAL '7 days' AND t.pagado = FALSE THEN 'proximo'
    WHEN t.pagado = TRUE THEN 'pagado'
    ELSE 'futuro'
  END AS estado_urgencia,
  -- Días hasta vencimiento (negativo = vencido)
  (t.fecha_programada - CURRENT_DATE) AS dias_restantes
FROM tickets t
JOIN propiedades p ON t.propiedad_id = p.id
WHERE
  -- Mostrar: no pagados O pagados en últimos 30 días
  t.pagado = FALSE
  OR t.fecha_pago_real >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY t.fecha_programada ASC;

-- Comentario de la vista
COMMENT ON VIEW v_proximos_pagos IS
'Vista unificada de próximos pagos desde tabla tickets. Incluye tickets manuales y de servicios.';

-- ============================================================================
-- PASO 2: (OPCIONAL) MIGRAR DATOS DE fechas_pago_servicios → tickets
-- ============================================================================
-- Solo ejecutar si hay datos en fechas_pago_servicios que no están en tickets

-- Primero, verificar si hay datos para migrar
SELECT
  '📊 DATOS EN fechas_pago_servicios:' as info,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE pagado = false) as pendientes,
  COUNT(*) FILTER (WHERE pagado = true) as pagados
FROM fechas_pago_servicios;

-- Verificar duplicados potenciales (mismo servicio_id y fecha)
SELECT
  '⚠️ POSIBLES DUPLICADOS:' as info,
  fps.servicio_id,
  fps.fecha_pago,
  COUNT(*) as en_fps,
  (SELECT COUNT(*) FROM tickets t WHERE t.servicio_id = fps.servicio_id AND t.fecha_programada = fps.fecha_pago) as en_tickets
FROM fechas_pago_servicios fps
GROUP BY fps.servicio_id, fps.fecha_pago
HAVING (SELECT COUNT(*) FROM tickets t WHERE t.servicio_id = fps.servicio_id AND t.fecha_programada = fps.fecha_pago) > 0
LIMIT 10;

-- MIGRACIÓN: Insertar registros que NO existen en tickets
-- DESCOMENTAR PARA EJECUTAR:
/*
INSERT INTO tickets (
  propiedad_id,
  servicio_id,
  titulo,
  fecha_programada,
  monto_estimado,
  monto_real,
  pagado,
  fecha_pago_real,
  cuenta_id,
  tipo_ticket,
  estado,
  prioridad,
  created_at
)
SELECT
  fps.propiedad_id,
  fps.servicio_id,
  COALESCE(s.nombre, 'Pago de servicio') as titulo,
  fps.fecha_pago as fecha_programada,
  fps.monto_estimado,
  fps.monto_real,
  fps.pagado,
  fps.fecha_pago_real,
  fps.cuenta_id,
  COALESCE(s.tipo_servicio, 'servicio') as tipo_ticket,
  CASE WHEN fps.pagado THEN 'completado' ELSE 'pendiente' END as estado,
  'media' as prioridad,
  fps.created_at
FROM fechas_pago_servicios fps
LEFT JOIN servicios_inmueble s ON fps.servicio_id = s.id
WHERE NOT EXISTS (
  SELECT 1 FROM tickets t
  WHERE t.servicio_id = fps.servicio_id
  AND t.fecha_programada = fps.fecha_pago
);
*/

-- ============================================================================
-- PASO 3: (OPCIONAL) LIMPIAR TABLA LEGACY fechas_pago_servicios
-- ============================================================================
-- Solo ejecutar DESPUÉS de verificar que todo funciona correctamente

-- Verificar que la app funciona con la nueva estructura antes de eliminar

-- OPCIÓN A: Mantener tabla pero vaciarla (reversible)
-- TRUNCATE TABLE fechas_pago_servicios;

-- OPCIÓN B: Eliminar tabla completamente (irreversible)
-- DROP TABLE IF EXISTS fechas_pago_servicios CASCADE;

-- ============================================================================
-- PASO 4: (OPCIONAL) LIMPIAR POLÍTICAS RLS DE TABLA LEGACY
-- ============================================================================
-- Solo si decides eliminar la tabla

/*
-- Eliminar políticas RLS
DROP POLICY IF EXISTS "Usuarios ven pagos de sus propiedades" ON fechas_pago_servicios;
DROP POLICY IF EXISTS "Usuarios insertan pagos en sus propiedades" ON fechas_pago_servicios;
DROP POLICY IF EXISTS "Usuarios actualizan pagos de sus propiedades" ON fechas_pago_servicios;
DROP POLICY IF EXISTS "Usuarios eliminan pagos de sus propiedades" ON fechas_pago_servicios;

-- Deshabilitar RLS
ALTER TABLE fechas_pago_servicios DISABLE ROW LEVEL SECURITY;
*/

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que la vista funciona
SELECT
  '✅ VISTA v_proximos_pagos:' as info,
  COUNT(*) as total_registros
FROM v_proximos_pagos;

-- Verificar tickets por estado
SELECT
  estado_urgencia,
  COUNT(*) as cantidad,
  SUM(monto_estimado) as monto_total
FROM v_proximos_pagos
GROUP BY estado_urgencia
ORDER BY
  CASE estado_urgencia
    WHEN 'vencido' THEN 1
    WHEN 'hoy' THEN 2
    WHEN 'proximo' THEN 3
    WHEN 'futuro' THEN 4
    WHEN 'pagado' THEN 5
  END;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. La tabla 'tickets' ahora es la ÚNICA fuente de verdad
--    - servicio_id != NULL → tickets automáticos de servicios
--    - servicio_id = NULL → tickets manuales
--
-- 2. La vista v_proximos_pagos ahora usa 'tickets' en lugar de
--    'fechas_pago_servicios'
--
-- 3. Antes de eliminar fechas_pago_servicios:
--    - Verificar que no hay datos únicos que falten en tickets
--    - Probar la aplicación completa
--    - Hacer backup de la tabla
--
-- 4. Campos mapeados:
--    fechas_pago_servicios.fecha_pago → tickets.fecha_programada
--    fechas_pago_servicios.* → tickets.* (la mayoría son iguales)
-- ============================================================================
