-- ============================================================================
-- MIGRACIÓN: Unificar tickets en una sola tabla
-- ============================================================================
-- Descripción: Agrega servicio_id a tabla tickets para unificar tickets
--              automáticos (de servicios) y manuales en una sola tabla.
-- Fecha: 21 de Noviembre 2025
-- ============================================================================

-- 1. Agregar columna servicio_id a la tabla tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS servicio_id UUID REFERENCES servicios_inmueble(id) ON DELETE SET NULL;

-- 2. Crear índice para servicio_id
CREATE INDEX IF NOT EXISTS idx_tickets_servicio ON tickets(servicio_id);

-- 3. Agregar columna cuenta_id para relacionar tickets con cuentas bancarias (opcional)
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS cuenta_id UUID REFERENCES cuentas_bancarias(id) ON DELETE SET NULL;

-- 4. Crear índice para cuenta_id
CREATE INDEX IF NOT EXISTS idx_tickets_cuenta ON tickets(cuenta_id);

-- ============================================================================
-- MIGRACIÓN DE DATOS (Copiar registros de fechas_pago_servicios a tickets)
-- ============================================================================

-- Insertar todos los registros de fechas_pago_servicios a tickets
INSERT INTO tickets (
  propiedad_id,
  servicio_id,
  titulo,
  descripcion,
  tipo,
  prioridad,
  fecha_programada,
  fecha_completado,
  estado,
  pagado,
  monto_estimado,
  monto_real,
  created_at
)
SELECT
  fps.propiedad_id,
  fps.servicio_id,
  COALESCE(si.nombre, 'Pago de Servicio') as titulo,
  COALESCE(fps.notas, 'Pago generado automáticamente desde servicios') as descripcion,
  'Pago de Servicio' as tipo,
  'Media' as prioridad,
  fps.fecha_pago as fecha_programada,
  fps.fecha_pago_real as fecha_completado,
  CASE
    WHEN fps.pagado = TRUE THEN 'completado'
    ELSE 'pendiente'
  END as estado,
  fps.pagado,
  fps.monto_estimado,
  fps.monto_real,
  fps.created_at
FROM fechas_pago_servicios fps
LEFT JOIN servicios_inmueble si ON fps.servicio_id = si.id
WHERE NOT EXISTS (
  -- Evitar duplicados: solo insertar si no existe ya un ticket idéntico
  SELECT 1 FROM tickets t
  WHERE t.servicio_id = fps.servicio_id
    AND t.fecha_programada = fps.fecha_pago
    AND t.propiedad_id = fps.propiedad_id
);

-- ============================================================================
-- OPCIONAL: Renombrar tabla antigua (en vez de eliminarla)
-- ============================================================================
-- Si quieres mantener backup, renombra en vez de eliminar:
-- ALTER TABLE fechas_pago_servicios RENAME TO fechas_pago_servicios_backup;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Después de verificar que todo funciona correctamente, puedes:
-- 1. DROP TABLE fechas_pago_servicios; (eliminar tabla antigua)
-- 2. O mantenerla como backup temporal
--
-- La tabla 'tickets' ahora es la única fuente de verdad para:
-- - Tickets automáticos de servicios (servicio_id IS NOT NULL)
-- - Tickets manuales (servicio_id IS NULL)
