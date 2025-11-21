# 🔄 Instrucciones: Migración de Sistema de Roles

**Fecha:** 21 de Noviembre 2025
**Script:** `MIGRACION_ROLES_COLABORADORES.sql`
**Prioridad:** Alta
**Tiempo estimado:** 2-3 minutos

---

## 📋 ¿Qué hace esta migración?

Esta migración actualiza la tabla `propiedades_colaboradores` para soportar el nuevo sistema de roles y las invitaciones por email:

### Cambios principales:

1. **Nuevo campo `email_invitado`**
   - Permite invitar a personas que aún no están registradas en el sistema
   - Se usa cuando `user_id` es NULL

2. **Nuevos valores de rol:**
   - `supervisor`: Puede ver y gestionar todo excepto compartir/duplicar/editar configuración
   - `propietario`: Solo visualización, no puede crear/editar tickets
   - `promotor`: Acceso únicamente a sección de Anuncios

3. **Migración automática de roles antiguos:**
   - `admin` → `supervisor`
   - `editor` → `supervisor`
   - `viewer` → `propietario`

4. **Constraints mejorados:**
   - Permite `user_id` O `email_invitado` (pero no ambos)
   - UNIQUE indexes separados para cada caso

---

## 🚀 Cómo aplicar la migración

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `MIGRACION_ROLES_COLABORADORES.sql`
5. Ejecuta el script
6. Verifica que todos los pasos muestren ✅

### Opción 2: Desde psql

```bash
psql -h <tu-host> -U postgres -d postgres -f .claude/MIGRACION_ROLES_COLABORADORES.sql
```

---

## ✅ Verificación Post-Migración

Ejecuta esta query para verificar que todo está correcto:

```sql
-- Verificar estructura
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'propiedades_colaboradores'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'propiedades_colaboradores'::regclass;

-- Verificar distribución de roles
SELECT
  rol,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as con_usuario,
  COUNT(CASE WHEN email_invitado IS NOT NULL THEN 1 END) as invitaciones
FROM propiedades_colaboradores
GROUP BY rol;
```

**Resultado esperado:**
- Campo `email_invitado` debe existir (tipo TEXT, nullable)
- Campo `rol` debe tener solo valores: supervisor, propietario, promotor
- Constraints de UNIQUE deben existir para ambos casos
- No debe haber registros con roles antiguos (admin, editor, viewer)

---

## 🔙 Rollback (En caso de emergencia)

Si necesitas revertir los cambios:

```sql
BEGIN;

-- Eliminar índices nuevos
DROP INDEX IF EXISTS idx_unique_propiedad_user;
DROP INDEX IF EXISTS idx_unique_propiedad_email;

-- Eliminar constraint de check
ALTER TABLE propiedades_colaboradores
DROP CONSTRAINT IF EXISTS check_user_or_email;

-- Revertir roles (opcional, solo si es necesario)
UPDATE propiedades_colaboradores
SET rol = CASE
  WHEN rol = 'supervisor' THEN 'admin'
  WHEN rol = 'propietario' THEN 'viewer'
  ELSE rol
END;

-- Eliminar campo email_invitado (opcional, perderás invitaciones pendientes)
-- ALTER TABLE propiedades_colaboradores DROP COLUMN email_invitado;

-- Restaurar constraint UNIQUE original
ALTER TABLE propiedades_colaboradores
ADD CONSTRAINT propiedades_colaboradores_propiedad_id_user_id_key
UNIQUE (propiedad_id, user_id);

COMMIT;
```

---

## 📝 Notas importantes

1. **Backup recomendado:** Aunque la migración es segura, siempre es buena práctica hacer backup antes
2. **Downtime:** La migración es muy rápida, no requiere downtime
3. **Datos existentes:** Los colaboradores actuales se migran automáticamente a los nuevos roles
4. **Compatibilidad:** El código frontend ya está actualizado para usar los nuevos roles

---

## 🔗 Archivos relacionados

- **Script SQL:** `.claude/MIGRACION_ROLES_COLABORADORES.sql`
- **Componente CompartirPropiedad:** `components/CompartirPropiedad.tsx`
- **Wizard Step1:** `app/dashboard/catalogo/nueva/steps/Step1_DatosGenerales.tsx`
- **Schema actualizado:** Actualizar `.claude/DATABASE_SCHEMA.md` después de aplicar

---

## ❓ Preguntas frecuentes

**P: ¿Qué pasa con mis colaboradores existentes?**
R: Se migran automáticamente según el mapeo: admin/editor → supervisor, viewer → propietario

**P: ¿Puedo tener un usuario con email_invitado que luego se registre?**
R: Sí, cuando el usuario se registre, el sistema puede actualizar el registro para usar su user_id

**P: ¿Qué pasa si invito el mismo email dos veces?**
R: El constraint UNIQUE lo previene, mostrará un error

**P: ¿El rol 'promotor' se puede asignar en el wizard?**
R: No, el promotor solo se asigna desde el modal de Compartir en propiedades existentes

---

**🎯 Una vez aplicada la migración, marca este archivo como completado y actualiza el DATABASE_SCHEMA.md**
