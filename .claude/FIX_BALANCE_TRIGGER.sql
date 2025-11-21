-- ============================================================================
-- FIX: Trigger de Inicialización de Balance
-- Problema: balance_actual muestra 0 en vez de balance_inicial
-- ============================================================================

-- 1. Verificar si el trigger existe
SELECT
  tgname AS trigger_name,
  tgtype AS trigger_type,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'trigger_inicializar_balance';

-- 2. Verificar la función
SELECT
  proname AS function_name,
  prosrc AS source_code
FROM pg_proc
WHERE proname = 'inicializar_balance_cuenta';

-- 3. Recrear el trigger por si acaso
DROP TRIGGER IF EXISTS trigger_inicializar_balance ON cuentas_bancarias;

-- 4. Recrear la función
CREATE OR REPLACE FUNCTION inicializar_balance_cuenta()
RETURNS TRIGGER AS $$
BEGIN
  -- Establecer balance_actual = balance_inicial al crear la cuenta
  IF NEW.balance_actual IS NULL OR NEW.balance_actual = 0 THEN
    NEW.balance_actual := COALESCE(NEW.balance_inicial, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recrear el trigger
CREATE TRIGGER trigger_inicializar_balance
  BEFORE INSERT ON cuentas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION inicializar_balance_cuenta();

-- 6. Actualizar cuentas existentes que tengan balance_actual en 0
UPDATE cuentas_bancarias
SET balance_actual = balance_inicial
WHERE balance_actual = 0 AND balance_inicial != 0;

-- 7. Verificar el resultado
SELECT
  id,
  nombre,
  balance_inicial,
  balance_actual,
  created_at
FROM cuentas_bancarias
ORDER BY created_at DESC
LIMIT 10;
