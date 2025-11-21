/**
 * Generador de Tickets Automáticos desde Servicios
 * =================================================
 *
 * Esta función genera tickets recurrentes en la tabla fechas_pago_servicios
 * basándose en los servicios configurados en una propiedad.
 *
 * Genera tickets para el próximo 1 año a partir de la fecha actual.
 * Se regenera automáticamente para mantener siempre 1 año de tickets disponibles.
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
  frecuenciaUnidad: string, // 'dias' | 'semanas' | 'meses' | 'anos' | 'dia' | 'mes' | 'año'
  cantidadFechas: number
): Date[] {
  const fechas: Date[] = [];
  const fechaBase = new Date(lastPaymentDate + 'T00:00:00');

  for (let i = 1; i <= cantidadFechas; i++) {
    const nuevaFecha = new Date(fechaBase);

    // Soportar tanto singular como plural
    if (frecuenciaUnidad === 'dia' || frecuenciaUnidad === 'dias') {
      nuevaFecha.setDate(fechaBase.getDate() + (frecuenciaCantidad * i));
    } else if (frecuenciaUnidad === 'semana' || frecuenciaUnidad === 'semanas') {
      nuevaFecha.setDate(fechaBase.getDate() + (frecuenciaCantidad * i * 7));
    } else if (frecuenciaUnidad === 'mes' || frecuenciaUnidad === 'meses') {
      nuevaFecha.setMonth(fechaBase.getMonth() + (frecuenciaCantidad * i));
    } else if (frecuenciaUnidad === 'año' || frecuenciaUnidad === 'anos') {
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
      .eq('propiedad_id', propertyId);

    console.log(`🗑️ Servicios existentes eliminados para propiedad ${propertyId}`);

    // Crear registros en servicios_inmueble
    const serviciosParaInsertar = services.map(service => {
      // Mapear unidades del frontend (singular) al backend (plural)
      let unidad = service.frecuenciaUnidad || 'mes';
      if (unidad === 'dia') unidad = 'dias';
      if (unidad === 'mes') unidad = 'meses';
      if (unidad === 'año') unidad = 'anos';

      return {
        propiedad_id: propertyId,
        nombre: service.name,
        tipo_servicio: service.type,
        proveedor: service.provider || null,
        numero_contrato: service.accountNumber || null,
        monto: service.cost || 0,
        es_fijo: service.montoTipo === 'fijo' || !service.montoTipo,
        frecuencia_valor: service.frecuenciaCantidad || 1,
        frecuencia_unidad: unidad,
        ultima_fecha_pago: service.lastPaymentDate || null,
        activo: true
      };
    });

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

    // 2. Eliminar tickets automáticos existentes (los que tienen servicio_id) para esta propiedad
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('propiedad_id', propertyId)
      .not('servicio_id', 'is', null); // Solo eliminar tickets automáticos de servicios

    if (deleteError) {
      console.error('Error eliminando tickets automáticos existentes:', deleteError);
    } else {
      console.log('🗑️ Tickets automáticos existentes eliminados');
    }

    // 3. Generar tickets para el próximo 1 año
    const ticketsParaInsertar: any[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    const unAnoDespues = new Date(hoy);
    unAnoDespues.setFullYear(hoy.getFullYear() + 1);

    for (const service of serviciosValidos) {
      const servicioId = serviceIdMap.get(service.id);
      if (!servicioId) {
        console.warn(`⚠️ No se encontró ID de servicio para ${service.name}`);
        continue;
      }

      // Calcular cuántas fechas necesitamos generar (1 año completo)
      const frecuencia = service.frecuenciaCantidad || 1;
      const unidad = service.frecuenciaUnidad || 'mes';

      let cantidadFechas = 12; // Por defecto 12 pagos (1 año mensual)

      // Soportar tanto singular como plural
      if (unidad === 'mes' || unidad === 'meses') {
        cantidadFechas = Math.ceil(12 / frecuencia); // Ajustar según frecuencia
      } else if (unidad === 'dia' || unidad === 'dias') {
        cantidadFechas = Math.ceil(365 / frecuencia); // ~365 días = 1 año
      } else if (unidad === 'semana' || unidad === 'semanas') {
        cantidadFechas = Math.ceil(52 / frecuencia); // ~52 semanas = 1 año
      } else if (unidad === 'año' || unidad === 'anos') {
        cantidadFechas = Math.ceil(1 / frecuencia); // 1 o más pagos según frecuencia
      }

      // Generar las fechas
      const proximasFechas = calcularProximasFechas(
        service.lastPaymentDate,
        frecuencia,
        unidad,
        Math.min(cantidadFechas, 365) // Máximo 365 tickets por servicio (1 por día)
      );

      // Crear tickets solo para fechas dentro del próximo año
      for (const fecha of proximasFechas) {
        if (fecha >= hoy && fecha <= unAnoDespues) {
          ticketsParaInsertar.push({
            propiedad_id: propertyId,
            servicio_id: servicioId,
            titulo: service.name,
            descripcion: `Pago de ${service.type} - ${service.name}${service.provider ? ` (${service.provider})` : ''}`,
            tipo: 'Pago de Servicio',
            prioridad: 'Media',
            estado: 'pendiente',
            fecha_programada: fecha.toISOString().split('T')[0],
            monto_estimado: service.cost || 0,
            pagado: false
          });
        }
      }
    }

    console.log(`📝 Tickets a insertar: ${ticketsParaInsertar.length}`);

    // 4. Insertar todos los tickets en la tabla unificada 'tickets'
    if (ticketsParaInsertar.length > 0) {
      const { data: ticketsInsertados, error: insertError } = await supabase
        .from('tickets')
        .insert(ticketsParaInsertar)
        .select('id');

      if (insertError) {
        console.error('❌ Error insertando tickets:', insertError);
        throw insertError;
      }

      console.log('✅ ========================================');
      console.log(`✅ ${ticketsInsertados?.length || 0} TICKETS AUTOMÁTICOS CREADOS`);
      console.log('✅ ========================================');

      return {
        success: true,
        ticketsCreated: ticketsInsertados?.length || 0
      };
    } else {
      console.log('ℹ️ No se generaron tickets (todas las fechas están fuera del rango de 1 año)');
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

/**
 * Regenera automáticamente tickets para todas las propiedades del usuario
 * Asegura que siempre haya tickets hasta 1 año en el futuro
 */
export async function autoRegenerateTickets(userId: string): Promise<{
  success: boolean;
  propertiesProcessed: number;
  totalTicketsCreated: number;
  error?: string;
}> {
  try {
    console.log('🔄 ========================================');
    console.log('🔄 AUTO-REGENERANDO TICKETS');
    console.log(`🔄 Usuario: ${userId}`);
    console.log('🔄 ========================================');

    // 1. Obtener todas las propiedades del usuario (propias y compartidas)
    const { data: propsPropias } = await supabase
      .from('propiedades')
      .select('id, servicios')
      .eq('owner_id', userId);

    const { data: propsCompartidas } = await supabase
      .from('propiedades_colaboradores')
      .select('propiedad_id')
      .eq('user_id', userId);

    // Obtener datos completos de propiedades compartidas
    let propiedadesCompartidas: any[] = [];
    if (propsCompartidas && propsCompartidas.length > 0) {
      const idsCompartidos = propsCompartidas.map(p => p.propiedad_id);
      const { data } = await supabase
        .from('propiedades')
        .select('id, servicios')
        .in('id', idsCompartidos);
      propiedadesCompartidas = data || [];
    }

    // Combinar propiedades
    const propiedadesPropias = propsPropias || [];

    const todasPropiedades = [...propiedadesPropias, ...propiedadesCompartidas];

    console.log(`📋 Propiedades encontradas: ${todasPropiedades.length}`);

    if (todasPropiedades.length === 0) {
      return {
        success: true,
        propertiesProcessed: 0,
        totalTicketsCreated: 0
      };
    }

    // 2. Regenerar tickets para cada propiedad que tenga servicios
    let propertiesProcessed = 0;
    let totalTicketsCreated = 0;

    for (const propiedad of todasPropiedades) {
      const servicios = propiedad.servicios as Service[] || [];

      if (servicios.length > 0) {
        console.log(`🔄 Regenerando tickets para propiedad ${propiedad.id}...`);

        const result = await generateServiceTickets({
          propertyId: propiedad.id,
          services: servicios
        });

        if (result.success) {
          propertiesProcessed++;
          totalTicketsCreated += result.ticketsCreated;
          console.log(`✅ ${result.ticketsCreated} tickets creados para propiedad ${propiedad.id}`);
        } else {
          console.error(`❌ Error en propiedad ${propiedad.id}: ${result.error}`);
        }
      }
    }

    console.log('✅ ========================================');
    console.log(`✅ REGENERACIÓN COMPLETADA`);
    console.log(`✅ Propiedades procesadas: ${propertiesProcessed}`);
    console.log(`✅ Tickets totales creados: ${totalTicketsCreated}`);
    console.log('✅ ========================================');

    return {
      success: true,
      propertiesProcessed,
      totalTicketsCreated
    };

  } catch (error: any) {
    console.error('❌ Error en auto-regeneración:', error);
    return {
      success: false,
      propertiesProcessed: 0,
      totalTicketsCreated: 0,
      error: error?.message || 'Error desconocido'
    };
  }
}
