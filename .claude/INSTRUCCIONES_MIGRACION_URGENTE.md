# 🚨 Migraciones SQL Urgentes - Ejecutar AHORA

**Fecha:** 21 de Noviembre 2025
**Sesión:** claude/check-branch-status-01KMoup97XyrQnjrFn7mv7Ea
**Prioridad:** 🔴 ALTA

---

## ⚡ Scripts a Ejecutar

Ejecuta estos scripts en **Supabase → SQL Editor** en el siguiente orden:

### 1️⃣ Agregar Columnas Faltantes (OBLIGATORIO)

**Archivo:** `.claude/ADD_RESPONSABLE_COLUMN.sql`

```sql
-- Agregar columna responsable
ALTER TABLE fechas_pago_servicios
ADD COLUMN IF NOT EXISTS responsable TEXT;

-- Agregar columna notas si no existe
ALTER TABLE fechas_pago_servicios
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Verificar
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fechas_pago_servicios'
  AND column_name IN ('responsable', 'notas')
ORDER BY column_name;
```

**¿Por qué es necesario?**
- El modal de pagos está intentando guardar `responsable` y `notas`
- Sin estas columnas, obtienes el error: "Could not find the 'responsable' column"

---

### 2️⃣ Corregir Balance de Cuentas Existentes (RECOMENDADO)

**Archivo:** `.claude/FIX_BALANCE_TRIGGER.sql` (sección 6)

```sql
-- Actualizar cuentas existentes que tengan balance_actual en 0
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
  created_at
FROM cuentas_bancarias
ORDER BY created_at DESC
LIMIT 10;
```

**¿Por qué es necesario?**
- Las cuentas creadas antes del fix tienen `balance_actual = 0`
- Este script corrige el balance para que muestre el valor correcto

---

## ✅ Verificación Después de Ejecutar

### 1. Verificar Columnas
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'fechas_pago_servicios'
  AND column_name IN ('responsable', 'notas', 'cuenta_id', 'metodo_pago', 'referencia_pago')
ORDER BY column_name;
```

**Resultado esperado:** Debes ver 5 columnas listadas.

### 2. Verificar Balances
```sql
SELECT
  nombre,
  balance_inicial,
  balance_actual,
  activo
FROM cuentas_bancarias
WHERE activo = true
ORDER BY created_at DESC;
```

**Resultado esperado:** `balance_actual` debe ser igual a `balance_inicial` para cuentas nuevas.

---

## 🎯 Cambios en el Frontend

Ya aplicados y pusheados:

### ✅ Notificaciones Toast
- ✅ Todos los `alert()` reemplazados por toast notifications
- ✅ `toast.error()` para errores de validación
- ✅ `toast.warning()` para anticipos
- ✅ `toast.success()` para confirmaciones

### ✅ Dropdown de Cuentas
- ✅ Siempre visible (no condicional)
- ✅ Muestra estados: Error, Cargando, Sin cuentas, Con cuentas
- ✅ `propiedadId` se actualiza cuando cambia el ticket

### ✅ Balance Inicial
- ✅ Nuevas cuentas establecen `balance_actual = balance_inicial`
- ✅ Trigger como fallback

---

## 📋 Testing Después de Migrar

### Paso 1: Crear Cuenta
1. Ve a Balance de una propiedad
2. Crea una cuenta con balance inicial = 5000
3. **Verificar:** balance_actual debe mostrar 5000 ✅

### Paso 2: Marcar Pago
1. Ve a Tickets
2. Click "Marcar como pagado"
3. **Verificar:** Dropdown "Forma de Pago" es visible ✅
4. **Verificar:** Aparece tu cuenta en el dropdown ✅
5. Selecciona cuenta, llena datos, guarda
6. **Verificar:** Toast notification aparece ✅

### Paso 3: Verificar Balance
1. Ve a Balance
2. **Verificar:** balance_actual disminuyó correctamente ✅
3. **Verificar:** Movimiento aparece en tabla con cuenta ✅

---

## 🔧 Troubleshooting

### Error: "responsable column not found"
**Solución:** Ejecutar script 1️⃣ (ADD_RESPONSABLE_COLUMN.sql)

### Dropdown de cuentas no aparece
**Solución:**
1. Verifica que tienes la última versión del código (commit 7131400)
2. Recarga la página (Ctrl+F5)
3. Revisa consola del navegador para logs de debug

### Balance actual muestra 0
**Solución:**
1. Ejecutar script 2️⃣ (actualización de balances)
2. Para nuevas cuentas, el fix ya está aplicado automáticamente

---

## 📝 Commits Aplicados

```
7131400 - fix: Agregar columna responsable y cambiar alerts a toast
534eb15 - fix: Corregir visualización de dropdown de cuentas en modal de pago
e8a291e - debug: Agregar logs de debug para diagnóstico de cuentas
472296f - fix: Corregir inicialización de balance_actual en cuentas bancarias
```

---

## 🆘 Soporte

Si algo no funciona después de ejecutar estos scripts:

1. **Revisa logs en consola del navegador** (F12 → Consola)
2. **Ejecuta verificaciones SQL** de arriba
3. **Verifica que tienes la última versión del código**
4. **Recarga la página completamente** (Ctrl+Shift+R)

---

**¡IMPORTANTE!** Ejecuta el script 1️⃣ AHORA para que el sistema de pagos funcione correctamente.
