/**
 * API SERVICE: Cuentas Bancarias e Ingresos
 * Funciones para gestionar cuentas bancarias, ingresos y movimientos
 */

import { supabase } from '@/lib/supabase/client'
import type { CuentaBancaria, NuevaCuentaBancaria, Ingreso, NuevoIngreso, MovimientoCuenta } from '@/types/property'

// ============================================================================
// CUENTAS BANCARIAS
// ============================================================================

/**
 * Obtener todas las cuentas del usuario actual
 */
export async function obtenerCuentasUsuario(): Promise<CuentaBancaria[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .select('*')
    .eq('propietario_id', user.id)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener cuentas de una propiedad específica
 */
export async function obtenerCuentasPropiedad(propiedadId: string): Promise<CuentaBancaria[]> {
  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .select('*')
    .eq('propiedad_id', propiedadId)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener todas las cuentas (usuario + todas sus propiedades)
 */
export async function obtenerTodasLasCuentas(): Promise<CuentaBancaria[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Obtener propiedades del usuario
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id')
    .eq('owner_id', user.id)

  const propiedadIds = propiedades?.map(p => p.id) || []

  // Obtener cuentas del usuario O de sus propiedades
  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .select('*')
    .or(`propietario_id.eq.${user.id},propiedad_id.in.(${propiedadIds.join(',')})`)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtener una cuenta por ID
 */
export async function obtenerCuentaPorId(cuentaId: string): Promise<CuentaBancaria | null> {
  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .select('*')
    .eq('id', cuentaId)
    .single()

  if (error) throw error
  return data
}

/**
 * Crear nueva cuenta bancaria
 */
export async function crearCuenta(cuenta: NuevaCuentaBancaria): Promise<CuentaBancaria> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Si no tiene propiedad_id, asignar al propietario
  const cuentaData = {
    ...cuenta,
    propietario_id: cuenta.propietario_id || (cuenta.propiedad_id ? null : user.id),
    activo: true
  }

  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .insert(cuentaData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Actualizar cuenta bancaria
 */
export async function actualizarCuenta(
  cuentaId: string,
  updates: Partial<NuevaCuentaBancaria>
): Promise<CuentaBancaria> {
  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', cuentaId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Eliminar cuenta (soft delete)
 */
export async function eliminarCuenta(cuentaId: string): Promise<void> {
  const { error } = await supabase
    .from('cuentas_bancarias')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', cuentaId)

  if (error) throw error
}

/**
 * Eliminar cuenta permanentemente
 */
export async function eliminarCuentaDefinitivo(cuentaId: string): Promise<void> {
  const { error } = await supabase
    .from('cuentas_bancarias')
    .delete()
    .eq('id', cuentaId)

  if (error) throw error
}

/**
 * Ajustar balance manualmente (para correcciones)
 */
export async function ajustarBalance(cuentaId: string, nuevoBalance: number): Promise<CuentaBancaria> {
  const { data, error } = await supabase
    .from('cuentas_bancarias')
    .update({
      balance_actual: nuevoBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', cuentaId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// INGRESOS
// ============================================================================

/**
 * Obtener ingresos de una propiedad
 */
export async function obtenerIngresosPropiedad(
  propiedadId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<Ingreso[]> {
  let query = supabase
    .from('ingresos')
    .select('*')
    .eq('propiedad_id', propiedadId)
    .order('fecha_ingreso', { ascending: false })

  if (fechaInicio) {
    query = query.gte('fecha_ingreso', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha_ingreso', fechaFin)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Obtener todos los ingresos del usuario
 */
export async function obtenerTodosLosIngresos(
  fechaInicio?: string,
  fechaFin?: string
): Promise<Ingreso[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Obtener propiedades del usuario
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id')
    .eq('owner_id', user.id)

  const propiedadIds = propiedades?.map(p => p.id) || []

  if (propiedadIds.length === 0) return []

  let query = supabase
    .from('ingresos')
    .select('*')
    .in('propiedad_id', propiedadIds)
    .order('fecha_ingreso', { ascending: false })

  if (fechaInicio) {
    query = query.gte('fecha_ingreso', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha_ingreso', fechaFin)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Obtener ingresos de una cuenta específica
 */
export async function obtenerIngresosCuenta(
  cuentaId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<Ingreso[]> {
  let query = supabase
    .from('ingresos')
    .select('*')
    .eq('cuenta_id', cuentaId)
    .order('fecha_ingreso', { ascending: false })

  if (fechaInicio) {
    query = query.gte('fecha_ingreso', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha_ingreso', fechaFin)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Crear nuevo ingreso
 */
export async function crearIngreso(ingreso: NuevoIngreso): Promise<Ingreso> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { data, error } = await supabase
    .from('ingresos')
    .insert({
      ...ingreso,
      creado_por: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Actualizar ingreso
 */
export async function actualizarIngreso(
  ingresoId: string,
  updates: Partial<NuevoIngreso>
): Promise<Ingreso> {
  const { data, error } = await supabase
    .from('ingresos')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', ingresoId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Eliminar ingreso
 */
export async function eliminarIngreso(ingresoId: string): Promise<void> {
  const { error } = await supabase
    .from('ingresos')
    .delete()
    .eq('id', ingresoId)

  if (error) throw error
}

// ============================================================================
// MOVIMIENTOS (INGRESOS + EGRESOS)
// ============================================================================

/**
 * Obtener movimientos de una cuenta específica
 */
export async function obtenerMovimientosCuenta(
  cuentaId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<MovimientoCuenta[]> {
  let query = supabase
    .from('v_movimientos_cuenta')
    .select('*')
    .eq('cuenta_id', cuentaId)
    .order('fecha', { ascending: false })

  if (fechaInicio) {
    query = query.gte('fecha', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha', fechaFin)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Obtener movimientos de una propiedad
 */
export async function obtenerMovimientosPropiedad(
  propiedadId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<MovimientoCuenta[]> {
  let query = supabase
    .from('v_movimientos_cuenta')
    .select('*')
    .eq('propiedad_id', propiedadId)
    .order('fecha', { ascending: false })

  if (fechaInicio) {
    query = query.gte('fecha', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha', fechaFin)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Obtener todos los movimientos del usuario
 */
export async function obtenerTodosLosMovimientos(
  fechaInicio?: string,
  fechaFin?: string
): Promise<MovimientoCuenta[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // Obtener propiedades del usuario
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id')
    .eq('owner_id', user.id)

  const propiedadIds = propiedades?.map(p => p.id) || []

  if (propiedadIds.length === 0) return []

  let query = supabase
    .from('v_movimientos_cuenta')
    .select('*')
    .in('propiedad_id', propiedadIds)
    .order('fecha', { ascending: false })

  if (fechaInicio) {
    query = query.gte('fecha', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha', fechaFin)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// ============================================================================
// ESTADÍSTICAS Y RESÚMENES
// ============================================================================

/**
 * Calcular resumen de una cuenta
 */
export async function obtenerResumenCuenta(
  cuentaId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<{
  balance_actual: number
  total_ingresos: number
  total_egresos: number
  cantidad_ingresos: number
  cantidad_egresos: number
}> {
  const cuenta = await obtenerCuentaPorId(cuentaId)
  if (!cuenta) throw new Error('Cuenta no encontrada')

  const movimientos = await obtenerMovimientosCuenta(cuentaId, fechaInicio, fechaFin)

  const total_ingresos = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const total_egresos = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const cantidad_ingresos = movimientos.filter(m => m.tipo === 'ingreso').length
  const cantidad_egresos = movimientos.filter(m => m.tipo === 'egreso').length

  return {
    balance_actual: cuenta.balance_actual,
    total_ingresos,
    total_egresos,
    cantidad_ingresos,
    cantidad_egresos
  }
}

/**
 * Calcular resumen de una propiedad
 */
export async function obtenerResumenPropiedad(
  propiedadId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<{
  total_ingresos: number
  total_egresos: number
  balance: number
  cantidad_ingresos: number
  cantidad_egresos: number
}> {
  const movimientos = await obtenerMovimientosPropiedad(propiedadId, fechaInicio, fechaFin)

  const total_ingresos = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const total_egresos = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const cantidad_ingresos = movimientos.filter(m => m.tipo === 'ingreso').length
  const cantidad_egresos = movimientos.filter(m => m.tipo === 'egreso').length

  return {
    total_ingresos,
    total_egresos,
    balance: total_ingresos - total_egresos,
    cantidad_ingresos,
    cantidad_egresos
  }
}

/**
 * Calcular balance total del usuario (todas las cuentas)
 */
export async function obtenerBalanceTotalUsuario(): Promise<{
  balance_total_mxn: number
  balance_total_usd: number
  cantidad_cuentas: number
  cuentas: CuentaBancaria[]
}> {
  const cuentas = await obtenerTodasLasCuentas()

  const balance_total_mxn = cuentas
    .filter(c => c.tipo_moneda === 'MXN')
    .reduce((sum, c) => sum + c.balance_actual, 0)

  const balance_total_usd = cuentas
    .filter(c => c.tipo_moneda === 'USD')
    .reduce((sum, c) => sum + c.balance_actual, 0)

  return {
    balance_total_mxn,
    balance_total_usd,
    cantidad_cuentas: cuentas.length,
    cuentas
  }
}
