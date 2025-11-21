# 🏦 Sistema de Cuentas Bancarias e Ingresos - RAS v1.2

## 📋 Resumen de Implementación

Se ha implementado un sistema completo de gestión de cuentas bancarias e ingresos que permite:

✅ **Gestionar cuentas bancarias** asociadas a propiedades o propietarios
✅ **Registrar ingresos** (rentas, depósitos, ventas)
✅ **Asociar pagos a cuentas** para actualizar balances automáticamente
✅ **Visualizar movimientos** consolidados (ingresos + egresos)
✅ **Regenerar tickets** automáticamente para servicios recurrentes

---

## 📁 Archivos Creados/Modificados

### 🆕 Nuevos Archivos

| Archivo | Descripción |
|---------|-------------|
| `.claude/MIGRATION_CUENTAS_INGRESOS.sql` | Script SQL completo para crear tablas y funciones |
| `services/cuentas-api.ts` | API service para CRUD de cuentas e ingresos |
| `components/RegistrarIngresoModal.tsx` | Modal para registrar ingresos |
| `components/GestionCuentas.tsx` | Componente para gestionar cuentas bancarias |

### ✏️ Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `types/property.ts` | Agregados tipos: `CuentaBancaria`, `Ingreso`, `MovimientoCuenta` |
| `components/RegistrarPagoModal.tsx` | Agregado selector de cuenta bancaria |

---

## 🗄️ Estructura de Base de Datos

### Tabla: `cuentas_bancarias`

```sql
CREATE TABLE cuentas_bancarias (
  id UUID PRIMARY KEY,
  propiedad_id UUID (FK propiedades),  -- Cuenta de propiedad
  propietario_id UUID (FK profiles),   -- Cuenta personal
  nombre TEXT NOT NULL,
  tipo_moneda TEXT ('MXN' | 'USD'),
  tipo_cuenta TEXT ('Banco' | 'Tarjeta' | 'Efectivo'),
  banco TEXT,
  numero_cuenta TEXT,
  balance_inicial NUMERIC(12,2),
  balance_actual NUMERIC(12,2),       -- Calculado automáticamente
  descripcion TEXT,
  color TEXT,
  activo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Constraint importante:** Una cuenta debe tener `propiedad_id` O `propietario_id`, no ambos.

### Tabla: `ingresos`

```sql
CREATE TABLE ingresos (
  id UUID PRIMARY KEY,
  propiedad_id UUID (FK propiedades),
  cuenta_id UUID (FK cuentas_bancarias),
  creado_por UUID (FK profiles),
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  tipo_ingreso TEXT ('Renta' | 'Depósito' | 'Venta' | 'Otro'),
  metodo_pago TEXT,
  referencia_pago TEXT,
  tiene_factura BOOLEAN,
  numero_factura TEXT,
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Modificación: `fechas_pago_servicios`

Se agregaron los siguientes campos:

- `cuenta_id UUID` - FK a cuentas_bancarias
- `metodo_pago TEXT`
- `referencia_pago TEXT`
- `tiene_factura BOOLEAN`
- `numero_factura TEXT`
- `comprobante_url TEXT`
- `updated_at TIMESTAMPTZ`

### Vista: `v_movimientos_cuenta`

Vista consolidada que une:
- **Egresos:** De `fechas_pago_servicios` (pagos realizados)
- **Ingresos:** De `ingresos`

Útil para mostrar el historial completo de movimientos de una cuenta.

---

## ⚙️ Funciones Automáticas (Triggers)

### 1. Actualización automática de balance (Egresos)

**Trigger:** `trigger_actualizar_balance_pago`
**Función:** `actualizar_balance_cuenta_pago()`

Cuando se marca un pago como `pagado = TRUE`:
- Resta el `monto_real` del `balance_actual` de la cuenta
- Si se desmarca, revierte el balance

### 2. Actualización automática de balance (Ingresos)

**Trigger:** `trigger_actualizar_balance_ingreso`
**Función:** `actualizar_balance_cuenta_ingreso()`

Al insertar/actualizar/eliminar un ingreso:
- Suma o resta el monto del `balance_actual` de la cuenta
- Ajusta automáticamente si se cambia la cuenta destino

### 3. Inicializar balance al crear cuenta

**Trigger:** `trigger_inicializar_balance`
**Función:** `inicializar_balance_cuenta()`

Al crear una cuenta nueva:
- `balance_actual` = `balance_inicial`

### 4. Generar fechas de pago automáticas

**Función RPC:** `generar_fechas_pago_servicio(servicio_id, cantidad_meses)`

Genera tickets automáticamente para los próximos N meses de un servicio.

**Ejemplo de uso:**
```sql
SELECT generar_fechas_pago_servicio('uuid-del-servicio', 12);
-- Genera 12 fechas de pago para el próximo año
```

---

## 🚀 Pasos para Activar el Sistema

### PASO 1: Ejecutar Migración en Supabase

1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Copiar todo el contenido de `.claude/MIGRATION_CUENTAS_INGRESOS.sql`
3. Pegar y ejecutar
4. Verificar que no haya errores

### PASO 2: Crear Bucket de Storage (si no existe)

Si aún no existe el bucket `documentos`:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true);
```

**Configurar policies:**
```sql
-- Permitir subir archivos
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Permitir leer archivos
CREATE POLICY "Public can read documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documentos');
```

### PASO 3: Integrar Componentes en las Vistas

#### A) En vista de Balance por Propiedad

Archivo: `app/dashboard/catalogo/propiedad/[id]/balance/page.tsx`

```tsx
import GestionCuentas from '@/components/GestionCuentas'
import RegistrarIngresoModal from '@/components/RegistrarIngresoModal'

// Dentro del componente, agregar:
<GestionCuentas
  propiedadId={propiedadId}
  propiedadNombre={propiedad.nombre_propiedad}
  onCuentaSeleccionada={(cuenta) => {
    // Opcional: hacer algo cuando se selecciona una cuenta
    console.log('Cuenta seleccionada:', cuenta)
  }}
/>

// Agregar botón para registrar ingreso
<button onClick={() => setMostrarModalIngreso(true)}>
  + Registrar Ingreso
</button>

<RegistrarIngresoModal
  isOpen={mostrarModalIngreso}
  onClose={() => setMostrarModalIngreso(false)}
  onSuccess={() => {
    recargarDatos()
    setMostrarModalIngreso(false)
  }}
  propiedades={propiedades}
  cuentas={cuentas}
  propiedadPreseleccionada={propiedadId}
/>
```

#### B) En Dashboard Global (Cuentas)

Archivo: `app/dashboard/cuentas/page.tsx`

Similar a lo anterior, pero sin preseleccionar propiedad.

---

## 📊 Flujo de Uso

### 1️⃣ Usuario crea cuenta bancaria

1. Ir a **Catálogo → Propiedad → Balance**
2. Click en **"Nueva Cuenta"**
3. Llenar formulario:
   - Nombre (ej: "Cuenta BBVA Casa Playa")
   - Tipo: Banco / Tarjeta / Efectivo
   - Moneda: MXN / USD
   - Banco (opcional)
   - Últimos 4 dígitos (opcional)
   - Balance inicial (saldo actual de la cuenta)
   - Color (para identificación visual)
4. Guardar

### 2️⃣ Usuario registra ingreso

1. Click en **"Registrar Ingreso"**
2. Llenar formulario:
   - Fecha de ingreso
   - Tipo (Renta / Depósito / Venta / Otro)
   - Propiedad
   - Cuenta destino (opcional, pero recomendado)
   - Concepto
   - Monto
   - Método de pago
   - Referencia (si no es efectivo)
   - Factura (si aplica)
   - Comprobante (archivo opcional)
3. Guardar

✨ **El balance de la cuenta se actualiza automáticamente**

### 3️⃣ Usuario marca pago de servicio como pagado

1. Ir a **Tickets** o **Calendario**
2. Click en **"Registrar Pago"** en un ticket pendiente
3. Llenar formulario:
   - Fecha de pago
   - Propiedad (preseleccionada)
   - **Cuenta de origen** ← NUEVO
   - Monto
   - Método de pago
   - Referencia
   - Factura
   - Comprobante
4. Guardar

✨ **El balance de la cuenta se reduce automáticamente**

### 4️⃣ Usuario ve balance consolidado

En **Catálogo → Propiedad → Balance**:

- ✅ Ver todas las cuentas de la propiedad
- ✅ Balance actual de cada cuenta
- ✅ Historial de movimientos (ingresos + egresos)
- ✅ Filtrar por fecha
- ✅ Comparativo de periodos

---

## 🔄 Regeneración Automática de Tickets

Para activar la regeneración automática de tickets de servicios:

### Opción 1: Manualmente por servicio

```sql
-- Generar tickets para los próximos 12 meses de un servicio
SELECT generar_fechas_pago_servicio('uuid-del-servicio', 12);
```

### Opción 2: Job automático (recomendado)

Crear un **Edge Function** o **Cron Job** que ejecute:

```typescript
// Cada inicio de mes, regenerar tickets para servicios activos
const { data: servicios } = await supabase
  .from('servicios_inmueble')
  .select('id')
  .eq('activo', true)

for (const servicio of servicios) {
  await supabase.rpc('generar_fechas_pago_servicio', {
    p_servicio_id: servicio.id,
    p_cantidad_meses: 12
  })
}
```

---

## 📈 Próximos Pasos Sugeridos

### FASE 1: Estados de Cuenta (Pendiente)

- Crear reporte mensual automático
- Generar PDF con movimientos del mes
- Enviar por email al usuario

### FASE 2: Renombrar "Cuentas" → "Balance"

- Actualizar rutas en sidebar
- Cambiar títulos en vistas
- Actualizar navegación

### FASE 3: Dashboard de KPIs

- Tarjetas resumen: Total en cuentas, Ingresos del mes, Egresos del mes
- Gráfica de balance histórico
- Comparativa MXN vs USD

---

## 🐛 Troubleshooting

### ❌ Error: "relation cuentas_bancarias does not exist"

**Solución:** Ejecutar el script de migración en Supabase SQL Editor

### ❌ Error: "function generar_fechas_pago_servicio does not exist"

**Solución:** Verificar que se ejecutó la sección de funciones del script de migración

### ❌ El balance no se actualiza automáticamente

**Solución:** Verificar que los triggers estén creados:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### ❌ No puedo subir comprobantes

**Solución:**
1. Verificar que existe el bucket `documentos` en Storage
2. Verificar policies de storage
3. Verificar tamaño del archivo (máx 5MB)

---

## 📝 Notas Técnicas

- **Transacciones:** Los triggers garantizan que balance se actualice atómicamente
- **Soft Delete:** Las cuentas usan `activo = false` en lugar de eliminar
- **Validación:** Se valida que cuenta tenga propiedad_id O propietario_id mediante constraint
- **Performance:** Índices creados en `cuenta_id`, `tipo_moneda`, `fecha_ingreso`, etc.
- **Auditoría:** Todos los cambios tienen `updated_at` automático

---

## ✅ Checklist de Verificación

Antes de hacer commit, verificar:

- [ ] Migración ejecutada en Supabase
- [ ] Bucket `documentos` existe con policies
- [ ] Triggers funcionando correctamente
- [ ] Componentes integrados en vistas
- [ ] Probado flujo completo: crear cuenta → registrar ingreso → ver balance actualizado
- [ ] Probado flujo de pago: marcar pago → ver balance reducido
- [ ] Validaciones funcionando (montos negativos, campos requeridos)
- [ ] Archivos adjuntos funcionando

---

## 🎯 Conclusión

El sistema está **completamente implementado** a nivel de código y base de datos. Solo falta:

1. **Ejecutar la migración SQL** en Supabase
2. **Integrar los componentes** en las vistas existentes
3. **Probar el flujo completo**

Una vez hecho esto, el usuario podrá gestionar cuentas bancarias, registrar ingresos, asociar pagos a cuentas y ver balances actualizados en tiempo real.
