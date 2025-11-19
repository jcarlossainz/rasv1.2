/**
 * LOGGER - Sistema de Logging Condicional
 * ========================================
 * 
 * Este módulo proporciona un sistema de logging que:
 * 1. Solo muestra logs en desarrollo
 * 2. Puede ser extendido para enviar a servicios externos (Sentry, LogRocket, etc.)
 * 3. Mantiene la misma API que console pero controlada
 * 
 * USO:
 * import { logger } from '@/lib/logger'
 * 
 * logger.log('Mensaje de debug')
 * logger.error('Error ocurrido', error)
 * logger.warn('Advertencia')
 * logger.info('Información')
 */

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Configuración de qué mostrar en cada ambiente
const config = {
  development: {
    log: true,
    info: true,
    warn: true,
    error: true,
    debug: true,
    trace: true,
  },
  production: {
    log: false,      // No mostrar logs normales en producción
    info: false,     // No mostrar info en producción
    warn: false,     // No mostrar warnings en producción
    error: true,     // Sí mostrar errores en producción (pueden ir a Sentry)
    debug: false,    // No debug en producción
    trace: false,    // No trace en producción
  }
}

// Configuración actual según ambiente
const currentConfig = isDevelopment ? config.development : config.production

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/**
 * Formatea el timestamp para los logs
 */
function getTimestamp(): string {
  const now = new Date()
  return now.toISOString().split('T')[1].split('.')[0] // HH:MM:SS
}

/**
 * Formatea el contexto del log con colores (solo en desarrollo)
 */
function formatContext(level: string): string {
  if (!isDevelopment) return ''
  
  const colors = {
    log: '\x1b[36m',     // Cyan
    info: '\x1b[34m',    // Blue
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    debug: '\x1b[35m',   // Magenta
    trace: '\x1b[37m',   // White
    reset: '\x1b[0m',
  }
  
  const color = colors[level as keyof typeof colors] || colors.reset
  const timestamp = getTimestamp()
  
  return `${color}[${level.toUpperCase()}] [${timestamp}]${colors.reset}`
}

// ============================================================================
// INTEGRACIÓN CON SERVICIOS EXTERNOS
// ============================================================================

/**
 * Envía errores a Sentry (si está configurado)
 * Puedes descomentar y configurar cuando tengas Sentry instalado
 */
function sendToSentry(error: Error, context?: any): void {
  // TODO: Implementar cuando se instale Sentry
  // if (isProduction && window.Sentry) {
  //   Sentry.captureException(error, {
  //     extra: context,
  //   })
  // }
}

/**
 * Envía eventos a analytics (si está configurado)
 */
function sendToAnalytics(event: string, data?: any): void {
  // TODO: Implementar cuando se configure analytics
  // if (isProduction && window.gtag) {
  //   gtag('event', event, data)
  // }
}

// ============================================================================
// LOGGER PRINCIPAL
// ============================================================================

export const logger = {
  /**
   * Log normal - Para debugging general
   * Solo visible en desarrollo
   */
  log(...args: any[]): void {
    if (currentConfig.log) {
      console.log(formatContext('log'), ...args)
    }
  },

  /**
   * Info - Para información importante pero no crítica
   * Solo visible en desarrollo
   */
  info(...args: any[]): void {
    if (currentConfig.info) {
      console.info(formatContext('info'), ...args)
    }
  },

  /**
   * Warning - Para advertencias que no rompen la app
   * Solo visible en desarrollo
   */
  warn(...args: any[]): void {
    if (currentConfig.warn) {
      console.warn(formatContext('warn'), ...args)
    }
  },

  /**
   * Error - Para errores que deben ser atendidos
   * Visible en desarrollo Y producción (puede ir a Sentry)
   */
  error(message: string, error?: Error | any, context?: any): void {
    if (currentConfig.error) {
      console.error(formatContext('error'), message, error, context)
      
      // En producción, enviar a Sentry
      if (isProduction && error instanceof Error) {
        sendToSentry(error, { message, ...context })
      }
    }
  },

  /**
   * Debug - Para debugging detallado
   * Solo visible en desarrollo
   */
  debug(...args: any[]): void {
    if (currentConfig.debug) {
      console.debug(formatContext('debug'), ...args)
    }
  },

  /**
   * Trace - Para seguimiento de ejecución
   * Solo visible en desarrollo
   */
  trace(...args: any[]): void {
    if (currentConfig.trace) {
      console.trace(formatContext('trace'), ...args)
    }
  },

  /**
   * Group - Para agrupar logs relacionados
   */
  group(label: string): void {
    if (isDevelopment) {
      console.group(formatContext('log'), label)
    }
  },

  /**
   * GroupEnd - Cierra un grupo de logs
   */
  groupEnd(): void {
    if (isDevelopment) {
      console.groupEnd()
    }
  },

  /**
   * Time - Inicia un timer
   */
  time(label: string): void {
    if (isDevelopment) {
      console.time(label)
    }
  },

  /**
   * TimeEnd - Finaliza un timer y muestra el tiempo
   */
  timeEnd(label: string): void {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  },

  /**
   * Table - Muestra datos en formato tabla
   */
  table(data: any): void {
    if (isDevelopment) {
      console.table(data)
    }
  },
}

// ============================================================================
// LOGGERS ESPECIALIZADOS
// ============================================================================

/**
 * Logger para APIs y requests HTTP
 */
export const apiLogger = {
  request(method: string, url: string, data?: any): void {
    logger.group(`API Request: ${method} ${url}`)
    logger.log('Data:', data)
    logger.groupEnd()
  },

  response(status: number, url: string, data?: any): void {
    const isError = status >= 400
    if (isError) {
      logger.error(`API Error: ${status} ${url}`, new Error('API Error'), { data })
    } else {
      logger.log(`API Response: ${status} ${url}`, data)
    }
  },

  error(error: any, url: string): void {
    logger.error('API Error', error, { url })
  }
}

/**
 * Logger para operaciones de base de datos (Supabase)
 */
export const dbLogger = {
  query(operation: string, table: string, params?: any): void {
    logger.debug(`DB Query: ${operation} on ${table}`, params)
  },

  result(operation: string, table: string, count?: number): void {
    logger.debug(`DB Result: ${operation} on ${table}`, count ? `${count} rows` : '')
  },

  error(operation: string, table: string, error: any): void {
    logger.error(`DB Error: ${operation} on ${table}`, error)
  }
}

/**
 * Logger para autenticación y seguridad
 */
export const authLogger = {
  login(userId: string, email?: string): void {
    logger.info('User logged in', { userId, email })
    if (isProduction) {
      sendToAnalytics('login', { userId })
    }
  },

  logout(userId: string): void {
    logger.info('User logged out', { userId })
    if (isProduction) {
      sendToAnalytics('logout', { userId })
    }
  },

  error(action: string, error: any): void {
    logger.error(`Auth Error: ${action}`, error)
  }
}

/**
 * Logger para seguimiento de rendimiento
 */
export const performanceLogger = {
  start(label: string): void {
    logger.time(label)
  },

  end(label: string): void {
    logger.timeEnd(label)
  },

  measure(label: string, duration: number): void {
    logger.log(`Performance: ${label} took ${duration}ms`)
  }
}

// ============================================================================
// HELPERS PARA DEBUGGING
// ============================================================================

/**
 * Pretty print de objetos complejos
 */
export function prettyPrint(obj: any, label?: string): void {
  if (!isDevelopment) return
  
  if (label) {
    console.group(label)
  }
  
  console.log(JSON.stringify(obj, null, 2))
  
  if (label) {
    console.groupEnd()
  }
}

/**
 * Assert - Para validaciones en desarrollo
 */
export function assert(condition: boolean, message: string): void {
  if (isDevelopment && !condition) {
    logger.error('Assertion failed', new Error(message))
    throw new Error(`Assertion failed: ${message}`)
  }
}

/**
 * Deprecation warning
 */
export function deprecated(oldMethod: string, newMethod: string): void {
  if (isDevelopment) {
    logger.warn(`DEPRECATED: ${oldMethod} is deprecated. Use ${newMethod} instead.`)
  }
}

// ============================================================================
// EXPORTACIÓN DEFAULT
// ============================================================================

export default logger

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/**
 * MIGRACIÓN DE console.log A logger:
 * 
 * ANTES:
 * console.log('Propiedad cargada:', propiedad)
 * console.error('Error:', error)
 * console.warn('Advertencia')
 * 
 * DESPUÉS:
 * import { logger } from '@/lib/logger'
 * 
 * logger.log('Propiedad cargada:', propiedad)      // Solo en desarrollo
 * logger.error('Error:', error)                    // En desarrollo Y producción
 * logger.warn('Advertencia')                       // Solo en desarrollo
 * 
 * 
 * USO DE LOGGERS ESPECIALIZADOS:
 * 
 * import { apiLogger, dbLogger, authLogger } from '@/lib/logger'
 * 
 * // API
 * apiLogger.request('GET', '/api/propiedades')
 * apiLogger.response(200, '/api/propiedades', data)
 * 
 * // Base de datos
 * dbLogger.query('SELECT', 'propiedades', { id })
 * dbLogger.result('SELECT', 'propiedades', data.length)
 * 
 * // Autenticación
 * authLogger.login(user.id, user.email)
 * authLogger.logout(user.id)
 * 
 * 
 * DEBUGGING AVANZADO:
 * 
 * import { logger, prettyPrint, assert } from '@/lib/logger'
 * 
 * // Agrupar logs relacionados
 * logger.group('Cargando propiedad')
 * logger.log('ID:', id)
 * logger.log('Datos:', data)
 * logger.groupEnd()
 * 
 * // Medir rendimiento
 * logger.time('cargarPropiedad')
 * await cargarPropiedad()
 * logger.timeEnd('cargarPropiedad')
 * 
 * // Pretty print
 * prettyPrint(propiedad, 'Propiedad completa')
 * 
 * // Assertions
 * assert(propiedad.id, 'Propiedad debe tener ID')
 */
