# 🗄️ DATABASE SCHEMA - RAS v1.2

**Sistema:** RAS - Realty Administration System
**Base de Datos:** Supabase (PostgreSQL)
**Versión del Schema:** 1.2.0
**Fecha:** 21 de Noviembre 2025
**Estado:** Actualizado con Sistema de Cuentas e Ingresos

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Diagrama de Relaciones](#diagrama-de-relaciones)
3. [Tablas Principales](#tablas-principales)
   - [propiedades](#tabla-propiedades)
   - [profiles](#tabla-profiles)
   - [property_images](#tabla-property_images)
   - [servicios_inmueble](#tabla-servicios_inmueble)
   - [fechas_pago_servicios](#tabla-fechas_pago_servicios)
   - [tickets](#tabla-tickets)
   - [propiedades_colaboradores](#tabla-propiedades_colaboradores)
   - [contactos](#tabla-contactos)
   - [documentos](#tabla-documentos)
4. [Tablas Pendientes de Crear](#tablas-pendientes)
5. [Vistas](#vistas)
6. [Contratos de Datos (TypeScript)](#contratos-typescript)
7. [Flujo de Datos](#flujo-de-datos)
8. [Row Level Security (RLS)](#row-level-security)
9. [Índices y Optimizaciones](#indices)
10. [Notas Técnicas](#notas-tecnicas)

---

## 📊 RESUMEN EJECUTIVO

### Tablas Existentes

| Tabla | Estado | Propósito | RLS |
|-------|--------|-----------|-----|
| `propiedades` | ✅ Activa | Tabla principal de inmuebles | ⚠️ Desactivado |
| `profiles` | ✅ Activa | Perfiles de usuarios | ⚠️ Desactivado |
| `property_images` | ✅ Activa | Galería de fotos de propiedades | ⚠️ Desactivado |
| `servicios_inmueble` | ✅ Activa | Servicios de inmuebles | ⚠️ Desactivado |
| `fechas_pago_servicios` | ✅ Activa | Calendario de pagos de servicios | ⚠️ Desactivado |
| `tickets` | ✅ Activa | Tareas y tickets pendientes | ⚠️ Desactivado |
| `propiedades_colaboradores` | ✅ Activa | Colaboradores por propiedad | ⚠️ Desactivado |
| `contactos` | ✅ Activa | Directorio de contactos | ⚠️ Desactivado |
| `documentos` | ✅ Activa | Documentos adjuntos | ⚠️ Desactivado |
| `cuentas_bancarias` | ✅ Activa | **NUEVO** - Cuentas bancarias (MXN/USD) | ⚠️ Desactivado |
| `ingresos` | ✅ Activa | **NUEVO** - Registro de ingresos (rentas, ventas) | ⚠️ Desactivado |

### Tablas Pendientes de Crear

| Tabla | Prioridad | Fase | Propósito |
|-------|-----------|------|-----------|
| `eventos_calendario` | Alta | 4.2 | Eventos y fechas importantes |
| `inventarios` | Alta | 4.4 | Inventario de objetos con IA |
| `transacciones` | Alta | 4.7 | Ingresos y egresos |
| `anuncios_publicos` | Media | 4.6 | Anuncios publicados |
| `configuracion_widgets` | Baja | 6 | Preferencias de dashboard |

### Vistas SQL

| Vista | Estado | Propósito |
|-------|--------|-----------|
| `v_proximos_pagos` | ✅ Activa | Próximos pagos de servicios |
| `v_movimientos_cuenta` | ✅ Activa | **NUEVO** - Movimientos consolidados (ingresos + egresos) |

---

## 🔗 DIAGRAMA DE RELACIONES

```
┌─────────────────┐
│    profiles     │
│  (usuarios)     │
└────────┬────────┘
         │
         │ owner_id / user_id / propietario_id
         ├──────────────────────────┬────────────────────┐
         │                          │                    │
         ▼                          ▼                    ▼
┌─────────────────┐      ┌──────────────────────┐  ┌───────────────────┐
│  propiedades    │◄─────┤ propiedades_         │  │ cuentas_          │ **NUEVO**
│  (inmuebles)    │      │ colaboradores        │  │ bancarias         │
└────────┬────────┘      └──────────────────────┘  └─────────┬─────────┘
         │                                                   │
         │ propiedad_id                                     │ cuenta_id
         ├────────────┬──────────────┬─────────────┬────────┼────────────┬──────────┐
         │            │              │             │        │            │          │
         ▼            ▼              ▼             ▼        ▼            ▼          ▼
┌──────────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐
│ property_    │ │ servicios_ │ │ tickets │ │ eventos_ │ │ inventarios│ │  ingresos   │ **NUEVO**
│ images       │ │ inmueble   │ │         │ │calendario│ │            │ │  (rentas,   │
│ (fotos)      │ │            │ │(tareas) │ │(futuro)  │ │  (futuro)  │ │  depósitos) │
└──────────────┘ └─────┬──────┘ └─────────┘ └──────────┘ └────────────┘ └─────────────┘
                       │
                       │ servicio_id
                       ▼
                ┌──────────────────┐
                │ fechas_pago_     │◄────── cuenta_id ──────┐
                │ servicios        │                        │
                │ (calendario)     │                        │
                └──────────────────┘                        │
                                                           │
                                            ┌──────────────┴────────────────┐
                                            │ v_movimientos_cuenta (vista)  │
                                            │ Ingresos + Egresos            │
                                            └───────────────────────────────┘

┌─────────────────┐      ┌──────────────────┐
│   contactos     │      │   documentos     │
│  (directorio)   │      │   (archivos)     │
└─────────────────┘      └──────────────────┘
```

**NOTA:**
- `cuentas_bancarias` se relaciona con `propiedades` O `profiles` (no ambos)
- `ingresos` se relaciona con `propiedades` Y opcionalmente con `cuentas_bancarias`
- `fechas_pago_servicios` ahora incluye `cuenta_id` para ligar pagos a cuentas
- La vista `v_movimientos_cuenta` consolida movimientos de ambas tablas

---

## 📑 TABLAS PRINCIPALES

---

### TABLA: `propiedades`

**Descripción:** Tabla principal que almacena toda la información de los inmuebles.

#### Estructura de Campos

```sql
CREATE TABLE propiedades (
  -- ===== IDENTIFICACIÓN =====
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id            UUID NULL,

  -- ===== STEP 1: DATOS GENERALES =====
  nombre_propiedad      TEXT NOT NULL,
  tipo_propiedad        TEXT,
  mobiliario            TEXT,

  dimensiones           JSONB, -- {terreno: {valor, unidad}, construccion: {valor, unidad}}

  estados               TEXT[], -- ['Renta largo plazo', 'Venta', etc.]
  propietarios_email    TEXT[],
  supervisores_email    TEXT[],

  -- ===== STEP 2: UBICACIÓN =====
  ubicacion             JSONB, -- {calle, colonia, codigo_postal, ciudad, estado, pais, google_maps_link, referencias, es_complejo, nombre_complejo, amenidades_complejo}

  -- ===== STEP 3: ESPACIOS =====
  espacios              JSONB[], -- [{id, name, type, details: {equipamiento, camas, tieneBanoPrivado}}]

  -- ===== STEP 4: CONDICIONALES (Renta Largo Plazo) =====
  precios               JSONB, -- {mensual, noche, venta}

  inquilinos_email      TEXT[],
  fecha_inicio_contrato DATE,
  duracion_contrato_valor INTEGER,
  duracion_contrato_unidad TEXT, -- 'meses' | 'años'
  frecuencia_pago       TEXT, -- 'mensual' | 'quincenal' | 'semanal'
  dia_pago              INTEGER,

  -- ❌ ELIMINADO: precio_renta_disponible - Ahora se usa precios.mensual (JSONB)
  requisitos_renta      TEXT[],
  requisitos_renta_custom TEXT[],

  amenidades_vacacional TEXT[],

  -- ===== STEP 5: SERVICIOS =====
  servicios             JSONB[], -- [{id, nombre, proveedor, costo, frecuencia}]

  -- ===== STEP 6: GALERÍA =====
  -- Las fotos están en tabla separada: property_images

  -- ===== METADATA DEL WIZARD =====
  wizard_step           INTEGER DEFAULT 1,
  wizard_completed      BOOLEAN DEFAULT FALSE,
  is_draft              BOOLEAN DEFAULT TRUE,

  -- ===== TIMESTAMPS =====
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);
```

#### Campos JSON Detallados

**1. `dimensiones` (JSONB)**
```typescript
{
  terreno: {
    valor: number,
    unidad: 'm²' | 'ft²'
  },
  construccion: {
    valor: number,
    unidad: 'm²' | 'ft²'
  }
}
```

**2. `ubicacion` (JSONB)**
```typescript
{
  calle: string,
  colonia: string,
  codigo_postal: string,
  ciudad: string,
  estado: string,
  pais: string,
  google_maps_link: string,
  referencias: string,
  es_complejo: boolean,
  nombre_complejo?: string,
  amenidades_complejo?: string[]
}
```

**3. `espacios` (JSONB[])**
```typescript
[{
  id: string,
  name: string,
  type: SpaceType,
  category?: string,
  description?: string,
  icon?: string,
  quantity?: number,
  features?: string[],
  details: {
    equipamiento: string[],
    camas?: Array<{tipo: string, id: number}>,
    tieneBanoPrivado?: boolean,
    banoPrivadoId?: string | null,
    notas?: string
  },
  created_at?: string
}]
```

**4. `precios` (JSONB)**
```typescript
{
  mensual?: number | null,
  noche?: number | null,
  venta?: number | null
}
```

**5. `servicios` (JSONB[])**
```typescript
[{
  id: string,
  nombre: string,
  proveedor?: string,
  costo?: number,
  frecuencia?: string
}]
```

#### Índices Recomendados

```sql
CREATE INDEX idx_propiedades_owner ON propiedades(owner_id);
CREATE INDEX idx_propiedades_empresa ON propiedades(empresa_id);
CREATE INDEX idx_propiedades_estados ON propiedades USING GIN(estados);
CREATE INDEX idx_propiedades_draft ON propiedades(is_draft);
CREATE INDEX idx_propiedades_ubicacion ON propiedades USING GIN(ubicacion);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `PropertyFormData`

---

### TABLA: `profiles`

**Descripción:** Perfiles extendidos de usuarios (complementa auth.users de Supabase Auth).

#### Estructura de Campos

```sql
CREATE TABLE profiles (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ===== DATOS PERSONALES =====
  nombre          TEXT,
  apellido        TEXT,
  email           TEXT,
  telefono        TEXT,
  avatar_url      TEXT,

  -- ===== ORGANIZACIÓN =====
  empresa_id      UUID NULL,
  rol             TEXT, -- 'owner' | 'admin' | 'supervisor' | 'viewer'

  -- ===== PREFERENCIAS =====
  configuracion   JSONB, -- Preferencias de usuario

  -- ===== METADATA =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Relaciones

- `id` → `auth.users(id)` (1:1)
- `profiles.id` ← `propiedades.owner_id` (1:N)
- `profiles.id` ← `propiedades_colaboradores.user_id` (1:N)

#### Contrato TypeScript

```typescript
interface Profile {
  id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  avatar_url?: string;
  empresa_id?: string | null;
  rol?: 'owner' | 'admin' | 'supervisor' | 'viewer';
  configuracion?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
```

---

### TABLA: `property_images`

**Descripción:** Galería de fotos de propiedades con compresión dual (thumbnail + display).

#### Estructura de Campos

```sql
CREATE TABLE property_images (
  -- ===== IDENTIFICACIÓN =====
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== URLs =====
  url               TEXT NOT NULL, -- URL original/display
  url_thumbnail     TEXT, -- URL thumbnail (300x300)

  -- ===== METADATA =====
  is_cover          BOOLEAN DEFAULT FALSE,
  order_index       INTEGER DEFAULT 0,
  space_type        TEXT NULL, -- 'Habitación', 'Cocina', etc.
  caption           TEXT,

  -- ===== DIMENSIONES Y TAMAÑOS =====
  file_size         JSONB, -- {thumbnail: bytes, display: bytes}
  dimensions        JSONB, -- {thumbnail: {width, height}, display: {width, height}}

  -- ===== TIMESTAMPS =====
  uploaded_at       TIMESTAMPTZ DEFAULT NOW()
);
```

#### Campos JSON

**`file_size` (JSONB)**
```typescript
{
  thumbnail: number, // bytes
  display: number    // bytes
}
```

**`dimensions` (JSONB)**
```typescript
{
  thumbnail: { width: number, height: number },
  display: { width: number, height: number }
}
```

#### Índices

```sql
CREATE INDEX idx_property_images_property ON property_images(property_id);
CREATE INDEX idx_property_images_cover ON property_images(is_cover);
CREATE INDEX idx_property_images_order ON property_images(order_index);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `PropertyImage`

---

### TABLA: `servicios_inmueble`

**Descripción:** Servicios contratados para cada inmueble (luz, agua, internet, etc.).

#### Estructura de Campos

```sql
CREATE TABLE servicios_inmueble (
  -- ===== IDENTIFICACIÓN =====
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id        UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL SERVICIO =====
  tipo_servicio       TEXT NOT NULL, -- 'Luz', 'Agua', 'Gas', 'Internet', etc.
  nombre              TEXT NOT NULL,
  numero_contrato     TEXT,
  proveedor           TEXT,
  responsable         TEXT,

  -- ===== COSTO =====
  monto               NUMERIC(10,2) NOT NULL,
  es_fijo             BOOLEAN DEFAULT TRUE, -- true: fijo, false: variable

  -- ===== FRECUENCIA DE PAGO =====
  frecuencia_valor    INTEGER NOT NULL, -- 1, 2, 3, etc.
  frecuencia_unidad   TEXT NOT NULL, -- 'dias' | 'semanas' | 'meses' | 'anos'
  ultima_fecha_pago   DATE,

  -- ===== ESTADO =====
  activo              BOOLEAN DEFAULT TRUE,

  -- ===== TIMESTAMPS =====
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_servicios_propiedad ON servicios_inmueble(propiedad_id);
CREATE INDEX idx_servicios_activo ON servicios_inmueble(activo);
CREATE INDEX idx_servicios_tipo ON servicios_inmueble(tipo_servicio);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `ServicioInmueble`

---

### TABLA: `fechas_pago_servicios`

**Descripción:** Calendario de pagos programados para servicios.

#### Estructura de Campos

```sql
CREATE TABLE fechas_pago_servicios (
  -- ===== IDENTIFICACIÓN =====
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id       UUID REFERENCES servicios_inmueble(id) ON DELETE CASCADE,
  propiedad_id      UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== FECHA Y MONTO =====
  fecha_pago        DATE NOT NULL,
  monto_estimado    NUMERIC(10,2) NOT NULL,

  -- ===== ESTADO DE PAGO =====
  pagado            BOOLEAN DEFAULT FALSE,
  fecha_pago_real   DATE,
  monto_real        NUMERIC(10,2),

  -- ===== NOTAS =====
  notas             TEXT,

  -- ===== TIMESTAMPS =====
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_fechas_pago_servicio ON fechas_pago_servicios(servicio_id);
CREATE INDEX idx_fechas_pago_propiedad ON fechas_pago_servicios(propiedad_id);
CREATE INDEX idx_fechas_pago_fecha ON fechas_pago_servicios(fecha_pago);
CREATE INDEX idx_fechas_pago_pagado ON fechas_pago_servicios(pagado);
```

#### Contrato TypeScript

Ver: `/types/property.ts` → Interface `FechaPagoServicio`

---

### TABLA: `tickets`

**Descripción:** Sistema de tareas y tickets pendientes para propiedades.

#### Estructura de Campos

```sql
CREATE TABLE tickets (
  -- ===== IDENTIFICACIÓN =====
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id        UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL TICKET =====
  titulo              TEXT NOT NULL,
  descripcion         TEXT,
  tipo                TEXT, -- 'Mantenimiento', 'Pago', 'Reparación', etc.
  prioridad           TEXT, -- 'Baja', 'Media', 'Alta', 'Urgente'

  -- ===== ASIGNACIÓN =====
  asignado_a          UUID REFERENCES profiles(id),
  creado_por          UUID REFERENCES profiles(id),

  -- ===== FECHAS =====
  fecha_programada    DATE,
  fecha_completado    DATE,

  -- ===== ESTADO =====
  estado              TEXT DEFAULT 'pendiente', -- 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
  pagado              BOOLEAN DEFAULT FALSE,

  -- ===== MONTO =====
  monto_estimado      NUMERIC(10,2),
  monto_real          NUMERIC(10,2),

  -- ===== TIMESTAMPS =====
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_tickets_propiedad ON tickets(propiedad_id);
CREATE INDEX idx_tickets_asignado ON tickets(asignado_a);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_fecha ON tickets(fecha_programada);
CREATE INDEX idx_tickets_pagado ON tickets(pagado);
```

#### Contrato TypeScript

```typescript
interface Ticket {
  id: string;
  propiedad_id: string;
  titulo: string;
  descripcion?: string;
  tipo?: string;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  asignado_a?: string;
  creado_por?: string;
  fecha_programada?: string;
  fecha_completado?: string;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
  pagado: boolean;
  monto_estimado?: number;
  monto_real?: number;
  created_at?: string;
  updated_at?: string;
}
```

---

### TABLA: `propiedades_colaboradores`

**Descripción:** Relación N:N entre propiedades y colaboradores. Soporta usuarios registrados (user_id) e invitaciones pendientes (email_invitado).

#### Estructura de Campos

```sql
CREATE TABLE propiedades_colaboradores (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_invitado  TEXT, -- Para invitar usuarios no registrados

  -- ===== PERMISOS =====
  rol             TEXT NOT NULL, -- 'supervisor' | 'propietario' | 'promotor'

  -- ===== TIMESTAMPS =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- ===== CONSTRAINTS =====
  -- user_id y email_invitado son mutuamente exclusivos
  CONSTRAINT check_user_or_email CHECK (
    (user_id IS NOT NULL AND email_invitado IS NULL) OR
    (user_id IS NULL AND email_invitado IS NOT NULL)
  )
);
```

#### Índices

```sql
CREATE INDEX idx_colaboradores_propiedad ON propiedades_colaboradores(propiedad_id);
CREATE INDEX idx_colaboradores_user ON propiedades_colaboradores(user_id);

-- Índices UNIQUE parciales para evitar duplicados
CREATE UNIQUE INDEX idx_unique_propiedad_user
ON propiedades_colaboradores (propiedad_id, user_id)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_propiedad_email
ON propiedades_colaboradores (propiedad_id, email_invitado)
WHERE email_invitado IS NOT NULL;
```

#### Roles Explicados

| Rol | Permisos | Uso |
|-----|----------|-----|
| `supervisor` | Ver y gestionar todo excepto: compartir, duplicar, editar configuración | Para administradores de la propiedad |
| `propietario` | Solo visualización. NO puede crear/editar tickets | Para dueños que solo quieren ver |
| `promotor` | Acceso únicamente a sección de Anuncios | Para agentes de ventas/rentas |

#### Contrato TypeScript

```typescript
interface PropiedadColaborador {
  id: string;
  propiedad_id: string;
  user_id?: string | null; // NULL si es invitación pendiente
  email_invitado?: string | null; // Se usa cuando user_id es NULL
  rol: 'supervisor' | 'propietario' | 'promotor';
  created_at?: string;
}

interface Colaborador {
  id: string;
  user_id: string | null;
  email: string;
  full_name?: string;
  email_invitado?: string | null;
  esPendiente?: boolean; // true si email_invitado está presente
}
```

#### Notas Importantes

- **Invitaciones pendientes:** Cuando se invita a un email no registrado, se crea un registro con `email_invitado` y `user_id = NULL`
- **Conversión automática:** Cuando el usuario se registra, se puede actualizar el registro para usar `user_id` en lugar de `email_invitado`
- **Migración:** Los roles antiguos (`admin`, `editor`, `viewer`) fueron migrados a los nuevos valores

---

### TABLA: `contactos`

**Descripción:** Directorio de contactos (inquilinos, proveedores, propietarios, etc.).

#### Estructura de Campos

```sql
CREATE TABLE contactos (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- ===== DATOS PERSONALES =====
  nombre          TEXT NOT NULL,
  apellido        TEXT,
  email           TEXT,
  telefono        TEXT,

  -- ===== TIPO =====
  tipo            TEXT, -- 'Inquilino', 'Propietario', 'Proveedor', etc.

  -- ===== EMPRESA (si aplica) =====
  empresa         TEXT,
  puesto          TEXT,

  -- ===== NOTAS =====
  notas           TEXT,

  -- ===== ESTADO =====
  activo          BOOLEAN DEFAULT TRUE,

  -- ===== TIMESTAMPS =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_contactos_user ON contactos(user_id);
CREATE INDEX idx_contactos_tipo ON contactos(tipo);
CREATE INDEX idx_contactos_activo ON contactos(activo);
```

---

### TABLA: `documentos`

**Descripción:** Almacenamiento de documentos adjuntos (tickets, pagos, contratos, etc.).

#### Estructura de Campos

```sql
CREATE TABLE documentos (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ===== RELACIONES =====
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  ticket_id       UUID REFERENCES tickets(id) ON DELETE CASCADE,
  pago_id         UUID REFERENCES fechas_pago_servicios(id) ON DELETE CASCADE,

  -- ===== DATOS DEL ARCHIVO =====
  nombre          TEXT NOT NULL,
  url             TEXT NOT NULL,
  tipo            TEXT, -- 'PDF', 'Imagen', 'Contrato', etc.
  tamano          INTEGER, -- bytes

  -- ===== METADATA =====
  descripcion     TEXT,

  -- ===== TIMESTAMPS =====
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices

```sql
CREATE INDEX idx_documentos_propiedad ON documentos(propiedad_id);
CREATE INDEX idx_documentos_ticket ON documentos(ticket_id);
CREATE INDEX idx_documentos_pago ON documentos(pago_id);
```

---

## 🔮 TABLAS PENDIENTES DE CREAR

### Fase 4.2: Calendario

#### TABLA: `eventos_calendario`

**Descripción:** Eventos y fechas importantes de propiedades.

```sql
CREATE TABLE eventos_calendario (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL EVENTO =====
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  tipo            TEXT, -- 'Contrato', 'Vencimiento', 'Inspección', 'Mantenimiento', etc.

  -- ===== FECHAS =====
  fecha_inicio    TIMESTAMPTZ NOT NULL,
  fecha_fin       TIMESTAMPTZ,
  todo_el_dia     BOOLEAN DEFAULT FALSE,

  -- ===== RECORDATORIOS =====
  recordatorio    JSONB, -- {cantidad: number, unidad: 'minutos'|'horas'|'dias'}

  -- ===== METADATA =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrato TypeScript:**

```typescript
interface EventoCalendario {
  id: string;
  propiedad_id: string;
  titulo: string;
  descripcion?: string;
  tipo?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  todo_el_dia: boolean;
  recordatorio?: {
    cantidad: number;
    unidad: 'minutos' | 'horas' | 'dias';
  };
  created_at?: string;
  updated_at?: string;
}
```

---

### Fase 4.4: Inventario

#### TABLA: `inventarios`

**Descripción:** Inventario de objetos detectados por IA en fotos.

```sql
CREATE TABLE inventarios (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== DATOS DEL OBJETO =====
  nombre          TEXT NOT NULL,
  categoria       TEXT, -- 'Mueble', 'Electrodoméstico', 'Decoración', etc.
  descripcion     TEXT,

  -- ===== UBICACIÓN =====
  espacio         TEXT, -- 'Habitación principal', 'Cocina', etc.

  -- ===== CONDICIÓN =====
  estado          TEXT, -- 'Excelente', 'Bueno', 'Regular', 'Malo'

  -- ===== VALOR =====
  valor_estimado  NUMERIC(10,2),

  -- ===== FOTO =====
  foto_url        TEXT,

  -- ===== DATOS DE IA =====
  detectado_por_ia BOOLEAN DEFAULT FALSE,
  confidence_score NUMERIC(5,2), -- 0.00 - 1.00

  -- ===== TIMESTAMPS =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrato TypeScript:**

```typescript
interface Inventario {
  id: string;
  propiedad_id: string;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  espacio?: string;
  estado?: 'Excelente' | 'Bueno' | 'Regular' | 'Malo';
  valor_estimado?: number;
  foto_url?: string;
  detectado_por_ia: boolean;
  confidence_score?: number;
  created_at?: string;
  updated_at?: string;
}
```

---

### Fase 4.7: Balance / Transacciones

#### TABLA: `transacciones`

**Descripción:** Registro de ingresos y egresos de propiedades.

```sql
CREATE TABLE transacciones (
  -- ===== IDENTIFICACIÓN =====
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- ===== TIPO DE TRANSACCIÓN =====
  tipo            TEXT NOT NULL, -- 'ingreso' | 'egreso'
  categoria       TEXT NOT NULL, -- 'Renta', 'Mantenimiento', 'Servicio', 'Reparación', etc.

  -- ===== DATOS FINANCIEROS =====
  monto           NUMERIC(10,2) NOT NULL,
  moneda          TEXT DEFAULT 'MXN',

  -- ===== DESCRIPCIÓN =====
  concepto        TEXT NOT NULL,
  descripcion     TEXT,

  -- ===== FECHA =====
  fecha           DATE NOT NULL,

  -- ===== RELACIONES =====
  servicio_id     UUID REFERENCES servicios_inmueble(id),
  ticket_id       UUID REFERENCES tickets(id),
  pago_id         UUID REFERENCES fechas_pago_servicios(id),

  -- ===== COMPROBANTE =====
  comprobante_url TEXT,

  -- ===== METADATA =====
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrato TypeScript:**

```typescript
interface Transaccion {
  id: string;
  propiedad_id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  monto: number;
  moneda: string;
  concepto: string;
  descripcion?: string;
  fecha: string;
  servicio_id?: string;
  ticket_id?: string;
  pago_id?: string;
  comprobante_url?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

## 👁️ VISTAS SQL

### Vista: `v_proximos_pagos`

**Descripción:** Vista materializada con próximos pagos de servicios.

```sql
CREATE VIEW v_proximos_pagos AS
SELECT
  fps.id,
  fps.servicio_id,
  fps.propiedad_id,
  fps.fecha_pago,
  fps.monto_estimado,
  fps.pagado,
  s.nombre AS servicio_nombre,
  s.tipo_servicio,
  s.proveedor,
  p.nombre_propiedad,
  p.owner_id,
  CASE
    WHEN fps.fecha_pago < CURRENT_DATE AND fps.pagado = FALSE THEN 'vencido'
    WHEN fps.fecha_pago = CURRENT_DATE AND fps.pagado = FALSE THEN 'hoy'
    WHEN fps.fecha_pago > CURRENT_DATE AND fps.pagado = FALSE THEN 'proximo'
    ELSE 'pagado'
  END AS estado
FROM fechas_pago_servicios fps
JOIN servicios_inmueble s ON fps.servicio_id = s.id
JOIN propiedades p ON fps.propiedad_id = p.id
WHERE fps.pagado = FALSE OR fps.fecha_pago >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fps.fecha_pago ASC;
```

---

## 📝 CONTRATOS DE DATOS (TypeScript)

### Transformaciones FormData ↔ Database

#### 1. Transformación: Form → Database

```typescript
// Ver: /app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts
function transformFormToDatabase(formData: PropertyFormData): DatabaseProperty {
  return {
    // Step 1
    nombre_propiedad: formData.nombre_propiedad,
    tipo_propiedad: formData.tipo_propiedad,
    mobiliario: formData.mobiliario,
    dimensiones: {
      terreno: {
        valor: parseFloat(formData.tamano_terreno || '0'),
        unidad: formData.tamano_terreno_unit || 'm²'
      },
      construccion: {
        valor: parseFloat(formData.tamano_construccion || '0'),
        unidad: formData.tamano_construccion_unit || 'm²'
      }
    },
    estados: formData.estados,
    propietarios_email: formData.propietarios_email,
    supervisores_email: formData.supervisores_email,

    // Step 2
    ubicacion: formData.ubicacion,

    // Step 3
    espacios: formData.espacios,

    // Step 4
    precios: formData.precios,
    inquilinos_email: formData.inquilinos_email,
    fecha_inicio_contrato: formData.fecha_inicio_contrato,
    duracion_contrato_valor: parseInt(formData.duracion_contrato_valor),
    duracion_contrato_unidad: formData.duracion_contrato_unidad,
    frecuencia_pago: formData.frecuencia_pago,
    dia_pago: parseInt(formData.dia_pago),
    precio_renta_disponible: parseFloat(formData.precio_renta_disponible),
    requisitos_renta: formData.requisitos_renta,
    requisitos_renta_custom: formData.requisitos_renta_custom,
    amenidades_vacacional: formData.amenidades_vacacional,

    // Step 5
    servicios: formData.servicios,

    // Metadata
    wizard_step: formData.wizard_step,
    wizard_completed: formData.wizard_completed,
    is_draft: formData.is_draft,
    updated_at: new Date().toISOString()
  };
}
```

#### 2. Transformación: Database → Form

```typescript
// Ver: /app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts
function transformDatabaseToForm(dbData: DatabaseProperty): PropertyFormData {
  return {
    // Step 1
    nombre_propiedad: dbData.nombre_propiedad || '',
    tipo_propiedad: dbData.tipo_propiedad || 'Departamento',
    mobiliario: dbData.mobiliario || 'Amueblada',
    tamano_terreno: dbData.dimensiones?.terreno?.valor?.toString() || '',
    tamano_terreno_unit: dbData.dimensiones?.terreno?.unidad || 'm²',
    tamano_construccion: dbData.dimensiones?.construccion?.valor?.toString() || '',
    tamano_construccion_unit: dbData.dimensiones?.construccion?.unidad || 'm²',
    estados: dbData.estados || [],
    propietarios_email: dbData.propietarios_email || [],
    supervisores_email: dbData.supervisores_email || [],

    // Step 2
    ubicacion: dbData.ubicacion || INITIAL_UBICACION,

    // Step 3
    espacios: dbData.espacios || [],

    // Step 4
    precios: dbData.precios || { mensual: null, noche: null, venta: null },
    inquilinos_email: dbData.inquilinos_email || [],
    fecha_inicio_contrato: dbData.fecha_inicio_contrato || '',
    duracion_contrato_valor: dbData.duracion_contrato_valor?.toString() || '',
    duracion_contrato_unidad: dbData.duracion_contrato_unidad || 'meses',
    frecuencia_pago: dbData.frecuencia_pago || 'mensual',
    dia_pago: dbData.dia_pago?.toString() || '',
    precio_renta_disponible: dbData.precio_renta_disponible?.toString() || '',
    requisitos_renta: dbData.requisitos_renta || [],
    requisitos_renta_custom: dbData.requisitos_renta_custom || [],
    amenidades_vacacional: dbData.amenidades_vacacional || [],

    // Step 5
    servicios: dbData.servicios || [],

    // Step 6
    fotos: [], // Las fotos vienen de property_images

    // Metadata
    wizard_step: dbData.wizard_step || 1,
    wizard_completed: dbData.wizard_completed || false,
    is_draft: dbData.is_draft !== false,
    created_at: dbData.created_at,
    updated_at: dbData.updated_at,
    published_at: dbData.published_at
  };
}
```

---

## 🔄 FLUJO DE DATOS

### 1. Wizard de Nueva Propiedad → Supabase

```
┌──────────────────────┐
│ WizardContainer.tsx  │
│ (Form State)         │
└──────────┬───────────┘
           │
           │ formData (PropertyFormData)
           ▼
┌──────────────────────┐
│ usePropertyDatabase  │
│ .saveProperty()      │
└──────────┬───────────┘
           │
           │ transformFormToDatabase()
           ▼
┌──────────────────────┐
│ Supabase Client      │
│ .from('propiedades') │
│ .insert() / .update()│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ PostgreSQL Database  │
│ propiedades table    │
└──────────────────────┘
```

### 2. Supabase → Catálogo de Propiedades

```
┌──────────────────────┐
│ PostgreSQL Database  │
│ propiedades table    │
└──────────┬───────────┘
           │
           │ SELECT * FROM propiedades
           ▼
┌──────────────────────┐
│ Supabase Client      │
│ .from('propiedades') │
│ .select()            │
└──────────┬───────────┘
           │
           │ raw database data
           ▼
┌──────────────────────┐
│ transformDatabaseTo  │
│ Form() (si necesario)│
└──────────┬───────────┘
           │
           │ PropertyFormData
           ▼
┌──────────────────────┐
│ catalogo/page.tsx    │
│ (Lista de propiedades)│
└──────────────────────┘
```

### 3. Dashboard Consolidado

```
┌────────────────┐
│ Dashboard      │
│ page.tsx       │
└───────┬────────┘
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌───────────────┐           ┌──────────────────┐
│ propiedades   │           │ fechas_pago_     │
│ (COUNT, SUM)  │           │ servicios        │
└───────────────┘           │ (próximos pagos) │
        │                   └──────────────────┘
        │                              │
        ▼                              ▼
┌───────────────────────────────────────────┐
│ Widgets consolidados:                     │
│ - Resumen de propiedades                  │
│ - Calendario de eventos                   │
│ - Tickets pendientes                      │
│ - Balance financiero                      │
└───────────────────────────────────────────┘
```

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Estado Actual

⚠️ **IMPORTANTE:** RLS está actualmente **DESACTIVADO** en todas las tablas para facilitar el desarrollo.

**ESTO DEBE SER CORREGIDO ANTES DE PRODUCCIÓN (Fase 7).**

### Políticas Recomendadas

#### 1. Tabla `propiedades`

```sql
-- Habilitar RLS
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Política: Usuario ve sus propiedades
CREATE POLICY "usuarios_ven_sus_propiedades"
ON propiedades FOR SELECT
USING (
  auth.uid() = owner_id
  OR
  id IN (
    SELECT propiedad_id
    FROM propiedades_colaboradores
    WHERE user_id = auth.uid()
  )
);

-- Política: Usuario inserta sus propiedades
CREATE POLICY "usuarios_insertan_sus_propiedades"
ON propiedades FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Política: Usuario actualiza sus propiedades
CREATE POLICY "usuarios_actualizan_sus_propiedades"
ON propiedades FOR UPDATE
USING (auth.uid() = owner_id);

-- Política: Usuario elimina sus propiedades
CREATE POLICY "usuarios_eliminan_sus_propiedades"
ON propiedades FOR DELETE
USING (auth.uid() = owner_id);
```

#### 2. Tabla `property_images`

```sql
-- Habilitar RLS
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Política: Usuario ve fotos de sus propiedades
CREATE POLICY "usuarios_ven_fotos_de_sus_propiedades"
ON property_images FOR SELECT
USING (
  property_id IN (
    SELECT id FROM propiedades
    WHERE owner_id = auth.uid()
    OR id IN (
      SELECT propiedad_id
      FROM propiedades_colaboradores
      WHERE user_id = auth.uid()
    )
  )
);

-- Política: Usuario gestiona fotos de sus propiedades
CREATE POLICY "usuarios_gestionan_fotos_de_sus_propiedades"
ON property_images FOR ALL
USING (
  property_id IN (
    SELECT id FROM propiedades
    WHERE owner_id = auth.uid()
  )
);
```

#### 3. Otras Tablas

Aplicar políticas similares a:
- `servicios_inmueble`
- `fechas_pago_servicios`
- `tickets`
- `propiedades_colaboradores`
- `documentos`

---

## 🚀 ÍNDICES Y OPTIMIZACIONES

### Índices Existentes

Ver secciones de cada tabla arriba.

### Índices Recomendados para Optimización

```sql
-- Búsquedas por ubicación
CREATE INDEX idx_propiedades_ubicacion_ciudad
ON propiedades((ubicacion->>'ciudad'));

CREATE INDEX idx_propiedades_ubicacion_estado
ON propiedades((ubicacion->>'estado'));

-- Búsquedas por tipo
CREATE INDEX idx_propiedades_tipo
ON propiedades(tipo_propiedad);

-- Ordenamiento por fecha
CREATE INDEX idx_propiedades_created
ON propiedades(created_at DESC);

-- Filtros de precio (JSONB)
CREATE INDEX idx_propiedades_precio_mensual
ON propiedades(((precios->>'mensual')::numeric));

CREATE INDEX idx_propiedades_precio_venta
ON propiedades(((precios->>'venta')::numeric));

-- Full-text search (futuro)
CREATE INDEX idx_propiedades_nombre_fts
ON propiedades USING gin(to_tsvector('spanish', nombre_propiedad));
```

---

---

## 💰 TABLA: `cuentas_bancarias`

**Propósito:** Gestión de cuentas bancarias asociadas a propiedades o propietarios

### Estructura

```sql
CREATE TABLE cuentas_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  propietario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo_moneda TEXT NOT NULL CHECK (tipo_moneda IN ('MXN', 'USD')),
  tipo_cuenta TEXT NOT NULL CHECK (tipo_cuenta IN ('Banco', 'Tarjeta', 'Efectivo')),
  banco TEXT,
  numero_cuenta TEXT,
  balance_inicial NUMERIC(12,2) DEFAULT 0,
  balance_actual NUMERIC(12,2) DEFAULT 0,
  descripcion TEXT,
  color TEXT DEFAULT '#3B82F6',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT cuenta_owner_check CHECK (
    (propiedad_id IS NOT NULL AND propietario_id IS NULL) OR
    (propiedad_id IS NULL AND propietario_id IS NOT NULL)
  )
);
```

### Campos

| Campo | Tipo | Descripción | Requerido | Default |
|-------|------|-------------|-----------|---------|
| `id` | UUID | Identificador único | Sí | auto |
| `propiedad_id` | UUID | FK a propiedades (cuenta de propiedad) | Condicional | null |
| `propietario_id` | UUID | FK a profiles (cuenta personal) | Condicional | null |
| `nombre` | TEXT | Nombre descriptivo (ej: "BBVA Casa Playa") | Sí | - |
| `tipo_moneda` | TEXT | Moneda: 'MXN' o 'USD' | Sí | - |
| `tipo_cuenta` | TEXT | Tipo: 'Banco', 'Tarjeta', 'Efectivo' | Sí | - |
| `banco` | TEXT | Nombre del banco | No | null |
| `numero_cuenta` | TEXT | Últimos 4 dígitos de cuenta | No | null |
| `balance_inicial` | NUMERIC(12,2) | Saldo inicial al crear cuenta | No | 0 |
| `balance_actual` | NUMERIC(12,2) | Saldo actual (calculado automáticamente) | No | 0 |
| `descripcion` | TEXT | Descripción adicional | No | null |
| `color` | TEXT | Color para identificación visual (hex) | No | '#3B82F6' |
| `activo` | BOOLEAN | Si la cuenta está activa | No | true |
| `created_at` | TIMESTAMPTZ | Fecha de creación | Sí | now() |
| `updated_at` | TIMESTAMPTZ | Última actualización | Sí | now() |

### Constraints

- **cuenta_owner_check:** Una cuenta DEBE tener `propiedad_id` O `propietario_id`, NO ambos

### Índices

```sql
CREATE INDEX idx_cuentas_propiedad ON cuentas_bancarias(propiedad_id);
CREATE INDEX idx_cuentas_propietario ON cuentas_bancarias(propietario_id);
CREATE INDEX idx_cuentas_tipo_moneda ON cuentas_bancarias(tipo_moneda);
CREATE INDEX idx_cuentas_activo ON cuentas_bancarias(activo);
```

### Triggers

#### 1. Inicializar Balance
**Función:** `inicializar_balance_cuenta()`
**Trigger:** `trigger_inicializar_balance`
**Momento:** BEFORE INSERT

Al crear una cuenta nueva, establece `balance_actual = balance_inicial`

```sql
CREATE OR REPLACE FUNCTION inicializar_balance_cuenta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_actual := COALESCE(NEW.balance_inicial, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Ejemplo de Datos

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "propiedad_id": "123e4567-e89b-12d3-a456-426614174000",
  "propietario_id": null,
  "nombre": "BBVA Cuenta Casa Playa",
  "tipo_moneda": "MXN",
  "tipo_cuenta": "Banco",
  "banco": "BBVA",
  "numero_cuenta": "1234",
  "balance_inicial": 50000.00,
  "balance_actual": 48500.00,
  "descripcion": "Cuenta principal para gastos de la casa en la playa",
  "color": "#0033A0",
  "activo": true
}
```

---

## 💵 TABLA: `ingresos`

**Propósito:** Registro de ingresos de propiedades (rentas, depósitos, ventas)

### Estructura

```sql
CREATE TABLE ingresos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  cuenta_id UUID REFERENCES cuentas_bancarias(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES profiles(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  fecha_ingreso DATE NOT NULL,
  tipo_ingreso TEXT CHECK (tipo_ingreso IN ('Renta', 'Depósito', 'Venta', 'Otro')),
  metodo_pago TEXT,
  referencia_pago TEXT,
  tiene_factura BOOLEAN DEFAULT false,
  numero_factura TEXT,
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Campos

| Campo | Tipo | Descripción | Requerido | Default |
|-------|------|-------------|-----------|---------|
| `id` | UUID | Identificador único | Sí | auto |
| `propiedad_id` | UUID | FK a propiedades | Sí | - |
| `cuenta_id` | UUID | FK a cuentas_bancarias (cuenta destino) | No | null |
| `creado_por` | UUID | FK a profiles (usuario que registró) | Sí | - |
| `concepto` | TEXT | Descripción del ingreso | Sí | - |
| `monto` | NUMERIC(10,2) | Cantidad del ingreso | Sí | - |
| `fecha_ingreso` | DATE | Fecha en que se recibió el ingreso | Sí | - |
| `tipo_ingreso` | TEXT | Tipo: 'Renta', 'Depósito', 'Venta', 'Otro' | No | null |
| `metodo_pago` | TEXT | Forma de pago (transferencia, efectivo, etc) | No | null |
| `referencia_pago` | TEXT | Número de referencia o confirmación | No | null |
| `tiene_factura` | BOOLEAN | Si se emitió factura | No | false |
| `numero_factura` | TEXT | Folio de factura | No | null |
| `comprobante_url` | TEXT | URL del comprobante en Storage | No | null |
| `notas` | TEXT | Notas adicionales | No | null |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro | Sí | now() |
| `updated_at` | TIMESTAMPTZ | Última actualización | Sí | now() |

### Índices

```sql
CREATE INDEX idx_ingresos_propiedad ON ingresos(propiedad_id);
CREATE INDEX idx_ingresos_cuenta ON ingresos(cuenta_id);
CREATE INDEX idx_ingresos_fecha ON ingresos(fecha_ingreso);
CREATE INDEX idx_ingresos_tipo ON ingresos(tipo_ingreso);
CREATE INDEX idx_ingresos_creado_por ON ingresos(creado_por);
```

### Triggers

#### 1. Actualizar Balance de Cuenta (Ingresos)
**Función:** `actualizar_balance_cuenta_ingreso()`
**Trigger:** `trigger_actualizar_balance_ingreso`
**Momento:** AFTER INSERT, UPDATE, DELETE

Actualiza automáticamente el `balance_actual` de la cuenta cuando:
- Se inserta un nuevo ingreso: suma el monto
- Se actualiza un ingreso: ajusta la diferencia
- Se elimina un ingreso: resta el monto
- Se cambia la cuenta destino: mueve el balance entre cuentas

```sql
CREATE OR REPLACE FUNCTION actualizar_balance_cuenta_ingreso()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.cuenta_id IS NOT NULL THEN
      UPDATE cuentas_bancarias
      SET balance_actual = balance_actual + NEW.monto
      WHERE id = NEW.cuenta_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si cambió la cuenta destino
    IF OLD.cuenta_id IS DISTINCT FROM NEW.cuenta_id THEN
      -- Restar de cuenta antigua
      IF OLD.cuenta_id IS NOT NULL THEN
        UPDATE cuentas_bancarias
        SET balance_actual = balance_actual - OLD.monto
        WHERE id = OLD.cuenta_id;
      END IF;
      -- Sumar a cuenta nueva
      IF NEW.cuenta_id IS NOT NULL THEN
        UPDATE cuentas_bancarias
        SET balance_actual = balance_actual + NEW.monto
        WHERE id = NEW.cuenta_id;
      END IF;
    -- Si solo cambió el monto
    ELSIF OLD.monto IS DISTINCT FROM NEW.monto AND NEW.cuenta_id IS NOT NULL THEN
      UPDATE cuentas_bancarias
      SET balance_actual = balance_actual - OLD.monto + NEW.monto
      WHERE id = NEW.cuenta_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.cuenta_id IS NOT NULL THEN
      UPDATE cuentas_bancarias
      SET balance_actual = balance_actual - OLD.monto
      WHERE id = OLD.cuenta_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Ejemplo de Datos

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "propiedad_id": "123e4567-e89b-12d3-a456-426614174000",
  "cuenta_id": "550e8400-e29b-41d4-a716-446655440000",
  "creado_por": "user-uuid-123",
  "concepto": "Renta de Diciembre 2025",
  "monto": 15000.00,
  "fecha_ingreso": "2025-12-01",
  "tipo_ingreso": "Renta",
  "metodo_pago": "Transferencia SPEI",
  "referencia_pago": "REF123456789",
  "tiene_factura": true,
  "numero_factura": "A123456",
  "comprobante_url": "https://supabase.co/storage/v1/object/public/documentos/comprobantes/diciembre_renta.pdf",
  "notas": "Pago puntual del inquilino"
}
```

---

## 👁️ VISTA: `v_movimientos_cuenta`

**Propósito:** Vista consolidada de todos los movimientos de una cuenta (ingresos + egresos)

### Estructura

```sql
CREATE OR REPLACE VIEW v_movimientos_cuenta AS
-- Ingresos (+)
SELECT
  i.id,
  i.cuenta_id,
  i.fecha_ingreso as fecha,
  'ingreso' as tipo_movimiento,
  i.concepto as descripcion,
  i.monto,
  i.tipo_ingreso as categoria,
  i.metodo_pago,
  i.referencia_pago,
  i.comprobante_url,
  i.created_at
FROM ingresos i
WHERE i.cuenta_id IS NOT NULL

UNION ALL

-- Egresos (-)
SELECT
  fps.id,
  fps.cuenta_id,
  fps.fecha_pago as fecha,
  'egreso' as tipo_movimiento,
  si.nombre as descripcion,
  fps.monto_real as monto,
  si.tipo_servicio as categoria,
  fps.metodo_pago,
  fps.referencia_pago,
  fps.comprobante_url,
  fps.updated_at as created_at
FROM fechas_pago_servicios fps
JOIN servicios_inmueble si ON fps.servicio_id = si.id
WHERE fps.cuenta_id IS NOT NULL AND fps.pagado = true

ORDER BY fecha DESC, created_at DESC;
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID del movimiento (ingreso o egreso) |
| `cuenta_id` | UUID | ID de la cuenta |
| `fecha` | DATE | Fecha del movimiento |
| `tipo_movimiento` | TEXT | 'ingreso' o 'egreso' |
| `descripcion` | TEXT | Concepto o nombre del servicio |
| `monto` | NUMERIC | Cantidad del movimiento |
| `categoria` | TEXT | Tipo de ingreso o servicio |
| `metodo_pago` | TEXT | Método de pago |
| `referencia_pago` | TEXT | Referencia o confirmación |
| `comprobante_url` | TEXT | URL del comprobante |
| `created_at` | TIMESTAMPTZ | Fecha de registro |

### Uso desde TypeScript

```typescript
// Obtener movimientos de una cuenta
const { data: movimientos } = await supabase
  .from('v_movimientos_cuenta')
  .select('*')
  .eq('cuenta_id', cuentaId)
  .order('fecha', { ascending: false })
  .limit(50)

// Filtrar por tipo
const { data: ingresos } = await supabase
  .from('v_movimientos_cuenta')
  .select('*')
  .eq('cuenta_id', cuentaId)
  .eq('tipo_movimiento', 'ingreso')

// Filtrar por rango de fechas
const { data: movimientosMes } = await supabase
  .from('v_movimientos_cuenta')
  .select('*')
  .eq('cuenta_id', cuentaId)
  .gte('fecha', '2025-12-01')
  .lte('fecha', '2025-12-31')
```

---

## 🔧 MODIFICACIONES A TABLA: `fechas_pago_servicios`

Se agregaron los siguientes campos para soportar el sistema de cuentas:

```sql
ALTER TABLE fechas_pago_servicios
ADD COLUMN IF NOT EXISTS cuenta_id UUID REFERENCES cuentas_bancarias(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metodo_pago TEXT,
ADD COLUMN IF NOT EXISTS referencia_pago TEXT,
ADD COLUMN IF NOT EXISTS tiene_factura BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numero_factura TEXT,
ADD COLUMN IF NOT EXISTS comprobante_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

### Trigger Agregado

#### Actualizar Balance de Cuenta (Egresos)
**Función:** `actualizar_balance_cuenta_pago()`
**Trigger:** `trigger_actualizar_balance_pago`
**Momento:** AFTER UPDATE

Cuando se marca un pago como `pagado = TRUE`:
- Resta el `monto_real` del `balance_actual` de la cuenta
- Si se desmarca, revierte el balance

```sql
CREATE OR REPLACE FUNCTION actualizar_balance_cuenta_pago()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actuar si cambió el estado de pagado o el monto
  IF OLD.pagado IS DISTINCT FROM NEW.pagado OR OLD.monto_real IS DISTINCT FROM NEW.monto_real THEN

    -- Si se marcó como pagado
    IF NEW.pagado = TRUE AND OLD.pagado = FALSE THEN
      IF NEW.cuenta_id IS NOT NULL THEN
        UPDATE cuentas_bancarias
        SET balance_actual = balance_actual - COALESCE(NEW.monto_real, NEW.monto_estimado, 0)
        WHERE id = NEW.cuenta_id;
      END IF;

    -- Si se desmarcó como pagado
    ELSIF NEW.pagado = FALSE AND OLD.pagado = TRUE THEN
      IF OLD.cuenta_id IS NOT NULL THEN
        UPDATE cuentas_bancarias
        SET balance_actual = balance_actual + COALESCE(OLD.monto_real, OLD.monto_estimado, 0)
        WHERE id = OLD.cuenta_id;
      END IF;

    -- Si cambió el monto pero sigue pagado
    ELSIF NEW.pagado = TRUE AND OLD.pagado = TRUE AND OLD.monto_real IS DISTINCT FROM NEW.monto_real THEN
      IF NEW.cuenta_id IS NOT NULL THEN
        UPDATE cuentas_bancarias
        SET balance_actual = balance_actual + COALESCE(OLD.monto_real, 0) - COALESCE(NEW.monto_real, 0)
        WHERE id = NEW.cuenta_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 FUNCIÓN RPC: `generar_fechas_pago_servicio`

**Propósito:** Genera automáticamente tickets de pago para servicios recurrentes

### Definición

```sql
CREATE OR REPLACE FUNCTION generar_fechas_pago_servicio(
  p_servicio_id UUID,
  p_cantidad_meses INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
DECLARE
  v_servicio RECORD;
  v_fecha_base DATE;
  v_contador INTEGER := 0;
BEGIN
  -- Obtener información del servicio
  SELECT * INTO v_servicio
  FROM servicios_inmueble
  WHERE id = p_servicio_id AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Servicio no encontrado o inactivo';
  END IF;

  -- Determinar fecha base
  SELECT COALESCE(MAX(fecha_pago), v_servicio.fecha_ultimo_pago, CURRENT_DATE)
  INTO v_fecha_base
  FROM fechas_pago_servicios
  WHERE servicio_id = p_servicio_id;

  -- Generar fechas según frecuencia
  FOR i IN 1..p_cantidad_meses LOOP
    INSERT INTO fechas_pago_servicios (
      servicio_id,
      propiedad_id,
      fecha_pago,
      monto_estimado,
      pagado
    ) VALUES (
      p_servicio_id,
      v_servicio.propiedad_id,
      v_fecha_base + (i * INTERVAL '1 month'),
      v_servicio.monto,
      false
    )
    ON CONFLICT DO NOTHING;

    v_contador := v_contador + 1;
  END LOOP;

  RETURN v_contador;
END;
$$ LANGUAGE plpgsql;
```

### Uso

```sql
-- Generar 12 meses de tickets para un servicio
SELECT generar_fechas_pago_servicio('servicio-uuid', 12);

-- Generar para todos los servicios activos
DO $$
DECLARE
  servicio RECORD;
BEGIN
  FOR servicio IN SELECT id FROM servicios_inmueble WHERE activo = true
  LOOP
    PERFORM generar_fechas_pago_servicio(servicio.id, 12);
  END LOOP;
END $$;
```

---
## 📌 NOTAS TÉCNICAS

### 1. Campos JSONB vs Columnas Separadas

**Se usa JSONB cuando:**
- Los datos están agrupados conceptualmente (ej: `ubicacion`, `dimensiones`)
- Se reduce la cantidad de columnas (mejor UX en Supabase)
- Los datos son opcionales o condicionales

**Se usan columnas separadas cuando:**
- Se necesita indexación específica
- Se hacen queries frecuentes por ese campo
- El campo es crítico para relaciones

### 2. Arrays de Texto vs Tablas de Relación

**Se usan arrays (`TEXT[]`) cuando:**
- Es una lista simple sin metadata adicional (ej: `estados`, `amenidades_vacacional`)
- No se necesita normalización estricta
- Se facilita la lectura en UI

**Se usan tablas de relación cuando:**
- Se necesita metadata adicional (ej: `propiedades_colaboradores` con `rol`)
- Se requieren queries complejas
- Hay relaciones N:N

### 3. Timestamps y Auditoría

Todas las tablas principales incluyen:
- `created_at`: Fecha de creación (automático)
- `updated_at`: Fecha de última actualización (manual via trigger o aplicación)

### 4. UUIDs vs Integer IDs

Se usa UUID v4 para:
- Seguridad (IDs no predecibles)
- Sincronización entre ambientes
- Estándar de Supabase Auth

### 5. Soft Delete vs Hard Delete

**Actualmente:** Hard delete (ON DELETE CASCADE)

**Recomendación futura:** Implementar soft delete con columna `deleted_at` para:
- Auditoría
- Recuperación de datos
- Historial

---

## 🎯 PRÓXIMOS PASOS

### Fase 4: Conectar Páginas de Catálogo

1. **Crear tablas pendientes:**
   - `eventos_calendario`
   - `inventarios`
   - `transacciones`

2. **Implementar interfaces TypeScript** para las nuevas tablas

3. **Crear helpers de transformación** para cada tipo de dato

4. **Documentar flujos de datos** específicos de cada página

### Fase 7: RLS & Seguridad

1. **Habilitar RLS** en todas las tablas
2. **Implementar políticas** de seguridad
3. **Testing exhaustivo** de permisos
4. **Auditoría de seguridad** completa

---

## 📚 REFERENCIAS

### Archivos Relacionados

- `/types/property.ts` - Interfaces TypeScript principales
- `/app/dashboard/catalogo/nueva/hooks/usePropertyDatabase.ts` - Hook de BD
- `/lib/supabase/client.ts` - Cliente de Supabase
- `/lib/supabase/supabase-storage.ts` - Gestión de Storage
- `.claude/PROJECT_PLAN.md` - Plan maestro del proyecto

### Documentación Externa

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**FIN DEL DOCUMENTO**

**Versión:** 1.0.0
**Última actualización:** 17 de Noviembre 2025
**Mantenido por:** Claude Code

*Este documento debe actualizarse cada vez que se modifique la estructura de la base de datos.*
