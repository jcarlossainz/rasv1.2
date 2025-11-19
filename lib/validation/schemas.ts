/**
 * Esquemas de Validación Zod
 * Centralización de validaciones para formularios críticos
 */

import { z } from 'zod'

// ========================================
// AUTENTICACIÓN
// ========================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
})

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z
    .string()
    .min(1, 'Confirma tu contraseña'),
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})

// ========================================
// CONTACTOS (DIRECTORIO)
// ========================================

export const contactoSchema = z.object({
  full_name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  email: z
    .string()
    .email('Correo electrónico inválido')
    .or(z.literal('')), // Permitir vacío
  telefono: z
    .string()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .or(z.literal('')), // Permitir vacío
  tipo: z.enum(['inquilino', 'propietario', 'proveedor', 'supervisor'], {
    required_error: 'Selecciona un tipo de contacto'
  }),
  categoria_proveedor: z.string().optional(),
  notas: z.string().max(500, 'Las notas son demasiado largas').optional(),
  activo: z.boolean().default(true)
})

// ========================================
// PROPIEDADES (WIZARD - STEP 1)
// ========================================

export const propiedadStep1Schema = z.object({
  nombre_propiedad: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  tipo_propiedad: z
    .string()
    .min(1, 'Selecciona un tipo de propiedad'),
  estados: z
    .array(z.string())
    .min(1, 'Selecciona al menos un estado'),
  mobiliario: z
    .string()
    .min(1, 'Selecciona el tipo de mobiliario'),
  capacidad_personas: z
    .number()
    .min(1, 'Debe tener capacidad para al menos 1 persona')
    .max(100, 'Capacidad máxima: 100 personas')
    .optional()
    .nullable(),
  dimensiones: z.object({
    terreno: z.object({
      valor: z.number().min(0, 'El valor debe ser positivo'),
      unidad: z.enum(['m²', 'ft²', 'hectáreas'])
    }).optional(),
    construccion: z.object({
      valor: z.number().min(0, 'El valor debe ser positivo'),
      unidad: z.enum(['m²', 'ft²'])
    }).optional()
  }).optional()
})

// ========================================
// UBICACIÓN (WIZARD - STEP 2)
// ========================================

export const ubicacionSchema = z.object({
  calle: z.string().min(1, 'La calle es requerida'),
  colonia: z.string().min(1, 'La colonia es requerida'),
  codigo_postal: z
    .string()
    .regex(/^\d{5}$/, 'Código postal inválido (5 dígitos)'),
  ciudad: z.string().min(1, 'La ciudad es requerida'),
  estado: z.string().min(1, 'El estado es requerido'),
  pais: z.string().default('México'),
  google_maps_link: z
    .string()
    .url('URL de Google Maps inválida')
    .optional()
    .or(z.literal(''))
})

// ========================================
// TICKETS/PAGOS
// ========================================

export const ticketSchema = z.object({
  titulo: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título es demasiado largo'),
  fecha_programada: z
    .string()
    .min(1, 'La fecha es requerida'),
  monto_estimado: z
    .number()
    .min(0, 'El monto debe ser positivo')
    .optional()
    .nullable(),
  tipo_ticket: z.enum(['pago', 'mantenimiento', 'reparacion', 'otro']),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).default('media'),
  estado: z.enum(['pendiente', 'en_proceso', 'completado', 'cancelado']).default('pendiente'),
  notas: z.string().max(1000, 'Las notas son demasiado largas').optional()
})

// ========================================
// TIPOS (TypeScript Inference)
// ========================================

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ContactoInput = z.infer<typeof contactoSchema>
export type PropiedadStep1Input = z.infer<typeof propiedadStep1Schema>
export type UbicacionInput = z.infer<typeof ubicacionSchema>
export type TicketInput = z.infer<typeof ticketSchema>
