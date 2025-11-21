-- ============================================================================
-- 🏢 RAS - MIGRACIÓN: Sistema de Cuentas Bancarias e Ingresos (VERSIÓN SEGURA)
-- ============================================================================
-- Fecha: 21 de Noviembre 2025
-- Descripción: Agrega tablas para cuentas bancarias, ingresos y relaciones
-- NOTA: Esta versión elimina funciones existentes primero para evitar errores
-- ============================================================================

-- ============================================================================
-- PASO 0: LIMPIAR FUNCIONES EXISTENTES (EVITAR CONFLICTOS)
-- ============================================================================

DROP FUNCTION IF EXISTS generar_fechas_pago_servicio(uuid, integer);
DROP FUNCTION IF EXISTS actualizar_balance_cuenta_pago();
DROP FUNCTION IF EXISTS actualizar_balance_cuenta_ingreso();
DROP FUNCTION IF EXISTS inicializar_balance_cuenta();

-- ============================================================================
-- PASO 1: ACTUALIZAR TABLA fechas_pago_servicios
-- ============================================================================
-- Agregar campos extendidos para registro de pagos

ALTER TABLE fechas_pago_servicios
ADD COLUMN IF NOT EXISTS metodo_pago TEXT,
ADD COLUMN IF NOT EXISTS referencia_pago TEXT,
ADD COLUMN IF NOT EXISTS tiene_factura BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS numero_factura TEXT,
ADD COLUMN IF NOT EXISTS comprobante_url TEXT,
ADD COLUMN IF NOT EXISTS cuenta_id UUID, -- FK a cuentas_bancarias
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índice para búsqueda por cuenta
CREATE INDEX IF NOT EXISTS idx_fechas_pago_cuenta ON fechas_pago_servicios(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_fechas_pago_metodo ON fechas_pago_servicios(metodo_pago);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_fechas_pago_updated_at ON fechas_pago_servicios;
CREATE TRIGGER update_fechas_pago_updated_at BEFORE UPDATE ON fechas_pago_servicios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 2: CREAR TABLA cuentas_bancarias
-- ============================================================================

CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  -- IDENTIFICACIÓN
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- RELACIONES (una cuenta puede ser de una propiedad O de un propietario)
  propiedad_id      UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  propietario_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- INFORMACIÓN DE LA CUENTA
  nombre            TEXT NOT NULL, -- "Cuenta principal Casa Playa", "Tarjeta Banamex", etc.
  tipo_moneda       TEXT NOT NULL DEFAULT 'MXN', -- 'MXN' | 'USD'
  tipo_cuenta       TEXT NOT NULL DEFAULT 'Banco', -- 'Banco' | 'Tarjeta' | 'Efectivo'
  banco             TEXT, -- "BBVA", "Santander", etc. (NULL para efectivo)
  numero_cuenta     TEXT, -- Últimos 4 dígitos (opcional)

  -- BALANCE
  balance_inicial   NUMERIC(12,2) DEFAULT 0, -- Balance al crear la cuenta
  balance_actual    NUMERIC(12,2) DEFAULT 0, -- Balance calculado automáticamente

  -- METADATA
  descripcion       TEXT,
  color             TEXT, -- Color para identificar visualmente (hex)

  -- ESTADO
  activo            BOOLEAN DEFAULT TRUE,

  -- TIMESTAMPS
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINT: debe tener propiedad_id O propietario_id (no ambos ni ninguno)
  CONSTRAINT check_cuenta_relacion CHECK (
    (propiedad_id IS NOT NULL AND propietario_id IS NULL) OR
    (propiedad_id IS NULL AND propietario_id IS NOT NULL)
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cuentas_propiedad ON cuentas_bancarias(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_propietario ON cuentas_bancarias(propietario_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_activo ON cuentas_bancarias(activo);
CREATE INDEX IF NOT EXISTS idx_cuentas_tipo ON cuentas_bancarias(tipo_cuenta);
CREATE INDEX IF NOT EXISTS idx_cuentas_moneda ON cuentas_bancarias(tipo_moneda);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_cuentas_updated_at ON cuentas_bancarias;
CREATE TRIGGER update_cuentas_updated_at BEFORE UPDATE ON cuentas_bancarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 3: CREAR TABLA ingresos
-- ============================================================================

CREATE TABLE IF NOT EXISTS ingresos (
  -- IDENTIFICACIÓN
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- RELACIONES
  propiedad_id      UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  cuenta_id         UUID REFERENCES cuentas_bancarias(id) ON DELETE SET NULL,
  creado_por        UUID REFERENCES profiles(id),

  -- DATOS DEL INGRESO
  concepto          TEXT NOT NULL, -- "Renta mensual Febrero", "Depósito inquilino", etc.
  monto             NUMERIC(10,2) NOT NULL,
  fecha_ingreso     DATE NOT NULL,

  -- CATEGORÍA
  tipo_ingreso      TEXT, -- 'Renta' | 'Depósito' | 'Venta' | 'Otro'

  -- DETALLES DE PAGO
  metodo_pago       TEXT, -- 'Transferencia' | 'Efectivo' | 'Cheque' | 'Tarjeta' | 'Otro'
  referencia_pago   TEXT, -- Número de referencia/operación

  -- FACTURACIÓN
  tiene_factura     BOOLEAN DEFAULT FALSE,
  numero_factura    TEXT,

  -- ARCHIVOS
  comprobante_url   TEXT,

  -- NOTAS
  notas             TEXT,

  -- TIMESTAMPS
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ingresos_propiedad ON ingresos(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_cuenta ON ingresos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_ingresos_tipo ON ingresos(tipo_ingreso);
CREATE INDEX IF NOT EXISTS idx_ingresos_creado_por ON ingresos(creado_por);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_ingresos_updated_at ON ingresos;
CREATE TRIGGER update_ingresos_updated_at BEFORE UPDATE ON ingresos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 4: AGREGAR FK a fechas_pago_servicios
-- ============================================================================
-- Agregar constraint de foreign key para cuenta_id (si no existe)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fechas_pago_servicios_cuenta_id_fkey'
  ) THEN
    ALTER TABLE fechas_pago_servicios
    ADD CONSTRAINT fechas_pago_servicios_cuenta_id_fkey
    FOREIGN KEY (cuenta_id) REFERENCES cuentas_bancarias(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- PASO 5: CREAR FUNCIONES AUXILIARES
-- ============================================================================

-- Función para actualizar balance de cuenta al registrar pago (egreso)
CREATE OR REPLACE FUNCTION actualizar_balance_cuenta_pago()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si el pago está marcado como pagado y tiene cuenta asociada
  IF NEW.pagado = TRUE AND NEW.cuenta_id IS NOT NULL THEN
    -- Restar del balance (es un egreso)
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual - NEW.monto_real,
        updated_at = NOW()
    WHERE id = NEW.cuenta_id;
  END IF;

  -- Si se desmarca el pago, revertir el balance
  IF OLD.pagado = TRUE AND NEW.pagado = FALSE AND OLD.cuenta_id IS NOT NULL THEN
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual + OLD.monto_real,
        updated_at = NOW()
    WHERE id = OLD.cuenta_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balance al marcar pago
DROP TRIGGER IF EXISTS trigger_actualizar_balance_pago ON fechas_pago_servicios;
CREATE TRIGGER trigger_actualizar_balance_pago
  AFTER UPDATE ON fechas_pago_servicios
  FOR EACH ROW
  WHEN (OLD.pagado IS DISTINCT FROM NEW.pagado OR OLD.monto_real IS DISTINCT FROM NEW.monto_real)
  EXECUTE FUNCTION actualizar_balance_cuenta_pago();

-- Función para actualizar balance de cuenta al registrar ingreso
CREATE OR REPLACE FUNCTION actualizar_balance_cuenta_ingreso()
RETURNS TRIGGER AS $$
BEGIN
  -- Al insertar ingreso, sumar al balance
  IF TG_OP = 'INSERT' AND NEW.cuenta_id IS NOT NULL THEN
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual + NEW.monto,
        updated_at = NOW()
    WHERE id = NEW.cuenta_id;
  END IF;

  -- Al actualizar ingreso, ajustar balance
  IF TG_OP = 'UPDATE' AND NEW.cuenta_id IS NOT NULL THEN
    -- Revertir el ingreso anterior
    IF OLD.cuenta_id IS NOT NULL THEN
      UPDATE cuentas_bancarias
      SET balance_actual = balance_actual - OLD.monto,
          updated_at = NOW()
      WHERE id = OLD.cuenta_id;
    END IF;

    -- Aplicar el nuevo ingreso
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual + NEW.monto,
        updated_at = NOW()
    WHERE id = NEW.cuenta_id;
  END IF;

  -- Al eliminar ingreso, restar del balance
  IF TG_OP = 'DELETE' AND OLD.cuenta_id IS NOT NULL THEN
    UPDATE cuentas_bancarias
    SET balance_actual = balance_actual - OLD.monto,
        updated_at = NOW()
    WHERE id = OLD.cuenta_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balance al crear/modificar/eliminar ingreso
DROP TRIGGER IF EXISTS trigger_actualizar_balance_ingreso ON ingresos;
CREATE TRIGGER trigger_actualizar_balance_ingreso
  AFTER INSERT OR UPDATE OR DELETE ON ingresos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_balance_cuenta_ingreso();

-- Función para inicializar balance de cuenta al crearla
CREATE OR REPLACE FUNCTION inicializar_balance_cuenta()
RETURNS TRIGGER AS $$
BEGIN
  -- Establecer balance_actual = balance_inicial al crear la cuenta
  NEW.balance_actual := NEW.balance_inicial;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para inicializar balance al crear cuenta
DROP TRIGGER IF EXISTS trigger_inicializar_balance ON cuentas_bancarias;
CREATE TRIGGER trigger_inicializar_balance
  BEFORE INSERT ON cuentas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION inicializar_balance_cuenta();

-- ============================================================================
-- PASO 6: FUNCIÓN PARA GENERAR FECHAS DE PAGO AUTOMÁTICAS
-- ============================================================================

CREATE OR REPLACE FUNCTION generar_fechas_pago_servicio(
  p_servicio_id UUID,
  p_cantidad_meses INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
DECLARE
  v_servicio RECORD;
  v_fecha_inicio DATE;
  v_fecha_pago DATE;
  v_contador INTEGER := 0;
  v_existe BOOLEAN;
BEGIN
  -- Obtener datos del servicio
  SELECT * INTO v_servicio
  FROM servicios_inmueble
  WHERE id = p_servicio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Servicio no encontrado: %', p_servicio_id;
  END IF;

  -- Determinar fecha de inicio
  IF v_servicio.ultima_fecha_pago IS NOT NULL THEN
    v_fecha_inicio := v_servicio.ultima_fecha_pago;
  ELSE
    v_fecha_inicio := CURRENT_DATE;
  END IF;

  -- Generar fechas de pago
  FOR i IN 1..p_cantidad_meses LOOP
    -- Calcular próxima fecha según frecuencia
    CASE v_servicio.frecuencia_unidad
      WHEN 'dias' THEN
        v_fecha_pago := v_fecha_inicio + (i * v_servicio.frecuencia_valor * INTERVAL '1 day');
      WHEN 'semanas' THEN
        v_fecha_pago := v_fecha_inicio + (i * v_servicio.frecuencia_valor * INTERVAL '1 week');
      WHEN 'meses' THEN
        v_fecha_pago := v_fecha_inicio + (i * v_servicio.frecuencia_valor * INTERVAL '1 month');
      WHEN 'anos' THEN
        v_fecha_pago := v_fecha_inicio + (i * v_servicio.frecuencia_valor * INTERVAL '1 year');
      ELSE
        RAISE EXCEPTION 'Frecuencia no válida: %', v_servicio.frecuencia_unidad;
    END CASE;

    -- Verificar si ya existe una fecha de pago para esta fecha
    SELECT EXISTS (
      SELECT 1 FROM fechas_pago_servicios
      WHERE servicio_id = p_servicio_id
        AND fecha_pago = v_fecha_pago
    ) INTO v_existe;

    -- Insertar solo si no existe
    IF NOT v_existe THEN
      INSERT INTO fechas_pago_servicios (
        servicio_id,
        propiedad_id,
        fecha_pago,
        monto_estimado,
        pagado
      ) VALUES (
        p_servicio_id,
        v_servicio.propiedad_id,
        v_fecha_pago,
        v_servicio.monto,
        FALSE
      );
      v_contador := v_contador + 1;
    END IF;
  END LOOP;

  RETURN v_contador;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 7: CREAR VISTA CONSOLIDADA DE MOVIMIENTOS
-- ============================================================================

-- Vista que combina ingresos y egresos para mostrar en balance
CREATE OR REPLACE VIEW v_movimientos_cuenta AS
-- Egresos (pagos realizados)
SELECT
  fps.id,
  'egreso' AS tipo,
  fps.fecha_pago_real AS fecha,
  fps.monto_real AS monto,
  s.nombre AS concepto,
  fps.cuenta_id,
  fps.propiedad_id,
  fps.metodo_pago,
  fps.referencia_pago,
  fps.tiene_factura,
  fps.numero_factura,
  fps.comprobante_url,
  fps.notas,
  s.tipo_servicio AS categoria,
  fps.created_at
FROM fechas_pago_servicios fps
JOIN servicios_inmueble s ON fps.servicio_id = s.id
WHERE fps.pagado = TRUE

UNION ALL

-- Ingresos
SELECT
  i.id,
  'ingreso' AS tipo,
  i.fecha_ingreso AS fecha,
  i.monto,
  i.concepto,
  i.cuenta_id,
  i.propiedad_id,
  i.metodo_pago,
  i.referencia_pago,
  i.tiene_factura,
  i.numero_factura,
  i.comprobante_url,
  i.notas,
  i.tipo_ingreso AS categoria,
  i.created_at
FROM ingresos i

ORDER BY fecha DESC, created_at DESC;

-- ============================================================================
-- PASO 8: COMENTARIOS DESCRIPTIVOS
-- ============================================================================

COMMENT ON TABLE cuentas_bancarias IS 'Cuentas bancarias, tarjetas y efectivo asociadas a propiedades o propietarios';
COMMENT ON TABLE ingresos IS 'Registro de ingresos (rentas, depósitos, ventas, etc.)';
COMMENT ON COLUMN cuentas_bancarias.balance_actual IS 'Balance calculado automáticamente por triggers al registrar ingresos/egresos';
COMMENT ON VIEW v_movimientos_cuenta IS 'Vista consolidada de todos los movimientos (ingresos y egresos) para balance';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificación: Listar tablas creadas
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('cuentas_bancarias', 'ingresos')
ORDER BY table_name;
