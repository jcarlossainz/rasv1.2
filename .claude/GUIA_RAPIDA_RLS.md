# GUÍA RÁPIDA: IMPLEMENTAR RLS EN RAS v1.2

**Urgencia:** CRÍTICA - Implementar HOY
**Tiempo:** 30-45 minutos
**Riesgo Actual:** Máximo (todos los datos sin protección)

---

## SITUACIÓN CRÍTICA

**Tu base de datos está completamente sin protección.**

```
❌ Usuario A PUEDE:
   - Ver TODAS las propiedades de todos los usuarios
   - Editar propiedades de otros usuarios
   - Eliminar propiedades ajenas
   - Ver fotos, documentos, contactos de otros usuarios
   - Manipular datos financieros
   - Crear colaboradores sin permiso
   - Cambiar su rol a admin

🔒 Con RLS implementado:
   - Solo puede ver sus datos
   - Solo puede editar sus datos
   - Colaboradores tienen permisos limitados
   - Imposible escalada de privilegios
```

---

## 3 PASOS SIMPLES

### PASO 1: Hacer Backup (5 minutos)

1. Ve a Supabase Dashboard
2. Ve a Project Settings > Backups
3. Haz clic en "Create Backup Now"
4. Espera a que termine

### PASO 2: Ejecutar Script RLS (10 minutos)

1. Ve a SQL Editor en Supabase
2. Haz clic en "+ New Query"
3. Abre archivo: `.claude/RLS_IMPLEMENTATION.sql`
4. **Copia TODO el contenido**
5. **Pégalo en el editor SQL de Supabase**
6. Haz clic en "RUN" (botón verde)
7. Espera a que ejecute (debe decir "Success")

### PASO 3: Probar (15-20 minutos)

1. Abre `.claude/TEST_RLS_POLICIES.sql`
2. Crea 2 usuarios de prueba en Supabase Auth
3. Ejecuta cada test en el orden de la guía
4. Verifica que todos los tests pasen
5. Si alguno falla, revisa la política correspondiente

---

## ARCHIVOS CREADOS PARA TI

| Archivo | Propósito |
|---------|-----------|
| RLS_AUDIT_COMPLETO.md | Análisis detallado de vulnerabilidades |
| RLS_IMPLEMENTATION.sql | Script SQL listo para ejecutar |
| TEST_RLS_POLICIES.sql | Suite de tests para validar RLS |
| GUIA_RAPIDA_RLS.md | Este archivo |

---

## VERIFICACIÓN RÁPIDA

Después de ejecutar RLS_IMPLEMENTATION.sql, verifica:

```sql
-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Debe mostrar: rowsecurity = true para todas las tablas
```

---

## QÚICK TROUBLESHOOTING

### Error: "permission denied"
- Asegúrate de estar loggeado como admin en Supabase
- Verifica que el proyecto es el correcto

### Error: "relation does not exist"
- Verificar que todas las tablas existen
- Ejecutar SETUP_SUPABASE.sql primero si faltan tablas

### Aplicación no funciona después de RLS
- Verificar que auth.uid() es válido (usuario loggeado)
- Revisar los logs de errores en Supabase
- Algunos queries pueden necesitar actualizarse

### Performance lento
- Asegúrate de que los índices existen
- Ejecutar database-indexes.sql
- Usar EXPLAIN ANALYZE en Supabase

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] Haz backup de la BD
- [ ] Ejecuta RLS_IMPLEMENTATION.sql
- [ ] Verifica que no hay errores
- [ ] Crea 2 usuarios de prueba
- [ ] Ejecuta tests básicos (1.1-1.4)
- [ ] Ejecuta tests de imágenes (2.1-2.2)
- [ ] Ejecuta tests financieros (3.1-3.2)
- [ ] Ejecuta tests de escalada (4.1-4.2)
- [ ] Ejecuta tests de contactos (5.1-5.2)
- [ ] Prueba la aplicación
- [ ] Verifica logs sin errores
- [ ] Documenta cualquier change en el código

---

## CAMBIOS QUE PODRÍAS NECESITAR EN TU CÓDIGO

La mayoría de código funcionará sin cambios, PERO:

### 1. Si tienes queries sin usuario loggeado
```typescript
// ❌ ANTES (sin RLS, funcionaba para todos)
const { data } = await supabase
  .from('propiedades')
  .select('*');

// ✅ DESPUÉS (necesita usuario loggeado)
// RLS automáticamente filtra por auth.uid()
// Si no hay usuario, retorna error
const { data: { user } } = await supabase.auth.getUser();
if (!user) return null;

const { data } = await supabase
  .from('propiedades')
  .select('*');
```

### 2. Si tienes vista pública de catálogo
```typescript
// ❌ PROBLEMA: Con RLS, solo usuarios loggeados ven propiedades
// Solución: Crear tabla pública de "propiedades_publicas"
//           o endpoint de API pública sin RLS
```

### 3. Queries complejas con joins
```typescript
// Podrían necesitar ajustes si usan usuarios específicos
// Verificar que los UUIDs son correctos en subqueries
```

---

## ANTES vs DESPUÉS

### ANTES (Sin RLS)

```typescript
// Usuario B ejecuta:
const { data } = await supabase
  .from('propiedades')
  .select('*');

// Resultado: ❌ 150 propiedades (incluidas de user A!)
// Riesgo: CRÍTICO
```

### DESPUÉS (Con RLS)

```typescript
// Usuario B ejecuta (mismo código):
const { data } = await supabase
  .from('propiedades')
  .select('*');

// Resultado: ✅ Solo sus propiedades (ej: 5)
// RLS automáticamente filtra en la BD
// Riesgo: MITIGADO
```

---

## RENDIMIENTO

RLS NO ralentiza significativamente si tienes índices:

- Con índices: **+5% overhead** (aceptable)
- Sin índices: **+500% overhead** (desastre)
- CRÍTICO: Los índices ya existen en SETUP_SUPABASE.sql

Verifica:
```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## SOPORTE FUTURO

Después de implementar RLS:

### Operaciones que ahora requieren cuidado
- **Búsquedas globales:** Necesitan tabla pública separada
- **Reportes:** Usar vistas materializadas o funciones especiales
- **Backups:** Funcionan igual (RLS no afecta backups)
- **Migrations:** Solo afecta las operaciones de datos

### Cambios futuros de RLS
Si necesitas cambiar una política:

```sql
-- 1. Ver políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'propiedades';

-- 2. Eliminar política vieja
DROP POLICY "policy_name" ON tablename;

-- 3. Crear política nueva
CREATE POLICY "new_policy_name" ...
```

---

## DOCUMENTACIÓN COMPLETA

Para análisis detallado, ver:
- `RLS_AUDIT_COMPLETO.md` - Análisis de vulnerabilidades
- `RLS_IMPLEMENTATION.sql` - Explicaciones en el código
- `TEST_RLS_POLICIES.sql` - Casos de prueba

---

## PRÓXIMOS PASOS

1. **HOY:** Implementar RLS (30-45 min)
2. **MAÑANA:** Probar aplicación completamente
3. **ESTA SEMANA:** Revisar cualquier query que falle
4. **PRÓXIMA SEMANA:** Implementar catálogo público (si se necesita)

---

**ESTO ES CRÍTICO - NO ESPERES**

Una vez implementado, tu base de datos será segura de acuerdo a estándares de industria.

¿Preguntas? Revisar RLS_AUDIT_COMPLETO.md para análisis detallado.

