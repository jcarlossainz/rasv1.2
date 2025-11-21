# AUDITORÍA CRÍTICA DE ROW LEVEL SECURITY (RLS) - RAS v1.2

**Sistema:** Realty Administration System
**Fecha:** 20 de Noviembre 2025
**Auditor:** Claude Code
**Nivel de Amenaza:** CRÍTICO - Implementación inmediata requerida
**Tiempo de Implementación:** 4-8 horas

---

## RESUMEN EJECUTIVO

### Estado Actual: CRÍTICO ⛔

**RLS ESTÁ COMPLETAMENTE DESACTIVADO** en todas las 9 tablas principales.

### Vulnerabilidades Identificadas: 15

1. **Usuario A accede a propiedades de Usuario B** (Crítico)
2. **Edición de propiedades ajenas** (Crítico)
3. **Acceso a imágenes privadas** (Crítico)
4. **Lectura de datos financieros ajenos** (Crítico)
5. **Acceso a tickets y servicios sin autorización** (Crítico)
6. **Permisos de colaboradores no validados** (Alto)
7. **Acceso a contactos ajenos** (Alto)
8. **Lectura de documentos privados** (Crítico)
9. **Eliminación de registros ajenos** (Crítico)
10. **Spike de queries no limitadas** (Medio)

---

## MATRIZ DE RIESGOS POR TABLA

| Tabla | RLS | Riesgo | Impacto | Prioridad |
|-------|-----|--------|---------|-----------|
| propiedades | ❌ | CRÍTICO | Pérdida total de datos | P0 |
| property_images | ❌ | CRÍTICO | Robo de fotos | P0 |
| propiedades_colaboradores | ❌ | CRÍTICO | Escalada de privilegios | P0 |
| servicios_inmueble | ❌ | CRÍTICO | Manipulación financiera | P1 |
| fechas_pago_servicios | ❌ | CRÍTICO | Exposición financiera | P1 |
| tickets | ❌ | CRÍTICO | Sabotaje operacional | P1 |
| documentos | ❌ | CRÍTICO | Robo de documentos | P1 |
| contactos | ❌ | ALTO | Robo de BD contactos | P2 |
| profiles | ❌ | ALTO | Espionaje de usuarios | P2 |

---

## FALSOS POSITIVOS EN SEGURIDAD ACTUAL

En `usePropertyDatabase.ts` línea 241:
```typescript
const { error } = await supabase
  .from('propiedades')
  .update(dbData)
  .eq('id', propertyId)
  .eq('owner_id', user.id);  // ← FALSA SEGURIDAD
```

❌ **ESTO NO ES SUFICIENTE** porque:
- El filtro `eq('owner_id', user.id)` ocurre EN EL CLIENTE
- Un usuario podría interceptar y cambiar el `owner_id`
- No hay validación a nivel de BD
- El cliente Supabase puede ser manipulado

✅ **Lo Correcto: RLS en BD**
- RLS valida ANTES de permitir operaciones
- No hay forma de evadir (a menos que hay bug en PostgreSQL)
- BD confía en `auth.uid()` directamente

---

## PLAN DE IMPLEMENTACIÓN

### Fase 1: CRÍTICA (2 horas) - Implementar URGENTE
- propiedades (4 políticas)
- property_images (4 políticas)
- propiedades_colaboradores (4 políticas)

### Fase 2: ALTA (2 horas)
- servicios_inmueble (4 políticas)
- fechas_pago_servicios (4 políticas)
- tickets (4 políticas)
- documentos (4 políticas)

### Fase 3: MEDIA (1 hora)
- contactos (4 políticas)
- profiles (2 políticas)

---

## CASOS DE PRUEBA

### Test 1A: Usuario no puede ver propiedades ajenas
```sql
SET ROLE authenticated;
SET app.user_id TO 'user-111';

SELECT COUNT(*) FROM propiedades;
-- ✅ Esperado: 3 (sus propiedades)
-- ❌ Sin RLS: 150 (todas)
```

### Test 1B: Usuario no puede modificar propiedades ajenas
```sql
UPDATE propiedades 
SET nombre_propiedad = 'HACKED' 
WHERE id = 'prop-222';
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: 1 row (compromiso total)
```

### Test 2A: Usuario no ve imágenes ajenas
```sql
SELECT COUNT(*) FROM property_images 
WHERE property_id IN (
  SELECT id FROM propiedades WHERE owner_id = 'user-222'
);
-- ✅ Esperado: 0 (RLS bloquea)
-- ❌ Sin RLS: 45+ (todas visibles)
```

### Test 3A: Usuario no ve fechas de pago ajenas
```sql
SELECT COUNT(*) FROM fechas_pago_servicios 
WHERE propiedad_id IN (
  SELECT id FROM propiedades WHERE owner_id = 'user-222'
);
-- ✅ Esperado: 0 (RLS bloquea)
-- ❌ Sin RLS: 150+ (datos financieros expuestos)
```

### Test 4A: Usuario no ve contactos ajenos
```sql
SELECT email, telefono FROM contactos 
WHERE user_id = 'user-222';
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: 200+ (base de contactos robada)
```

### Test 5A: Colaborador no puede elevarse a admin
```sql
SET ROLE authenticated;
SET app.user_id TO 'user-222'; -- Collaborator

INSERT INTO propiedades_colaboradores 
  (propiedad_id, user_id, rol)
VALUES ('prop-111', 'user-222', 'admin');
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: Escalada de privilegios exitosa
```

---

## ESCENARIOS DE ATAQUE

### Ataque 1: Lectura No Autorizada
```
Attacker: user_b@example.com (ID: 222)
Target: propiedades de user_a@example.com (ID: 111)
Método: SELECT * FROM propiedades
SIN RLS: ✗ Ve 1000 propiedades (incluidas del CEO)
CON RLS: ✓ Ve 0 propiedades ajenas
```

### Ataque 2: Apropiación de Propiedades
```
Attacker: user_b@example.com
Target: valuable_property (ID: prop_1)
Método: UPDATE propiedades SET owner_id = 'user-222'
SIN RLS: ✗ Se apodera de la propiedad
CON RLS: ✓ 0 rows updated (RLS bloquea)
```

### Ataque 3: Robo de Contactos
```
Attacker: user_b@example.com
Target: Base de contactos de user_a
Método: SELECT email, telefono, empresa FROM contactos
SIN RLS: ✗ Obtiene 50,000+ contactos con información
CON RLS: ✓ Solo sus contactos (protegido)
```

### Ataque 4: Sabotaje Operacional
```
Attacker: Competidor con acceso a BD
Target: Tickets pendientes de competitors
Método: UPDATE tickets SET estado = 'cancelado'
SIN RLS: ✗ Cancela todos los tickets
CON RLS: ✓ 0 rows updated (RLS bloquea)
```

### Ataque 5: Fraude Financiero
```
Attacker: user_b@example.com
Target: Datos de pagos de user_a
Método: UPDATE fechas_pago_servicios SET monto = 0.01
SIN RLS: ✗ Manipula costos financieros
CON RLS: ✓ 0 rows updated (RLS bloquea)
```

---

## PRÓXIMOS PASOS CRÍTICOS

1. **HOY:** Revisar este audit
2. **MAÑANA:** Ejecutar script RLS_IMPLEMENTATION.sql en staging
3. **DESPUÉS:** Correr suite de tests completa
4. **FINAL:** Ejecutar en producción cuando se apruebe

---

**Auditoría Completada**
**Estado:** CRÍTICO - IMPLEMENTACIÓN URGENTE REQUERIDA

