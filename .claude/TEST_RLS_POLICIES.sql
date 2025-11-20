-- ================================================================
-- TEST SUITE PARA RLS POLICIES - RAS v1.2
-- ================================================================
-- Sistema: Realty Administration System
-- Versión: 1.0.0
-- Fecha: 20 de Noviembre 2025
--
-- INSTRUCCIONES:
-- 1. Tener 2 usuarios de prueba creados en Supabase Auth
-- 2. Ejecutar cada test manualmente (remplazar user IDs)
-- 3. Verificar los resultados esperados
-- 4. Los tests usan comentarios /* */ para documentar esperado
-- ================================================================

-- ================================================================
-- TEST SETUP - CREAR USUARIOS DE PRUEBA
-- ================================================================

/*
EN SUPABASE DASHBOARD:
1. Ve a Authentication > Users
2. Crea Usuario A: test-user-a@test.com
3. Crea Usuario B: test-user-b@test.com
4. Apunta sus UUIDs (reemplazar en tests abajo)

Ejemplo UUIDs (reemplazar con los reales):
- USER_A_ID: 550e8400-e29b-41d4-a716-446655440001
- USER_B_ID: 550e8400-e29b-41d4-a716-446655440002
*/

-- ================================================================
-- TEST SUITE 1: PROPIEDADES - ACCESO BÁSICO
-- ================================================================

-- TEST 1.1: Usuario A no ve propiedades de Usuario B
/*
INSTRUCCIÓN:
1. Logearse como USER_A
2. Ejecutar: SELECT COUNT(*) FROM propiedades;
3. Esperado: Solo sus propiedades (ej: 5)
4. Sin RLS: 150 propiedades (todas)
*/

SELECT 'TEST 1.1: Usuario A propiedades propias' AS test_name;
SELECT COUNT(*) as propiedades_visibles FROM propiedades;
-- ✅ Esperado: N (sus propiedades solamente)
-- ❌ Sin RLS: Total de propiedades en BD

---

-- TEST 1.2: Usuario B no puede ver propiedad específica de Usuario A
/*
INSTRUCCIÓN:
1. Logearse como USER_B
2. Ejecutar el SELECT abajo (remplazar prop_id con propiedad de USER_A)
3. Esperado: 0 filas
4. Sin RLS: 1 fila (acceso no autorizado)
*/

SELECT 'TEST 1.2: Usuario B no accede a propiedad de A' AS test_name;
SELECT COUNT(*) as unauthorized_access 
FROM propiedades 
WHERE id = 'prop-uuid-de-usuario-a';
-- ✅ Esperado: 0 filas (RLS bloquea)
-- ❌ Sin RLS: 1 fila

---

-- TEST 1.3: Usuario A no puede UPDATE propiedad de Usuario B
/*
INSTRUCCIÓN:
1. Logearse como USER_A
2. Ejecutar UPDATE abajo
3. Esperado: 0 rows updated
4. Sin RLS: 1 row updated (security breach!)
*/

UPDATE propiedades 
SET nombre_propiedad = 'HACKED_BY_USER_A' 
WHERE owner_id = 'user-b-uuid' AND id = 'prop-b-uuid'
RETURNING id;
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: 1 row (propiedad ajena modificada!)

---

-- TEST 1.4: Usuario A no puede DELETE propiedad de Usuario B
/*
INSTRUCCIÓN:
1. Logearse como USER_A
2. Ejecutar DELETE abajo
3. Esperado: 0 rows deleted
4. Sin RLS: 1 row deleted (sabotaje total!)
*/

DELETE FROM propiedades 
WHERE owner_id = 'user-b-uuid' AND id = 'prop-b-uuid'
RETURNING id;
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: 1 row (propiedad destruida!)

---

-- ================================================================
-- TEST SUITE 2: PROPERTY IMAGES - ROBO DE FOTOS
-- ================================================================

-- TEST 2.1: Usuario B no ve imágenes de propiedades de Usuario A
/*
INSTRUCCIÓN:
1. Logearse como USER_B
2. Ejecutar SELECT abajo (remplazar prop_id)
3. Esperado: 0 filas (no ve fotos)
4. Sin RLS: 45 filas (todas las fotos expuestas)
*/

SELECT 'TEST 2.1: Usuario B no ve fotos de propiedad A' AS test_name;
SELECT COUNT(*) as fotos_unauthorized 
FROM property_images 
WHERE property_id IN (
  SELECT id FROM propiedades WHERE owner_id = 'user-a-uuid'
);
-- ✅ Esperado: 0 filas (RLS bloquea)
-- ❌ Sin RLS: 45+ filas (información sensible expuesta)

---

-- TEST 2.2: Usuario A no puede subir fotos a propiedad de Usuario B
/*
INSTRUCCIÓN:
1. Logearse como USER_A
2. Ejecutar INSERT abajo
3. Esperado: ERROR - violates RLS policy
4. Sin RLS: 1 row inserted (foto ajena añadida!)
*/

INSERT INTO property_images (id, property_id, url, url_thumbnail)
VALUES 
  ('img-attack-123', 'prop-b-uuid', 'http://malicious.com/image.jpg', 'http://malicious.com/thumb.jpg')
RETURNING id;
-- ✅ Esperado: ERROR (RLS bloquea)
-- ❌ Sin RLS: SUCCESS (inserción maliciosa)

---

-- ================================================================
-- TEST SUITE 3: DATOS FINANCIEROS - FRAUDE
-- ================================================================

-- TEST 3.1: Usuario B no ve fechas de pago de propiedades de A
/*
INSTRUCCIÓN:
1. Logearse como USER_B
2. Ejecutar SELECT abajo
3. Esperado: 0 filas
4. Sin RLS: 150+ filas (todos los pagos expuestos)
*/

SELECT 'TEST 3.1: Usuario B no ve pagos de propiedad A' AS test_name;
SELECT COUNT(*) as pagos_unauthorized
FROM fechas_pago_servicios 
WHERE propiedad_id IN (
  SELECT id FROM propiedades WHERE owner_id = 'user-a-uuid'
);
-- ✅ Esperado: 0 filas (RLS bloquea)
-- ❌ Sin RLS: 150+ filas (datos financieros expuestos)

---

-- TEST 3.2: Usuario A no puede manipular montos de Usuario B
/*
INSTRUCCIÓN:
1. Logearse como USER_A
2. Ejecutar UPDATE abajo (cambiar monto a 0.01)
3. Esperado: 0 rows updated (manipulación prevenida)
4. Sin RLS: 1 row updated (fraude exitoso)
*/

UPDATE fechas_pago_servicios 
SET monto_estimado = 0.01 
WHERE propiedad_id IN (
  SELECT id FROM propiedades WHERE owner_id = 'user-b-uuid'
)
RETURNING id;
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: Múltiples rows (fraude financiero!)

---

-- ================================================================
-- TEST SUITE 4: ESCALADA DE PRIVILEGIOS
-- ================================================================

-- TEST 4.1: Usuario B no puede convertirse en admin
/*
INSTRUCCIÓN:
1. Logearse como USER_B (es colaborador 'viewer')
2. Ejecutar UPDATE abajo (intenta cambiar su rol a admin)
3. Esperado: 0 rows updated (escalada prevenida)
4. Sin RLS: 1 row updated (escalada exitosa!)
*/

UPDATE propiedades_colaboradores 
SET rol = 'admin' 
WHERE propiedad_id IN (
  SELECT id FROM propiedades WHERE owner_id = 'user-a-uuid'
) AND user_id = 'user-b-uuid'
RETURNING id;
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: 1 row (privilegios escalados!)

---

-- TEST 4.2: Usuario B no puede agregar colaboradores a propiedad ajena
/*
INSTRUCCIÓN:
1. Logearse como USER_B
2. Ejecutar INSERT abajo
3. Esperado: ERROR - violates RLS policy
4. Sin RLS: SUCCESS (permiso escalado ilegalmente)
*/

INSERT INTO propiedades_colaboradores (propiedad_id, user_id, rol)
VALUES ('prop-a-uuid', 'attacker-uuid', 'admin')
RETURNING id;
-- ✅ Esperado: ERROR (RLS bloquea)
-- ❌ Sin RLS: SUCCESS (escalada de privilegios!)

---

-- ================================================================
-- TEST SUITE 5: ROBO DE CONTACTOS
-- ================================================================

-- TEST 5.1: Usuario B no ve contactos de Usuario A
/*
INSTRUCCIÓN:
1. Logearse como USER_B
2. Ejecutar SELECT abajo
3. Esperado: 0 filas
4. Sin RLS: 200+ filas (base de contactos robada)
*/

SELECT 'TEST 5.1: Usuario B no ve contactos de A' AS test_name;
SELECT COUNT(*) as contactos_unauthorized
FROM contactos 
WHERE user_id = 'user-a-uuid';
-- ✅ Esperado: 0 filas (RLS bloquea)
-- ❌ Sin RLS: 200+ filas (DB contactos expuesta)

---

-- TEST 5.2: Usuario B no puede eliminar contactos de Usuario A
/*
INSTRUCCIÓN:
1. Logearse como USER_B
2. Ejecutar DELETE abajo
3. Esperado: 0 rows deleted
4. Sin RLS: Múltiples rows (sabotaje de BD)
*/

DELETE FROM contactos 
WHERE user_id = 'user-a-uuid'
RETURNING id;
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: Múltiples rows (destrucción de datos!)

---

-- ================================================================
-- TEST SUITE 6: COLABORADORES
-- ================================================================

-- TEST 6.1: Colaborador puede ver propiedad
/*
INSTRUCCIÓN:
1. USER_B es colaborador de prop-a-uuid (con rol 'viewer')
2. Logearse como USER_B
3. Ejecutar SELECT abajo
4. Esperado: 1 fila (ve su propiedad compartida)
5. Sin RLS: Ve también propiedades que NO están compartidas
*/

SELECT 'TEST 6.1: Colaborador ve propiedad compartida' AS test_name;
SELECT COUNT(*) as colaborador_access
FROM propiedades 
WHERE id = 'prop-a-uuid';
-- ✅ Esperado: 1 fila (acceso legítimo)

---

-- TEST 6.2: Colaborador NO puede editar propiedad
/*
INSTRUCCIÓN:
1. USER_B es colaborador 'viewer' (no editor)
2. Logearse como USER_B
3. Ejecutar UPDATE abajo
4. Esperado: 0 rows updated (no tiene permisos)
5. Sin RLS: 1 row (acceso no autorizado)
*/

UPDATE propiedades 
SET nombre_propiedad = 'EDITED_BY_COLLABORATOR' 
WHERE id = 'prop-a-uuid' AND owner_id = 'user-a-uuid'
RETURNING id;
-- ✅ Esperado: 0 rows (RLS bloquea)
-- ❌ Sin RLS: 1 row (colaborador editing propiedad ajena!)

---

-- ================================================================
-- RESUMEN DE TESTS
-- ================================================================

/*
✅ RESULTADOS ESPERADOS CON RLS:
- TEST 1.1: COUNT = N (sus propiedades solamente)
- TEST 1.2: COUNT = 0 (no ve propiedad ajena)
- TEST 1.3: 0 rows updated (no puede editar ajena)
- TEST 1.4: 0 rows deleted (no puede eliminar ajena)
- TEST 2.1: COUNT = 0 (no ve fotos ajenas)
- TEST 2.2: ERROR (no puede subir a propiedad ajena)
- TEST 3.1: COUNT = 0 (no ve pagos ajenos)
- TEST 3.2: 0 rows updated (no puede manipular pagos)
- TEST 4.1: 0 rows updated (no puede escalarse a admin)
- TEST 4.2: ERROR (no puede agregar colaboradores)
- TEST 5.1: COUNT = 0 (no ve contactos ajenos)
- TEST 5.2: 0 rows deleted (no puede eliminar contactos)
- TEST 6.1: COUNT = 1 (ve su colaboración)
- TEST 6.2: 0 rows updated (colaborador no puede editar)

❌ RESULTADOS SIN RLS (CRÍTICO):
- Todos los tests retornarían SUCCESS
- Acceso no autorizado a todos los datos
- Posibilidad de robo, fraude y sabotaje total
*/

-- ================================================================
-- FIN DEL TEST SUITE
-- ================================================================

