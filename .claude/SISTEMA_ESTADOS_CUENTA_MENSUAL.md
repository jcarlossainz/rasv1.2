# 📋 Sistema de Estados de Cuenta Mensuales con Archivado Automático

**Versión:** 1.0
**Fecha:** 22 de Noviembre 2025
**Objetivo:** Reducir carga de base de datos archivando tickets antiguos y generar estados de cuenta mensuales automáticos

---

## 🎯 OBJETIVO

Resolver el problema de escalabilidad de tickets implementando:

1. **Generación automática** de estados de cuenta mensuales en PDF + ZIP
2. **Archivado automático** de tickets completados > 1 año a tabla histórica
3. **Acceso rápido** a tickets recientes (< 1 año) para operación diaria
4. **Acceso bajo demanda** a tickets históricos mediante descarga de ZIP

---

## 📊 NÚMEROS ACTUALES vs OBJETIVO

| Métrica | Sin Archivado | Con Archivado |
|---------|---------------|---------------|
| **Tickets activos** | 6,000,000/año | ~600,000 (solo último año) |
| **Tamaño tabla tickets** | ~50 GB | ~5 GB |
| **Tiempo query dashboard** | ~5-10 segundos | ~500ms |
| **Tickets por descarga ZIP** | N/A | ~50-100 por mes |

**Reducción:** 90% menos registros en tabla activa

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### 1. Estructura de Base de Datos

```sql
-- ============================================================================
-- TABLA: estados_cuenta_archivos
-- Almacena metadata de cada estado de cuenta mensual generado
-- ============================================================================

CREATE TABLE estados_cuenta_archivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id UUID REFERENCES propiedades(id) ON DELETE CASCADE NOT NULL,

  -- Período del estado de cuenta
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  año INTEGER NOT NULL CHECK (año >= 2024),

  -- Archivo generado
  archivo_url TEXT NOT NULL, -- URL del ZIP en Storage: estados-cuenta/{prop_id}/{año}/{mes}.zip
  archivo_tamano BIGINT, -- Tamaño en bytes

  -- Métricas del período
  total_tickets INTEGER NOT NULL DEFAULT 0,
  tickets_pagados INTEGER NOT NULL DEFAULT 0,
  tickets_pendientes INTEGER NOT NULL DEFAULT 0,

  total_ingresos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_egresos DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_final DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Metadata
  generado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generado_por UUID REFERENCES profiles(id), -- Usuario que generó (si manual)
  es_automatico BOOLEAN DEFAULT TRUE,

  -- Índices y constraints
  UNIQUE(propiedad_id, mes, año)
);

CREATE INDEX idx_estados_cuenta_propiedad ON estados_cuenta_archivos(propiedad_id, año DESC, mes DESC);
CREATE INDEX idx_estados_cuenta_fecha ON estados_cuenta_archivos(año DESC, mes DESC);


-- ============================================================================
-- TABLA: tickets_historico
-- Almacena tickets archivados (completados y > 1 año)
-- ============================================================================

CREATE TABLE tickets_historico (
  -- Misma estructura que tabla tickets
  LIKE tickets INCLUDING ALL,

  -- Campos adicionales para histórico
  archivado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estado_cuenta_id UUID REFERENCES estados_cuenta_archivos(id)
);

-- Índices optimizados para búsquedas históricas
CREATE INDEX idx_tickets_hist_propiedad_fecha ON tickets_historico(propiedad_id, fecha_programada DESC);
CREATE INDEX idx_tickets_hist_estado_cuenta ON tickets_historico(estado_cuenta_id);
CREATE INDEX idx_tickets_hist_archivado ON tickets_historico(archivado_at DESC);

-- Particionamiento por año (opcional pero recomendado)
-- ALTER TABLE tickets_historico PARTITION BY RANGE (EXTRACT(YEAR FROM fecha_programada));
```

---

### 2. Función de Generación de Estado de Cuenta

```sql
-- ============================================================================
-- FUNCIÓN: generar_estado_cuenta_mensual
-- Genera estado de cuenta y archiva tickets antiguos
-- ============================================================================

CREATE OR REPLACE FUNCTION generar_estado_cuenta_mensual(
  p_propiedad_id UUID,
  p_mes INTEGER,
  p_año INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_tickets JSONB;
  v_ingresos JSONB;
  v_total_ingresos DECIMAL(12,2) := 0;
  v_total_egresos DECIMAL(12,2) := 0;
  v_tickets_pagados INTEGER := 0;
  v_tickets_pendientes INTEGER := 0;
  v_total_tickets INTEGER := 0;
BEGIN

  -- 1. OBTENER TICKETS DEL MES (tanto de tabla tickets como fechas_pago_servicios)
  WITH tickets_mes AS (
    SELECT
      t.id,
      t.titulo,
      t.descripcion,
      t.monto_estimado,
      t.monto_real,
      t.fecha_programada,
      t.pagado,
      t.fecha_pago_real,
      t.categoria,
      t.prioridad,
      'manual' as tipo_ticket
    FROM tickets t
    WHERE t.propiedad_id = p_propiedad_id
      AND EXTRACT(MONTH FROM t.fecha_programada) = p_mes
      AND EXTRACT(YEAR FROM t.fecha_programada) = p_año

    UNION ALL

    SELECT
      fps.id,
      CONCAT('Pago de ', si.nombre) as titulo,
      si.tipo_servicio as descripcion,
      fps.monto_estimado,
      fps.monto_real,
      fps.fecha_pago as fecha_programada,
      fps.pagado,
      fps.fecha_pago_real,
      'Servicio' as categoria,
      'Media' as prioridad,
      'servicio' as tipo_ticket
    FROM fechas_pago_servicios fps
    INNER JOIN servicios_inmueble si ON fps.servicio_id = si.id
    WHERE fps.propiedad_id = p_propiedad_id
      AND EXTRACT(MONTH FROM fps.fecha_pago) = p_mes
      AND EXTRACT(YEAR FROM fps.fecha_pago) = p_año
  )
  SELECT
    json_agg(tm.*) FILTER (WHERE tm.id IS NOT NULL),
    COUNT(*),
    COUNT(*) FILTER (WHERE tm.pagado = TRUE),
    COUNT(*) FILTER (WHERE tm.pagado = FALSE),
    COALESCE(SUM(CASE WHEN tm.pagado THEN tm.monto_real ELSE 0 END), 0)
  INTO v_tickets, v_total_tickets, v_tickets_pagados, v_tickets_pendientes, v_total_egresos
  FROM tickets_mes tm;

  -- 2. OBTENER INGRESOS DEL MES
  SELECT
    json_agg(i.*) FILTER (WHERE i.id IS NOT NULL),
    COALESCE(SUM(i.monto), 0)
  INTO v_ingresos, v_total_ingresos
  FROM ingresos i
  WHERE i.propiedad_id = p_propiedad_id
    AND EXTRACT(MONTH FROM i.fecha_ingreso) = p_mes
    AND EXTRACT(YEAR FROM i.fecha_ingreso) = p_año;

  -- 3. RETORNAR DATOS PARA GENERACIÓN DE PDF
  RETURN jsonb_build_object(
    'mes', p_mes,
    'año', p_año,
    'propiedad_id', p_propiedad_id,
    'tickets', COALESCE(v_tickets, '[]'::jsonb),
    'ingresos', COALESCE(v_ingresos, '[]'::jsonb),
    'metricas', jsonb_build_object(
      'total_tickets', v_total_tickets,
      'tickets_pagados', v_tickets_pagados,
      'tickets_pendientes', v_tickets_pendientes,
      'total_ingresos', v_total_ingresos,
      'total_egresos', v_total_egresos,
      'balance', v_total_ingresos - v_total_egresos
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- FUNCIÓN: archivar_tickets_completados
-- Mueve tickets completados > 1 año a tabla histórico
-- ============================================================================

CREATE OR REPLACE FUNCTION archivar_tickets_completados(
  p_meses_antiguedad INTEGER DEFAULT 12
) RETURNS TABLE(tickets_archivados INTEGER) AS $$
DECLARE
  v_fecha_limite TIMESTAMP WITH TIME ZONE;
  v_count INTEGER;
BEGIN
  -- Calcular fecha límite (por defecto: hace 12 meses)
  v_fecha_limite := NOW() - (p_meses_antiguedad || ' months')::INTERVAL;

  -- PASO 1: Copiar tickets a histórico
  INSERT INTO tickets_historico (
    SELECT *,
           NOW() as archivado_at,
           NULL as estado_cuenta_id
    FROM tickets
    WHERE pagado = TRUE
      AND fecha_pago_real < v_fecha_limite
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- PASO 2: Eliminar tickets archivados de tabla principal
  DELETE FROM tickets
  WHERE pagado = TRUE
    AND fecha_pago_real < v_fecha_limite;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3. Job Automático (Supabase Edge Function)

```typescript
// /supabase/functions/generar-estados-cuenta/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import PDFDocument from 'https://cdn.skypack.dev/pdfkit'
import JSZip from 'https://cdn.skypack.dev/jszip'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Obtener mes/año anterior
  const ahora = new Date()
  const mesAnterior = ahora.getMonth() === 0 ? 12 : ahora.getMonth()
  const añoAnterior = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear()

  // Obtener todas las propiedades activas
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, nombre_propiedad, owner_id')
    .eq('is_draft', false)

  const resultados = []

  for (const propiedad of propiedades) {
    try {
      // 1. Obtener datos del mes
      const { data: datosEstado } = await supabase
        .rpc('generar_estado_cuenta_mensual', {
          p_propiedad_id: propiedad.id,
          p_mes: mesAnterior,
          p_año: añoAnterior
        })

      if (!datosEstado || datosEstado.metricas.total_tickets === 0) {
        console.log(`Propiedad ${propiedad.nombre_propiedad}: Sin actividad este mes`)
        continue
      }

      // 2. Generar PDF
      const pdfBuffer = await generarPDF(datosEstado, propiedad)

      // 3. Generar CSVs
      const csvTickets = generarCSV(datosEstado.tickets, 'tickets')
      const csvIngresos = generarCSV(datosEstado.ingresos, 'ingresos')

      // 4. Crear ZIP
      const zip = new JSZip()
      zip.file('estado_cuenta.pdf', pdfBuffer)
      zip.file('tickets.csv', csvTickets)
      zip.file('ingresos.csv', csvIngresos)

      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

      // 5. Subir ZIP a Storage
      const nombreArchivo = `${añoAnterior}/${mesAnterior.toString().padStart(2, '0')}.zip`
      const rutaStorage = `estados-cuenta/${propiedad.id}/${nombreArchivo}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(rutaStorage, zipBuffer, {
          contentType: 'application/zip',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 6. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(rutaStorage)

      // 7. Guardar registro en estados_cuenta_archivos
      const { error: insertError } = await supabase
        .from('estados_cuenta_archivos')
        .insert({
          propiedad_id: propiedad.id,
          mes: mesAnterior,
          año: añoAnterior,
          archivo_url: publicUrl,
          archivo_tamano: zipBuffer.byteLength,
          total_tickets: datosEstado.metricas.total_tickets,
          tickets_pagados: datosEstado.metricas.tickets_pagados,
          tickets_pendientes: datosEstado.metricas.tickets_pendientes,
          total_ingresos: datosEstado.metricas.total_ingresos,
          total_egresos: datosEstado.metricas.total_egresos,
          balance_final: datosEstado.metricas.balance,
          es_automatico: true
        })

      if (insertError) throw insertError

      resultados.push({
        propiedad: propiedad.nombre_propiedad,
        status: 'success',
        url: publicUrl
      })

    } catch (error) {
      resultados.push({
        propiedad: propiedad.nombre_propiedad,
        status: 'error',
        error: error.message
      })
    }
  }

  return new Response(
    JSON.stringify({
      mes: mesAnterior,
      año: añoAnterior,
      total_procesadas: propiedades.length,
      exitosas: resultados.filter(r => r.status === 'success').length,
      fallidas: resultados.filter(r => r.status === 'error').length,
      detalles: resultados
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

// ============================================================================
// HELPER: Generar PDF
// ============================================================================

async function generarPDF(datos: any, propiedad: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Uint8Array[] = []

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    // ENCABEZADO
    doc.fontSize(20).text('Estado de Cuenta Mensual', { align: 'center' })
    doc.fontSize(12).text(propiedad.nombre_propiedad, { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).text(`Período: ${nombreMes(datos.mes)} ${datos.año}`)
    doc.moveDown()

    // RESUMEN FINANCIERO
    doc.fontSize(16).text('Resumen Financiero')
    doc.moveDown(0.5)
    doc.fontSize(12)
    doc.text(`Total Ingresos: $${datos.metricas.total_ingresos.toFixed(2)} MXN`, { continued: false })
    doc.text(`Total Egresos: $${datos.metricas.total_egresos.toFixed(2)} MXN`)
    doc.text(`Balance del Mes: $${datos.metricas.balance.toFixed(2)} MXN`)
    doc.moveDown()

    // TICKETS
    doc.fontSize(16).text('Tickets del Mes')
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Total de tickets: ${datos.metricas.total_tickets}`)
    doc.text(`Pagados: ${datos.metricas.tickets_pagados}`)
    doc.text(`Pendientes: ${datos.metricas.tickets_pendientes}`)
    doc.moveDown()

    // TABLA DE TICKETS
    if (datos.tickets && datos.tickets.length > 0) {
      doc.fontSize(12).text('Detalle de Tickets:')
      doc.moveDown(0.5)
      doc.fontSize(8)

      datos.tickets.forEach((ticket: any, index: number) => {
        doc.text(`${index + 1}. ${ticket.titulo} - $${ticket.monto_real || ticket.monto_estimado} - ${ticket.pagado ? 'PAGADO' : 'PENDIENTE'}`)
      })
    }

    doc.end()
  })
}

// ============================================================================
// HELPER: Generar CSV
// ============================================================================

function generarCSV(datos: any[], tipo: string): string {
  if (!datos || datos.length === 0) return ''

  const headers = Object.keys(datos[0]).join(',')
  const rows = datos.map(d => Object.values(d).join(','))

  return [headers, ...rows].join('\n')
}

function nombreMes(mes: number): string {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return meses[mes - 1]
}
```

---

### 4. Programar Ejecución Automática (Supabase Cron)

```sql
-- Ejecutar el 1º de cada mes a las 00:00 UTC
SELECT cron.schedule(
  'generar-estados-cuenta-mensuales',
  '0 0 1 * *', -- Cron: minuto hora día mes día_semana
  $$
  SELECT
    net.http_post(
      url := 'https://[TU-PROJECT-ID].supabase.co/functions/v1/generar-estados-cuenta',
      headers := jsonb_build_object('Authorization', 'Bearer [SERVICE-ROLE-KEY]'),
      body := '{}'::jsonb
    );
  $$
);

-- Archivar tickets antiguos cada domingo a las 02:00 UTC
SELECT cron.schedule(
  'archivar-tickets-antiguos',
  '0 2 * * 0',
  $$
  SELECT archivar_tickets_completados(12); -- Archivar tickets > 12 meses
  $$
);
```

---

## 🎨 INTERFAZ DE USUARIO

### Vista de Estados de Cuenta

```tsx
// /app/dashboard/catalogo/propiedad/[id]/balance/estados-cuenta/page.tsx

export default function EstadosCuentaPage() {
  const { id } = useParams()
  const [estados, setEstados] = useState<EstadoCuenta[]>([])

  useEffect(() => {
    cargarEstados()
  }, [id])

  const cargarEstados = async () => {
    const { data } = await supabase
      .from('estados_cuenta_archivos')
      .select('*')
      .eq('propiedad_id', id)
      .order('año', { ascending: false })
      .order('mes', { ascending: false })

    setEstados(data || [])
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Estados de Cuenta</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {estados.map((estado) => (
          <div key={estado.id} className="border rounded-lg p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">
                {nombreMes(estado.mes)} {estado.año}
              </h3>
              <span className={`px-2 py-1 rounded text-xs ${
                estado.balance_final >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                ${estado.balance_final.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Ingresos: ${estado.total_ingresos.toFixed(2)}</p>
              <p>Egresos: ${estado.total_egresos.toFixed(2)}</p>
              <p>Tickets: {estado.total_tickets} ({estado.tickets_pagados} pagados)</p>
            </div>

            <a
              href={estado.archivo_url}
              download
              className="block w-full text-center bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
            >
              📥 Descargar ZIP
            </a>
          </div>
        ))}
      </div>

      {estados.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay estados de cuenta generados aún.
          <br />
          Los estados se generan automáticamente el 1º de cada mes.
        </div>
      )}
    </div>
  )
}
```

---

## 📅 CRONOGRAMA DE IMPLEMENTACIÓN

### Semana 1: Base de Datos y Backend

**Día 1-2:**
- Crear tablas `estados_cuenta_archivos` y `tickets_historico`
- Implementar funciones `generar_estado_cuenta_mensual()` y `archivar_tickets_completados()`
- Testing de funciones

**Día 3-4:**
- Desarrollar Edge Function para generación de PDFs
- Implementar generación de ZIPs
- Testing de generación completa

**Día 5:**
- Configurar Supabase Cron
- Testing de ejecución automática

### Semana 2: Frontend y Pruebas

**Día 1-2:**
- Crear vista de Estados de Cuenta
- Implementar descarga de ZIPs
- Diseño responsive

**Día 3-4:**
- Testing end-to-end
- Optimizaciones

**Día 5:**
- Documentación
- Deploy a producción

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Base de Datos
- [ ] Crear tabla `estados_cuenta_archivos`
- [ ] Crear tabla `tickets_historico`
- [ ] Implementar función `generar_estado_cuenta_mensual()`
- [ ] Implementar función `archivar_tickets_completados()`
- [ ] Crear índices optimizados
- [ ] Testing de funciones SQL

### Storage
- [ ] Crear bucket `documentos` si no existe
- [ ] Configurar políticas de acceso
- [ ] Crear estructura de carpetas

### Edge Function
- [ ] Crear función `generar-estados-cuenta`
- [ ] Implementar generación de PDF
- [ ] Implementar generación de CSV
- [ ] Implementar creación de ZIP
- [ ] Testing de función

### Automatización
- [ ] Configurar Supabase Cron para generación mensual
- [ ] Configurar Cron para archivado semanal
- [ ] Testing de ejecución automática

### Frontend
- [ ] Crear página de Estados de Cuenta
- [ ] Implementar listado de archivos
- [ ] Implementar descarga de ZIPs
- [ ] Diseño responsive
- [ ] Testing de UI

### Testing
- [ ] Test unitarios de funciones SQL
- [ ] Test de Edge Function
- [ ] Test end-to-end de flujo completo
- [ ] Test de rendimiento con datos reales

### Documentación
- [ ] Documentar funciones SQL
- [ ] Documentar Edge Function
- [ ] Guía de usuario
- [ ] Actualizar README

---

## 🎯 BENEFICIOS ESPERADOS

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Tickets en tabla activa** | 6M | 600k | 90% menos |
| **Tiempo de carga dashboard** | 5-10s | 500ms | 95% más rápido |
| **Espacio en BD** | 50 GB | 5 GB | 90% menos |
| **Costo mensual Supabase** | $25/mes | $10/mes | 60% menos |

---

**Documento creado:** 22 de Noviembre 2025
**Próxima revisión:** Después de implementación
