# 📅 PLAN DE INTEGRACIÓN DE CALENDARIOS - RAS V1.2

## Estrategia: Opción C - Híbrido

Sistema que importa calendarios de plataformas (Booking, Airbnb, Expedia) y utiliza Google Vacation Rentals como plataforma directa de bookings.

---

## 🎯 ETAPAS DEL PROYECTO

### **ETAPA 1: Importar información de plataformas**
**Duración estimada:** 2-3 semanas
**Objetivo:** Sistema que lee calendarios de Booking, Airbnb, Expedia mediante iCal

### **ETAPA 2: Conectar con Google Vacation Rentals**
**Duración estimada:** 4-6 semanas
**Objetivo:** Listar propiedades en Google y recibir bookings directos

### **ETAPA 3: Pruebas con propiedades piloto**
**Duración estimada:** 2-3 semanas
**Objetivo:** Validar funcionamiento end-to-end con 2-3 propiedades reales

### **ETAPA 4: Solicitar partnerships oficiales**
**Duración estimada:** 3-6 meses (tiempo de aprobación)
**Objetivo:** Obtener acceso a APIs oficiales para bloqueos bidireccionales

---

## 📊 CRONOGRAMA VISUAL

```
Mes 1-2:  Etapa 1 - Importar iCal ████████░░░░
Mes 2-4:  Etapa 2 - Google VR    ░░████████░░
Mes 4-5:  Etapa 3 - Pruebas      ░░░░░░████░░
Mes 5-8:  Etapa 4 - Partnerships ░░░░░░░░████

Total: ~8 meses para sistema completo
```

---

## 🔨 ETAPA 1: IMPORTAR INFORMACIÓN DE PLATAFORMAS

### 1.1 Modificaciones a Base de Datos

#### Agregar campos de iCal a tabla propiedades
```sql
ALTER TABLE propiedades ADD COLUMN ical_airbnb_url TEXT;
ALTER TABLE propiedades ADD COLUMN ical_booking_url TEXT;
ALTER TABLE propiedades ADD COLUMN ical_expedia_url TEXT;
ALTER TABLE propiedades ADD COLUMN ultimo_sync_ical TIMESTAMPTZ;
```

#### Crear tabla para eventos de calendario consolidado
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  origen TEXT NOT NULL, -- 'airbnb', 'booking', 'expedia', 'manual', 'google_vr'
  reserva_id TEXT, -- ID de la reserva en la plataforma
  estado TEXT NOT NULL, -- 'bloqueado', 'reservado', 'disponible'
  titulo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_origen CHECK (origen IN ('airbnb', 'booking', 'expedia', 'manual', 'google_vr')),
  CONSTRAINT check_estado CHECK (estado IN ('bloqueado', 'reservado', 'disponible'))
);

CREATE INDEX idx_calendar_events_propiedad ON calendar_events(propiedad_id);
CREATE INDEX idx_calendar_events_fechas ON calendar_events(fecha_inicio, fecha_fin);
CREATE INDEX idx_calendar_events_origen ON calendar_events(origen);
```

### 1.2 Implementación Backend

#### Archivo: `/lib/calendar/ical-sync.ts`
**Descripción:** Servicio para fetch y parseo de feeds iCal

**Funciones principales:**
- `fetchICalFeed(url: string)` - Descarga y parsea un feed iCal
- `syncPropertyCalendar(propiedadId, urls)` - Sincroniza todos los calendarios de una propiedad
- `detectConflicts(events)` - Detecta overlapping entre reservas
- `mergeDuplicates(events)` - Elimina eventos duplicados

**Dependencias:**
```bash
npm install node-ical
```

#### Archivo: `/app/api/calendar/sync/route.ts`
**Descripción:** Endpoint para sincronización manual

**Métodos:**
- `POST /api/calendar/sync` - Sincroniza una propiedad específica
  - Body: `{ propiedadId: string }`
  - Response: `{ success: boolean, events: Event[], conflicts: Conflict[] }`

#### Archivo: `/app/api/cron/sync-calendars/route.ts`
**Descripción:** Endpoint para sincronización automática (cron job)

**Configuración:**
- Frecuencia: Cada 4 horas
- Autenticación: Bearer token via `CRON_SECRET`
- Vercel Cron: `0 */4 * * *`

**Variables de entorno necesarias:**
```env
CRON_SECRET=your-secret-token-here
```

### 1.3 Implementación Frontend

#### Archivo: `/app/dashboard/catalogo/propiedad/[id]/calendario/settings/page.tsx`
**Descripción:** Página de configuración de URLs iCal

**Funcionalidades:**
- Formulario para ingresar URLs de Airbnb, Booking, Expedia
- Botón "Sincronizar ahora" para sync manual
- Mostrar última fecha de sincronización
- Validación de URLs
- Instrucciones de dónde encontrar URLs en cada plataforma

#### Archivo: `/app/dashboard/catalogo/propiedad/[id]/calendario/page.tsx`
**Descripción:** Vista consolidada del calendario

**Funcionalidades:**
- Calendario visual (React Big Calendar o similar)
- Eventos coloreados por origen:
  - 🔴 Airbnb (rojo)
  - 🔵 Booking (azul)
  - 🟡 Expedia (amarillo)
  - 🟢 Google VR (verde)
  - ⚫ Manual (gris)
- Tooltip con detalles al hover
- Detectar y mostrar conflictos visualmente
- Filtros por origen
- Exportar calendario consolidado

### 1.4 Lógica de Sincronización

**Flujo de sincronización:**

1. Fetch feeds iCal de todas las URLs configuradas
2. Parsear eventos (VEVENT)
3. Normalizar datos:
   - Fecha inicio/fin
   - Título de reserva
   - ID único (UID del iCal)
4. Detectar duplicados (mismo período en múltiples plataformas)
5. Guardar en `calendar_events`
6. Detectar conflictos (overlapping)
7. Actualizar timestamp de última sync

**Manejo de duplicados:**
```typescript
// Si el mismo período aparece en 2+ plataformas
// mantener solo 1 registro con notas sobre duplicación
```

**Detección de conflictos:**
```typescript
// Verificar si hay overlapping entre fechas
// Ejemplo: Reserva A (01-05) vs Reserva B (03-07) = CONFLICTO
```

### 1.5 Testing y Validación

**Casos de prueba:**
- ✅ Importar calendario de Airbnb
- ✅ Importar calendario de Booking
- ✅ Importar calendario de Expedia
- ✅ Detectar evento duplicado en 2 plataformas
- ✅ Detectar conflicto de fechas
- ✅ Sincronización automática cada 4 horas
- ✅ Manejo de URLs inválidas
- ✅ Manejo de feeds vacíos

---

## 🌐 ETAPA 2: CONECTAR CON GOOGLE VACATION RENTALS

### 2.1 Registro y Configuración

#### Pasos administrativos:
1. Crear cuenta en Google Hotel Center
   - URL: https://www.google.com/travel/hotels/propertyowners/
2. Verificar identidad del negocio
3. Verificar propiedad del dominio
4. Configurar información fiscal
5. Aceptar términos de servicio

### 2.2 Implementación XML Feed

#### Archivo: `/app/api/google-vr/feed/route.ts`
**Descripción:** Genera XML feed con listado de propiedades

**Especificación:** Google Vacation Rentals Property Feed v2.0

**Estructura XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<listings xmlns="http://www.google.com/schemas/sitemap/0.9">
  <listing>
    <id>UUID</id>
    <name>Nombre de la propiedad</name>
    <address>
      <component name="addr1">Calle</component>
      <component name="city">Ciudad</component>
      <component name="postal_code">CP</component>
      <component name="country">MX</component>
    </address>
    <latitude>19.4326</latitude>
    <longitude>-99.1332</longitude>
    <phone country="52">5555555555</phone>
    <category>vacation_rental</category>
    <content>
      <text type="description">Descripción detallada...</text>
      <review type="editorial">
        <author>Propietario</author>
        <rating>5.0</rating>
      </review>
    </content>
    <image type="photo">
      <url>https://...</url>
      <caption>Living room</caption>
    </image>
    <attributes>
      <website>https://tu-dominio.com/anuncio/UUID</website>
      <bedrooms>3</bedrooms>
      <bathrooms>2</bathrooms>
      <max_guests>6</max_guests>
    </attributes>
    <price>
      <baserate currency="MXN">1500.00</baserate>
    </price>
  </listing>
</listings>
```

**Actualización:** Regenerar XML cada 24 horas o cuando hay cambios

#### Archivo: `/app/api/google-vr/availability/route.ts`
**Descripción:** API de disponibilidad en tiempo real

**Endpoint:** `GET /api/google-vr/availability`

**Query params:**
- `property_id` - UUID de la propiedad
- `start_date` - Fecha inicio (YYYY-MM-DD)
- `end_date` - Fecha fin (YYYY-MM-DD)
- `num_adults` - Número de adultos
- `num_children` - Número de niños

**Response XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<availability>
  <property id="UUID">
    <available>true</available>
    <price currency="MXN">1500.00</price>
    <tax currency="MXN">240.00</tax>
    <total currency="MXN">1740.00</total>
    <check_in>2024-01-01</check_in>
    <check_out>2024-01-05</check_out>
    <nights>4</nights>
  </property>
</availability>
```

### 2.3 Sistema de Bookings

#### Archivo: `/app/api/google-vr/booking/route.ts`
**Descripción:** Webhook para recibir reservas de Google

**Endpoint:** `POST /api/google-vr/booking`

**Flujo:**
1. Google envía solicitud de booking
2. Validar firma digital de Google
3. Verificar disponibilidad en tiempo real
4. Crear registro en `calendar_events`
5. Procesar pago (Stripe/PayPal)
6. Enviar confirmación a Google
7. Enviar emails de confirmación
8. Bloquear fechas en calendario local

**Request body (ejemplo):**
```json
{
  "booking_id": "google-12345",
  "property_id": "uuid-propiedad",
  "guest": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+525555555555"
  },
  "check_in": "2024-01-01",
  "check_out": "2024-01-05",
  "num_adults": 2,
  "num_children": 1,
  "total_price": 7500.00,
  "currency": "MXN"
}
```

**Response:**
```json
{
  "status": "confirmed",
  "confirmation_code": "RAS-12345",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Archivo: `/app/api/google-vr/booking/cancel/route.ts`
**Descripción:** Manejo de cancelaciones

### 2.4 Página de Landing para Bookings Directos

#### Archivo: `/app/anuncio/[id]/page.tsx`
**Mejoras necesarias:**

1. **Calendario interactivo de disponibilidad**
   - Mostrar fechas bloqueadas
   - Selección de fechas de entrada/salida
   - Cálculo automático de precio

2. **Formulario de booking**
   - Datos del huésped
   - Número de personas
   - Peticiones especiales
   - Validación en tiempo real

3. **Integración de pago**
   - Stripe Checkout
   - PayPal
   - Opción de pago en propiedad (para casos específicos)

4. **Confirmación y comunicación**
   - Email de confirmación automático
   - WhatsApp notification (opcional)
   - PDF con detalles de la reserva

### 2.5 Pasarela de Pago

**Proveedor recomendado:** Stripe

**Instalación:**
```bash
npm install @stripe/stripe-js stripe
```

**Variables de entorno:**
```env
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Flujo de pago:**
1. Usuario completa datos de booking
2. Crear Checkout Session en Stripe
3. Redirigir a Stripe Checkout
4. Stripe procesa pago
5. Webhook confirma pago exitoso
6. Crear booking confirmado
7. Enviar confirmaciones

---

## 🧪 ETAPA 3: PRUEBAS CON PROPIEDADES PILOTO

### 3.1 Selección de Propiedades

**Criterios:**
- Mínimo 1 listing activo en Airbnb o Booking
- Propietario dispuesto a colaborar
- Diferentes tipos de propiedad (casa, depto, etc.)
- Diferentes ubicaciones

**Número:** 2-3 propiedades

### 3.2 Plan de Pruebas

#### Semana 1-2: Sincronización de calendarios
- [ ] Configurar URLs iCal en todas las propiedades piloto
- [ ] Ejecutar sincronización inicial
- [ ] Verificar que eventos se importan correctamente
- [ ] Probar sincronización automática
- [ ] Documentar errores encontrados

#### Semana 2-3: Google Vacation Rentals
- [ ] Generar XML feed con propiedades piloto
- [ ] Enviar feed a Google Hotel Center
- [ ] Esperar aprobación de Google
- [ ] Verificar que aparecen en Google Travel
- [ ] Probar API de disponibilidad

#### Semana 3-4: Bookings end-to-end
- [ ] Realizar booking de prueba desde Google
- [ ] Verificar que se bloquea en calendario local
- [ ] Verificar que se bloquea en Airbnb (vía iCal export)
- [ ] Verificar que se bloquea en Booking (vía iCal export)
- [ ] Probar flujo de pago completo
- [ ] Probar emails de confirmación

### 3.3 Dashboard de Monitoreo

#### Archivo: `/app/dashboard/admin/calendar-sync/page.tsx`
**Funcionalidades:**

**Tabla de propiedades:**
- Nombre de propiedad
- Última sincronización
- Status (✅ OK, ⚠️ Warning, ❌ Error)
- Número de eventos importados
- Número de conflictos detectados
- Botón "Forzar sync"

**Estadísticas globales:**
- Total de propiedades con iCal configurado
- Total de eventos importados (últimas 24h)
- Conflictos detectados
- Bookings desde Google VR

**Log de errores:**
- Timestamp
- Propiedad afectada
- Tipo de error
- Mensaje detallado

### 3.4 Métricas de Éxito

**KPIs a medir:**
- ✅ Tasa de sincronización exitosa (>95%)
- ✅ Tiempo de respuesta de APIs (<2s)
- ✅ Conflictos de doble booking (0)
- ✅ Uptime del sistema (>99%)
- ✅ Conversión de bookings desde Google (>1%)

### 3.5 Documentación de Bugs

**Template para reportar bugs:**
```markdown
## Bug #001
**Fecha:** 2024-XX-XX
**Propiedad:** Nombre
**Plataforma:** Airbnb/Booking/Expedia/Google
**Severidad:** Critical/High/Medium/Low

**Descripción:**
[Descripción detallada del bug]

**Pasos para reproducir:**
1. ...
2. ...

**Comportamiento esperado:**
[Qué debería pasar]

**Comportamiento actual:**
[Qué está pasando]

**Solución propuesta:**
[Cómo arreglarlo]

**Status:** Open/In Progress/Resolved
```

---

## 🤝 ETAPA 4: SOLICITAR PARTNERSHIPS OFICIALES

### 4.1 Booking.com Connectivity API

#### Requisitos previos:
- ✅ Sistema funcionando con iCal mínimo 3 meses
- ✅ Mínimo 5-10 propiedades activas
- ✅ Track record de bookings exitosos
- ✅ Sistema de pagos implementado
- ✅ Soporte técnico disponible 24/7

#### Proceso de aplicación:
1. Registrarse en https://join.booking.com/
2. Completar formulario de aplicación
3. Enviar documentación requerida:
   - RFC o documento de incorporación
   - Identificación oficial
   - Comprobante de domicilio
   - Screenshots del sistema
4. Demostración en vivo del sistema
5. Revisión técnica por equipo de Booking
6. Firma de contrato
7. Recibir credenciales API
8. Integración y pruebas
9. Go live

**Tiempo estimado:** 2-4 meses

**Costo:** Comisión del 3-5% por booking

#### Documentación API:
https://developers.booking.com/

### 4.2 Airbnb API Access

#### Requisitos previos:
- ✅ Empresa legalmente establecida
- ✅ Volumen mínimo de propiedades (10+)
- ✅ Track record con iCal de 6+ meses
- ✅ Sistema PMS completo funcional
- ✅ Referencias de clientes

#### Proceso de aplicación:
1. Contactar Airbnb Partner team
2. Completar cuestionario de elegibilidad
3. Presentación de negocio
4. Demo del sistema
5. Revisión de compliance
6. Firma de NDA
7. Acceso a sandbox API
8. Certificación técnica
9. Acceso a producción

**Tiempo estimado:** 4-6 meses

**Costo:** A través del sistema de comisiones de Airbnb

**Contacto:** https://www.airbnb.com/help/article/218

### 4.3 Expedia Partner Solutions

#### Requisitos previos:
Similares a Booking.com

#### Proceso de aplicación:
1. Aplicar en https://www.expediagroup.com/
2. Evaluación de elegibilidad
3. Due diligence
4. Contrato de partnership
5. Onboarding técnico
6. Integración API
7. Certificación
8. Go live

**Tiempo estimado:** 2-3 meses

**Costo:** Comisión del 3-5% por booking

### 4.4 Plan B: Channel Manager

**Si no se aprueban los partnerships**, considerar integrar con un Channel Manager establecido:

#### Opciones recomendadas:

**1. Guesty**
- Pro: Más completo, mejor soporte
- Con: Más caro ($25-50/unidad/mes)
- API: Sí, muy completa
- URL: https://www.guesty.com/

**2. Hostfully**
- Pro: Más económico ($5-15/unidad/mes)
- Con: Menos features
- API: Sí, básica
- URL: https://www.hostfully.com/

**3. Lodgify**
- Pro: Balance precio/features
- Con: Soporte limitado
- API: Sí, intermedia
- URL: https://www.lodgify.com/

**Integración con Channel Manager:**
- Usar su API para sincronización bidireccional
- Ellos manejan la conexión con Airbnb/Booking/Expedia
- Tu sistema se conecta solo con el Channel Manager
- Más rápido y confiable que partnerships directos

---

## 💰 PRESUPUESTO ESTIMADO

### Costos de Desarrollo
- **Etapa 1:** Incluido (desarrollo interno)
- **Etapa 2:** Incluido (desarrollo interno)
- **Etapa 3:** Incluido (desarrollo interno)
- **Etapa 4:** $0 USD (tiempo de espera)

### Costos de Operación

#### Infraestructura
- **Hosting:** $0 USD (Vercel free tier hasta cierto tráfico)
- **Base de datos:** Incluido en Supabase
- **Cron jobs:** Incluido en Vercel

#### APIs y Servicios
- **Google VR:** 15% comisión por booking
- **Booking.com API:** 3-5% comisión adicional (si aprueban)
- **Airbnb API:** A través de su sistema de comisiones (si aprueban)
- **Expedia API:** 3-5% comisión adicional (si aprueban)
- **Stripe:** 3.6% + $3 MXN por transacción
- **Channel Manager (Plan B):** $5-50 USD/unidad/mes

#### Costos totales estimados (mensuales)
- **Escenario mínimo (solo Google VR):** $0 USD fijos + comisiones por booking
- **Escenario con Channel Manager:** $100-500 USD/mes (20 propiedades)
- **Escenario con APIs directas:** $0 USD fijos + comisiones por booking

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Etapa 1: Importar iCal
- [ ] Crear migración de BD (campos iCal)
- [ ] Crear tabla calendar_events
- [ ] Implementar servicio ical-sync.ts
- [ ] Crear API endpoint /api/calendar/sync
- [ ] Crear API endpoint /api/cron/sync-calendars
- [ ] Configurar Vercel Cron
- [ ] Crear página de settings de URLs
- [ ] Crear vista de calendario consolidado
- [ ] Implementar detección de conflictos
- [ ] Testing completo
- [ ] Documentación de usuario

### Etapa 2: Google VR
- [ ] Registrarse en Google Hotel Center
- [ ] Verificar dominio y negocio
- [ ] Implementar XML feed endpoint
- [ ] Implementar API de disponibilidad
- [ ] Implementar webhook de bookings
- [ ] Integrar Stripe
- [ ] Mejorar página de anuncio público
- [ ] Implementar calendario de disponibilidad
- [ ] Implementar formulario de booking
- [ ] Testing de pago end-to-end
- [ ] Enviar feed a Google
- [ ] Esperar aprobación
- [ ] Testing en producción

### Etapa 3: Pruebas
- [ ] Seleccionar 2-3 propiedades piloto
- [ ] Configurar URLs iCal
- [ ] Sincronizar calendarios
- [ ] Listar en Google VR
- [ ] Ejecutar plan de pruebas
- [ ] Documentar bugs
- [ ] Crear dashboard de monitoreo
- [ ] Recolectar feedback de usuarios
- [ ] Ajustes y optimizaciones
- [ ] Aprobar para rollout completo

### Etapa 4: Partnerships
- [ ] Preparar documentación de aplicación
- [ ] Aplicar a Booking.com
- [ ] Aplicar a Airbnb
- [ ] Aplicar a Expedia
- [ ] Seguimiento de aplicaciones
- [ ] Demos y presentaciones
- [ ] Integraciones API (si aprueban)
- [ ] Certificaciones técnicas
- [ ] Go live con APIs oficiales
- [ ] Evaluar Plan B (Channel Manager) si es necesario

---

## 🚨 RIESGOS Y MITIGACIONES

### Riesgo 1: Delays en sincronización iCal
**Impacto:** Alto
**Probabilidad:** Media
**Mitigación:**
- Sincronizar cada 2-4 horas
- Notificaciones de conflictos en tiempo real
- Proceso manual de verificación antes de confirmar bookings

### Riesgo 2: Rechazo de partnerships oficiales
**Impacto:** Medio
**Probabilidad:** Alta
**Mitigación:**
- Plan B: Integrar con Channel Manager establecido
- Continuar con iCal mientras tanto
- Construir track record antes de re-aplicar

### Riesgo 3: Double bookings
**Impacto:** Crítico
**Probabilidad:** Baja
**Mitigación:**
- Sistema de detección de conflictos robusto
- Buffer de 1-2 horas antes de confirmar bookings
- Proceso de verificación manual para casos dudosos
- Seguro o fondo de emergencia para compensaciones

### Riesgo 4: Problemas con Google VR
**Impacto:** Alto
**Probabilidad:** Baja
**Mitigación:**
- Documentación completa antes de aplicar
- Testing exhaustivo en sandbox
- Soporte técnico disponible 24/7
- Proceso de rollback rápido

### Riesgo 5: Costos de operación elevados
**Impacto:** Medio
**Probabilidad:** Media
**Mitigación:**
- Empezar con propiedades piloto
- Calcular ROI antes de escalar
- Optimizar comisiones con volumen
- Negociar mejores tarifas con Channel Managers

---

## 📚 RECURSOS Y DOCUMENTACIÓN

### APIs y Servicios
- [Google Vacation Rentals Documentation](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental)
- [Booking.com Connectivity API](https://developers.booking.com/)
- [iCalendar (RFC 5545)](https://icalendar.org/RFC-Specifications/iCalendar-RFC-5545/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [node-ical Library](https://www.npmjs.com/package/node-ical)

### Guías de Usuario (a crear)
- Cómo configurar URLs de iCal
- Cómo encontrar URLs en Airbnb
- Cómo encontrar URLs en Booking
- Cómo encontrar URLs en Expedia
- Cómo resolver conflictos de calendario
- Cómo administrar bookings directos

### Videos Tutorial (a crear)
- Configuración inicial de calendarios
- Primera sincronización
- Manejo de bookings desde Google
- Dashboard de monitoreo

---

## 📞 CONTACTOS IMPORTANTES

### Soporte Técnico
- **Google Hotel Center:** https://support.google.com/hotelcenter
- **Booking.com Partner Hub:** https://partner.booking.com/
- **Airbnb Partner Support:** https://www.airbnb.com/help
- **Stripe Support:** https://support.stripe.com/

### Comunidades
- **Vacation Rental Forum:** https://www.vacationrentalforum.com/
- **Google Hotel Ads Community:** https://support.google.com/hotelcenter/community
- **Short Term Rental Reddit:** https://www.reddit.com/r/shortterm rentals/

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

1. ✅ Crear este archivo de plan (COMPLETADO)
2. ⏳ Crear migración SQL para campos iCal
3. ⏳ Crear tabla calendar_events
4. ⏳ Implementar servicio ical-sync.ts
5. ⏳ Instalar dependencia node-ical
6. ⏳ Crear API endpoint de sincronización

**Comenzar con:** Etapa 1, Paso 1.1 - Modificaciones a Base de Datos

---

## 📝 NOTAS FINALES

Este es un proyecto ambicioso que transformará el sistema RAS en una plataforma de gestión de alquileres vacacionales completa. El enfoque de 4 etapas permite validar la viabilidad del negocio antes de comprometer recursos significativos.

**Filosofía:** Construir → Probar → Validar → Escalar

La Etapa 1 puede comenzar de inmediato. Las siguientes etapas dependen del éxito de las anteriores.

**Última actualización:** 2024-11-24
**Versión:** 1.0
**Autor:** Claude + Carlos
