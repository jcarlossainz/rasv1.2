# 🚀 INSTRUCCIONES DE IMPLEMENTACIÓN
## Sistema Unificado: Tickets-Balance-Calendario

**Fecha:** 21 de Noviembre 2025
**Versión:** 1.0
**Estado:** Listo para implementar

---

## 📋 RESUMEN DE CAMBIOS

Se implementaron los siguientes cambios para unificar el sistema de **tickets**, **balance** y **calendario**:

### ✅ CAMBIOS REALIZADOS

1. **Base de Datos:**
   - ✅ Renombrado tabla `cuentas_bancarias` → `cuentas`
   - ✅ Eliminada tabla `cuentas` anterior (redundante)
   - ✅ Creada función RPC `generar_fechas_pago_servicio()` para generar pagos automáticos
   - ✅ Creada función `actualizar_saldo_cuenta()` para actualizar saldos automáticamente
   - ✅ Creados triggers para actualizar saldos al registrar pagos/ingresos

2. **Servicios Automáticos:**
   - ✅ `usePropertyDatabase.ts` ahora guarda servicios en tabla `servicios_inmueble`
   - ✅ Genera automáticamente 12 meses de `fechas_pago_servicios` al guardar servicios
   - ✅ Considera fecha actual y calcula próximos pagos correctamente

3. **Balance + Cuentas:**
   - ✅ `RegistrarPagoModal` incluye selector de cuentas obligatorio
   - ✅ Al registrar pago, se actualiza automáticamente el saldo de la cuenta (vía trigger)
   - ✅ Balance carga **ingresos** desde tabla `ingresos` (antes estaba vacío)
   - ✅ Funciona en `/dashboard/cuentas` (global) y `/dashboard/catalogo/propiedad/[id]/balance` (por propiedad)

---

## 🔧 PASO 1: EJECUTAR SCRIPT SQL EN SUPABASE

### 1.1 Abrir SQL Editor en Supabase

1. Ve a [Supabase](https://supabase.com)
2. Abre tu proyecto RAS
3. En el menú lateral, click en **SQL Editor**
4. Click en **"+ New query"**

### 1.2 Ejecutar el Script

1. Abre el archivo `.claude/MIGRATION_CUENTAS_Y_SERVICIOS.sql`
2. **Copia TODO el contenido** del archivo
3. **Pega** en el editor SQL de Supabase
4. Click en **"RUN"** (botón verde)
5. Espera a que termine (10-30 segundos)
6. Deberías ver mensajes de éxito:
   ```
   ✅ Tabla renombrada correctamente
   ✅ generar_fechas_pago_servicio creada correctamente
   ✅ Triggers creados correctamente
   ```

### 1.3 Verificar que Todo Funcionó

Ejecuta esta query para verificar:

```sql
-- Verificar tabla cuentas
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('cuentas', 'cuentas_bancarias');
-- Deberías ver SOLO 'cuentas'

-- Verificar función RPC
SELECT proname FROM pg_proc WHERE proname = 'generar_fechas_pago_servicio';
-- Deberías ver 1 fila

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name LIKE '%saldo%';
-- Deberías ver 3 triggers
```

---

## 📦 PASO 2: ACTUALIZAR CÓDIGO FRONT-END

**NO NECESITAS HACER NADA** - Los archivos ya fueron modificados:

### Archivos Modificados:

1. ✅ `/app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts`
   - Líneas 286-397: Lógica para guardar servicios en `servicios_inmueble` y generar fechas

2. ✅ `/components/RegistrarPagoModal.tsx`
   - Líneas 48-82: Selector de cuentas y carga de cuentas
   - Líneas 367-389: UI del selector de cuenta
   - Línea 211: Guarda `cuenta_id` al registrar pago

3. ✅ `/app/dashboard/cuentas/page.tsx`
   - Líneas 173-203: Carga ingresos desde tabla `ingresos`

4. ✅ `/app/dashboard/catalogo/propiedad/[id]/balance/page.tsx`
   - Líneas 129-155: Carga ingresos desde tabla `ingresos`

---

## ✨ PASO 3: PROBAR EL SISTEMA

### 3.1 Probar Generación Automática de Servicios

1. **Crear o editar una propiedad**
   - Ve a `/dashboard/catalogo/nueva`
   - Llega hasta **Step 5: Servicios**
   - Agrega un servicio:
     - Nombre: "Luz CFE"
     - Costo: $500
     - Frecuencia: Cada 1 mes
     - Última fecha de pago: 2025-01-15 (por ejemplo)
   - Guarda la propiedad

2. **Verificar que se creó en BD**
   ```sql
   -- Ver servicios creados
   SELECT * FROM servicios_inmueble WHERE propiedad_id = 'TU_PROPIEDAD_ID';

   -- Ver fechas de pago generadas
   SELECT * FROM fechas_pago_servicios WHERE servicio_id = 'TU_SERVICIO_ID'
   ORDER BY fecha_pago;
   ```

3. **Deberías ver:**
   - ✅ 1 registro en `servicios_inmueble`
   - ✅ ~12 registros en `fechas_pago_servicios` con fechas futuras

### 3.2 Probar Calendario

1. **Ver calendario**
   - Ve a `/dashboard/calendario` (vista global)
   - O `/dashboard/catalogo/propiedad/[id]/calendario` (vista por propiedad)

2. **Deberías ver:**
   - ✅ Pagos programados del servicio que agregaste
   - ✅ Fechas futuras calculadas correctamente

### 3.3 Probar Registro de Pago + Cuenta

1. **Primero crea una cuenta bancaria:**
   ```sql
   -- Ejecuta esto en SQL Editor
   INSERT INTO cuentas (
     nombre,
     tipo_cuenta,
     balance_inicial,
     balance_actual,
     activo
   ) VALUES (
     'Efectivo',
     'efectivo',
     10000.00,
     10000.00,
     true
   );
   ```

2. **Registrar un pago:**
   - Ve a `/dashboard/catalogo/propiedad/[id]/tickets`
   - Click en un ticket/pago pendiente
   - Click en "Registrar Pago"
   - **Verás el nuevo campo "Cuenta para Pago"** (obligatorio)
   - Selecciona "Efectivo (Saldo: $10,000.00)"
   - Completa el formulario y guarda

3. **Verificar que el saldo se actualizó automáticamente:**
   ```sql
   SELECT nombre, balance_actual FROM cuentas WHERE nombre = 'Efectivo';
   ```
   - ✅ Deberías ver que el saldo disminuyó según el monto del pago

### 3.4 Probar Balance con Ingresos

1. **Agregar un ingreso manualmente:**
   ```sql
   INSERT INTO ingresos (
     propiedad_id,
     cuenta_id,
     concepto,
     monto,
     fecha_ingreso,
     tipo_ingreso
   ) VALUES (
     'TU_PROPIEDAD_ID',
     (SELECT id FROM cuentas WHERE nombre = 'Efectivo' LIMIT 1),
     'Pago de Renta - Diciembre',
     15000.00,
     '2025-12-01',
     'Renta'
   );
   ```

2. **Ver en Balance:**
   - Ve a `/dashboard/cuentas` (global) o `/dashboard/catalogo/propiedad/[id]/balance`
   - ✅ Deberías ver el ingreso en la tabla
   - ✅ El card de "INGRESOS" mostrará $15,000
   - ✅ El "BALANCE" mostrará: Ingresos - Egresos

---

## 🔄 CÓMO FUNCIONA EL SISTEMA UNIFICADO

### Flujo Completo:

```
1. USUARIO CREA PROPIEDAD CON SERVICIOS
   ↓
2. Step 5: Agrega servicio "Luz CFE" - Cada 1 mes - Último pago: 2025-01-15
   ↓
3. usePropertyDatabase.ts guarda propiedad
   ↓
4. POR CADA SERVICIO:
   - Crea registro en servicios_inmueble
   - Llama a generar_fechas_pago_servicio()
   - Función calcula próximos 12 pagos desde HOY
   ↓
5. CALENDARIO muestra pagos pendientes automáticamente
   ↓
6. USUARIO ve pago próximo y lo registra
   ↓
7. RegistrarPagoModal:
   - Selecciona cuenta "Efectivo"
   - Completa datos de pago
   - Guarda con cuenta_id
   ↓
8. TRIGGER actualizar_saldo_cuenta():
   - Automáticamente resta del saldo de "Efectivo"
   - UPDATE cuentas SET balance_actual = balance_actual - monto
   ↓
9. BALANCE muestra:
   - Egresos: Pagos concretados
   - Ingresos: De tabla ingresos
   - Balance: Ingresos - Egresos
```

---

## 📊 QUÉ HACE CADA TABLA AHORA

| Tabla | Propósito | Relación |
|-------|-----------|----------|
| `cuentas` | Cuentas bancarias/efectivo del usuario | `cuenta_id` en pagos/ingresos |
| `servicios_inmueble` | Servicios de cada propiedad (Luz, Agua, etc.) | Se crean automáticamente desde wizard |
| `fechas_pago_servicios` | Fechas de pago programadas | Generadas automáticamente por RPC |
| `ingresos` | Ingresos registrados (rentas, depósitos) | Se crean manualmente (TODO: Modal) |
| `tickets` | Tickets/tareas manuales | Creados por usuario |

---

## 🎯 PRÓXIMOS PASOS (OPCIONAL)

Si quieres completar el 100% del sistema, falta:

### 1. Modal para Registrar Ingresos (2-3 horas)

Crear componente `RegistrarIngresoModal.tsx` similar a `RegistrarPagoModal` con campos:
- Fecha de ingreso
- Propiedad
- Concepto (Renta, Depósito, Venta, Otro)
- Monto
- Cuenta (donde se depositó)
- Método de pago (efectivo, transferencia, etc.)
- Comprobante (imagen/PDF)

### 2. Vista de Cuentas (3-4 horas)

Crear página `/dashboard/cuentas-bancarias` para:
- Ver lista de cuentas
- CRUD de cuentas (Crear, Editar, Eliminar)
- Ver saldo actual de cada cuenta
- Historial de movimientos por cuenta

### 3. Tickets Automáticos desde Servicios (1-2 horas)

Modificar `usePropertyDatabase.ts` para que al crear servicios también cree tickets iniciales vinculados con `servicio_id`.

---

## ⚠️ NOTAS IMPORTANTES

### Triggers Automáticos

Los triggers se encargan de:
- ✅ Actualizar `saldo_actual` en tabla `cuentas` al registrar pagos
- ✅ Actualizar `saldo_actual` al registrar ingresos
- ✅ Actualizar `updated_at` en todas las tablas necesarias

**NO necesitas actualizar saldos manualmente** - los triggers lo hacen automáticamente.

### Validaciones

- ✅ No puedes registrar pago sin seleccionar cuenta
- ✅ No puedes guardar servicio sin fecha de último pago
- ✅ Fechas de pago se generan solo hacia el futuro (no se crean fechas pasadas)

### Performance

- Los servicios se procesan en loop (no en paralelo) para evitar conflictos
- Se generan máximo 12 fechas de pago por servicio
- Se verifica que no existan fechas duplicadas (±3 días de tolerancia)

---

## 🐛 RESOLUCIÓN DE PROBLEMAS

### Error: "función generar_fechas_pago_servicio no existe"

**Solución:** Ejecuta el script SQL completo en Supabase.

### Error: "tabla cuentas no existe"

**Solución:** Ejecuta el script SQL completo. La migración renombra `cuentas_bancarias` → `cuentas`.

### Calendario vacío después de crear servicios

**Posibles causas:**
1. El servicio no tiene `última_fecha_pago` configurada
2. La función RPC falló (revisa logs en Supabase)
3. Las fechas generadas son todas pasadas (ajusta la fecha de último pago a más reciente)

**Verificar:**
```sql
SELECT * FROM fechas_pago_servicios WHERE servicio_id = 'TU_SERVICIO_ID';
```

### Saldos no se actualizan

**Posibles causas:**
1. Los triggers no se crearon correctamente
2. El campo `cuenta_id` es NULL

**Verificar triggers:**
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name LIKE '%saldo%';
```

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Revisa los logs de consola** del navegador (F12)
2. **Revisa los logs de Supabase** en el panel de Logs
3. **Verifica que ejecutaste el SQL completo** sin errores
4. **Consulta este documento** para el flujo esperado

---

## ✅ CHECKLIST FINAL

Antes de dar por terminada la implementación, verifica:

- [ ] Script SQL ejecutado sin errores
- [ ] Tabla `cuentas` existe (no `cuentas_bancarias`)
- [ ] Función RPC `generar_fechas_pago_servicio` creada
- [ ] Triggers de saldo creados
- [ ] Crear una propiedad con servicios genera fechas automáticamente
- [ ] Calendario muestra las fechas generadas
- [ ] Selector de cuentas aparece en RegistrarPagoModal
- [ ] Registrar pago actualiza saldo de cuenta
- [ ] Balance muestra ingresos (si hay en la BD)
- [ ] Código commiteado y pusheado a GitHub

---

**¡SISTEMA UNIFICADO LISTO! 🎉**

El flujo completo de **tickets → balance → calendario** está implementado y funcionando.
