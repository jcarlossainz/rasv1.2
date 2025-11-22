-- ============================================================================
-- 🔧 MIGRACIÓN: UNIFICAR SISTEMA DE CUENTAS
-- ============================================================================
-- Fecha: 21 de Noviembre 2025
-- Objetivo: Consolidar tabla cuentas_bancarias → cuentas
-- Descripción: Migra datos, actualiza FK, crea triggers y función RPC
-- ============================================================================

-- ============================================================================
-- PASO 0: ACTUALIZAR CONSTRAINT DE TIPO_CUENTA
-- ============================================================================

-- Eliminar constraint antigua
ALTER TABLE cuentas DROP CONSTRAINT IF EXISTS check_tipo_cuenta;

-- Crear nueva constraint con los 3 tipos: Banco, Tarjeta, Efectivo
ALTER TABLE cuentas
  ADD CONSTRAINT check_tipo_cuenta
  CHECK (tipo_cuenta IN ('Banco', 'Tarjeta', 'Efectivo'));

-- ============================================================================
-- PASO 1: MIGRAR DATOS DE cuentas_bancarias → cuentas
-- ============================================================================

-- 1.1 Migrar registros existentes
INSERT INTO cuentas (
  id,
  user_id,
  nombre_cuenta,
  descripcion,
  saldo_inicial,
  saldo_actual,
  moneda,
  tipo_cuenta,
  banco,
  numero_cuenta,
  -- Campos especiales: convertir relaciones 1:1 a arrays
  propiedades_ids,
  activa,
  created_at,
  updated_at
)
SELECT
  cb.id,
  -- user_id: usar propietario_id, o si es NULL, obtener owner_id de la propiedad
  COALESCE(
    cb.propietario_id,
    (SELECT p.owner_id FROM propiedades p WHERE p.id = cb.propiedad_id LIMIT 1)
  ) as user_id,
  cb.nombre as nombre_cuenta,
  cb.descripcion,
  COALESCE(cb.balance_inicial, 0) as saldo_inicial,
  COALESCE(cb.balance_actual, 0) as saldo_actual,
  COALESCE(cb.tipo_moneda, 'MXN') as moneda,
  -- Normalizar tipo_cuenta a valores permitidos: Banco, Tarjeta, Efectivo
  CASE
    WHEN LOWER(cb.tipo_cuenta) = 'efectivo' THEN 'Efectivo'
    WHEN LOWER(cb.tipo_cuenta) = 'tarjeta' THEN 'Tarjeta'
    WHEN LOWER(cb.tipo_cuenta) IN ('banco', 'bancaria') THEN 'Banco'
    ELSE 'Banco' -- Default
  END as tipo_cuenta,
  cb.banco,
  cb.numero_cuenta,
  -- Convertir propiedad_id a array
  CASE
    WHEN cb.propiedad_id IS NOT NULL THEN ARRAY[cb.propiedad_id]::uuid[]
    ELSE ARRAY[]::uuid[]
  END as propiedades_ids,
  COALESCE(cb.activo, true) as activa,
  COALESCE(cb.created_at, NOW()) as created_at,
  COALESCE(cb.updated_at, NOW()) as updated_at
FROM cuentas_bancarias cb
WHERE NOT EXISTS (
  -- Evitar duplicados si ya se migró antes
  SELECT 1 FROM cuentas c WHERE c.id = cb.id
);

-- Verificar cuántos registros se migraron
SELECT
  'Registros migrados de cuentas_bancarias → cuentas' as status,
  COUNT(*) as total
FROM cuentas
WHERE id IN (SELECT id FROM cuentas_bancarias);

-- ============================================================================
-- PASO 2: ACTUALIZAR FOREIGN KEYS
-- ============================================================================

-- 2.1 Eliminar FK antiguas que apuntan a cuentas_bancarias
ALTER TABLE ingresos
  DROP CONSTRAINT IF EXISTS ingresos_cuenta_id_fkey;

ALTER TABLE fechas_pago_servicios
  DROP CONSTRAINT IF EXISTS fechas_pago_servicios_cuenta_id_fkey;

-- 2.2 Crear nuevas FK que apuntan a cuentas
ALTER TABLE ingresos
  ADD CONSTRAINT ingresos_cuenta_id_fkey
  FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE SET NULL;

ALTER TABLE fechas_pago_servicios
  ADD CONSTRAINT fechas_pago_servicios_cuenta_id_fkey
  FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE SET NULL;

-- tickets.cuenta_id ya apunta a cuentas (no cambiar)

-- Verificar FK actualizadas
SELECT
  conrelid::regclass AS tabla,
  a.attname AS columna,
  confrelid::regclass AS tabla_referenciada
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND a.attname = 'cuenta_id';

-- ============================================================================
-- PASO 3: ELIMINAR TABLA cuentas_bancarias
-- ============================================================================

-- 3.1 Renombrar tabla como backup temporal (por seguridad)
ALTER TABLE cuentas_bancarias RENAME TO cuentas_bancarias_backup_20251121;

-- 3.2 (OPCIONAL) Después de verificar que todo funciona, eliminarla:
-- DROP TABLE cuentas_bancarias_backup_20251121 CASCADE;

COMMENT ON TABLE cuentas_bancarias_backup_20251121 IS
'Backup de cuentas_bancarias antes de migración. ELIMINAR después de verificar que todo funciona.';

-- ============================================================================
-- PASO 4: CREAR FUNCIÓN RPC PARA GENERAR FECHAS DE PAGO
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

COMMENT ON FUNCTION generar_fechas_pago_servicio IS
'Genera fechas de pago automáticas para un servicio.
Parámetros:
  - p_servicio_id: UUID del servicio en servicios_inmueble
  - p_cantidad_meses: Cantidad de meses a generar (default 12)
Retorna: Número de fechas generadas';

-- ============================================================================
-- PASO 5: VERIFICAR/ACTUALIZAR TRIGGERS PARA SALDOS AUTOMÁTICOS
-- ============================================================================

-- 5.1 Función para actualizar saldo cuando se registra un pago
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
    IF NEW.pagado = TRUE AND (OLD IS NULL OR OLD.pagado = FALSE) AND v_cuenta_id IS NOT NULL THEN
      -- Restar del saldo (egreso)
      UPDATE cuentas
      SET
        saldo_actual = saldo_actual - v_monto,
        updated_at = NOW()
      WHERE id = v_cuenta_id;

      RAISE NOTICE 'Saldo actualizado: cuenta_id=%, monto=-%', v_cuenta_id, v_monto;
    END IF;

  ELSIF TG_TABLE_NAME = 'ingresos' THEN
    v_monto := NEW.monto;
    v_cuenta_id := NEW.cuenta_id;

    -- Sumar al saldo (ingreso)
    IF v_cuenta_id IS NOT NULL THEN
      UPDATE cuentas
      SET
        saldo_actual = saldo_actual + v_monto,
        updated_at = NOW()
      WHERE id = v_cuenta_id;

      RAISE NOTICE 'Saldo actualizado: cuenta_id=%, monto=+%', v_cuenta_id, v_monto;
    END IF;

  ELSIF TG_TABLE_NAME = 'tickets' THEN
    v_monto := NEW.monto_real;
    v_cuenta_id := NEW.cuenta_id;

    -- Solo si afecta balance y se marcó como pagado
    IF NEW.afecta_balance = TRUE AND NEW.pagado = TRUE AND (OLD IS NULL OR OLD.pagado = FALSE) AND v_cuenta_id IS NOT NULL THEN
      -- Si es egreso, restar; si es ingreso, sumar
      IF NEW.tipo_movimiento = 'egreso' THEN
        UPDATE cuentas
        SET
          saldo_actual = saldo_actual - v_monto,
          updated_at = NOW()
        WHERE id = v_cuenta_id;

        RAISE NOTICE 'Saldo actualizado: cuenta_id=%, monto=-%', v_cuenta_id, v_monto;
      ELSIF NEW.tipo_movimiento = 'ingreso' THEN
        UPDATE cuentas
        SET
          saldo_actual = saldo_actual + v_monto,
          updated_at = NOW()
        WHERE id = v_cuenta_id;

        RAISE NOTICE 'Saldo actualizado: cuenta_id=%, monto=+%', v_cuenta_id, v_monto;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Actualizar trigger en fechas_pago_servicios (reemplazar el existente)
DROP TRIGGER IF EXISTS trigger_actualizar_balance_pago ON fechas_pago_servicios;
CREATE TRIGGER trigger_actualizar_balance_pago
  AFTER INSERT OR UPDATE ON fechas_pago_servicios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cuenta();

-- 5.3 Crear trigger para ingresos
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_ingreso ON ingresos;
CREATE TRIGGER trigger_actualizar_saldo_ingreso
  AFTER INSERT ON ingresos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cuenta();

-- 5.4 Crear trigger para tickets
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_ticket ON tickets;
CREATE TRIGGER trigger_actualizar_saldo_ticket
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cuenta();

-- ============================================================================
-- PASO 6: VERIFICACIONES FINALES
-- ============================================================================

-- 6.1 Verificar que cuentas tiene los registros migrados
SELECT
  'Total cuentas' as descripcion,
  COUNT(*) as cantidad
FROM cuentas;

-- 6.2 Verificar función RPC
SELECT
  'Función RPC creada' as descripcion,
  proname as nombre
FROM pg_proc
WHERE proname = 'generar_fechas_pago_servicio';

-- 6.3 Verificar todos los triggers de saldos
SELECT
  'Triggers de saldos' as descripcion,
  trigger_name,
  event_object_table as tabla,
  event_manipulation as evento
FROM information_schema.triggers
WHERE trigger_name LIKE '%saldo%'
   OR trigger_name LIKE '%balance%'
ORDER BY event_object_table;

-- 6.4 Verificar todas las FK apuntan a cuentas
SELECT
  'Foreign Keys a cuentas' as descripcion,
  conrelid::regclass AS tabla,
  confrelid::regclass AS tabla_referenciada
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND a.attname = 'cuenta_id'
ORDER BY conrelid::regclass;

-- ============================================================================
-- ÉXITO! 🎉
-- ============================================================================

SELECT '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE' as status;
SELECT '📊 Sistema unificado: tabla CUENTAS es la única fuente de verdad' as info;
SELECT '🔧 Triggers automáticos configurados para actualizar saldos' as info;
SELECT '⚡ Función RPC generar_fechas_pago_servicio() lista para usar' as info;
SELECT '🗑️  Después de verificar, elimina: cuentas_bancarias_backup_20251121' as todo;
