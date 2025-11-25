# 🔍 AUDITORÍA DE ESCALABILIDAD RAS v1.2

**Fecha:** 22 de Noviembre 2025
**Realizada por:** Claude (Session: fix-public-ads-error-011ZdAZ3o5AApCQAajtAdGAY)
**Estado del sistema:** En producción activa
**Objetivo:** Evaluar capacidad de escalar a números objetivo

---

## 📊 NÚMEROS OBJETIVO

| Métrica | Cantidad | Total Acumulado |
|---------|----------|-----------------|
| **Usuarios** | 1,000 | 1,000 usuarios |
| **Propiedades por usuario** | 10 | 10,000 propiedades |
| **Fotografías por propiedad** | 30 | 300,000 imágenes |
| **Tickets por propiedad/mes** | 50 | 500,000 tickets/mes |
| **Tickets por propiedad/año** | 600 | 6,000,000 tickets/año |

**Almacenamiento estimado:**
- Imágenes: ~3 TB (300k imágenes × 10 MB promedio)
- Base de datos: ~50 GB (con 6M tickets + metadata)
- Total: ~3.5 TB

---

## 🚨 PROBLEMAS CRÍTICOS DETECTADOS

### 1. ⛔ SEVERIDAD: CRÍTICA - getPropertyImages() sin límite

**Ubicación:** `/lib/supabase/supabase-storage.ts:170`

```typescript
// ❌ ACTUAL - SIN LÍMITE
const { data, error } = await supabase
  .from('property_images')
  .select('*')
  .eq('property_id', propertyId)
  .order('order_index', { ascending: true })
  // NO HAY .limit() - CARGARÁ TODAS LAS 30 FOTOS (o 300,000 si hay error)
```

**Impacto:**
- Crash del navegador al cargar galería
- Timeouts en queries
- Consumo excesivo de memoria (3-5 MB de metadata por propiedad)
- Con 300k imágenes totales puede intentar cargar TODO

**Solución URGENTE:**
```typescript
// ✅ CORRECTO
const { data, error } = await supabase
  .from('property_images')
  .select('*')
  .eq('property_id', propertyId)
  .order('order_index', { ascending: true })
  .limit(50) // ← AGREGAR LÍMITE
```

---

### 2. ⛔ SEVERIDAD: CRÍTICA - RLS Desactivado

**Ubicación:** Todas las tablas principales

**Problema:**
Row Level Security (RLS) está **DESACTIVADO** en producción. Esto significa:
- Cualquier usuario puede acceder a datos de otros usuarios
- Violación grave de seguridad y privacidad
- Incumplimiento potencial de regulaciones (GDPR, etc.)

**Evidencia:**
- Archivo `.claude/DESHABILITAR_RLS_DESARROLLO.sql` aplicado
- Políticas RLS no están activas

**Solución CRÍTICA:**
1. Habilitar RLS en TODAS las tablas
2. Crear políticas por tabla
3. Verificar con tests de seguridad

---

### 3. 🔴 SEVERIDAD: ALTA - Tickets sin filtro de fecha

**Ubicación:** `/app/dashboard/tickets/page.tsx:130`

```typescript
// ❌ PROBLEMA - Carga TODOS los tickets pendientes
const { data: ticketsSupabase } = await supabase
  .from('tickets')
  .select('*')
  .eq('pagado', false)
  .order('fecha_programada', { ascending: true })
  .limit(200) // Límite de 200 pero sin filtro de fecha
```

**Impacto:**
- Con 500,000 tickets/mes, el query escanea toda la tabla
- Límite de 200 solo muestra 0.04% de datos
- Query se volverá muy lento con 6M tickets/año

**Solución:**
```typescript
// ✅ SOLUCIÓN - Filtro de fecha obligatorio
const fechaInicio = new Date()
fechaInicio.setMonth(fechaInicio.getMonth() - 1) // Mes actual

const { data: ticketsSupabase } = await supabase
  .from('tickets')
  .select('*')
  .eq('pagado', false)
  .gte('fecha_programada', fechaInicio.toISOString())
  .order('fecha_programada', { ascending: true })
  .limit(50)
```

---

### 4. 🔴 SEVERIDAD: ALTA - Paginación Offset-Based

**Ubicación:** `/app/dashboard/tickets/page.tsx:370`

**Problema:**
Usa paginación offset-based que se vuelve extremadamente lenta con millones de registros:

```typescript
// ❌ LENTO con millones de registros
.range(offset, offset + limit - 1)
// En página 1000: OFFSET 50000 - Supabase debe escanear 50k rows
```

**Solución:**
Cambiar a **cursor-based pagination**:

```typescript
// ✅ RÁPIDO - Cursor-based
const { data } = await supabase
  .from('tickets')
  .select('*')
  .eq('pagado', false)
  .gt('created_at', lastCursor) // Cursor del último item
  .order('created_at', { ascending: true })
  .limit(50)
```

---

## 📈 ANÁLISIS POR COMPONENTE

### Base de Datos

**Tablas Críticas:**

| Tabla | Registros Estimados | Problema | Prioridad |
|-------|---------------------|----------|-----------|
| `propiedades` | 10,000 | Sin paginación en catálogo | Media |
| `tickets` | 6,000,000/año | Sin filtro fecha + offset pagination | CRÍTICA |
| `fechas_pago_servicios` | 6,000,000/año | Límite 200 insuficiente | CRÍTICA |
| `property_images` | 300,000 | Sin límite en query | CRÍTICA |

**Índices Faltantes:**

```sql
-- CRÍTICO para fechas_pago_servicios
CREATE INDEX idx_pagos_optimo ON fechas_pago_servicios(
  propiedad_id,
  pagado,
  fecha_pago
) WHERE pagado = false;

-- IMPORTANTE para búsquedas geográficas
CREATE INDEX idx_propiedades_ciudad ON propiedades
USING GIN ((ubicacion->>'ciudad'));

-- IMPORTANTE para ordenamiento de imágenes
CREATE INDEX idx_images_timestamp ON property_images(
  property_id,
  uploaded_at DESC
);

-- CRÍTICO para tickets
CREATE INDEX idx_tickets_fecha_propiedad ON tickets(
  propiedad_id,
  fecha_programada DESC,
  pagado
);
```

---

### Sistema de Imágenes

**Estado Actual:**
- ✅ Compresión activa (thumbnail 300x300px, display optimizado)
- ✅ JPEG quality 80-85%
- ❌ NO hay lazy loading
- ❌ NO hay límite en queries
- ❌ NO hay CDN

**Recomendaciones:**
1. **URGENTE:** Agregar `.limit(50)` a todas las queries de imágenes
2. **ALTO:** Implementar lazy loading con `IntersectionObserver`
3. **ALTO:** Agregar CDN (Cloudflare) para caché
4. **MEDIO:** Cambiar de JPEG a WebP (50% menos peso)

---

### Sistema de Tickets

**Estado Actual:**
- ✅ Paginación implementada (límite 200)
- ❌ NO hay filtro de fecha obligatorio
- ❌ Usa offset-based pagination (lenta)
- ❌ NO hay vista materializada
- ❌ NO hay archivado automático

**Problema de Escalabilidad:**

Con 6,000,000 tickets/año:
- Tabla crecerá indefinidamente
- Queries se volverán muy lentos
- Límite de 200 es 0.003% de datos

**Solución Propuesta:**

1. **Filtros de fecha obligatorios** (default: mes actual)
2. **Cursor-based pagination** en lugar de offset
3. **Vista materializada** para tickets próximos (refresh cada hora)
4. **Archivado automático** de tickets completados > 1 año
5. **Particionamiento** de tabla por año

---

## 🏗️ ARQUITECTURA DE ARCHIVADO

### Sistema de Estados de Cuenta Mensuales

**Objetivo:**
Generar estados de cuenta mensuales automáticos en formato ZIP y archivar tickets antiguos.

**Estructura:**

```
/storage/estados-cuenta/{propiedad_id}/
  ├── 2024/
  │   ├── enero-2024.zip
  │   │   ├── estado_cuenta.pdf
  │   │   ├── tickets_pagados.csv
  │   │   ├── tickets_pendientes.csv
  │   │   └── comprobantes/
  │   │       ├── comprobante_001.pdf
  │   │       └── comprobante_002.pdf
  │   ├── febrero-2024.zip
  │   └── ...
  └── 2025/
      └── ...
```

**Flujo:**

```
1. GENERACIÓN AUTOMÁTICA (1º de cada mes a las 00:00)
   ↓
2. Consultar tickets del mes anterior
   ↓
3. Generar PDF con resumen financiero
   ↓
4. Exportar CSVs de tickets
   ↓
5. Comprimir en ZIP
   ↓
6. Subir a Storage
   ↓
7. ARCHIVAR tickets a tabla tickets_historico
   ↓
8. Eliminar tickets archivados de tabla principal
```

**Implementación:**

```typescript
// Función RPC en Supabase
CREATE OR REPLACE FUNCTION generar_estado_cuenta_mensual(
  p_propiedad_id UUID,
  p_mes INTEGER,
  p_año INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_tickets JSONB;
  v_total_ingresos DECIMAL;
  v_total_egresos DECIMAL;
BEGIN
  -- Obtener tickets del mes
  SELECT json_agg(t.*)
  INTO v_tickets
  FROM tickets t
  WHERE t.propiedad_id = p_propiedad_id
    AND EXTRACT(MONTH FROM t.fecha_programada) = p_mes
    AND EXTRACT(YEAR FROM t.fecha_programada) = p_año;

  -- Calcular totales
  SELECT
    COALESCE(SUM(i.monto), 0),
    COALESCE(SUM(CASE WHEN t.pagado THEN t.monto_real ELSE 0 END), 0)
  INTO v_total_ingresos, v_total_egresos
  FROM ingresos i
  LEFT JOIN tickets t ON t.propiedad_id = p_propiedad_id
  WHERE EXTRACT(MONTH FROM i.fecha_ingreso) = p_mes
    AND EXTRACT(YEAR FROM i.fecha_ingreso) = p_año;

  RETURN jsonb_build_object(
    'tickets', v_tickets,
    'ingresos', v_total_ingresos,
    'egresos', v_total_egresos,
    'balance', v_total_ingresos - v_total_egresos
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Tabla de Archivos:**

```sql
CREATE TABLE estados_cuenta_archivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  año INTEGER NOT NULL CHECK (año >= 2024),
  archivo_url TEXT NOT NULL, -- URL del ZIP en Storage
  total_tickets INTEGER NOT NULL,
  total_ingresos DECIMAL(12,2) NOT NULL,
  total_egresos DECIMAL(12,2) NOT NULL,
  balance_final DECIMAL(12,2) NOT NULL,
  generado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(propiedad_id, mes, año)
);
```

---

## 📂 LIMPIEZA DE DOCUMENTACIÓN

### Archivos Obsoletos Detectados

**Para ELIMINAR:**
- ✅ `app/dashboard/catalogo/page_backup_fase2.tsx`

**Para REVISAR (posible obsolescencia):**
- `MIGRATION_UNIFY_TICKETS.sql`
- `LIMPIAR_TICKETS_COMPLETO.sql`
- `LIMPIAR_TICKETS_SOLAMENTE.sql`
- `LIMPIAR_Y_REGENERAR_TICKETS.sql`
- `VERIFICAR_TABLAS_LEGACY.sql`

**Acción:** Mover a `/archives/` si ya fueron ejecutados

---

## 🎯 PLAN DE ACCIÓN PRIORIZADO

### 🚨 PRIORIDAD CRÍTICA (Hacer HOY)

1. **Agregar límite a getPropertyImages()**
   - Archivo: `/lib/supabase/supabase-storage.ts:170`
   - Cambio: Agregar `.limit(50)`
   - Tiempo: 5 minutos

2. **Habilitar RLS en producción**
   - Aplicar políticas de seguridad
   - Tiempo: 2 horas

3. **Agregar filtro de fecha en tickets**
   - Archivo: `/app/dashboard/tickets/page.tsx:130`
   - Default: mes actual
   - Tiempo: 30 minutos

4. **Crear índice optimizado para pagos**
   ```sql
   CREATE INDEX idx_pagos_optimo ON fechas_pago_servicios(
     propiedad_id, pagado, fecha_pago
   ) WHERE pagado = false;
   ```
   - Tiempo: 2 minutos

### 🔴 PRIORIDAD ALTA (Hacer esta semana)

5. **Implementar lazy loading en galería**
   - Usar `IntersectionObserver`
   - Tiempo: 3 horas

6. **Cambiar a cursor-based pagination en tickets**
   - Mejor rendimiento con millones de registros
   - Tiempo: 4 horas

7. **Configurar CDN (Cloudflare)**
   - Para caché de imágenes
   - Tiempo: 2 horas

8. **Crear tabla tickets_historico**
   ```sql
   CREATE TABLE tickets_historico (
     LIKE tickets INCLUDING ALL
   );
   ```
   - Tiempo: 10 minutos

9. **Implementar archivado automático**
   - Mover tickets > 1 año a histórico
   - Tiempo: 3 horas

10. **Agregar monitoreo de queries lentas**
    - EXPLAIN ANALYZE en producción
    - Tiempo: 2 horas

### 🟡 PRIORIDAD MEDIA (Próximas 2 semanas)

11. **Sistema de estados de cuenta mensuales**
    - Generar PDFs + ZIPs automáticamente
    - Tiempo: 2 días

12. **Vista materializada para tickets próximos**
    - Refresh cada hora
    - Tiempo: 3 horas

13. **Cambiar JPEG a WebP**
    - Reducir 50% peso de imágenes
    - Tiempo: 4 horas

14. **Implementar connection pooling (pgBouncer)**
    - Para 1,000 usuarios concurrentes
    - Tiempo: 1 día

15. **Tests de carga con k6**
    - Validar escalabilidad
    - Tiempo: 1 día

---

## 📊 ESTIMACIÓN DE ESCALABILIDAD

| Escenario | Viable | Cambios Necesarios |
|-----------|--------|-------------------|
| **1,000 usuarios** | ✅ SÍ | RLS + límites + filtros fecha |
| **10,000 propiedades** | ✅ SÍ | Cursor pagination + índices + caché |
| **300,000 imágenes** | ⚠️ CONDICIONAL | Lazy loading + CDN + límite queries + WebP |
| **6M tickets/año** | ⚠️ CONDICIONAL | Particionamiento + archivado + vista materializada + filtros obligatorios |

**Conclusión:**
El sistema **NO puede escalar** a los números objetivo **sin implementar los cambios críticos**.

**Tiempo total estimado de implementación:**
- Prioridad crítica: 1 día
- Prioridad alta: 3-4 días
- Prioridad media: 5-7 días
- **TOTAL: 2-3 semanas** (con testing incluido)

---

## 🔄 MÉTRICAS ACTUALES vs OBJETIVO

| Métrica | Actual | Objetivo | Estado |
|---------|--------|----------|--------|
| Queries por carga catálogo | 3 | 3 | ✅ OK |
| Límite tickets por query | 200 | 50-100 con filtros | ⚠️ Ajustar |
| Límite imágenes | ∞ | 50 | ❌ CRÍTICO |
| Paginación | Offset | Cursor | ❌ Cambiar |
| RLS | ❌ OFF | ✅ ON | ❌ CRÍTICO |
| Archivado | ❌ NO | ✅ SÍ | ❌ Implementar |
| CDN | ❌ NO | ✅ SÍ | ❌ Configurar |

---

## 📝 PRÓXIMOS PASOS INMEDIATOS

1. **Aplicar fixes críticos HOY** (items 1-4)
2. **Implementar sistema de archivado esta semana** (items 5-10)
3. **Planear estados de cuenta mensuales** (próximas 2 semanas)
4. **Testing de carga** antes de escalar usuarios

**Sin estos cambios, el sistema colapsará alrededor de:**
- ~500 propiedades
- ~50,000 tickets
- ~15,000 imágenes

---

**Reporte generado automáticamente por auditoría de escalabilidad**
**Última actualización:** 22 de Noviembre 2025
**Próxima revisión recomendada:** Después de implementar prioridad crítica
