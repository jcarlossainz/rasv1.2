-- ============================================================================
-- MIGRACIÓN: Agregar soporte para invitaciones abiertas
-- ============================================================================
-- Descripción: Permite invitar usuarios por email aunque no estén registrados
-- Cuando el usuario se registre, automáticamente tendrá acceso a las propiedades
-- ============================================================================

-- 1. Modificar tabla propiedades_colaboradores
ALTER TABLE propiedades_colaboradores
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email_invitado TEXT,
  ADD COLUMN IF NOT EXISTS agregado_por UUID REFERENCES profiles(id);

-- 2. Actualizar constraint único para permitir invitaciones pendientes
-- Eliminar constraint anterior
ALTER TABLE propiedades_colaboradores
  DROP CONSTRAINT IF EXISTS propiedades_colaboradores_propiedad_id_user_id_key;

-- Crear nuevo constraint que considere email_invitado
-- Solo un registro por propiedad+user_id O propiedad+email_invitado
CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_user_unique
  ON propiedades_colaboradores(propiedad_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_email_unique
  ON propiedades_colaboradores(propiedad_id, email_invitado)
  WHERE email_invitado IS NOT NULL;

-- 3. Crear índice para búsquedas por email_invitado
CREATE INDEX IF NOT EXISTS idx_colaboradores_email_invitado
  ON propiedades_colaboradores(email_invitado)
  WHERE email_invitado IS NOT NULL;

-- 4. Función para procesar invitaciones pendientes cuando un usuario se registra
CREATE OR REPLACE FUNCTION procesar_invitaciones_pendientes()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar registros de invitaciones pendientes con el user_id del nuevo usuario
  UPDATE propiedades_colaboradores
  SET user_id = NEW.id,
      email_invitado = NULL  -- Limpiar email_invitado una vez procesado
  WHERE LOWER(email_invitado) = LOWER(NEW.email)
    AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger que ejecuta la función cuando se crea un nuevo profile
DROP TRIGGER IF EXISTS trigger_procesar_invitaciones ON profiles;
CREATE TRIGGER trigger_procesar_invitaciones
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION procesar_invitaciones_pendientes();

-- ============================================================================
-- COMENTARIOS PARA VERIFICACIÓN
-- ============================================================================
-- Para verificar que funcionó correctamente, ejecuta:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'propiedades_colaboradores';
--
-- SELECT * FROM propiedades_colaboradores WHERE email_invitado IS NOT NULL;
-- ============================================================================
