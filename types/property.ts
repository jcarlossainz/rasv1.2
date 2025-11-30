// ===== ESPACIOS (TU ESTRUCTURA ACTUAL) =====

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  description?: string;
  icon?: string;
  category?: string;
  quantity?: number;
  features?: string[];
  details: {
    equipamiento: string[];
    camas?: Array<{ tipo: string; id: number }>;
    capacidadPersonas?: number; // Ocupantes máximos en habitaciones
    tieneBanoPrivado?: boolean;
    banoPrivadoId?: string | null;
    notas?: string;
  };
  created_at?: string;
}

export type SpaceType =
  | 'Habitación'
  | 'Lock-off'
  | 'Cuarto de servicio'
  | 'Baño completo'
  | 'Medio baño'
  | 'Cocina'
  | 'Sala'
  | 'Comedor'
  | 'Cuarto de lavado'
  | 'Terraza'
  | 'Rooftop'
  | 'Patio'
  | 'Jardín'
  | 'Alberca'
  | 'Bodega'
  | 'Estacionamiento'
  | 'Gimnasio'
  | 'Bar'
  | 'Cine / Tv Room'
  | 'Oficina';

export const SPACE_CATEGORIES = {
  habitaciones: ['Habitación', 'Lock-off', 'Cuarto de servicio'],
  banos: ['Baño completo', 'Medio baño'],
  areasComunes: ['Cocina', 'Sala', 'Comedor', 'Cuarto de lavado'],
  exteriores: ['Terraza', 'Rooftop', 'Patio', 'Jardín', 'Alberca'],
  adicionales: ['Bodega', 'Estacionamiento', 'Gimnasio', 'Bar', 'Cine / Tv Room', 'Oficina']
};

// ===== GALERÍA DE IMÁGENES (TU ESTRUCTURA ACTUAL) =====

export interface PropertyImage {
  id?: string;
  url: string;
  url_thumbnail?: string;
  is_cover: boolean;
  order_index: number;
  space_type: string | null;
  caption: string | null;
  uploaded_at?: string;
  file_size?: {
    thumbnail: number;
    display: number;
  };
  dimensions?: {
    thumbnail: { width: number; height: number };
    display: { width: number; height: number };
  };
}

export interface GalleryStats {
  total: number;
  assigned: number;
  unassigned: number;
  withCover: number;
  bySpace: Record<string, number>;
}

export interface PhotoUploadProgress {
  total: number;
  current: number;
  percentage: number;
  status: string;
  currentFile: string;
  errors: string[];
}

export interface ImageCompressionResult {
  thumbnail: Blob;
  display: Blob;
  originalSize: number;
  thumbnailSize: number;
  displaySize: number;
  compressionRatio: {
    thumbnail: number;
    display: number;
  };
}

// ===== UBICACIÓN (TU ESTRUCTURA ACTUAL - YA OPTIMIZADA) =====

export interface Ubicacion {
  calle?: string | null;
  numero_exterior?: string | null;
  numero_interior?: string | null;
  colonia?: string | null;
  codigo_postal?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  pais?: string | null;
  google_maps_link?: string | null;
  referencias?: string | null;
  es_complejo?: boolean;
  nombre_complejo?: string | null;
  amenidades_complejo?: string[];
}

// ===== SERVICIOS (TU ESTRUCTURA ACTUAL) =====

export interface ServicioInmueble {
  id: string;
  tipo_servicio: string;
  nombre: string;
  numero_contrato: string;
  monto: number;
  es_fijo: boolean;
  ultima_fecha_pago: string;
  frecuencia_valor: number;
  frecuencia_unidad: 'dias' | 'semanas' | 'meses' | 'anos';
  responsable?: string;
  proveedor?: string;
  activo: boolean;
}

export interface FechaPagoServicio {
  id: string;
  servicio_id: string;
  propiedad_id: string;
  fecha_pago: string;
  monto_estimado: number;
  pagado: boolean;
  fecha_pago_real?: string;
  notas?: string;
  created_at: string;
}

// ===== NUEVOS TIPOS: PRECIOS, TAMAÑOS Y DATOS CONDICIONALES =====

/**
 * NUEVO: Estructura para precios consolidada en una columna JSON
 * Reemplaza: costo_renta_mensual, precio_noche, precio_venta
 */
export interface Precios {
  mensual?: number | null;
  noche?: number | null;
  venta?: number | null;
}

/**
 * NUEVO: Estructura para tamaños (reduce 4 campos a 2)
 */
export interface TamanoMedida {
  valor: string;
  unidad: 'm²' | 'ft²';
}

/**
 * NUEVO: Datos específicos de Renta Largo Plazo
 * Agrupa todos los campos relacionados en un solo objeto JSON
 */
export interface DatosRentaLargoPlazo {
  inquilino_id?: string;
  
  // Contrato
  fecha_inicio_contrato?: string;
  duracion_contrato?: {
    valor: string;
    unidad: 'meses' | 'años';
  };
  
  // Pagos (cuando está rentado)
  costo_renta_mensual?: string;
  frecuencia_pago?: 'mensual' | 'quincenal' | 'semanal';
  dia_pago?: string;
  
  // Disponible (cuando NO está rentado)
  precio_renta_disponible?: string;
  requisitos_renta?: string[];
  requisitos_renta_custom?: string[];
}

/**
 * NUEVO: Datos específicos de Renta Vacacional
 */
export interface DatosRentaVacacional {
  precio_noche?: string;
  amenidades_vacacional?: string[];
  estancia_minima?: string;
  politicas?: {
    check_in?: string;
    check_out?: string;
    mascotas?: boolean;
  };
}

/**
 * NUEVO: Datos específicos de Venta
 */
export interface DatosVenta {
  precio_venta?: string;
  precio_venta_number?: number;
  moneda?: string;
  escrituras?: boolean;
  adeudos?: boolean;
  notas?: string;
}

// ===== TIPOS PARA MODO EDICIÓN =====

export type WizardMode = 'create' | 'edit';

export interface WizardProps {
  isOpen: boolean;
  mode: WizardMode;
  propertyId?: string;
  initialData?: Partial<PropertyFormData>;
  onClose: () => void;
  onSave: (data: PropertyFormData) => Promise<void>;
  onSaveDraft?: (data: PropertyFormData) => Promise<void>;
}

export interface WizardContainerProps {
  mode?: WizardMode;
  propertyId?: string;
  initialData?: Partial<PropertyFormData>;
  onSave: (data: PropertyFormData) => Promise<void>;
  onSaveDraft?: (data: PropertyFormData) => Promise<void>;
}

// ===== INTERFACE PRINCIPAL: PropertyFormData (OPTIMIZADA) =====

export interface PropertyFormData {
  // ===== IDENTIFICACIÓN (5 campos) =====
  id?: string;
  nombre_propiedad: string;
  tipo_propiedad: string;
  estados: string[]; // ['Renta largo plazo', 'Venta', etc.]
  fecha_creacion?: string;
  
  // ===== DATOS BÁSICOS (3 campos - AHORA OBJETOS) =====
  mobiliario: string;
  capacidad_personas?: string;
  tamano_terreno: TamanoMedida;        // NUEVO: objeto {valor, unidad}
  tamano_construccion: TamanoMedida;   // NUEVO: objeto {valor, unidad}
  
  // ===== UBICACIÓN (1 campo JSON - YA OPTIMIZADO) =====
  ubicacion?: Ubicacion | null;
  
  // ===== DESCRIPCIÓN (2 campos) =====
  descripcion_corta?: string;
  descripcion_larga?: string;
  
  // ===== CARACTERÍSTICAS FÍSICAS (8 campos - MANTENER) =====
  superficie_terreno?: number;
  superficie_construccion?: number;
  recamaras?: number;
  banos?: number;
  medios_banos?: number;
  estacionamientos?: number;
  niveles?: number;
  antiguedad?: number;
  
  // ===== ASIGNACIONES (2 campos) =====
  propietarios_email: string[];  
  supervisores_email: string[];  
  
  // ===== DATOS CONDICIONALES (3 campos JSON - NUEVO) =====
  datos_renta_largo?: DatosRentaLargoPlazo;      // NUEVO: agrupa ~10 campos
  datos_renta_vacacional?: DatosRentaVacacional;  // NUEVO: agrupa ~2 campos
  datos_venta?: DatosVenta;                       // NUEVO: agrupa ~3 campos
  
  // ===== PRECIOS (1 campo JSON - NUEVO) =====
  precios?: Precios;  // NUEVO: consolida mensual, noche, venta en un solo JSON
  
  // ===== PRECIO ADICIONAL (1 campo) =====
  precio_renta?: number;
  
  // ===== ESPACIOS (1 campo JSON) =====
  espacios: Space[];
  
  // ===== SERVICIOS (1 campo JSON) =====
  servicios?: ServicioInmueble[];
  
  // ===== GALERÍA (1 campo JSON) =====
  photos: PropertyImage[];
  
  // ===== AMENIDADES (1 campo) =====
  amenidades?: string[];
  
  // ===== OTRAS CARACTERÍSTICAS (2 campos) =====
  permite_mascotas?: boolean;
  amueblado?: boolean;
  
  // ===== CONTACTO (1 campo) =====
  contacto_id?: string;
  
  // ===== METADATA (5 campos) =====
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  status?: 'draft' | 'published' | 'archived';
  is_draft: boolean;
  
  // ===== COMPATIBILIDAD TEMPORAL - DEPRECAR DESPUÉS =====
  // Mantener estos campos por compatibilidad, pero usar los nuevos objetos
  tamano_terreno_temp?: string;          // @deprecated usar tamano_terreno.valor
  tamano_terreno_unit_temp?: string;     // @deprecated usar tamano_terreno.unidad
  tamano_construccion_temp?: string;     // @deprecated usar tamano_construccion.valor
  tamano_construccion_unit_temp?: string;// @deprecated usar tamano_construccion.unidad
  inquilino_id?: string;                 // @deprecated usar datos_renta_largo.inquilino_id
  fecha_inicio_contrato?: string;        // @deprecated usar datos_renta_largo.fecha_inicio_contrato
  duracion_contrato_valor?: string;      // @deprecated usar datos_renta_largo.duracion_contrato.valor
  duracion_contrato_unidad?: string;     // @deprecated usar datos_renta_largo.duracion_contrato.unidad
  costo_renta_mensual?: string;          // @deprecated usar precios.mensual
  frecuencia_pago?: string;              // @deprecated usar datos_renta_largo.frecuencia_pago
  dia_pago?: string;                     // @deprecated usar datos_renta_largo.dia_pago
  precio_renta_disponible?: string;      // @deprecated usar datos_renta_largo.precio_renta_disponible
  requisitos_renta?: string[];           // @deprecated usar datos_renta_largo.requisitos_renta
  requisitos_renta_custom?: string[];    // @deprecated usar datos_renta_largo.requisitos_renta_custom
  precio_noche?: string;                 // @deprecated usar precios.noche
  amenidades_vacacional?: string[];      // @deprecated usar datos_renta_vacacional.amenidades_vacacional
  precio_venta?: string;                 // @deprecated usar precios.venta
  precio_venta_number?: number;          // @deprecated usar precios.venta
  moneda?: string;                       // @deprecated usar datos_venta.moneda
}

// ===== ENUMS Y TIPOS AUXILIARES (TU ESTRUCTURA ACTUAL) =====

export enum PropertyType {
  CASA = 'Casa',
  DEPARTAMENTO = 'Departamento',
  TERRENO = 'Terreno',
  OFICINA = 'Oficina',
  LOCAL_COMERCIAL = 'Local Comercial',
  BODEGA = 'Bodega',
  RANCHO = 'Rancho',
  VILLA = 'Villa',
  CONDOMINIO = 'Condominio',
  PENTHOUSE = 'Penthouse',
  LOFT = 'Loft',
  ESTUDIO = 'Estudio'
}

export enum PropertyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum TransactionType {
  VENTA = 'venta',
  RENTA = 'renta',
  AMBOS = 'ambos'
}

export type EstadoPropiedad = 
  | 'Renta largo plazo'
  | 'Renta vacacional'
  | 'Venta'
  | 'Mantenimiento'
  | 'Suspendido'
  | 'Propietario';

export type FrecuenciaPago = 
  | 'mensual'
  | 'quincenal'
  | 'semanal';

export type DuracionUnidad = 
  | 'meses'
  | 'años';

// ===== CONSTANTES (TU ESTRUCTURA ACTUAL + NUEVAS) =====

export const GALLERY_CONSTANTS = {
  THUMBNAIL_SIZE: 300,
  DISPLAY_MAX_WIDTH: 1200,
  COMPRESSION_QUALITY: 0.8,
  MAX_FILES_PER_UPLOAD: 20,
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MIN_PHOTOS_RECOMMENDED: 5,
  OPTIMAL_PHOTOS: 15
} as const;

export const TIPOS_PROPIEDAD = [
  'Departamento',
  'Casa',
  'Villa',
  'Condominio',
  'Penthouse',
  'Loft',
  'Estudio',
  'Oficina',
  'Local comercial',
  'Bodega'
];

export const ESTADOS_PROPIEDAD = [
  'Renta largo plazo',
  'Renta vacacional',
  'Venta',
  'Mantenimiento',
  'Suspendido',
  'Propietario'
];

export const OPCIONES_MOBILIARIO = [
  'Amueblada',
  'Semi-amueblada',
  'Sin amueblar'
];

export const FRECUENCIA_PAGO_OPTIONS = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' }
];

export const DURACION_CONTRATO_UNIDAD_OPTIONS = [
  { value: 'meses', label: 'Meses' },
  { value: 'años', label: 'Años' }
];

export const UNIDADES_MEDIDA = ['m²', 'ft²'] as const;

// ===== HELPER TYPES PARA FORMULARIOS (TU ESTRUCTURA ACTUAL) =====

export type PropertyFormStep = 
  | 'datos_generales'
  | 'ubicacion'
  | 'espacios'
  | 'condicionales'
  | 'servicios'
  | 'galeria'
  | 'revision';

export interface StepConfig {
  id: PropertyFormStep;
  title: string;
  icon: string;
  description: string;
  isComplete: (data: PropertyFormData) => boolean;
}

// ===== TIPOS PARA VALIDACIONES (TU ESTRUCTURA ACTUAL) =====

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface StepValidation {
  step: PropertyFormStep;
  validation: ValidationResult;
}

// ===== HELPERS DE VALIDACIÓN Y UTILIDADES (NUEVOS) =====

/**
 * Verifica si una propiedad tiene datos de renta largo plazo
 */
export function hasRentaLargoPlazoData(data: PropertyFormData): boolean {
  return !!data.datos_renta_largo?.inquilino_id || 
         !!data.datos_renta_largo?.costo_renta_mensual;
}

/**
 * Verifica si una propiedad tiene datos de renta vacacional
 */
export function hasRentaVacacionalData(data: PropertyFormData): boolean {
  return !!data.datos_renta_vacacional?.precio_noche;
}

/**
 * Verifica si una propiedad tiene datos de venta
 */
export function hasVentaData(data: PropertyFormData): boolean {
  return !!data.datos_venta?.precio_venta;
}

/**
 * Limpia datos condicionales que no corresponden a estados activos
 */
export function cleanUnusedConditionalData(data: PropertyFormData): PropertyFormData {
  const cleaned = { ...data };
  
  if (!data.estados.includes('Renta largo plazo')) {
    delete cleaned.datos_renta_largo;
  }
  
  if (!data.estados.includes('Renta vacacional')) {
    delete cleaned.datos_renta_vacacional;
  }
  
  if (!data.estados.includes('Venta')) {
    delete cleaned.datos_venta;
  }
  
  return cleaned;
}

/**
 * Genera un ID único para una nueva propiedad
 */
export function generatePropertyId(): string {
  return `PROP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Genera un ID único para un espacio
 */
export function generateSpaceId(): string {
  return `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Genera un ID único para un servicio
 */
export function generateServiceId(): string {
  return `srv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verifica si un objeto es una PropertyFormData válida
 */
export function isPropertyFormData(obj: any): obj is PropertyFormData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.nombre_propiedad === 'string' &&
    typeof obj.tipo_propiedad === 'string' &&
    Array.isArray(obj.estados) &&
    typeof obj.mobiliario === 'string' &&
    Array.isArray(obj.espacios) &&
    typeof obj.is_draft === 'boolean'
  );
}

/**
 * VALOR INICIAL para formularios nuevos
 */
export const INITIAL_PROPERTY_DATA: PropertyFormData = {
  // Identificación
  nombre_propiedad: '',
  tipo_propiedad: 'Departamento',
  estados: [],
  
  // Básicos
  mobiliario: 'Amueblada',
  tamano_terreno: { valor: '', unidad: 'm²' },
  tamano_construccion: { valor: '', unidad: 'm²' },
  
  // Asignaciones
  propietario_id: '',
  
  // Ubicación
  ubicacion: {
    calle: '',
    colonia: '',
    codigo_postal: '',
    ciudad: '',
    estado: '',
    pais: '',
    google_maps_link: '',
    referencias: '',
    es_complejo: false,
    amenidades_complejo: []
  },
  
  // Precios (NUEVO)
  precios: {
    mensual: null,
    noche: null,
    venta: null
  },
  
  // Espacios y servicios
  espacios: [],
  servicios: [],
  
  // Galería
  photos: [],
  
  // Metadata
  is_draft: true
};

export interface Service {
  id: string;
  type: string;
  name: string;
  provider: string;
  accountNumber: string;
  cost: number;
  montoTipo: 'fijo' | 'variable'; // ✨ NUEVO - Tipo de monto
  frecuenciaCantidad: number; // ✨ NUEVO - Cantidad (ej: 1, 2, 3)
  frecuenciaUnidad: 'dia' | 'mes' | 'año'; // ✨ NUEVO - Unidad de tiempo
  paymentFrequency: 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'unico'; // Mantener por compatibilidad
  lastPaymentDate: string; // ✨ CORREGIDO - Fecha del último pago (formato YYYY-MM-DD)
  notes: string;
}

// ============================================================================
// SISTEMA DE CUENTAS BANCARIAS E INGRESOS
// ============================================================================

/**
 * Cuenta bancaria, tarjeta o efectivo
 * Ahora soporta múltiples propiedades y propietarios via arrays
 */
export interface CuentaBancaria {
  id: string;
  user_id: string; // Usuario dueño de la cuenta
  nombre_cuenta: string;
  descripcion: string | null;
  saldo_inicial: number;
  saldo_actual: number;
  moneda: 'MXN' | 'USD';
  tipo_cuenta: 'Banco' | 'Tarjeta' | 'Efectivo';
  banco: string | null;
  numero_cuenta: string | null;
  clabe: string | null;
  propietarios_ids: string[]; // Array de UUIDs de profiles
  propiedades_ids: string[]; // Array de UUIDs de propiedades
  fecha_corte_dia: number; // Día del mes para corte (default: 1)
  genera_estados_cuenta: boolean;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tipo para crear una nueva cuenta
 */
export interface NuevaCuentaBancaria {
  nombre_cuenta: string;
  descripcion?: string;
  saldo_inicial: number;
  moneda?: 'MXN' | 'USD';
  tipo_cuenta: 'Banco' | 'Tarjeta' | 'Efectivo';
  banco?: string;
  numero_cuenta?: string;
  clabe?: string;
  propiedades_ids?: string[]; // Propiedades asociadas
  propietarios_ids?: string[]; // Propietarios asociados
  fecha_corte_dia?: number;
  genera_estados_cuenta?: boolean;
}

/**
 * Registro de ingreso (renta, depósito, venta, etc.)
 */
export interface Ingreso {
  id: string;
  propiedad_id: string;
  cuenta_id: string | null;
  creado_por: string | null;
  concepto: string;
  monto: number;
  fecha_ingreso: string; // YYYY-MM-DD
  tipo_ingreso: 'Renta' | 'Depósito' | 'Venta' | 'Otro' | null;
  metodo_pago: 'Transferencia' | 'Efectivo' | 'Cheque' | 'Tarjeta' | 'Otro' | null;
  referencia_pago: string | null;
  tiene_factura: boolean;
  numero_factura: string | null;
  comprobante_url: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Tipo para crear un nuevo ingreso
 */
export interface NuevoIngreso {
  propiedad_id: string;
  cuenta_id?: string;
  concepto: string;
  monto: number;
  fecha_ingreso: string;
  tipo_ingreso?: 'Renta' | 'Depósito' | 'Venta' | 'Otro';
  metodo_pago?: 'Transferencia' | 'Efectivo' | 'Cheque' | 'Tarjeta' | 'Otro';
  referencia_pago?: string;
  tiene_factura?: boolean;
  numero_factura?: string;
  comprobante_url?: string;
  notas?: string;
}

/**
 * Movimiento consolidado (ingreso o egreso) para vista de balance
 */
export interface MovimientoCuenta {
  id: string;
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  monto: number;
  concepto: string;
  cuenta_id: string | null;
  propiedad_id: string;
  metodo_pago: string | null;
  referencia_pago: string | null;
  tiene_factura: boolean;
  numero_factura: string | null;
  comprobante_url: string | null;
  notas: string | null;
  categoria: string | null;
  created_at: string;
}

// ============================================================================
// FUNCIONES HELPER PARA CÁLCULOS
// ============================================================================

/**
 * Calcula la capacidad total de personas sumando los ocupantes de todas las habitaciones
 * @param espacios - Array de espacios de la propiedad
 * @returns Número total de personas que puede alojar la propiedad, o null si no hay capacidad definida
 */
export function calcularCapacidadPersonas(espacios: Space[]): number | null {
  if (!espacios || espacios.length === 0) return null;

  // Tipos de espacios que pueden tener ocupantes
  const espaciosHabitables: SpaceType[] = ['Habitación', 'Lock-off', 'Cuarto de servicio'];

  let capacidadTotal = 0;
  let tieneCapacidad = false;

  for (const espacio of espacios) {
    // Solo contar espacios habitables
    if (espaciosHabitables.includes(espacio.type)) {
      const capacidad = espacio.details?.capacidadPersonas;
      if (capacidad && capacidad > 0) {
        capacidadTotal += capacidad;
        tieneCapacidad = true;
      }
    }
  }

  return tieneCapacidad ? capacidadTotal : null;
}