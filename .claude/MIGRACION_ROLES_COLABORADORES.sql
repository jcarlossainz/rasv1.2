-- ============================================================================
-- MIGRACIÓN: Sistema de Roles para Colaboradores
-- ============================================================================
-- Fecha: 21 de Noviembre 2025
-- Descripción: Actualiza propiedades_colaboradores para soportar:
--   1. Nuevos roles: supervisor, propietario, promotor
--   2. Campo email_invitado para invitaciones a usuarios no registrados
--   3. Constraint actualizado para soportar ambos flujos
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PASO 1: Agregar campo email_invitado si no existe
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propiedades_colaboradores'
    AND column_name = 'email_invitado'
  ) THEN
    ALTER TABLE propiedades_colaboradores
    ADD COLUMN email_invitado TEXT;

    RAISE NOTICE '✅ Campo email_invitado agregado';
  ELSE
    RAISE NOTICE '⚠️  Campo email_invitado ya existe';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 2: Eliminar constraint UNIQUE anterior
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Buscar el nombre del constraint UNIQUE
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'propiedades_colaboradores_propiedad_id_user_id_key'
  ) THEN
    ALTER TABLE propiedades_colaboradores
    DROP CONSTRAINT propiedades_colaboradores_propiedad_id_user_id_key;

    RAISE NOTICE '✅ Constraint UNIQUE anterior eliminado';
  ELSE
    RAISE NOTICE '⚠️  Constraint UNIQUE ya fue eliminado';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 3: Migrar roles antiguos a nuevos
-- ----------------------------------------------------------------------------
-- Mapeo de roles:
-- 'admin' | 'editor' -> 'supervisor'
-- 'viewer' -> 'propietario'

UPDATE propiedades_colaboradores
SET rol = CASE
  WHEN rol IN ('admin', 'editor') THEN 'supervisor'
  WHEN rol = 'viewer' THEN 'propietario'
  ELSE rol
END
WHERE rol IN ('admin', 'editor', 'viewer');

-- Verificar cuántos registros fueron actualizados
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ % registros migrados a nuevos roles', updated_count;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 4: Agregar constraints mejorados
-- ----------------------------------------------------------------------------

-- Constraint: No permitir user_id y email_invitado nulos al mismo tiempo
ALTER TABLE propiedades_colaboradores
ADD CONSTRAINT check_user_or_email CHECK (
  (user_id IS NOT NULL AND email_invitado IS NULL) OR
  (user_id IS NULL AND email_invitado IS NOT NULL)
);

-- Constraint: UNIQUE para user_id (solo cuando no es nulo)
CREATE UNIQUE INDEX idx_unique_propiedad_user
ON propiedades_colaboradores (propiedad_id, user_id)
WHERE user_id IS NOT NULL;

-- Constraint: UNIQUE para email_invitado (solo cuando no es nulo)
CREATE UNIQUE INDEX idx_unique_propiedad_email
ON propiedades_colaboradores (propiedad_id, email_invitado)
WHERE email_invitado IS NOT NULL;

RAISE NOTICE '✅ Constraints actualizados correctamente';

-- ----------------------------------------------------------------------------
-- PASO 5: Actualizar comentarios de la tabla
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN propiedades_colaboradores.rol IS
  'Rol del colaborador: supervisor | propietario | promotor';

COMMENT ON COLUMN propiedades_colaboradores.email_invitado IS
  'Email de invitación para usuarios no registrados. Se usa cuando user_id es NULL';

COMMENT ON TABLE propiedades_colaboradores IS
  'Colaboradores de propiedades. Soporta usuarios registrados (user_id) y invitaciones pendientes (email_invitado)';

RAISE NOTICE '✅ Comentarios actualizados';

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  total_registros INTEGER;
  registros_user_id INTEGER;
  registros_email INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_registros FROM propiedades_colaboradores;
  SELECT COUNT(*) INTO registros_user_id FROM propiedades_colaboradores WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO registros_email FROM propiedades_colaboradores WHERE email_invitado IS NOT NULL;

  RAISE NOTICE '📊 ESTADÍSTICAS FINALES:';
  RAISE NOTICE '  Total de colaboradores: %', total_registros;
  RAISE NOTICE '  Usuarios registrados: %', registros_user_id;
  RAISE NOTICE '  Invitaciones pendientes: %', registros_email;
END $$;

COMMIT;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Para verificar la estructura final:
-- \d propiedades_colaboradores
