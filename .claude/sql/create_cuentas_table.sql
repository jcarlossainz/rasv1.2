-- ============================================================
-- TABLA: cuentas
-- Descripción: Gestión de cuentas bancarias y de efectivo
--              para el sistema de balance de propiedades
-- Fecha: 2025-11-20
-- Repositorio: rasv1.2
-- ============================================================

-- Crear tabla cuentas
CREATE TABLE IF NOT EXISTS cuentas (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información básica
  nombre_cuenta VARCHAR(255) NOT NULL,
  descripcion TEXT,

  -- Configuración financiera
  saldo_inicial DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  saldo_actual DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
  tipo_cuenta VARCHAR(20) NOT NULL,

  -- Información bancaria (opcional, solo para cuentas bancarias)
  banco VARCHAR(255),
  numero_cuenta VARCHAR(100),
  clabe VARCHAR(18),

  -- Asociaciones (arrays de UUIDs)
  propietarios_ids UUID[] DEFAULT ARRAY[]::UUID[],
  propiedades_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Configuración de reportes
  fecha_corte_dia INTEGER DEFAULT 1 NOT NULL,
  genera_estados_cuenta BOOLEAN DEFAULT false,

  -- Estado
  activa BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_moneda CHECK (moneda IN ('MXN', 'USD', 'EUR')),
  CONSTRAINT check_tipo_cuenta CHECK (tipo_cuenta IN ('bancaria', 'efectivo')),
  CONSTRAINT check_fecha_corte CHECK (fecha_corte_dia >= 1 AND fecha_corte_dia <= 31),
  CONSTRAINT check_saldos_positivos CHECK (saldo_inicial >= 0 AND saldo_actual >= 0)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Índice para búsqueda por usuario (principal)
CREATE INDEX IF NOT EXISTS idx_cuentas_user_id ON cuentas(user_id);

-- Índice para filtrar cuentas activas
CREATE INDEX IF NOT EXISTS idx_cuentas_activa ON cuentas(activa) WHERE activa = true;

-- Índice para filtrar por tipo de cuenta
CREATE INDEX IF NOT EXISTS idx_cuentas_tipo ON cuentas(tipo_cuenta);

-- Índice para filtrar por moneda
CREATE INDEX IF NOT EXISTS idx_cuentas_moneda ON cuentas(moneda);

-- Índice GIN para búsqueda en array de propiedades
CREATE INDEX IF NOT EXISTS idx_cuentas_propiedades ON cuentas USING GIN(propiedades_ids);

-- Índice GIN para búsqueda en array de propietarios
CREATE INDEX IF NOT EXISTS idx_cuentas_propietarios ON cuentas USING GIN(propietarios_ids);

-- Índice compuesto para consultas frecuentes (user + activa)
CREATE INDEX IF NOT EXISTS idx_cuentas_user_activa ON cuentas(user_id, activa) WHERE activa = true;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta la función antes de cada UPDATE
CREATE TRIGGER update_cuentas_updated_at
BEFORE UPDATE ON cuentas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para inicializar saldo_actual = saldo_inicial en INSERT
CREATE OR REPLACE FUNCTION init_saldo_actual()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saldo_actual IS NULL OR NEW.saldo_actual = 0 THEN
    NEW.saldo_actual := NEW.saldo_inicial;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER init_saldo_cuenta
BEFORE INSERT ON cuentas
FOR EACH ROW
EXECUTE FUNCTION init_saldo_actual();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- NOTA: RLS está DESACTIVADO por ahora para desarrollo
-- Descomentar antes de producción (Fase 7 del proyecto)

-- ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;

-- Política: Usuario solo puede ver sus propias cuentas
-- CREATE POLICY cuentas_select_policy ON cuentas
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- Política: Usuario solo puede insertar sus propias cuentas
-- CREATE POLICY cuentas_insert_policy ON cuentas
--   FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

-- Política: Usuario solo puede actualizar sus propias cuentas
-- CREATE POLICY cuentas_update_policy ON cuentas
--   FOR UPDATE
--   USING (auth.uid() = user_id);

-- Política: Usuario solo puede eliminar (soft delete) sus propias cuentas
-- CREATE POLICY cuentas_delete_policy ON cuentas
--   FOR DELETE
--   USING (auth.uid() = user_id);

-- ============================================================
-- COMENTARIOS (Documentación de la tabla)
-- ============================================================

COMMENT ON TABLE cuentas IS 'Tabla para gestionar cuentas bancarias y de efectivo asociadas a propiedades inmobiliarias';

COMMENT ON COLUMN cuentas.id IS 'Identificador único de la cuenta (UUID)';
COMMENT ON COLUMN cuentas.user_id IS 'ID del usuario propietario de la cuenta (FK a auth.users)';
COMMENT ON COLUMN cuentas.nombre_cuenta IS 'Nombre descriptivo de la cuenta (ej: "Cuenta Efectivo MXN - Casa Playa")';
COMMENT ON COLUMN cuentas.descripcion IS 'Descripción adicional de la cuenta (opcional)';
COMMENT ON COLUMN cuentas.saldo_inicial IS 'Saldo inicial al momento de crear la cuenta';
COMMENT ON COLUMN cuentas.saldo_actual IS 'Saldo actual calculado (se actualiza con movimientos)';
COMMENT ON COLUMN cuentas.moneda IS 'Moneda de la cuenta: MXN, USD o EUR';
COMMENT ON COLUMN cuentas.tipo_cuenta IS 'Tipo de cuenta: bancaria o efectivo';
COMMENT ON COLUMN cuentas.banco IS 'Nombre del banco (solo para cuentas bancarias)';
COMMENT ON COLUMN cuentas.numero_cuenta IS 'Número de cuenta bancaria (solo para cuentas bancarias)';
COMMENT ON COLUMN cuentas.clabe IS 'CLABE interbancaria de 18 dígitos (solo para cuentas bancarias en MXN)';
COMMENT ON COLUMN cuentas.propietarios_ids IS 'Array de UUIDs de propietarios asociados a esta cuenta';
COMMENT ON COLUMN cuentas.propiedades_ids IS 'Array de UUIDs de propiedades asociadas a esta cuenta';
COMMENT ON COLUMN cuentas.fecha_corte_dia IS 'Día del mes para generar estado de cuenta (1-31)';
COMMENT ON COLUMN cuentas.genera_estados_cuenta IS 'Indica si se deben generar estados de cuenta automáticamente';
COMMENT ON COLUMN cuentas.activa IS 'Indica si la cuenta está activa (soft delete)';
COMMENT ON COLUMN cuentas.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN cuentas.updated_at IS 'Fecha y hora de última actualización del registro';

-- ============================================================
-- DATOS DE EJEMPLO (solo para desarrollo - comentado)
-- ============================================================

-- Insertar cuenta de ejemplo (descomentar si se desea)
-- INSERT INTO cuentas (
--   user_id,
--   nombre_cuenta,
--   descripcion,
--   saldo_inicial,
--   moneda,
--   tipo_cuenta,
--   propiedades_ids,
--   fecha_corte_dia
-- ) VALUES (
--   '<USER_UUID>',
--   'Cuenta Principal MXN',
--   'Cuenta principal en pesos mexicanos',
--   100000.00,
--   'MXN',
--   'bancaria',
--   ARRAY['<PROPIEDAD_UUID>']::UUID[],
--   1
-- );

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
