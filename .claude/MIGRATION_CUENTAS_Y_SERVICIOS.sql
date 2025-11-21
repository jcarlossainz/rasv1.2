-- ============================================================================
-- 🔧 MIGRACIÓN: UNIFICACIÓN SISTEMA TICKETS-BALANCE-CALENDARIO
-- ============================================================================
-- Fecha: 21 de Noviembre 2025
-- Descripción: Renombra cuentas_bancarias → cuentas y crea función RPC
-- ============================================================================

-- ============================================================================
-- PASO 1: RENOMBRAR TABLA cuentas_bancarias → cuentas
-- ============================================================================

-- 1.1 Verificar que existe cuentas_bancarias
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'cuentas_bancarias') THEN
        RAISE EXCEPTION 'La tabla cuentas_bancarias no existe';
    END IF;
END $$;

-- 1.2 Eliminar tabla vieja "cuentas" si existe
DROP TABLE IF EXISTS cuentas CASCADE;

-- 1.3 Renombrar cuentas_bancarias → cuentas
ALTER TABLE cuentas_bancarias RENAME TO cuentas;

-- 1.4 Verificar que se renombró correctamente
SELECT 'Tabla renombrada correctamente' as status
FROM pg_tables
WHERE tablename = 'cuentas';

-- ============================================================================
-- PASO 2: CREAR FUNCIÓN PARA GENERAR FECHAS DE PAGO AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION generar_fechas_pago_servicio(
  p_servicio_id UUID,
  p_cantidad_meses INTEGER DEFAULT 12
) RETURNS INTEGER AS $$
DECLARE
  v_servicio RECORD;
  v_fecha_base DATE;
  v_fecha_siguiente DATE;
  v_contador INTEGER := 0;
  v_meses_agregados INTEGER := 0;
  v_dias_agregados INTEGER := 0;
  v_semanas_agregadas INTEGER := 0;
BEGIN
  -- 1. Obtener información del servicio
  SELECT
    s.propiedad_id,
    s.monto,
    s.frecuencia_valor,
    s.frecuencia_unidad,
    s.ultima_fecha_pago
  INTO v_servicio
  FROM servicios_inmueble s
  WHERE s.id = p_servicio_id AND s.activo = TRUE;

  -- Verificar que existe el servicio
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Servicio no encontrado o inactivo: %', p_servicio_id;
  END IF;

  -- Verificar que tiene última fecha de pago
  IF v_servicio.ultima_fecha_pago IS NULL THEN
    RAISE EXCEPTION 'El servicio no tiene fecha de último pago configurada';
  END IF;

  -- 2. Calcular fecha base (siguiente pago después del último)
  CASE v_servicio.frecuencia_unidad
    WHEN 'dias' THEN
      v_fecha_base := v_servicio.ultima_fecha_pago + (v_servicio.frecuencia_valor || ' days')::INTERVAL;
    WHEN 'semanas' THEN
      v_fecha_base := v_servicio.ultima_fecha_pago + (v_servicio.frecuencia_valor || ' weeks')::INTERVAL;
    WHEN 'meses' THEN
      v_fecha_base := v_servicio.ultima_fecha_pago + (v_servicio.frecuencia_valor || ' months')::INTERVAL;
    WHEN 'anos' THEN
      v_fecha_base := v_servicio.ultima_fecha_pago + (v_servicio.frecuencia_valor || ' years')::INTERVAL;
    ELSE
      RAISE EXCEPTION 'Unidad de frecuencia no válida: %', v_servicio.frecuencia_unidad;
  END CASE;

  -- 3. Si la fecha base es pasada, ajustar al futuro
  WHILE v_fecha_base < CURRENT_DATE LOOP
    CASE v_servicio.frecuencia_unidad
      WHEN 'dias' THEN
        v_fecha_base := v_fecha_base + (v_servicio.frecuencia_valor || ' days')::INTERVAL;
      WHEN 'semanas' THEN
        v_fecha_base := v_fecha_base + (v_servicio.frecuencia_valor || ' weeks')::INTERVAL;
      WHEN 'meses' THEN
        v_fecha_base := v_fecha_base + (v_servicio.frecuencia_valor || ' months')::INTERVAL;
      WHEN 'anos' THEN
        v_fecha_base := v_fecha_base + (v_servicio.frecuencia_valor || ' years')::INTERVAL;
    END CASE;
  END LOOP;

  -- 4. Generar fechas de pago para los próximos N meses
  v_fecha_siguiente := v_fecha_base;
  v_contador := 0;

  WHILE v_contador < p_cantidad_meses LOOP
    -- Verificar si ya existe una fecha de pago similar (±3 días)
    IF NOT EXISTS (
      SELECT 1 FROM fechas_pago_servicios
      WHERE servicio_id = p_servicio_id
        AND fecha_pago BETWEEN (v_fecha_siguiente - INTERVAL '3 days')
                           AND (v_fecha_siguiente + INTERVAL '3 days')
    ) THEN
      -- Insertar nueva fecha de pago
      INSERT INTO fechas_pago_servicios (
        servicio_id,
        propiedad_id,
        fecha_pago,
        monto_estimado,
        pagado,
        created_at
      ) VALUES (
        p_servicio_id,
        v_servicio.propiedad_id,
        v_fecha_siguiente,
        v_servicio.monto,
        FALSE,
        NOW()
      );
    END IF;

    -- Calcular siguiente fecha
    CASE v_servicio.frecuencia_unidad
      WHEN 'dias' THEN
        v_fecha_siguiente := v_fecha_siguiente + (v_servicio.frecuencia_valor || ' days')::INTERVAL;
      WHEN 'semanas' THEN
        v_fecha_siguiente := v_fecha_siguiente + (v_servicio.frecuencia_valor || ' weeks')::INTERVAL;
      WHEN 'meses' THEN
        v_fecha_siguiente := v_fecha_siguiente + (v_servicio.frecuencia_valor || ' months')::INTERVAL;
      WHEN 'anos' THEN
        v_fecha_siguiente := v_fecha_siguiente + (v_servicio.frecuencia_valor || ' years')::INTERVAL;
    END CASE;

    v_contador := v_contador + 1;
  END LOOP;

  RETURN v_contador;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 3: CREAR FUNCIÓN PARA ACTUALIZAR SALDO DE CUENTA
-- ============================================================================

CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
DECLARE
  v_monto NUMERIC;
  v_cuenta_id UUID;
BEGIN
  -- Determinar el monto y cuenta según la tabla
  IF TG_TABLE_NAME = 'fechas_pago_servicios' THEN
    v_monto := NEW.monto_real;
    v_cuenta_id := NEW.cuenta_id;

    -- Solo actualizar si se marcó como pagado
    IF NEW.pagado = TRUE AND OLD.pagado = FALSE AND v_cuenta_id IS NOT NULL THEN
      -- Restar del saldo (egreso)
      UPDATE cuentas
      SET
        balance_actual = balance_actual - v_monto,
        updated_at = NOW()
      WHERE id = v_cuenta_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'ingresos' THEN
    v_monto := NEW.monto;
    v_cuenta_id := NEW.cuenta_id;

    -- Sumar al saldo (ingreso)
    IF v_cuenta_id IS NOT NULL THEN
      UPDATE cuentas
      SET
        balance_actual = balance_actual + v_monto,
        updated_at = NOW()
      WHERE id = v_cuenta_id;
    END IF;

  ELSIF TG_TABLE_NAME = 'tickets' THEN
    v_monto := NEW.monto_real;
    v_cuenta_id := NEW.cuenta_id;

    -- Solo si afecta balance y se marcó como pagado
    IF NEW.afecta_balance = TRUE AND NEW.pagado = TRUE AND OLD.pagado = FALSE AND v_cuenta_id IS NOT NULL THEN
      -- Si es egreso, restar; si es ingreso, sumar
      IF NEW.tipo_movimiento = 'egreso' THEN
        UPDATE cuentas
        SET
          balance_actual = balance_actual - v_monto,
          updated_at = NOW()
        WHERE id = v_cuenta_id;
      ELSIF NEW.tipo_movimiento = 'ingreso' THEN
        UPDATE cuentas
        SET
          balance_actual = balance_actual + v_monto,
          updated_at = NOW()
        WHERE id = v_cuenta_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 4: CREAR TRIGGERS PARA ACTUALIZAR SALDOS AUTOMÁTICAMENTE
-- ============================================================================

-- Trigger para fechas_pago_servicios
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_pago_servicio ON fechas_pago_servicios;
CREATE TRIGGER trigger_actualizar_saldo_pago_servicio
  AFTER UPDATE ON fechas_pago_servicios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cuenta();

-- Trigger para ingresos
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_ingreso ON ingresos;
CREATE TRIGGER trigger_actualizar_saldo_ingreso
  AFTER INSERT ON ingresos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cuenta();

-- Trigger para tickets
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_ticket ON tickets;
CREATE TRIGGER trigger_actualizar_saldo_ticket
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cuenta();

-- ============================================================================
-- PASO 5: VERIFICACIONES FINALES
-- ============================================================================

-- Verificar que la función se creó correctamente
SELECT
  'generar_fechas_pago_servicio creada correctamente' as status
FROM pg_proc
WHERE proname = 'generar_fechas_pago_servicio';

-- Verificar triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_actualizar_saldo_pago_servicio',
  'trigger_actualizar_saldo_ingreso',
  'trigger_actualizar_saldo_ticket'
)
ORDER BY event_object_table;

-- Mostrar estructura final de tabla cuentas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cuentas'
ORDER BY ordinal_position;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

COMMENT ON FUNCTION generar_fechas_pago_servicio IS
'Genera fechas de pago automáticas basadas en la frecuencia del servicio.
Considera la fecha actual y solo genera fechas futuras.';

COMMENT ON FUNCTION actualizar_saldo_cuenta IS
'Actualiza automáticamente el saldo de cuentas al registrar pagos o ingresos.';
