# 🗄️ ESTADO ACTUAL DE LA BASE DE DATOS
**Fecha:** 21 de Noviembre 2025
**Branch:** claude/fix-add-ticket-modal-01YaMfSaWy5VQc3tfNAMM7zZ

---

## ⚠️ PROBLEMA DETECTADO: DOS TABLAS DE CUENTAS

Actualmente existen **DOS tablas** para cuentas bancarias:

### 1. Tabla `cuentas`
**Estructura más completa:**
- `user_id` (UUID) - Dueño de la cuenta
- `nombre_cuenta` (VARCHAR)
- `saldo_inicial` / `saldo_actual` (NUMERIC)
- `moneda` (VARCHAR) - Default: 'MXN'
- `tipo_cuenta` (VARCHAR)
- `banco`, `numero_cuenta`, `clabe`
- **`propietarios_ids` (UUID[])** - Array de propietarios
- **`propiedades_ids` (UUID[])** - Array de propiedades
- `fecha_corte_dia` (INTEGER)
- `genera_estados_cuenta` (BOOLEAN)
- `activa` (BOOLEAN)

### 2. Tabla `cuentas_bancarias`
**Estructura más simple:**
- `propiedad_id` (UUID) - Una sola propiedad
- `propietario_id` (UUID) - Un solo propietario
- `nombre` (TEXT)
- `tipo_moneda` (TEXT) - Default: 'MXN'
- `tipo_cuenta` (TEXT) - Default: 'Banco'
- `banco`, `numero_cuenta`
- `balance_inicial` / `balance_actual` (NUMERIC)
- `descripcion`, `color`
- `activo` (BOOLEAN)

---

## ✅ TABLAS QUE YA ESTÁN LISTAS

### `fechas_pago_servicios`
- ✅ Tiene columna `cuenta_id` (UUID)
- ✅ Tiene `responsable` (TEXT)
- ✅ Tiene campos de pago: `metodo_pago`, `referencia_pago`, `comprobante_url`
- ✅ Tiene `pagado` (BOOLEAN), `monto_real`, `fecha_pago_real`

### `tickets`
- ✅ Tiene columna `cuenta_id` (UUID)
- ✅ Tiene `afecta_balance` (BOOLEAN)
- ✅ Tiene `tipo_movimiento` (VARCHAR)
- ✅ Tiene `servicio_id` (UUID) - Para tickets automáticos de servicios
- ✅ Tiene `responsable` y `proveedor`

### `ingresos`
- ✅ Estructura completa con `propiedad_id`, `cuenta_id`
- ✅ Campos de pago: `metodo_pago`, `referencia_pago`, `comprobante_url`
- ✅ Facturación: `tiene_factura`, `numero_factura`

### `servicios_inmueble`
- ✅ Estructura completa para servicios recurrentes
- ✅ Campos: `frecuencia_valor`, `frecuencia_unidad`, `ultima_fecha_pago`
- ✅ Tiene `responsable` (TEXT)

---

## 🎯 ESTADO DEL CÓDIGO ACTUAL

### ✅ Lo que SÍ funciona:

1. **UI Completa:**
   - Modal "Nueva Cuenta Bancaria" en `/dashboard/cuentas`
   - Selector de cuentas en `RegistrarPagoModal`
   - Componente `GestionCuentas.tsx`

2. **Generación de Tickets:**
   - `lib/supabase/generate-service-tickets.ts` genera tickets en cliente
   - Se llama desde `usePropertyDatabase.ts` al guardar servicios

3. **API Services:**
   - `services/cuentas-api.ts` para CRUD de cuentas

### ❌ Lo que FALTA:

1. **Decidir qué tabla usar:**
   - ¿`cuentas` o `cuentas_bancarias`?
   - ¿O fusionar ambas?

2. **Triggers automáticos:**
   - NO hay triggers para actualizar `saldo_actual` automáticamente
   - Los saldos deben actualizarse manualmente

3. **Función RPC:**
   - NO existe `generar_fechas_pago_servicio()` en SQL
   - La generación se hace en TypeScript (cliente)

---

## 🔍 ANÁLISIS: ¿Cuál tabla usar?

### Opción A: Usar `cuentas` (recomendado)
**Ventajas:**
- ✅ Más flexible (múltiples propiedades/propietarios por cuenta)
- ✅ Tiene `fecha_corte_dia` para estados de cuenta
- ✅ Tiene `genera_estados_cuenta` flag
- ✅ Estructura más moderna

**Desventajas:**
- ❌ El código actual usa `cuentas_bancarias`
- ❌ Requiere migrar datos existentes

### Opción B: Usar `cuentas_bancarias`
**Ventajas:**
- ✅ Es lo que usa el código actual
- ✅ Más simple (1 propiedad por cuenta)
- ✅ Tiene campo `color` para UI

**Desventajas:**
- ❌ Menos flexible
- ❌ No soporta cuentas compartidas entre propiedades

### Opción C: Fusionar ambas (IDEAL)
- Unificar en tabla `cuentas` tomando lo mejor de ambas
- Migrar datos de `cuentas_bancarias` → `cuentas`
- Eliminar `cuentas_bancarias`

---

## 📊 RELACIONES ACTUALES

### `fechas_pago_servicios.cuenta_id` → ¿?
- ¿Apunta a `cuentas` o `cuentas_bancarias`?
- **Verificar en Supabase:** Foreign key constraints

### `tickets.cuenta_id` → ¿?
- ¿Apunta a `cuentas` o `cuentas_bancarias`?
- **Verificar en Supabase:** Foreign key constraints

### `ingresos.cuenta_id` → ¿?
- ¿Apunta a `cuentas` o `cuentas_bancarias`?
- **Verificar en Supabase:** Foreign key constraints

---

## 🚀 PLAN RECOMENDADO

### FASE 1: Investigar estado actual (15 min)
1. Verificar en Supabase qué tabla se está usando realmente
2. Ver foreign keys de `cuenta_id` en todas las tablas
3. Revisar código para ver qué tabla consulta

### FASE 2: Decidir estrategia (tú decides)
- **Opción A:** Migrar todo a `cuentas` y eliminar `cuentas_bancarias`
- **Opción B:** Quedarnos con `cuentas_bancarias` y eliminar `cuentas`
- **Opción C:** Fusionar ambas en `cuentas` mejorada

### FASE 3: Ejecutar migración SQL
- Crear script de migración definitivo
- Unificar tablas
- Crear triggers automáticos
- Crear función RPC `generar_fechas_pago_servicio()`

### FASE 4: Actualizar código
- Modificar `usePropertyDatabase.ts` para usar RPC
- Actualizar tipos TypeScript
- Probar flujo completo

---

## 🔧 PRÓXIMOS PASOS

**NECESITO QUE VERIFIQUES EN SUPABASE:**

```sql
-- 1. Ver foreign keys de cuenta_id
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'cuenta_id';

-- 2. Ver cuántos registros hay en cada tabla
SELECT 'cuentas' as tabla, COUNT(*) as total FROM cuentas
UNION ALL
SELECT 'cuentas_bancarias', COUNT(*) FROM cuentas_bancarias;

-- 3. Ver si hay triggers existentes
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

Una vez tengamos esta info, sabré exactamente qué hacer. 🎯
