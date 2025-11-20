/**
 * TIPOS PARA EL SISTEMA DE CUENTAS BANCARIAS
 * Fecha: 2025-11-20
 * Repositorio: rasv1.2
 * Descripción: Tipos TypeScript para la gestión de cuentas bancarias y de efectivo
 */

// ============================================================
// ENUMS Y TIPOS BASE
// ============================================================

/**
 * Tipos de cuenta disponibles
 */
export type TipoCuenta = 'bancaria' | 'efectivo'

/**
 * Monedas soportadas
 */
export type Moneda = 'MXN' | 'USD' | 'EUR'

/**
 * Símbolos de moneda para display
 */
export const SIMBOLOS_MONEDA: Record<Moneda, string> = {
  MXN: '$',
  USD: '$',
  EUR: '€'
}

/**
 * Nombres completos de monedas
 */
export const NOMBRES_MONEDA: Record<Moneda, string> = {
  MXN: 'Peso Mexicano',
  USD: 'Dólar Estadounidense',
  EUR: 'Euro'
}

// ============================================================
// INTERFACE PRINCIPAL: CUENTA
// ============================================================

/**
 * Cuenta bancaria o de efectivo
 * Representa una cuenta del sistema de balance
 */
export interface Cuenta {
  // Identificadores
  id: string
  user_id: string

  // Información básica
  nombre_cuenta: string
  descripcion?: string | null

  // Configuración financiera
  saldo_inicial: number
  saldo_actual: number
  moneda: Moneda
  tipo_cuenta: TipoCuenta

  // Información bancaria (opcional, solo para cuentas bancarias)
  banco?: string | null
  numero_cuenta?: string | null
  clabe?: string | null

  // Asociaciones
  propietarios_ids: string[] // UUIDs de propietarios
  propiedades_ids: string[] // UUIDs de propiedades

  // Configuración de reportes
  fecha_corte_dia: number // 1-31
  genera_estados_cuenta: boolean

  // Estado
  activa: boolean

  // Metadata
  created_at: string
  updated_at: string
}

// ============================================================
// INTERFACE PARA FORMULARIOS
// ============================================================

/**
 * Datos de formulario para crear/editar cuenta
 * Usado en AñadirCuentaModal
 */
export interface CuentaFormData {
  // Información básica (requerida)
  nombre_cuenta: string
  descripcion?: string
  saldo_inicial: number
  moneda: Moneda
  tipo_cuenta: TipoCuenta

  // Información bancaria (condicional: solo si tipo_cuenta === 'bancaria')
  banco?: string
  numero_cuenta?: string
  clabe?: string

  // Asociaciones (requeridas)
  propietarios_ids: string[]
  propiedades_ids: string[]

  // Configuración
  fecha_corte_dia: number
  genera_estados_cuenta: boolean
}

// ============================================================
// INTERFACES PARA DISPLAY/UI
// ============================================================

/**
 * Cuenta con datos calculados para display
 * Incluye nombres de propiedades en lugar de solo IDs
 */
export interface CuentaConPropiedades extends Cuenta {
  propiedades: {
    id: string
    nombre: string
  }[]
  propietarios: {
    id: string
    nombre: string
    email: string
  }[]
}

/**
 * Resumen financiero de una cuenta
 */
export interface ResumenCuenta {
  cuenta_id: string
  nombre_cuenta: string
  moneda: Moneda
  saldo_actual: number
  total_ingresos: number
  total_egresos: number
  cantidad_movimientos: number
  ultimo_movimiento_fecha?: string | null
}

/**
 * Resumen de balance por moneda
 */
export interface BalancePorMoneda {
  moneda: Moneda
  total_saldo: number
  cantidad_cuentas: number
  cuentas: {
    id: string
    nombre: string
    saldo: number
  }[]
}

// ============================================================
// OPCIONES PARA FORMULARIOS
// ============================================================

/**
 * Opciones de tipo de cuenta para selector
 */
export const TIPOS_CUENTA_OPCIONES: { value: TipoCuenta; label: string }[] = [
  { value: 'bancaria', label: 'Cuenta Bancaria' },
  { value: 'efectivo', label: 'Efectivo (Cash)' }
]

/**
 * Opciones de moneda para selector
 */
export const MONEDA_OPCIONES: { value: Moneda; label: string; simbolo: string }[] = [
  { value: 'MXN', label: 'Peso Mexicano', simbolo: '$' },
  { value: 'USD', label: 'Dólar Estadounidense', simbolo: '$' },
  { value: 'EUR', label: 'Euro', simbolo: '€' }
]

/**
 * Opciones de día de corte (1-31)
 */
export const DIAS_CORTE_OPCIONES = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `Día ${i + 1}`
}))

// ============================================================
// CONSTANTES DE VALIDACIÓN
// ============================================================

/**
 * Longitud de CLABE interbancaria (México)
 */
export const CLABE_LENGTH = 18

/**
 * Monto mínimo para saldo inicial
 */
export const SALDO_MINIMO = 0

/**
 * Monto máximo para saldo inicial (10 millones)
 */
export const SALDO_MAXIMO = 10_000_000

// ============================================================
// HELPERS/UTILIDADES
// ============================================================

/**
 * Formatea un monto con su símbolo de moneda
 * @param monto - Cantidad numérica
 * @param moneda - Tipo de moneda
 * @returns String formateado (ej: "$1,234.56")
 */
export function formatearMonto(monto: number, moneda: Moneda): string {
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return formatter.format(monto)
}

/**
 * Valida si una CLABE es válida (solo formato, no dígito verificador)
 * @param clabe - CLABE a validar
 * @returns true si tiene 18 dígitos numéricos
 */
export function validarCLABE(clabe: string): boolean {
  if (!clabe) return true // Opcional
  const regex = /^\d{18}$/
  return regex.test(clabe)
}

/**
 * Obtiene el nombre corto de la moneda
 * @param moneda - Tipo de moneda
 * @returns Código de 3 letras
 */
export function getNombreCortoMoneda(moneda: Moneda): string {
  return moneda
}

/**
 * Obtiene el símbolo de la moneda
 * @param moneda - Tipo de moneda
 * @returns Símbolo (ej: "$", "€")
 */
export function getSimboloMoneda(moneda: Moneda): string {
  return SIMBOLOS_MONEDA[moneda]
}

/**
 * Determina si una cuenta es bancaria
 * @param cuenta - Cuenta a verificar
 * @returns true si es bancaria
 */
export function esCuentaBancaria(cuenta: Cuenta | CuentaFormData): boolean {
  return cuenta.tipo_cuenta === 'bancaria'
}

/**
 * Determina si una cuenta es de efectivo
 * @param cuenta - Cuenta a verificar
 * @returns true si es efectivo
 */
export function esCuentaEfectivo(cuenta: Cuenta | CuentaFormData): boolean {
  return cuenta.tipo_cuenta === 'efectivo'
}

// ============================================================
// TIPOS PARA FILTROS
// ============================================================

/**
 * Filtros para listado de cuentas
 */
export interface CuentasFiltros {
  busqueda?: string
  tipo_cuenta?: TipoCuenta | 'todas'
  moneda?: Moneda | 'todas'
  propiedad_id?: string | 'todas'
  activa?: boolean | 'todas'
  ordenPor?: 'nombre' | 'saldo' | 'fecha'
  ordenDireccion?: 'asc' | 'desc'
}

/**
 * Resultado paginado de cuentas
 */
export interface CuentasPaginadas {
  cuentas: Cuenta[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
}

// ============================================================
// TIPOS PARA RESPUESTAS DE API
// ============================================================

/**
 * Respuesta exitosa al crear cuenta
 */
export interface CrearCuentaResponse {
  success: true
  cuenta: Cuenta
  message: string
}

/**
 * Respuesta de error al crear cuenta
 */
export interface ErrorCuentaResponse {
  success: false
  error: string
  details?: any
}

/**
 * Respuesta al obtener lista de cuentas
 */
export interface ListarCuentasResponse {
  success: true
  cuentas: Cuenta[]
  total: number
}

// ============================================================
// EXPORT DEFAULT (opcional)
// ============================================================

export default {
  SIMBOLOS_MONEDA,
  NOMBRES_MONEDA,
  TIPOS_CUENTA_OPCIONES,
  MONEDA_OPCIONES,
  DIAS_CORTE_OPCIONES,
  CLABE_LENGTH,
  SALDO_MINIMO,
  SALDO_MAXIMO
}
