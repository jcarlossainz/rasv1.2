/**
 * SCHEMAS DE VALIDACIÓN CON ZOD - CUENTAS
 * Fecha: 2025-11-20
 * Repositorio: rasv1.2
 * Descripción: Esquemas de validación para formularios de cuentas bancarias
 */

import { z } from 'zod'
import { CLABE_LENGTH, SALDO_MINIMO, SALDO_MAXIMO } from '@/types/cuenta'

// ============================================================
// SCHEMA PRINCIPAL: CUENTA
// ============================================================

/**
 * Schema de validación para crear/editar cuenta
 */
export const cuentaSchema = z.object({
  // Información básica (requerida)
  nombre_cuenta: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .trim(),

  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  saldo_inicial: z
    .number({
      required_error: 'El saldo inicial es requerido',
      invalid_type_error: 'El saldo inicial debe ser un número'
    })
    .min(SALDO_MINIMO, `El saldo inicial no puede ser negativo`)
    .max(SALDO_MAXIMO, `El saldo inicial no puede exceder $${SALDO_MAXIMO.toLocaleString()}`),

  moneda: z.enum(['MXN', 'USD', 'EUR'], {
    required_error: 'Debes seleccionar una moneda',
    invalid_type_error: 'Moneda inválida'
  }),

  tipo_cuenta: z.enum(['bancaria', 'efectivo'], {
    required_error: 'Debes seleccionar un tipo de cuenta',
    invalid_type_error: 'Tipo de cuenta inválido'
  }),

  // Información bancaria (condicional)
  banco: z
    .string()
    .min(2, 'El nombre del banco debe tener al menos 2 caracteres')
    .max(255, 'El nombre del banco no puede exceder 255 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  numero_cuenta: z
    .string()
    .min(4, 'El número de cuenta debe tener al menos 4 caracteres')
    .max(100, 'El número de cuenta no puede exceder 100 caracteres')
    .trim()
    .optional()
    .or(z.literal('')),

  clabe: z
    .string()
    .length(CLABE_LENGTH, `La CLABE debe tener exactamente ${CLABE_LENGTH} dígitos`)
    .regex(/^\d+$/, 'La CLABE debe contener solo números')
    .optional()
    .or(z.literal('')),

  // Asociaciones (requeridas)
  propietarios_ids: z
    .array(z.string().uuid('ID de propietario inválido'))
    .min(1, 'Debes seleccionar al menos un propietario')
    .max(50, 'No puedes asociar más de 50 propietarios'),

  propiedades_ids: z
    .array(z.string().uuid('ID de propiedad inválido'))
    .min(1, 'Debes seleccionar al menos una propiedad')
    .max(100, 'No puedes asociar más de 100 propiedades'),

  // Configuración
  fecha_corte_dia: z
    .number()
    .int('El día de corte debe ser un número entero')
    .min(1, 'El día de corte debe ser entre 1 y 31')
    .max(31, 'El día de corte debe ser entre 1 y 31'),

  genera_estados_cuenta: z.boolean()

}).refine(
  (data) => {
    // Validación condicional: Si es cuenta bancaria, debe tener al menos el nombre del banco
    if (data.tipo_cuenta === 'bancaria') {
      return data.banco && data.banco.length > 0
    }
    return true
  },
  {
    message: 'Las cuentas bancarias deben tener un banco asociado',
    path: ['banco']
  }
).refine(
  (data) => {
    // Validación condicional: Si tiene CLABE, debe ser cuenta bancaria y moneda MXN
    if (data.clabe && data.clabe.length > 0) {
      return data.tipo_cuenta === 'bancaria' && data.moneda === 'MXN'
    }
    return true
  },
  {
    message: 'La CLABE solo aplica para cuentas bancarias en MXN',
    path: ['clabe']
  }
)

/**
 * Tipo inferido del schema de cuenta
 */
export type CuentaSchemaType = z.infer<typeof cuentaSchema>

// ============================================================
// SCHEMAS PARCIALES (para actualizaciones parciales)
// ============================================================

/**
 * Schema parcial para actualizar solo algunos campos de cuenta
 */
export const cuentaParcialSchema = cuentaSchema.partial()

/**
 * Schema para desactivar cuenta
 */
export const desactivarCuentaSchema = z.object({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  razon: z.string().min(10, 'Debe proporcionar una razón de al menos 10 caracteres').optional()
})

// ============================================================
// SCHEMAS PARA FILTROS
// ============================================================

/**
 * Schema de validación para filtros de cuentas
 */
export const cuentasFiltrosSchema = z.object({
  busqueda: z.string().max(255).optional(),
  tipo_cuenta: z.enum(['bancaria', 'efectivo', 'todas']).optional(),
  moneda: z.enum(['MXN', 'USD', 'EUR', 'todas']).optional(),
  propiedad_id: z.string().uuid().or(z.literal('todas')).optional(),
  activa: z.boolean().or(z.literal('todas')).optional(),
  ordenPor: z.enum(['nombre', 'saldo', 'fecha']).optional(),
  ordenDireccion: z.enum(['asc', 'desc']).optional()
})

/**
 * Tipo inferido del schema de filtros
 */
export type CuentasFiltrosSchemaType = z.infer<typeof cuentasFiltrosSchema>

// ============================================================
// SCHEMAS PARA PAGINACIÓN
// ============================================================

/**
 * Schema para parámetros de paginación
 */
export const paginacionSchema = z.object({
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(20)
})

/**
 * Tipo inferido del schema de paginación
 */
export type PaginacionSchemaType = z.infer<typeof paginacionSchema>

// ============================================================
// HELPERS DE VALIDACIÓN
// ============================================================

/**
 * Valida datos de cuenta y retorna errores formateados
 * @param data - Datos a validar
 * @returns Objeto con éxito y datos validados o errores
 */
export function validarCuentaData(data: unknown): {
  success: boolean
  data?: CuentaSchemaType
  errors?: Record<string, string[]>
} {
  const result = cuentaSchema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data
    }
  } else {
    const errors: Record<string, string[]> = {}
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(issue.message)
    })

    return {
      success: false,
      errors
    }
  }
}

// ============================================================
// MENSAJES DE ERROR PERSONALIZADOS
// ============================================================

export const MENSAJES_ERROR = {
  NOMBRE_REQUERIDO: 'El nombre de la cuenta es requerido',
  NOMBRE_MINIMO: 'El nombre debe tener al menos 3 caracteres',
  SALDO_NEGATIVO: 'El saldo no puede ser negativo',
  MONEDA_INVALIDA: 'Moneda inválida. Selecciona MXN, USD o EUR',
  TIPO_INVALIDO: 'Tipo de cuenta inválido. Selecciona bancaria o efectivo',
  PROPIEDADES_REQUERIDAS: 'Debes seleccionar al menos una propiedad',
  BANCO_REQUERIDO: 'Las cuentas bancarias deben tener un banco asociado',
  CLABE_FORMATO: 'La CLABE debe tener 18 dígitos numéricos',
  CLABE_SOLO_MXN: 'La CLABE solo aplica para cuentas en MXN'
} as const
