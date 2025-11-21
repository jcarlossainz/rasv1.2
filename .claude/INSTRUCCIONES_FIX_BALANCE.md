# 🔧 Fix: Balance Actual en Cuentas Bancarias

## Problema Identificado

Al crear una cuenta con `balance_inicial = 3500`, el campo `balance_actual` muestra `0` en lugar de `3500`.

## Causa

El trigger `trigger_inicializar_balance` debería copiar automáticamente el valor de `balance_inicial` a `balance_actual`, pero no está funcionando correctamente.

## Solución Implementada

### ✅ Fix Inmediato (Ya aplicado)

**Archivo modificado:** `services/cuentas-api.ts`

Ahora la función `crearCuenta()` establece explícitamente `balance_actual = balance_inicial` al crear una cuenta nueva.

**Esto significa que:**
- Todas las cuentas nuevas que crees de ahora en adelante funcionarán correctamente
- El `balance_actual` mostrará el valor correcto desde el inicio

### 🔄 Fix para Cuentas Existentes

Si ya creaste alguna cuenta antes de este fix, necesitas ejecutar un UPDATE en Supabase.

**Pasos:**

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Ejecuta el siguiente script:

```sql
-- Actualizar cuentas que tienen balance_actual en 0 pero balance_inicial con valor
UPDATE cuentas_bancarias
SET balance_actual = balance_inicial,
    updated_at = NOW()
WHERE balance_actual = 0
  AND balance_inicial != 0;

-- Verificar el resultado
SELECT
  id,
  nombre,
  balance_inicial,
  balance_actual,
  tipo_moneda,
  created_at
FROM cuentas_bancarias
ORDER BY created_at DESC;
```

5. Revisa los resultados y confirma que `balance_actual` ahora tiene el valor correcto

### 🔍 Verificar el Trigger (Opcional)

Si quieres verificar que el trigger esté instalado correctamente, ejecuta:

```sql
-- Ver triggers instalados
SELECT
  tgname AS trigger_name,
  tgtype AS trigger_type,
  tgenabled AS enabled
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'cuentas_bancarias'
  AND tgname = 'trigger_inicializar_balance';
```

Si NO aparece ningún resultado, ejecuta el script completo en `.claude/FIX_BALANCE_TRIGGER.sql`

## Resultado Esperado

Después de aplicar estos fixes:

- ✅ Al crear nueva cuenta con balance_inicial = 3500
- ✅ El balance_actual debe mostrar 3500
- ✅ Al registrar un ingreso de 1000, balance_actual = 4500
- ✅ Al marcar un pago de 500, balance_actual = 4000

## Notas Técnicas

### ¿Por qué pasó esto?

El trigger `trigger_inicializar_balance` está configurado como `BEFORE INSERT`, lo que significa que debería ejecutarse antes de insertar el registro. La función asigna:

```sql
NEW.balance_actual := NEW.balance_inicial;
```

Sin embargo, hay casos donde los triggers pueden no ejecutarse correctamente:
1. Permisos insuficientes
2. Políticas RLS (Row Level Security) que interfieren
3. El trigger no se ejecutó durante la migración

### ¿Por qué el fix funciona?

Al establecer `balance_actual` explícitamente en el código de la aplicación, nos aseguramos de que el valor se pase directamente en el INSERT, evitando depender únicamente del trigger.

Esto es un **defense in depth approach**: el trigger debería funcionar, pero si no lo hace, el código lo maneja.

---

**Fecha:** 21 de Noviembre 2025
**Sesión:** claude/check-branch-status-01KMoup97XyrQnjrFn7mv7Ea
**Fix aplicado por:** Claude
