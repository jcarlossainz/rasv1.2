-- ============================================================================
-- 🔄 MIGRACIÓN: Servicios de JSONB[] a Tabla Normalizada (CORREGIDO)
-- ============================================================================
-- Descripción: Migra servicios desde propiedades.servicios (JSONB[])
--              a la tabla servicios_inmueble
-- ============================================================================

-- Insertar servicios desde el array JSONB de propiedades
INSERT INTO servicios_inmueble (
  id,
  propiedad_id,
  tipo_servicio,
  nombre,
  numero_contrato,
  proveedor,
  responsable,
  monto,
  es_fijo,
  frecuencia_valor,
  frecuencia_unidad,
  ultima_fecha_pago,
  activo,
  created_at
)
SELECT
  -- Generar UUID único para cada servicio
  uuid_generate_v4(),

  -- ID de la propiedad
  p.id as propiedad_id,

  -- Tipo de servicio (del JSONB)
  servicio->>'type' as tipo_servicio,

  -- Nombre del servicio
  servicio->>'name' as nombre,

  -- Número de contrato/cuenta
  servicio->>'accountNumber' as numero_contrato,

  -- Proveedor
  servicio->>'provider' as proveedor,

  -- Responsable (null por ahora, se puede agregar después)
  NULL as responsable,

  -- Monto (convertir a numeric)
  CAST(servicio->>'cost' AS NUMERIC(10,2)) as monto,

  -- Es fijo (basado en montoTipo)
  CASE
    WHEN servicio->>'montoTipo' = 'fijo' THEN true
    WHEN servicio->>'montoTipo' = 'variable' THEN false
    ELSE true
  END as es_fijo,

  -- Frecuencia valor (cantidad)
  COALESCE(CAST(servicio->>'frecuenciaCantidad' AS INTEGER), 1) as frecuencia_valor,

  -- Frecuencia unidad (mapear de singular a plural)
  CASE
    WHEN servicio->>'frecuenciaUnidad' = 'dia' THEN 'dias'
    WHEN servicio->>'frecuenciaUnidad' = 'mes' THEN 'meses'
    WHEN servicio->>'frecuenciaUnidad' = 'año' THEN 'anos'
    -- Fallback basado en paymentFrequency si no existe frecuenciaUnidad
    WHEN servicio->>'paymentFrequency' = 'mensual' THEN 'meses'
    WHEN servicio->>'paymentFrequency' = 'bimestral' THEN 'meses'
    WHEN servicio->>'paymentFrequency' = 'trimestral' THEN 'meses'
    WHEN servicio->>'paymentFrequency' = 'semestral' THEN 'meses'
    WHEN servicio->>'paymentFrequency' = 'anual' THEN 'anos'
    ELSE 'meses'
  END as frecuencia_unidad,

  -- Última fecha de pago (convertir a DATE)
  CASE
    WHEN servicio->>'lastPaymentDate' IS NOT NULL
      AND servicio->>'lastPaymentDate' != ''
    THEN CAST(servicio->>'lastPaymentDate' AS DATE)
    ELSE NULL
  END as ultima_fecha_pago,

  -- Activo
  true as activo,

  -- Fecha de creación
  p.created_at

FROM propiedades p,
     unnest(p.servicios) as servicio  -- CORREGIDO: unnest para JSONB[]
WHERE p.servicios IS NOT NULL
  AND array_length(p.servicios, 1) > 0;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver cuántos servicios se migraron
SELECT
  'Servicios migrados' as status,
  COUNT(*) as total
FROM servicios_inmueble;

-- Ver servicios por propiedad
SELECT
  p.nombre_propiedad,
  COUNT(s.id) as cantidad_servicios,
  array_length(p.servicios, 1) as servicios_en_jsonb
FROM propiedades p
LEFT JOIN servicios_inmueble s ON s.propiedad_id = p.id
WHERE p.servicios IS NOT NULL
GROUP BY p.id, p.nombre_propiedad, p.servicios
ORDER BY cantidad_servicios DESC;

-- Ver detalle de servicios migrados
SELECT
  p.nombre_propiedad,
  s.tipo_servicio,
  s.nombre,
  s.monto,
  s.es_fijo,
  s.frecuencia_valor,
  s.frecuencia_unidad,
  s.ultima_fecha_pago
FROM servicios_inmueble s
JOIN propiedades p ON s.propiedad_id = p.id
ORDER BY p.nombre_propiedad, s.tipo_servicio, s.nombre;

-- Ver ejemplo de estructura JSONB original vs migrada
SELECT
  p.nombre_propiedad,
  jsonb_array_length(to_jsonb(p.servicios)) as servicios_originales,
  COUNT(s.id) as servicios_migrados,
  CASE
    WHEN jsonb_array_length(to_jsonb(p.servicios)) = COUNT(s.id) THEN '✅ Coincide'
    ELSE '⚠️ No coincide'
  END as validacion
FROM propiedades p
LEFT JOIN servicios_inmueble s ON s.propiedad_id = p.id
WHERE p.servicios IS NOT NULL
GROUP BY p.id, p.nombre_propiedad, p.servicios
ORDER BY p.nombre_propiedad;
