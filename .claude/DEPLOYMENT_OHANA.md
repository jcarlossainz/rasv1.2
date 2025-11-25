# 🚀 Deployment de ohana.mx

**Fecha:** 25 de Noviembre 2025
**Objetivo:** Desplegar el sistema RAS en producción con el dominio ohana.mx
**Estado:** 🟡 En progreso

---

## 🎯 Objetivo

Configurar y desplegar el sistema de administración de propiedades (actualmente RAS v1.2) en el dominio **ohana.mx** para que sea accesible públicamente.

### Contexto
- **Dominio comprado:** ohana.mx (GoDaddy)
- **Estado actual:** Sistema funcionando solo en localhost
- **Destino:** Producción en Vercel con dominio personalizado
- **Transición futura:** RAS → Ohana (rebranding)

---

## 📋 Plan de Deployment

### ✅ Fase 1: Preparación (COMPLETADO)
- [x] Crear cuenta en Vercel
- [x] Conectar repositorio GitHub (jcarlossainz/rasv1.2)
- [x] Revisar configuración del proyecto

### 🟡 Fase 2: Configuración de Variables de Entorno (EN CURSO)

**Variables requeridas para producción:**

```bash
# Supabase (Backend)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Google Vision AI
NEXT_PUBLIC_GOOGLE_VISION_API_KEY=tu-google-vision-key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu-google-maps-key
```

**Dónde obtener estas variables:**
- **Supabase:** Dashboard → Project Settings → API
- **Google Vision:** Google Cloud Console → APIs & Services → Credentials
- **Google Maps:** Google Cloud Console → APIs & Services → Credentials

**Dónde configurarlas:**
- Vercel Dashboard → Project → Settings → Environment Variables
- Agregar para: Production, Preview, Development

### ⏳ Fase 3: Primer Deploy (PENDIENTE)
- [ ] Ejecutar deploy desde branch principal
- [ ] Verificar que el build sea exitoso
- [ ] Probar URL temporal de Vercel (*.vercel.app)
- [ ] Verificar conexión con Supabase

### ⏳ Fase 4: Configuración de Dominio (PENDIENTE)

**En Vercel:**
1. Settings → Domains → Add Domain
2. Agregar: `ohana.mx`
3. Agregar: `www.ohana.mx`
4. Obtener configuración DNS

**En GoDaddy:**
1. DNS → Manage Zones → ohana.mx
2. Agregar registros que proporcione Vercel:
   - A record: @ → IP de Vercel
   - CNAME: www → cname.vercel-dns.com

### ⏳ Fase 5: Actualizar Supabase (PENDIENTE)

**En Supabase Dashboard:**
1. Authentication → URL Configuration
2. Site URL: `https://ohana.mx`
3. Redirect URLs: `https://ohana.mx/**`
4. Guardar cambios

### ⏳ Fase 6: Verificación Final (PENDIENTE)
- [ ] DNS propagado (24-48h)
- [ ] SSL activo (automático en Vercel)
- [ ] Login funcionando
- [ ] Subida de imágenes funcionando
- [ ] Sincronización de calendarios funcionando
- [ ] Google Vision funcionando
- [ ] Google Maps funcionando

---

## 🔧 Stack Tecnológico

### Frontend/Hosting
- **Vercel** - Hosting y deployment
- **Next.js 14** - Framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Backend/Database
- **Supabase** - PostgreSQL + Auth + Storage
- **Row Level Security** - Seguridad a nivel base de datos

### APIs Externas
- **Google Vision AI** - Análisis de imágenes
- **Google Maps API** - Geocoding y mapas
- **node-ical** - Sincronización calendarios OTA

---

## 💰 Costos Estimados

### Desarrollo
- **Valor de mercado del sistema:** ~$35,000-40,000 USD
- **Costos de desarrollo actual:** Ya invertidos

### Operación Mensual
```
Dominio (ohana.mx):             $1.25/mes ($15/año)
Supabase (Plan Pro):           $25/mes (recomendado para producción)
Vercel (Plan Hobby):           $0/mes (suficiente para empezar)
Google Vision API:             $2-5/mes (según uso)
Google Maps API:               $10-30/mes (según tráfico)
────────────────────────────────────────────────────
TOTAL MENSUAL:                 ~$40-65/mes
```

### Escalado Futuro
- **Vercel Pro:** $20/mes (cuando se necesite más bandwidth)
- **Supabase Pro:** $25/mes → Incluye:
  - 8GB base de datos
  - 100GB bandwidth
  - 100GB storage
  - Daily backups

---

## 📊 Features Implementadas

### Core Features
- ✅ Autenticación multi-usuario
- ✅ Gestión de propiedades (CRUD completo)
- ✅ Sistema de tickets/mantenimiento
- ✅ Upload y gestión de imágenes
- ✅ Dashboard con métricas
- ✅ Sistema de colaboradores
- ✅ Multi-tenancy

### Features Premium
- ✅ **Sincronización OTA** (Airbnb, Booking, Expedia)
- ✅ **Google Vision AI** (análisis automático de imágenes)
- ✅ **Google Maps** (geocoding automático)
- ✅ Calendario integrado
- ✅ Wizard de onboarding
- ✅ Optimizaciones de performance

---

## 🔐 Seguridad

### Implementado
- ✅ Row Level Security (RLS) en Supabase
- ✅ Variables de entorno separadas por ambiente
- ✅ Headers de seguridad (ver next.config.mjs)
- ✅ SSL automático (Vercel)

### Políticas de Seguridad
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 🎯 Próximos Pasos Después del Deploy

### Corto Plazo (1-2 semanas)
1. Probar todas las funcionalidades en producción
2. Monitorear errores en Vercel
3. Optimizar imágenes si es necesario
4. Configurar backups automáticos

### Mediano Plazo (1-3 meses)
1. Agregar PWA (Progressive Web App) para móviles
2. Implementar analytics (PostHog, Plausible, etc.)
3. Configurar monitoreo de uptime
4. Optimizar SEO

### Largo Plazo (6+ meses)
1. Evaluar migración a app móvil nativa (Capacitor)
2. Agregar más integraciones OTA
3. Sistema de reportes avanzados
4. API pública para integraciones

---

## 📱 Roadmap Móvil

### Fase 1: PWA (2-3 días)
- Agregar manifest.json
- Service worker para offline
- Instalable desde navegador

### Fase 2: Capacitor (2-3 semanas)
- Wrapper nativo para App Store / Play Store
- Notificaciones push
- Acceso a features nativas

### Fase 3: React Native (3-6 meses)
- Solo si se justifica por tracción
- Performance nativa completa

---

## 🐛 Troubleshooting Común

### Build falla en Vercel
1. Verificar que todas las variables de entorno estén configuradas
2. Revisar logs de build en Vercel Dashboard
3. Verificar que dependencias en package.json sean correctas

### Error de autenticación
1. Verificar que Site URL en Supabase coincida con dominio
2. Revisar Redirect URLs en Supabase
3. Limpiar cookies del navegador

### Imágenes no cargan
1. Verificar políticas de CORS en Supabase Storage
2. Verificar que dominio esté en next.config.mjs → images.domains
3. Revisar políticas RLS de storage

### Sincronización de calendarios falla
1. Verificar que las URLs iCal sean accesibles públicamente
2. Revisar logs en Vercel
3. Verificar que SUPABASE_SERVICE_ROLE_KEY esté configurada

---

## 📞 Recursos de Ayuda

### Documentación
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)

### Soporte
- Vercel: support@vercel.com
- Supabase: Dashboard → Support
- GoDaddy: Soporte 24/7

---

## 📝 Notas Importantes

1. **Backups:** Supabase hace backups automáticos diarios en plan Pro
2. **Monitoreo:** Vercel proporciona analytics básicos gratis
3. **Límites:** Plan hobby de Vercel tiene límite de 100GB bandwidth/mes
4. **SSL:** Certificados SSL son automáticos y se renuevan automáticamente
5. **DNS:** Cambios de DNS pueden tardar 24-48h en propagarse globalmente

---

**Última actualización:** 25 Nov 2025
**Responsable:** Sistema de deployment automático
**Próxima revisión:** Post-deployment inicial
