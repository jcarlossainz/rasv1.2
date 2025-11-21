-- ============================================================================
-- DIAGNÓSTICO Y FIX: Balance de Cuentas No Se Actualiza
-- ============================================================================
-- Problema: Al registrar pago de 450, cuenta sigue en 3500 en vez de 3050
-- ============================================================================

-- 1. VERIFICAR SI EL TRIGGER EXISTE
SELECT
  tgname AS trigger_name,
  tgtype AS trigger_type,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'trigger_actualizar_balance_pago';

-- 2. VERIFICAR PAGOS RECIENTES
SELECT
  id,
  servicio_id,
  fecha_pago_real,
  monto_real,
  cuenta_id,
  pagado,
  responsable,
  notas,
  updated_at
FROM fechas_pago_servicios
WHERE pagado = true
  AND cuenta_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- 3. VERIFICAR ESTADO DE LAS CUENTAS
SELECT
  c.id,
  c.nombre,
  c.balance_inicial,
  c.balance_actual,
  c.updated_at,
  COUNT(fps.id) AS num_pagos_asociados,
  COALESCE(SUM(fps.monto_real), 0) AS total_pagos
FROM cuentas_bancarias c
LEFT JOIN fechas_pago_servicios fps ON c.id = fps.cuenta_id AND fps.pagado = true
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.balance_inicial, c.balance_actual, c.updated_at
ORDER BY c.created_at DESC;

-- 4. VERIFICAR LA FUNCIÓN DEL TRIGGER
SELECT
  proname AS function_name,
  prosrc AS source_code
FROM pg_proc
WHERE proname = 'actualizar_balance_cuenta_pago';

-- ============================================================================
-- FIX: RECALCULAR BALANCE DE TODAS LAS CUENTAS
-- ============================================================================

-- Esta consulta muestra cómo DEBERÍA estar el balance de cada cuenta
SELECT
  c.id,
  c.nombre,
  c.balance_inicial,
  c.balance_actual AS balance_actual_incorrecto,
  (c.balance_inicial - COALESCE(SUM(fps.monto_real), 0)) AS balance_esperado,
  COALESCE(SUM(fps.monto_real), 0) AS total_egresos
FROM cuentas_bancarias c
LEFT JOIN fechas_pago_servicios fps ON c.id = fps.cuenta_id AND fps.pagado = true
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.balance_inicial, c.balance_actual
ORDER BY c.created_at DESC;

-- ============================================================================
-- APLICAR FIX: ACTUALIZAR BALANCES CORRECTAMENTE
-- ============================================================================

-- PASO 1: Actualizar balances basándose en egresos
UPDATE cuentas_bancarias c
SET balance_actual = c.balance_inicial - COALESCE((
  SELECT SUM(fps.monto_real)
  FROM fechas_pago_servicios fps
  WHERE fps.cuenta_id = c.id
    AND fps.pagado = true
    AND fps.monto_real IS NOT NULL
), 0),
updated_at = NOW()
WHERE c.activo = true;

-- PASO 2: Verificar resultado
SELECT
  id,
  nombre,
  balance_inicial,
  balance_actual,
  (balance_inicial - balance_actual) AS total_gastado,
  updated_at
FROM cuentas_bancarias
WHERE activo = true
ORDER BY created_at DESC;

-- ============================================================================
-- VERIFICAR QUE EL TRIGGER FUNCIONE PARA FUTUROS PAGOS
-- ============================================================================

-- Si el trigger no existe, recrearlo:

-- Primero eliminar si existe
DROP TRIGGER IF EXISTS trigger_actualizar_balance_pago ON fechas_pago_servicios;

-- Recrear la función
CREATE OR REPLACE FUNCTION actualizar_balance_cuenta_pago()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si el pago está marcado como pagado y tiene cuenta asociada
  IF NEW.pagado = TRUE AND NEW.cuenta_id IS NOT NULL AND NEW.monto_real IS NOT NULL THEN
    -- Verificar si OLD existe (UPDATE vs INSERT)
    IF TG_OP = 'UPDATE' AND OLD.pagado = TRUE AND OLD.cuenta_id IS NOT NULL AND OLD.monto_real IS NOT NULL THEN
      -- Revertir el pago anterior si había
      UPDATE cuentas_bancarias
      SET balance_actual = balance_actual + OLD.monto_real,
          updated_at = NOW()
      WHERE id = OLD.cuenta_id;
    END IF;

    -- Aplicar el nuevo pago (restar del balance)
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual - NEW.monto_real,
        updated_at = NOW()
    WHERE id = NEW.cuenta_id;

    RAISE NOTICE 'Balance actualizado para cuenta % - Restado: %', NEW.cuenta_id, NEW.monto_real;
  END IF;

  -- Si se desmarca el pago, revertir el balance
  IF TG_OP = 'UPDATE' AND OLD.pagado = TRUE AND NEW.pagado = FALSE AND OLD.cuenta_id IS NOT NULL AND OLD.monto_real IS NOT NULL THEN
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual + OLD.monto_real,
        updated_at = NOW()
    WHERE id = OLD.cuenta_id;

    RAISE NOTICE 'Balance revertido para cuenta % + Sumado: %', OLD.cuenta_id, OLD.monto_real;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
CREATE TRIGGER trigger_actualizar_balance_pago
  AFTER INSERT OR UPDATE ON fechas_pago_servicios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_balance_cuenta_pago();

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 'Trigger recreado correctamente' AS status;

-- Ver cuentas actualizadas
SELECT
  nombre,
  balance_inicial,
  balance_actual,
  (balance_inicial - balance_actual) AS gastado,
  updated_at
FROM cuentas_bancarias
WHERE activo = true
ORDER BY created_at DESC;
