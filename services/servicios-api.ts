// services/servicios-api.ts
// Funciones para interactuar con los servicios del inmueble en Supabase

import { createClient } from '@supabase/supabase-js';
import { ServicioInmueble, FechaPagoServicio } from '@/types/property';

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// SERVICIOS
// ============================================

/**
 * Obtener todos los servicios de una propiedad
 */
export async function obtenerServiciosPropiedad(propiedadId: string) {
  const { data, error } = await supabase
    .from('servicios_inmueble')
    .select('*')
    .eq('propiedad_id', propiedadId)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error obteniendo servicios:', error);
    throw error;
  }

  return data as ServicioInmueble[];
}

/**
 * Crear un nuevo servicio
 */
export async function crearServicio(servicio: Omit<ServicioInmueble, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('servicios_inmueble')
    .insert([servicio])
    .select()
    .single();

  if (error) {
    console.error('Error creando servicio:', error);
    throw error;
  }

  return data as ServicioInmueble;
}

/**
 * Actualizar un servicio existente
 */
export async function actualizarServicio(servicioId: string, updates: Partial<ServicioInmueble>) {
  const { data, error } = await supabase
    .from('servicios_inmueble')
    .update(updates)
    .eq('id', servicioId)
    .select()
    .single();

  if (error) {
    console.error('Error actualizando servicio:', error);
    throw error;
  }

  return data as ServicioInmueble;
}

/**
 * Eliminar (desactivar) un servicio
 */
export async function eliminarServicio(servicioId: string) {
  const { error } = await supabase
    .from('servicios_inmueble')
    .update({ activo: false })
    .eq('id', servicioId);

  if (error) {
    console.error('Error eliminando servicio:', error);
    throw error;
  }

  return true;
}

/**
 * Eliminar definitivamente un servicio (hard delete)
 */
export async function eliminarServicioDefinitivo(servicioId: string) {
  const { error } = await supabase
    .from('servicios_inmueble')
    .delete()
    .eq('id', servicioId);

  if (error) {
    console.error('Error eliminando servicio definitivamente:', error);
    throw error;
  }

  return true;
}

// ============================================
// FECHAS DE PAGO
// ============================================

/**
 * Obtener fechas de pago de un servicio
 */
export async function obtenerFechasPagoServicio(servicioId: string) {
  const { data, error } = await supabase
    .from('fechas_pago_servicios')
    .select('*')
    .eq('servicio_id', servicioId)
    .order('fecha_pago', { ascending: true });

  if (error) {
    console.error('Error obteniendo fechas de pago:', error);
    throw error;
  }

  return data as FechaPagoServicio[];
}

/**
 * Obtener próximas fechas de pago de una propiedad
 */
export async function obtenerProximosPagosPropiedad(propiedadId: string, limite: number = 10) {
  const { data, error } = await supabase
    .from('v_proximos_pagos')
    .select('*')
    .eq('propiedad_id', propiedadId)
    .eq('pagado', false)
    .order('fecha_pago', { ascending: true })
    .limit(limite);

  if (error) {
    console.error('Error obteniendo próximos pagos:', error);
    throw error;
  }

  return data;
}

/**
 * Obtener todos los pagos pendientes del usuario
 */
export async function obtenerTodosPagosPendientes() {
  const { data, error } = await supabase
    .from('v_proximos_pagos')
    .select('*')
    .eq('pagado', false)
    .order('fecha_pago', { ascending: true });

  if (error) {
    console.error('Error obteniendo pagos pendientes:', error);
    throw error;
  }

  return data;
}

/**
 * Obtener pagos vencidos
 */
export async function obtenerPagosVencidos(propiedadId?: string) {
  let query = supabase
    .from('v_proximos_pagos')
    .select('*')
    .eq('estado_urgencia', 'vencido');

  if (propiedadId) {
    query = query.eq('propiedad_id', propiedadId);
  }

  const { data, error } = await query.order('fecha_pago', { ascending: true });

  if (error) {
    console.error('Error obteniendo pagos vencidos:', error);
    throw error;
  }

  return data;
}

/**
 * Marcar un pago como realizado
 */
export async function marcarPagoRealizado(
  pagoId: string,
  montoReal: number,
  metodoPago?: string,
  referencia?: string,
  notas?: string
) {
  const { data, error } = await supabase
    .from('fechas_pago_servicios')
    .update({
      pagado: true,
      fecha_pago_real: new Date().toISOString().split('T')[0],
      monto_real: montoReal,
      metodo_pago: metodoPago,
      referencia_pago: referencia,
      notas: notas
    })
    .eq('id', pagoId)
    .select()
    .single();

  if (error) {
    console.error('Error marcando pago como realizado:', error);
    throw error;
  }

  return data;
}

/**
 * Desmarcar un pago (volver a pendiente)
 */
export async function desmarcarPago(pagoId: string) {
  const { data, error } = await supabase
    .from('fechas_pago_servicios')
    .update({
      pagado: false,
      fecha_pago_real: null,
      monto_real: null,
      metodo_pago: null,
      referencia_pago: null
    })
    .eq('id', pagoId)
    .select()
    .single();

  if (error) {
    console.error('Error desmarcando pago:', error);
    throw error;
  }

  return data;
}

/**
 * Regenerar fechas de pago manualmente
 */
export async function regenerarFechasPago(servicioId: string, cantidadFechas: number = 6) {
  const { data, error } = await supabase.rpc('generar_fechas_pago_servicio', {
    p_servicio_id: servicioId,
    p_cantidad_fechas: cantidadFechas
  });

  if (error) {
    console.error('Error regenerando fechas de pago:', error);
    throw error;
  }

  return data;
}

// ============================================
// ESTADÍSTICAS Y RESÚMENES
// ============================================

/**
 * Obtener resumen de pagos por propiedad
 */
export async function obtenerResumenPagosPropiedad(propiedadId: string) {
  const { data, error } = await supabase
    .from('fechas_pago_servicios')
    .select('pagado, monto_estimado, fecha_pago')
    .eq('propiedad_id', propiedadId);

  if (error) {
    console.error('Error obteniendo resumen:', error);
    throw error;
  }

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  const resumen = {
    total_pendientes: 0,
    monto_pendiente: 0,
    total_vencidos: 0,
    monto_vencido: 0,
    pagos_este_mes: 0,
    monto_este_mes: 0
  };

  data.forEach(pago => {
    const fechaPago = new Date(pago.fecha_pago);
    
    if (!pago.pagado) {
      resumen.total_pendientes++;
      resumen.monto_pendiente += pago.monto_estimado;

      if (fechaPago < hoy) {
        resumen.total_vencidos++;
        resumen.monto_vencido += pago.monto_estimado;
      }

      if (fechaPago >= inicioMes && fechaPago <= finMes) {
        resumen.pagos_este_mes++;
        resumen.monto_este_mes += pago.monto_estimado;
      }
    }
  });

  return resumen;
}

/**
 * Obtener gastos mensuales de una propiedad
 */
export async function obtenerGastosMensuales(propiedadId: string) {
  const { data, error } = await supabase
    .from('servicios_inmueble')
    .select('tipo_servicio, nombre, monto, frecuencia_valor, frecuencia_unidad')
    .eq('propiedad_id', propiedadId)
    .eq('activo', true);

  if (error) {
    console.error('Error obteniendo gastos mensuales:', error);
    throw error;
  }

  // Calcular gasto mensual promedio
  let gastoMensualTotal = 0;

  data.forEach(servicio => {
    let montoMensual = servicio.monto;

    // Convertir a monto mensual según frecuencia
    switch (servicio.frecuencia_unidad) {
      case 'dias':
        montoMensual = (servicio.monto / servicio.frecuencia_valor) * 30;
        break;
      case 'semanas':
        montoMensual = (servicio.monto / servicio.frecuencia_valor) * 4.33;
        break;
      case 'meses':
        montoMensual = servicio.monto / servicio.frecuencia_valor;
        break;
      case 'anos':
        montoMensual = servicio.monto / (servicio.frecuencia_valor * 12);
        break;
    }

    gastoMensualTotal += montoMensual;
  });

  return {
    servicios: data,
    gasto_mensual_promedio: gastoMensualTotal
  };
}

