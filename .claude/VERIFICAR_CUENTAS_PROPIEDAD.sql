-- ============================================================================
-- VERIFICAR CUENTAS Y SU ASOCIACIÓN A PROPIEDADES
-- ============================================================================

-- 1. Ver todas las cuentas bancarias con su balance
SELECT
  id,
  nombre,
  propiedad_id,
  propietario_id,
  tipo_cuenta,
  tipo_moneda,
  balance_inicial,
  balance_actual,
  activo,
  created_at
FROM cuentas_bancarias
ORDER BY created_at DESC;

-- 2. Ver cuentas con el nombre de la propiedad asociada
SELECT
  c.id,
  c.nombre AS cuenta_nombre,
  c.tipo_cuenta,
  c.tipo_moneda,
  c.balance_inicial,
  c.balance_actual,
  c.activo,
  p.nombre_propiedad,
  p.id AS propiedad_id
FROM cuentas_bancarias c
LEFT JOIN propiedades p ON c.propiedad_id = p.id
WHERE c.activo = true
ORDER BY c.created_at DESC;

-- 3. Ver propiedades y cuántas cuentas tienen
SELECT
  p.id,
  p.nombre_propiedad,
  COUNT(c.id) AS num_cuentas
FROM propiedades p
LEFT JOIN cuentas_bancarias c ON p.id = c.propiedad_id AND c.activo = true
GROUP BY p.id, p.nombre_propiedad
ORDER BY p.nombre_propiedad;

-- 4. Verificar si hay cuentas sin propiedad_id pero con propietario_id
SELECT
  id,
  nombre,
  'Sin propiedad, solo propietario' AS tipo,
  propietario_id,
  balance_inicial,
  balance_actual
FROM cuentas_bancarias
WHERE propiedad_id IS NULL AND propietario_id IS NOT NULL;
