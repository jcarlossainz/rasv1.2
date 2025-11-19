-- ============================================================================
-- 🏢 RAS - SUPABASE DATABASE SETUP SCRIPT
-- ============================================================================
-- Sistema: Realty Administration System
-- Versión: 1.0.0
-- Fecha: 18 de Noviembre 2025
-- Descripción: Script completo para configurar la base de datos desde cero
-- ============================================================================

-- ============================================================================
-- PASO 1: LIMPIAR BASE DE DATOS EXISTENTE
-- ============================================================================
-- ADVERTENCIA: Esto eliminará TODOS los datos existentes

DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS contactos CASCADE;
DROP TABLE IF EXISTS propiedades_colaboradores CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS fechas_pago_servicios CASCADE;
DROP TABLE IF EXISTS servicios_inmueble CASCADE;
DROP TABLE IF EXISTS property_images CASCADE;
DROP TABLE IF EXISTS propiedades CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Limpiar vistas
DROP VIEW IF EXISTS v_proximos_pagos CASCADE;

-- ============================================================================
-- PASO 2: HABILITAR EXTENSIONES
-- ============================================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PASO 3: CREAR TABLAS PRINCIPALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: profiles
-- Descripción: Perfiles extendidos de usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  -- IDENTIFICACIÓN
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- DATOS PERSONALES
  nombre          TEXT,
  apellido        TEXT,
  email           TEXT,
  telefono        TEXT,
  avatar_url      TEXT,

  -- ORGANIZACIÓN
  empresa_id      UUID NULL,
  rol             TEXT DEFAULT 'owner', -- 'owner' | 'admin' | 'supervisor' | 'viewer'

  -- PREFERENCIAS
  configuracion   JSONB DEFAULT '{}'::jsonb,

  -- METADATA
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_empresa ON profiles(empresa_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ----------------------------------------------------------------------------
-- TABLA: propiedades
-- Descripción: Tabla principal de inmuebles
-- ----------------------------------------------------------------------------
CREATE TABLE propiedades (
  -- IDENTIFICACIÓN
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id            UUID NULL,

  -- STEP 1: DATOS GENERALES
  nombre_propiedad      TEXT NOT NULL,
  tipo_propiedad        TEXT,
  mobiliario            TEXT,
  dimensiones           JSONB, -- {terreno: {valor, unidad}, construccion: {valor, unidad}}
  estados               TEXT[], -- ['Renta largo plazo', 'Venta', etc.]
  propietarios_email    TEXT[],
  supervisores_email    TEXT[],

  -- STEP 2: UBICACIÓN
  ubicacion             JSONB, -- {calle, colonia, codigo_postal, ciudad, estado, pais, google_maps_link, referencias, es_complejo, nombre_complejo, amenidades_complejo}

  -- STEP 3: ESPACIOS
  espacios              JSONB[], -- [{id, name, type, details: {equipamiento, camas, tieneBanoPrivado}}]

  -- STEP 4: CONDICIONALES
  precios               JSONB, -- {mensual, noche, venta}
  inquilinos_email      TEXT[],
  fecha_inicio_contrato DATE,
  duracion_contrato_valor INTEGER,
  duracion_contrato_unidad TEXT, -- 'meses' | 'años'
  frecuencia_pago       TEXT, -- 'mensual' | 'quincenal' | 'semanal'
  dia_pago              INTEGER,
  precio_renta_disponible NUMERIC(10,2),
  requisitos_renta      TEXT[],
  requisitos_renta_custom TEXT[],
  amenidades_vacacional TEXT[],

  -- STEP 5: SERVICIOS
  servicios             JSONB[], -- [{id, nombre, proveedor, costo, frecuencia}]

  -- ANUNCIO (Phase 4.6)
  estado_anuncio        TEXT DEFAULT 'borrador', -- 'borrador' | 'publicado' | 'pausado'
  descripcion_anuncio   TEXT,

  -- METADATA DEL WIZARD
  wizard_step           INTEGER DEFAULT 1,
  wizard_completed      BOOLEAN DEFAULT FALSE,
  is_draft              BOOLEAN DEFAULT TRUE,

  -- TIMESTAMPS
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_propiedades_owner ON propiedades(owner_id);
CREATE INDEX idx_propiedades_empresa ON propiedades(empresa_id);
CREATE INDEX idx_propiedades_estados ON propiedades USING GIN(estados);
CREATE INDEX idx_propiedades_draft ON propiedades(is_draft);
CREATE INDEX idx_propiedades_ubicacion ON propiedades USING GIN(ubicacion);
CREATE INDEX idx_propiedades_estado_anuncio ON propiedades(estado_anuncio);
CREATE INDEX idx_propiedades_tipo ON propiedades(tipo_propiedad);
CREATE INDEX idx_propiedades_created ON propiedades(created_at DESC);

-- Índices para búsquedas JSONB
CREATE INDEX idx_propiedades_ubicacion_ciudad ON propiedades((ubicacion->>'ciudad'));
CREATE INDEX idx_propiedades_ubicacion_estado ON propiedades((ubicacion->>'estado'));
CREATE INDEX idx_propiedades_precio_mensual ON propiedades(((precios->>'mensual')::numeric));
CREATE INDEX idx_propiedades_precio_venta ON propiedades(((precios->>'venta')::numeric));

-- Full-text search
CREATE INDEX idx_propiedades_nombre_fts ON propiedades USING gin(to_tsvector('spanish', nombre_propiedad));

-- ----------------------------------------------------------------------------
-- TABLA: property_images
-- Descripción: Galería de fotos e inventario de propiedades
-- ----------------------------------------------------------------------------
CREATE TABLE property_images (
  -- IDENTIFICACIÓN
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- URLs DE IMAGEN
  url               TEXT NOT NULL, -- URL original/display
  url_thumbnail     TEXT, -- URL thumbnail (300x300)

  -- METADATA DE FOTO
  is_cover          BOOLEAN DEFAULT FALSE,
  order_index       INTEGER DEFAULT 0,
  caption           TEXT,

  -- DIMENSIONES Y TAMAÑOS
  file_size         JSONB, -- {thumbnail: bytes, display: bytes}
  dimensions        JSONB, -- {thumbnail: {width, height}, display: {width, height}}

  -- INVENTARIO (Phase 4.4 - AI)
  object_name       TEXT, -- Nombre del objeto detectado por IA
  labels            TEXT, -- Etiquetas separadas por comas
  space_type        TEXT, -- ID del espacio asignado

  -- TIMESTAMPS
  uploaded_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_property_images_property ON property_images(property_id);
CREATE INDEX idx_property_images_cover ON property_images(is_cover);
CREATE INDEX idx_property_images_order ON property_images(order_index);
CREATE INDEX idx_property_images_space ON property_images(space_type);
CREATE INDEX idx_property_images_object ON property_images(object_name);

-- ----------------------------------------------------------------------------
-- TABLA: servicios_inmueble
-- Descripción: Servicios contratados (luz, agua, internet, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE servicios_inmueble (
  -- IDENTIFICACIÓN
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id        UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- DATOS DEL SERVICIO
  tipo_servicio       TEXT NOT NULL, -- 'Luz', 'Agua', 'Gas', 'Internet', etc.
  nombre              TEXT NOT NULL,
  numero_contrato     TEXT,
  proveedor           TEXT,
  responsable         TEXT,

  -- COSTO
  monto               NUMERIC(10,2) NOT NULL,
  es_fijo             BOOLEAN DEFAULT TRUE, -- true: fijo, false: variable

  -- FRECUENCIA DE PAGO
  frecuencia_valor    INTEGER NOT NULL, -- 1, 2, 3, etc.
  frecuencia_unidad   TEXT NOT NULL, -- 'dias' | 'semanas' | 'meses' | 'anos'
  ultima_fecha_pago   DATE,

  -- ESTADO
  activo              BOOLEAN DEFAULT TRUE,

  -- TIMESTAMPS
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_servicios_propiedad ON servicios_inmueble(propiedad_id);
CREATE INDEX idx_servicios_activo ON servicios_inmueble(activo);
CREATE INDEX idx_servicios_tipo ON servicios_inmueble(tipo_servicio);

-- ----------------------------------------------------------------------------
-- TABLA: fechas_pago_servicios
-- Descripción: Calendario de pagos programados
-- ----------------------------------------------------------------------------
CREATE TABLE fechas_pago_servicios (
  -- IDENTIFICACIÓN
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servicio_id       UUID REFERENCES servicios_inmueble(id) ON DELETE CASCADE,
  propiedad_id      UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- FECHA Y MONTO
  fecha_pago        DATE NOT NULL,
  monto_estimado    NUMERIC(10,2) NOT NULL,

  -- ESTADO DE PAGO
  pagado            BOOLEAN DEFAULT FALSE,
  fecha_pago_real   DATE,
  monto_real        NUMERIC(10,2),

  -- NOTAS
  notas             TEXT,

  -- TIMESTAMPS
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_fechas_pago_servicio ON fechas_pago_servicios(servicio_id);
CREATE INDEX idx_fechas_pago_propiedad ON fechas_pago_servicios(propiedad_id);
CREATE INDEX idx_fechas_pago_fecha ON fechas_pago_servicios(fecha_pago);
CREATE INDEX idx_fechas_pago_pagado ON fechas_pago_servicios(pagado);

-- ----------------------------------------------------------------------------
-- TABLA: tickets
-- Descripción: Sistema de tareas y tickets pendientes
-- ----------------------------------------------------------------------------
CREATE TABLE tickets (
  -- IDENTIFICACIÓN
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id        UUID REFERENCES propiedades(id) ON DELETE CASCADE,

  -- DATOS DEL TICKET
  titulo              TEXT NOT NULL,
  descripcion         TEXT,
  tipo                TEXT, -- 'Mantenimiento', 'Pago', 'Reparación', etc.
  prioridad           TEXT, -- 'Baja', 'Media', 'Alta', 'Urgente'

  -- ASIGNACIÓN
  asignado_a          UUID REFERENCES profiles(id),
  creado_por          UUID REFERENCES profiles(id),

  -- FECHAS
  fecha_programada    DATE,
  fecha_completado    DATE,

  -- ESTADO
  estado              TEXT DEFAULT 'pendiente', -- 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
  pagado              BOOLEAN DEFAULT FALSE,

  -- MONTO
  monto_estimado      NUMERIC(10,2),
  monto_real          NUMERIC(10,2),

  -- TIMESTAMPS
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tickets_propiedad ON tickets(propiedad_id);
CREATE INDEX idx_tickets_asignado ON tickets(asignado_a);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_fecha ON tickets(fecha_programada);
CREATE INDEX idx_tickets_pagado ON tickets(pagado);
CREATE INDEX idx_tickets_tipo ON tickets(tipo);
CREATE INDEX idx_tickets_prioridad ON tickets(prioridad);

-- ----------------------------------------------------------------------------
-- TABLA: propiedades_colaboradores
-- Descripción: Relación N:N entre propiedades y colaboradores
-- ----------------------------------------------------------------------------
CREATE TABLE propiedades_colaboradores (
  -- IDENTIFICACIÓN
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- PERMISOS
  rol             TEXT DEFAULT 'viewer', -- 'viewer' | 'editor' | 'admin'

  -- TIMESTAMPS
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINT
  UNIQUE(propiedad_id, user_id)
);

-- Índices
CREATE INDEX idx_colaboradores_propiedad ON propiedades_colaboradores(propiedad_id);
CREATE INDEX idx_colaboradores_user ON propiedades_colaboradores(user_id);

-- ----------------------------------------------------------------------------
-- TABLA: contactos
-- Descripción: Directorio de contactos
-- ----------------------------------------------------------------------------
CREATE TABLE contactos (
  -- IDENTIFICACIÓN
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- DATOS PERSONALES
  nombre          TEXT NOT NULL,
  apellido        TEXT,
  email           TEXT,
  telefono        TEXT,

  -- TIPO
  tipo            TEXT, -- 'Inquilino', 'Propietario', 'Proveedor', etc.

  -- EMPRESA (si aplica)
  empresa         TEXT,
  puesto          TEXT,

  -- NOTAS
  notas           TEXT,

  -- ESTADO
  activo          BOOLEAN DEFAULT TRUE,

  -- TIMESTAMPS
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contactos_user ON contactos(user_id);
CREATE INDEX idx_contactos_tipo ON contactos(tipo);
CREATE INDEX idx_contactos_activo ON contactos(activo);

-- ----------------------------------------------------------------------------
-- TABLA: documentos
-- Descripción: Almacenamiento de documentos adjuntos
-- ----------------------------------------------------------------------------
CREATE TABLE documentos (
  -- IDENTIFICACIÓN
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- RELACIONES
  propiedad_id    UUID REFERENCES propiedades(id) ON DELETE CASCADE,
  ticket_id       UUID REFERENCES tickets(id) ON DELETE CASCADE,
  pago_id         UUID REFERENCES fechas_pago_servicios(id) ON DELETE CASCADE,

  -- DATOS DEL ARCHIVO
  nombre          TEXT NOT NULL,
  url             TEXT NOT NULL,
  tipo            TEXT, -- 'PDF', 'Imagen', 'Contrato', etc.
  tamano          INTEGER, -- bytes

  -- METADATA
  descripcion     TEXT,

  -- TIMESTAMPS
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_documentos_propiedad ON documentos(propiedad_id);
CREATE INDEX idx_documentos_ticket ON documentos(ticket_id);
CREATE INDEX idx_documentos_pago ON documentos(pago_id);

-- ============================================================================
-- PASO 4: CREAR VISTAS
-- ============================================================================

-- Vista: v_proximos_pagos
-- Descripción: Próximos pagos de servicios con información consolidada
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

-- ============================================================================
-- PASO 5: CONFIGURAR TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_propiedades_updated_at BEFORE UPDATE ON propiedades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servicios_updated_at BEFORE UPDATE ON servicios_inmueble
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contactos_updated_at BEFORE UPDATE ON contactos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- NOTA: RLS está desactivado para desarrollo
-- Habilitar en FASE 7 antes de producción

-- Ejemplo de cómo habilitarlo:
-- ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "usuarios_ven_sus_propiedades"
-- ON propiedades FOR SELECT
-- USING (auth.uid() = owner_id);

-- ============================================================================
-- PASO 7: FUNCIONES AUXILIARES
-- ============================================================================

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Verificación: Listar todas las tablas creadas
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificación: Listar todos los índices creados
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

COMMENT ON SCHEMA public IS '🏢 RAS - Realty Administration System v1.0.0';
