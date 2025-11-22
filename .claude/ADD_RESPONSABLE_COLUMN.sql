-- ============================================================================
-- MIGRACIÓN: Agregar columna 'responsable' a fechas_pago_servicios
-- ============================================================================
-- Fecha: 21 de Noviembre 2025
-- Descripción: Agrega la columna faltante 'responsable' para registrar quién pagó
-- ============================================================================

-- Agregar columna responsable
ALTER TABLE fechas_pago_servicios
ADD COLUMN IF NOT EXISTS responsable TEXT;

-- Agregar columna notas si no existe
ALTER TABLE fechas_pago_servicios
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Verificar las columnas agregadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fechas_pago_servicios'
  AND column_name IN ('responsable', 'notas')
ORDER BY column_name;

-- Ver estructura completa de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fechas_pago_servicios'
ORDER BY ordinal_position;
