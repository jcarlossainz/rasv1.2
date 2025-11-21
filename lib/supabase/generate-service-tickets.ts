/**
 * Generador de Tickets Automáticos desde Servicios
 * =================================================
 *
 * Esta función genera tickets recurrentes en la tabla fechas_pago_servicios
 * basándose en los servicios configurados en una propiedad.
 *
 * Genera tickets para los próximos 3 meses a partir de la fecha actual.
 */

import { supabase } from './client';
import { Service } from '@/types/property';

interface GenerateTicketsParams {
  propertyId: string;
  services: Service[];
}

/**
 * Calcula las próximas N fechas de pago para un servicio
 */
function calcularProximasFechas(
  lastPaymentDate: string,
  frecuenciaCantidad: number,
  frecuenciaUnidad: 'dia' | 'mes' | 'año',
  cantidadFechas: number
): Date[] {
  const fechas: Date[] = [];
  const fechaBase = new Date(lastPaymentDate + 'T00:00:00');

  for (let i = 1; i <= cantidadFechas; i++) {
    const nuevaFecha = new Date(fechaBase);

    if (frecuenciaUnidad === 'dia') {
      nuevaFecha.setDate(fechaBase.getDate() + (frecuenciaCantidad * i));
    } else if (frecuenciaUnidad === 'mes') {
      nuevaFecha.setMonth(fechaBase.getMonth() + (frecuenciaCantidad * i));
    } else if (frecuenciaUnidad === 'año') {
      nuevaFecha.setFullYear(fechaBase.getFullYear() + (frecuenciaCantidad * i));
    }

    fechas.push(nuevaFecha);
  }

  return fechas;
}

/**
 * Genera registros de servicios_inmueble desde los servicios del wizard
 */
async function crearRegistrosServicios(
  propertyId: string,
  services: Service[]
): Promise<Map<string, string>> {
  // Map: wizard service ID -> DB service ID
  const serviceIdMap = new Map<string, string>();

  try {
    // Primero, eliminar servicios existentes de esta propiedad
    await supabase
      .from('servicios_inmueble')
      .delete()
      .eq('inmueble_id', propertyId);

    console.log(`🗑️ Servicios existentes eliminados para propiedad ${propertyId}`);

    // Crear registros en servicios_inmueble
    const serviciosParaInsertar = services.map(service => ({
      inmueble_id: propertyId,
      nombre: service.name,
      tipo_servicio: service.type,
      proveedor: service.provider || null,
      numero_cuenta: service.accountNumber || null,
      costo_promedio: service.cost || 0,
      tipo_monto: service.montoTipo || 'fijo',
      frecuencia_cantidad: service.frecuenciaCantidad || 1,
      frecuencia_unidad: service.frecuenciaUnidad || 'mes',
      notas: service.notes || null
    }));

    if (serviciosParaInsertar.length > 0) {
      const { data: serviciosInsertados, error } = await supabase
        .from('servicios_inmueble')
        .insert(serviciosParaInsertar)
        .select('id, nombre');

      if (error) {
        console.error('❌ Error insertando servicios_inmueble:', error);
        throw error;
      }

      // Crear map de IDs (por nombre)
      services.forEach((service, index) => {
        if (serviciosInsertados && serviciosInsertados[index]) {
          serviceIdMap.set(service.id, serviciosInsertados[index].id);
        }
      });

      console.log(`✅ ${serviciosInsertados?.length || 0} servicios creados en servicios_inmueble`);
    }
  } catch (error) {
    console.error('❌ Error en crearRegistrosServicios:', error);
  }

  return serviceIdMap;
}

/**
 * Genera tickets automáticos para los servicios de una propiedad
 */
export async function generateServiceTickets({
  propertyId,
  services
}: GenerateTicketsParams): Promise<{
  success: boolean;
  ticketsCreated: number;
  error?: string;
}> {
  try {
    console.log('🎫 ========================================');
    console.log('🎫 GENERANDO TICKETS AUTOMÁTICOS');
    console.log(`🎫 Propiedad: ${propertyId}`);
    console.log(`🎫 Servicios: ${services.length}`);
    console.log('🎫 ========================================');

    // Filtrar servicios válidos (que tengan fecha de último pago)
    const serviciosValidos = services.filter(s => s.lastPaymentDate && s.lastPaymentDate.trim() !== '');

    if (serviciosValidos.length === 0) {
      console.log('ℹ️ No hay servicios con fecha de último pago. No se generarán tickets.');
      return {
        success: true,
        ticketsCreated: 0
      };
    }

    console.log(`📋 Servicios válidos: ${serviciosValidos.length}`);

    // 1. Crear registros en servicios_inmueble y obtener sus IDs
    const serviceIdMap = await crearRegistrosServicios(propertyId, serviciosValidos);

    // 2. Eliminar tickets existentes para esta propiedad
    const { error: deleteError } = await supabase
      .from('fechas_pago_servicios')
      .delete()
      .eq('propiedad_id', propertyId);

    if (deleteError) {
      console.error('Error eliminando tickets existentes:', deleteError);
    } else {
      console.log('🗑️ Tickets existentes eliminados');
    }

    // 3. Generar tickets para los próximos 3 meses
    const ticketsParaInsertar: any[] = [];
    const hoy = new Date();
    const tresMesesDespues = new Date();
    tresMesesDespues.setMonth(hoy.getMonth() + 3);

    for (const service of serviciosValidos) {
      const servicioId = serviceIdMap.get(service.id);
      if (!servicioId) {
        console.warn(`⚠️ No se encontró ID de servicio para ${service.name}`);
        continue;
      }

      // Calcular cuántas fechas necesitamos generar (aprox 3 meses)
      const frecuencia = service.frecuenciaCantidad || 1;
      const unidad = service.frecuenciaUnidad || 'mes';

      let cantidadFechas = 3; // Por defecto 3 pagos
      if (unidad === 'mes') {
        cantidadFechas = Math.ceil(3 / frecuencia); // Ajustar según frecuencia
      } else if (unidad === 'dia') {
        cantidadFechas = Math.ceil(90 / frecuencia); // ~90 días = 3 meses
      } else if (unidad === 'año') {
        cantidadFechas = 1; // Solo 1 pago para servicios anuales
      }

      // Generar las fechas
      const proximasFechas = calcularProximasFechas(
        service.lastPaymentDate,
        frecuencia,
        unidad,
        Math.min(cantidadFechas, 12) // Máximo 12 tickets por servicio
      );

      // Crear tickets solo para fechas dentro de los próximos 3 meses
      for (const fecha of proximasFechas) {
        if (fecha <= tresMesesDespues) {
          ticketsParaInsertar.push({
            propiedad_id: propertyId,
            servicio_id: servicioId,
            fecha_pago: fecha.toISOString().split('T')[0],
            monto_estimado: service.cost || 0,
            pagado: false,
            tipo_ticket: 'Pago',
            estado: 'Pendiente',
            prioridad: 'Media',
            descripcion: `Pago de ${service.name}`
          });
        }
      }
    }

    console.log(`📝 Tickets a insertar: ${ticketsParaInsertar.length}`);

    // 4. Insertar todos los tickets
    if (ticketsParaInsertar.length > 0) {
      const { data: ticketsInsertados, error: insertError } = await supabase
        .from('fechas_pago_servicios')
        .insert(ticketsParaInsertar)
        .select('id');

      if (insertError) {
        console.error('❌ Error insertando tickets:', insertError);
        throw insertError;
      }

      console.log('✅ ========================================');
      console.log(`✅ ${ticketsInsertados?.length || 0} TICKETS CREADOS`);
      console.log('✅ ========================================');

      return {
        success: true,
        ticketsCreated: ticketsInsertados?.length || 0
      };
    } else {
      console.log('ℹ️ No se generaron tickets (todas las fechas están fuera del rango de 3 meses)');
      return {
        success: true,
        ticketsCreated: 0
      };
    }

  } catch (error: any) {
    console.error('❌ Error generando tickets:', error);
    return {
      success: false,
      ticketsCreated: 0,
      error: error?.message || 'Error desconocido'
    };
  }
}
