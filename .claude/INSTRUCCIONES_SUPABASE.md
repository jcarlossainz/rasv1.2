# 🏢 RAS - Instrucciones para Configurar Supabase desde Cero

**Fecha:** 18 de Noviembre 2025
**Versión:** 1.0.0

---

## 📋 RESUMEN

Esta guía te ayudará a configurar completamente Supabase para el proyecto RAS, borrando todo lo existente y creando la estructura correcta desde cero.

---

## ⚠️ ADVERTENCIA IMPORTANTE

**ESTE PROCESO BORRARÁ TODOS LOS DATOS EXISTENTES EN TU PROYECTO DE SUPABASE.**

Si tienes datos importantes:
1. Haz un backup antes de continuar
2. Exporta los datos desde el panel de Supabase
3. Guarda las credenciales importantes

---

## 🚀 PASO 1: PREPARACIÓN

### 1.1 Acceder a Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto RAS (o crea uno nuevo)
4. Anota los siguientes datos:
   - **Project URL:** `https://[tu-proyecto].supabase.co`
   - **Anon Key:** (desde Settings > API)
   - **Service Role Key:** (desde Settings > API - ¡guárdala en lugar seguro!)

### 1.2 Verificar Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aquí
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aquí
```

---

## 🗄️ PASO 2: EJECUTAR SCRIPT DE BASE DE DATOS

### Opción A: Desde el Panel de Supabase (RECOMENDADO)

1. En tu proyecto de Supabase, ve a **SQL Editor** (icono de código en la barra lateral)
2. Haz clic en **"+ New query"**
3. Abre el archivo `.claude/SETUP_SUPABASE.sql` de este repositorio
4. **Copia TODO el contenido** del archivo
5. **Pega** el contenido en el editor SQL de Supabase
6. Revisa que el script se copió correctamente
7. Haz clic en **"RUN"** (botón verde en la esquina inferior derecha)
8. Espera a que se ejecute (puede tomar 10-30 segundos)
9. Verifica que aparezca "Success. No rows returned" o un mensaje similar

### Opción B: Usando la CLI de Supabase

Si tienes instalada la CLI de Supabase:

```bash
# Desde la raíz del proyecto
supabase db reset
supabase db push .claude/SETUP_SUPABASE.sql
```

---

## ✅ PASO 3: VERIFICAR LA BASE DE DATOS

### 3.1 Verificar Tablas Creadas

1. Ve a **Table Editor** en el panel de Supabase
2. Deberías ver las siguientes 9 tablas:
   - ✅ `profiles`
   - ✅ `propiedades`
   - ✅ `property_images`
   - ✅ `servicios_inmueble`
   - ✅ `fechas_pago_servicios`
   - ✅ `tickets`
   - ✅ `propiedades_colaboradores`
   - ✅ `contactos`
   - ✅ `documentos`

### 3.2 Verificar Vista Creada

1. Ve a **SQL Editor**
2. Ejecuta: `SELECT * FROM v_proximos_pagos LIMIT 10;`
3. Debería ejecutarse sin errores (aunque no devuelva filas aún)

### 3.3 Verificar Índices

1. Ve a **SQL Editor**
2. Ejecuta:
```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```
3. Deberías ver múltiples índices para cada tabla

---

## 📦 PASO 4: CONFIGURAR STORAGE

### 4.1 Crear Buckets Manualmente

1. Ve a **Storage** en el panel de Supabase
2. Haz clic en **"Create a new bucket"**

#### Bucket 1: property-images

- **Name:** `property-images`
- **Public:** ✅ Activado
- **File size limit:** `10485760` (10 MB)
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`
- Haz clic en **"Create bucket"**

#### Bucket 2: property-documents

- **Name:** `property-documents`
- **Public:** ❌ Desactivado
- **File size limit:** `20971520` (20 MB)
- **Allowed MIME types:** `application/pdf, image/jpeg, image/png`
- Haz clic en **"Create bucket"**

#### Bucket 3: user-avatars

- **Name:** `user-avatars`
- **Public:** ✅ Activado
- **File size limit:** `2097152` (2 MB)
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`
- Haz clic en **"Create bucket"**

### 4.2 Configurar Políticas de Storage (OPCIONAL para desarrollo)

Para desarrollo, puedes dejar las políticas deshabilitadas.
Para producción, consulta el archivo `.claude/SETUP_STORAGE.sql` para ver las políticas recomendadas.

---

## 🔒 PASO 5: CONFIGURAR AUTENTICACIÓN

### 5.1 Habilitar Proveedores de Autenticación

1. Ve a **Authentication > Providers** en Supabase
2. Habilita los proveedores que necesites:
   - **Email:** ✅ Activado (recomendado)
   - **Google:** ⚪ Opcional
   - **GitHub:** ⚪ Opcional

### 5.2 Configurar Email Templates (Opcional)

1. Ve a **Authentication > Email Templates**
2. Personaliza las plantillas de:
   - Confirmación de email
   - Recuperación de contraseña
   - Invitación

### 5.3 Configurar URL de Redirección

1. Ve a **Authentication > URL Configuration**
2. Agrega las siguientes URLs:
   - `http://localhost:3000/**` (para desarrollo)
   - `https://tu-dominio.com/**` (para producción)

---

## 🧪 PASO 6: PROBAR LA CONFIGURACIÓN

### 6.1 Crear un Usuario de Prueba

1. Ve a **Authentication > Users**
2. Haz clic en **"Add user"**
3. Crea un usuario con:
   - Email: `prueba@ras.com`
   - Password: `Prueba123!`
   - Email confirmation: ✅ Auto Confirm User

### 6.2 Verificar Perfil Creado Automáticamente

1. Ve a **Table Editor > profiles**
2. Deberías ver un registro con:
   - `id`: (mismo UUID del usuario)
   - `email`: `prueba@ras.com`
   - `created_at`: (fecha actual)

Esto confirma que el trigger `on_auth_user_created` está funcionando.

### 6.3 Probar desde la Aplicación

1. Inicia tu aplicación Next.js:
```bash
npm run dev
```

2. Ve a `http://localhost:3000`
3. Intenta hacer login con: `prueba@ras.com` / `Prueba123!`
4. Si todo está bien, deberías poder acceder al dashboard

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "relation does not exist"

**Causa:** Las tablas no se crearon correctamente
**Solución:**
1. Ve a SQL Editor
2. Ejecuta: `DROP SCHEMA public CASCADE;`
3. Ejecuta: `CREATE SCHEMA public;`
4. Vuelve a ejecutar `SETUP_SUPABASE.sql`

### Error: "permission denied for schema public"

**Causa:** Permisos incorrectos
**Solución:**
1. Verifica que estás usando el proyecto correcto
2. Verifica que tu usuario tiene permisos de administrador
3. Intenta ejecutar: `GRANT ALL ON SCHEMA public TO postgres, anon, authenticated;`

### Error: "bucket already exists"

**Causa:** Los buckets ya fueron creados previamente
**Solución:**
1. No es un error crítico, puedes ignorarlo
2. O borra los buckets existentes desde Storage y vuelve a crearlos

### Las imágenes no se cargan

**Causa:** Buckets no públicos o URLs incorrectas
**Solución:**
1. Ve a Storage > property-images
2. Haz clic en los 3 puntos > Bucket settings
3. Activa "Public bucket"
4. Verifica que la URL en tu código sea correcta

### No puedo hacer login

**Causa:** Email confirmation requerida
**Solución:**
1. Ve a Authentication > Users
2. Encuentra el usuario
3. Click en 3 puntos > Confirm email

---

## 📊 VERIFICACIÓN FINAL

Ejecuta esta query para verificar que todo está correcto:

```sql
-- Verificar estructura completa
SELECT
  'Tablas' as tipo,
  COUNT(*) as cantidad
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT
  'Vistas' as tipo,
  COUNT(*) as cantidad
FROM information_schema.views
WHERE table_schema = 'public'

UNION ALL

SELECT
  'Índices' as tipo,
  COUNT(*) as cantidad
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT
  'Buckets' as tipo,
  COUNT(*) as cantidad
FROM storage.buckets;
```

**Resultado esperado:**
- Tablas: 9
- Vistas: 1
- Índices: 30+
- Buckets: 3

---

## 🎯 PRÓXIMOS PASOS

Una vez completada la configuración:

1. ✅ Crear propiedades de prueba desde el wizard
2. ✅ Subir fotos a las propiedades
3. ✅ Probar el inventario con IA
4. ✅ Crear tickets y servicios
5. ✅ Verificar que todo funciona correctamente

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisa los logs en **Logs** del panel de Supabase
2. Consulta la documentación oficial: [https://supabase.com/docs](https://supabase.com/docs)
3. Verifica el archivo `DATABASE_SCHEMA.md` para más detalles técnicos

---

## 📚 ARCHIVOS RELACIONADOS

- `.claude/SETUP_SUPABASE.sql` - Script principal de base de datos
- `.claude/SETUP_STORAGE.sql` - Configuración de Storage
- `.claude/DATABASE_SCHEMA.md` - Documentación completa del schema
- `.claude/PROJECT_PLAN.md` - Plan maestro del proyecto

---

**¡Listo! Tu base de datos de Supabase está configurada y lista para usar. 🎉**
