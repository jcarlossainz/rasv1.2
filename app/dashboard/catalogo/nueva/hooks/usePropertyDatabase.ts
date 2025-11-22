/**
 * usePropertyDatabase - Hook Unificado para Base de Datos
 * 
 * ÚNICO hook responsable de comunicación con Supabase
 * Maneja guardado completo de Steps 1-5
 * 
 * @version 3.0 - Simplificado
 */

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PropertyFormData } from '@/types/property';

// ============================================================================
// TIPOS
// ============================================================================

export interface SavePropertyResult {
  success: boolean;
  propertyId?: string;
  error?: string;
}

export interface LoadPropertyResult {
  success: boolean;
  data?: PropertyFormData;
  error?: string;
}

// ============================================================================
// HELPER: Generar tickets automáticos usando función RPC
// ============================================================================

async function generarTicketsAutomaticos(
  propertyId: string,
  services: any[]
): Promise<{ success: boolean; ticketsCreated: number; error?: string }> {
  try {
    let totalTickets = 0;

    // Primero, guardar servicios en servicios_inmueble
    for (const service of services) {
      // Mapear unidades del frontend al backend
      let unidad = service.frecuenciaUnidad || 'mes';
      if (unidad === 'dia') unidad = 'dias';
      if (unidad === 'mes') unidad = 'meses';
      if (unidad === 'año') unidad = 'anos';

      const servicioData = {
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

      // Insertar servicio
      const { data: servicioInsertado, error: errorServicio } = await supabase
        .from('servicios_inmueble')
        .insert(servicioData)
        .select('id')
        .single();

      if (errorServicio) {
        console.error(`❌ Error insertando servicio ${service.name}:`, errorServicio);
        continue;
      }

      // Llamar función RPC para generar fechas de pago
      if (servicioInsertado && service.lastPaymentDate) {
        const { data: ticketsGenerados, error: errorRPC } = await supabase
          .rpc('generar_fechas_pago_servicio', {
            p_servicio_id: servicioInsertado.id,
            p_cantidad_meses: 12
          });

        if (errorRPC) {
          console.error(`❌ Error generando fechas para ${service.name}:`, errorRPC);
        } else {
          totalTickets += ticketsGenerados || 0;
          console.log(`✅ ${ticketsGenerados} fechas generadas para ${service.name}`);
        }
      }
    }

    return {
      success: true,
      ticketsCreated: totalTickets
    };
  } catch (error: any) {
    console.error('❌ Error en generarTicketsAutomaticos:', error);
    return {
      success: false,
      ticketsCreated: 0,
      error: error.message
    };
  }
}

// ============================================================================
// TRANSFORMADOR: FormData → Database
// ============================================================================

function transformFormToDatabase(formData: PropertyFormData): any {
  console.log('📦 Transformando FormData → Database');

  return {
    // STEP 1: Datos Generales
    nombre_propiedad: formData.nombre_propiedad || '',
    tipo_propiedad: formData.tipo_propiedad || null,
    mobiliario: formData.mobiliario || null,

    dimensiones: {
      terreno: {
        valor: parseFloat(formData.tamano_terreno || '0'),
        unidad: formData.tamano_terreno_unit || 'm²'
      },
      construccion: {
        valor: parseFloat(formData.tamano_construccion || '0'),
        unidad: formData.tamano_construccion_unit || 'm²'
      }
    },

    estados: Array.isArray(formData.estados) ? formData.estados : [],
    propietarios_email: formData.propietarios_email || [],
    supervisores_email: formData.supervisores_email || [],
    
    // STEP 2: Ubicación
    ubicacion: formData.ubicacion || {
      google_maps_link: '',
      calle: '',
      colonia: '',
      codigo_postal: '',
      ciudad: '',
      estado: '',
      pais: 'México',
      referencias: '',
      es_complejo: false,
      nombre_complejo: '',
      amenidades_complejo: []
    },
    
    // STEP 3: Espacios
    espacios: formData.espacios || [],
    
    // STEP 4: Condicionales
    precios: {
      mensual: formData.precios?.mensual || null,
      noche: formData.precios?.noche || null,
      venta: formData.precios?.venta || null
    },
    
    inquilinos_email: formData.inquilinos_email || [],
    fecha_inicio_contrato: formData.fecha_inicio_contrato || null,
    duracion_contrato_valor: formData.duracion_contrato_valor ? parseInt(formData.duracion_contrato_valor) : null,
    duracion_contrato_unidad: formData.duracion_contrato_unidad || null,
    frecuencia_pago: formData.frecuencia_pago || null,
    dia_pago: formData.dia_pago ? parseInt(formData.dia_pago) : null,

    // NOTA: precio_renta_disponible se eliminó - ahora usa precios.mensual (JSONB)
    // precio_renta_disponible: formData.precio_renta_disponible ? parseFloat(formData.precio_renta_disponible) : null,
    requisitos_renta: formData.requisitos_renta || [],
    requisitos_renta_custom: formData.requisitos_renta_custom || [],
    
    amenidades_vacacional: formData.amenidades_vacacional || [],
    
    // STEP 5: Servicios
    servicios: formData.servicios || [],
    
    // Metadata
    wizard_step: formData.wizard_step || 1,
    wizard_completed: formData.wizard_completed || false,
    is_draft: formData.is_draft !== false,
    updated_at: new Date().toISOString()
  };
}

// ============================================================================
// TRANSFORMADOR: Database → FormData
// ============================================================================

function transformDatabaseToForm(dbData: any): PropertyFormData {
  console.log('📦 Transformando Database → FormData');

  return {
    // STEP 1: Datos Generales
    nombre_propiedad: dbData.nombre_propiedad || '',
    tipo_propiedad: dbData.tipo_propiedad || 'Departamento',
    mobiliario: dbData.mobiliario || 'Amueblada',

    tamano_terreno: dbData.dimensiones?.terreno?.valor?.toString() || '',
    tamano_terreno_unit: dbData.dimensiones?.terreno?.unidad || 'm²',
    tamano_construccion: dbData.dimensiones?.construccion?.valor?.toString() || '',
    tamano_construccion_unit: dbData.dimensiones?.construccion?.unidad || 'm²',

    estados: Array.isArray(dbData.estados) ? dbData.estados : [],
    propietarios_email: dbData.propietarios_email || [],
    supervisores_email: dbData.supervisores_email || [],

    // STEP 2: Ubicación
    ubicacion: dbData.ubicacion || {
      google_maps_link: '',
      calle: '',
      colonia: '',
      codigo_postal: '',
      ciudad: '',
      estado: '',
      pais: 'México',
      referencias: '',
      es_complejo: false,
      nombre_complejo: '',
      amenidades_complejo: []
    },

    // STEP 3: Espacios
    espacios: dbData.espacios || [],

    // STEP 4: Condicionales
    precios: {
      mensual: dbData.precios?.mensual || null,
      noche: dbData.precios?.noche || null,
      venta: dbData.precios?.venta || null
    },

    inquilinos_email: dbData.inquilinos_email || [],

    // Datos de renta largo plazo - leer desde JSONB o columnas individuales (compatibilidad)
    fecha_inicio_contrato: dbData.datos_renta_largo_plazo?.fecha_inicio_contrato || dbData.fecha_inicio_contrato || '',
    duracion_contrato_valor: (dbData.datos_renta_largo_plazo?.duracion_contrato_valor || dbData.duracion_contrato_valor)?.toString() || '',
    duracion_contrato_unidad: dbData.datos_renta_largo_plazo?.duracion_contrato_unidad || dbData.duracion_contrato_unidad || 'meses',
    frecuencia_pago: dbData.datos_renta_largo_plazo?.frecuencia_pago || dbData.frecuencia_pago || 'mensual',
    dia_pago: (dbData.datos_renta_largo_plazo?.dia_pago || dbData.dia_pago)?.toString() || '',

    precio_renta_disponible: (dbData.precio_renta_disponible || dbData.precios?.mensual)?.toString() || '',
    requisitos_renta: dbData.datos_renta_largo_plazo?.requisitos_renta || dbData.requisitos_renta || [],
    requisitos_renta_custom: dbData.datos_renta_largo_plazo?.requisitos_renta_custom || dbData.requisitos_renta_custom || [],

    // Datos de renta vacacional - leer desde JSONB o columnas individuales (compatibilidad)
    amenidades_vacacional: dbData.datos_renta_vacacional?.amenidades_vacacional || dbData.amenidades_vacacional || [],

    // STEP 5: Servicios
    servicios: dbData.servicios || [],

    // STEP 6: Galería (vacío por ahora)
    fotos: [],

    // Metadata
    wizard_step: dbData.wizard_step || 1,
    wizard_completed: dbData.wizard_completed || false,
    is_draft: dbData.is_draft !== false,
    published_at: dbData.published_at || '',
    created_at: dbData.created_at || '',
    updated_at: dbData.updated_at || ''
  };
}

// ============================================================================
// SINCRONIZAR COLABORADORES
// ============================================================================

/**
 * Sincroniza los colaboradores desde los arrays de emails a la tabla propiedades_colaboradores
 * Esta función se llama después de guardar/actualizar una propiedad
 */
async function syncColaboradores(
  propertyId: string,
  propietariosEmail: string[],
  supervisoresEmail: string[],
  inquilinosEmail: string[]
): Promise<void> {
  console.log('🔄 Sincronizando colaboradores a propiedades_colaboradores...');

  try {
    // 1. Primero, obtener todos los colaboradores existentes para esta propiedad
    const { data: existentes, error: errorExistentes } = await supabase
      .from('propiedades_colaboradores')
      .select('email_invitado, user_id, rol')
      .eq('propiedad_id', propertyId);

    if (errorExistentes) {
      console.error('Error obteniendo colaboradores existentes:', errorExistentes);
      return;
    }

    // 2. Crear un Set con los emails/user_ids existentes para evitar duplicados
    const existentesSet = new Set(
      (existentes || []).map(e => e.email_invitado || e.user_id)
    );

    // 3. Preparar lista de colaboradores a insertar
    const colaboradoresParaInsertar: Array<{
      propiedad_id: string;
      rol: string;
      email_invitado: string | null;
      user_id: string | null;
    }> = [];

    // Helper para agregar colaborador si no existe
    const agregarColaborador = async (email: string, rol: string) => {
      // Si ya existe, no agregar
      if (existentesSet.has(email)) {
        return;
      }

      // Buscar si el usuario existe en profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profile) {
        // Usuario registrado
        if (!existentesSet.has(profile.id)) {
          colaboradoresParaInsertar.push({
            propiedad_id: propertyId,
            rol: rol,
            email_invitado: null,
            user_id: profile.id
          });
        }
      } else {
        // Invitación pendiente
        colaboradoresParaInsertar.push({
          propiedad_id: propertyId,
          rol: rol,
          email_invitado: email,
          user_id: null
        });
      }
    };

    // 4. Procesar todos los emails
    for (const email of propietariosEmail || []) {
      await agregarColaborador(email, 'propietario');
    }
    for (const email of supervisoresEmail || []) {
      await agregarColaborador(email, 'supervisor');
    }
    for (const email of inquilinosEmail || []) {
      await agregarColaborador(email, 'inquilino');
    }

    // 5. Insertar todos los nuevos colaboradores
    if (colaboradoresParaInsertar.length > 0) {
      const { error: errorInsert } = await supabase
        .from('propiedades_colaboradores')
        .insert(colaboradoresParaInsertar);

      if (errorInsert) {
        console.error('Error insertando colaboradores:', errorInsert);
      } else {
        console.log(`✅ Se insertaron ${colaboradoresParaInsertar.length} colaboradores nuevos`);
      }
    } else {
      console.log('ℹ️ No hay colaboradores nuevos para insertar');
    }
  } catch (error) {
    console.error('Error en syncColaboradores:', error);
  }
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function usePropertyDatabase() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * GUARDAR o ACTUALIZAR propiedad
   */
  const saveProperty = useCallback(async (
    data: PropertyFormData,
    propertyId?: string
  ): Promise<SavePropertyResult> => {
    
    setIsSaving(true);
    
    try {
      console.log('💾 ========================================');
      console.log(propertyId ? '💾 ACTUALIZANDO PROPIEDAD' : '💾 CREANDO PROPIEDAD');
      console.log('💾 ========================================');
      
      // 1. Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }
      
      console.log(`👤 Usuario: ${user.id}`);
      
      // 2. Obtener empresa_id del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      
      const empresaId = profile?.empresa_id || null;
      console.log(`🏢 Empresa ID: ${empresaId || 'Sin empresa'}`);
      
      // 3. Transformar datos
      const dbData = transformFormToDatabase(data);
      
      if (propertyId) {
        // ==========================================
        // ACTUALIZAR PROPIEDAD EXISTENTE
        // ==========================================
        console.log(`🔄 Actualizando propiedad: ${propertyId}`);
        
        const { error } = await supabase
          .from('propiedades')
          .update(dbData)
          .eq('id', propertyId)
          .eq('owner_id', user.id);
        
        if (error) {
          console.error('❌ Error actualizando:', error);
          throw error;
        }

        console.log('✅ Propiedad actualizada exitosamente');

        // Sincronizar colaboradores a propiedades_colaboradores
        await syncColaboradores(
          propertyId,
          data.propietarios_email || [],
          data.supervisores_email || [],
          data.inquilinos_email || []
        );

        // Generar tickets automáticos desde los servicios usando RPC
        if (data.servicios && data.servicios.length > 0) {
          const ticketResult = await generarTicketsAutomaticos(
            propertyId,
            data.servicios
          );

          if (ticketResult.success) {
            console.log(`✅ ${ticketResult.ticketsCreated} tickets automáticos generados`);
          } else {
            console.error(`❌ Error generando tickets: ${ticketResult.error}`);
          }
        }

        return {
          success: true,
          propertyId: propertyId
        };
        
      } else {
        // ==========================================
        // CREAR NUEVA PROPIEDAD
        // ==========================================
        console.log('✨ Creando nueva propiedad');
        
        const dataToInsert = {
          ...dbData,
          owner_id: user.id,
          empresa_id: empresaId
        };
        
        const { data: newProperty, error } = await supabase
          .from('propiedades')
          .insert([dataToInsert])
          .select('id')
          .single();
        
        if (error) {
          console.error('❌ ========================================');
          console.error('❌ ERROR AL CREAR');
          console.error('❌ Error:', error);
          console.error('❌ ========================================');
          throw error;
        }
        
        console.log('✅ ========================================');
        console.log('✅ PROPIEDAD CREADA EXITOSAMENTE');
        console.log('✅ ID:', newProperty.id);
        console.log('✅ ========================================');

        // Sincronizar colaboradores a propiedades_colaboradores
        await syncColaboradores(
          newProperty.id,
          data.propietarios_email || [],
          data.supervisores_email || [],
          data.inquilinos_email || []
        );

        // Generar tickets automáticos desde los servicios
        if (data.servicios && data.servicios.length > 0) {
          const ticketResult = await generateServiceTickets({
            propertyId: newProperty.id,
            services: data.servicios
          });

          if (ticketResult.success) {
            console.log(`✅ ${ticketResult.ticketsCreated} tickets automáticos generados`);
          } else {
            console.error(`❌ Error generando tickets: ${ticketResult.error}`);
          }
        }

        return {
          success: true,
          propertyId: newProperty.id
        };
      }
      
    } catch (error: any) {
      console.error('❌ Error general al guardar:', error);
      return {
        success: false,
        error: error?.message || 'Error desconocido al guardar'
      };
    } finally {
      setIsSaving(false);
    }
  }, []);
  
  /**
   * CARGAR propiedad existente
   */
  const loadProperty = useCallback(async (
    propertyId: string
  ): Promise<LoadPropertyResult> => {
    
    setIsLoading(true);
    
    try {
      console.log('📖 ========================================');
      console.log('📖 CARGANDO PROPIEDAD');
      console.log(`📖 ID: ${propertyId}`);
      console.log('📖 ========================================');
      
      // 1. Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }
      
      // 2. Cargar propiedad - SELECT * (todas las columnas)
      const { data, error } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', propertyId)
        .eq('owner_id', user.id)
        .single();
      
      if (error) {
        console.error('❌ Error cargando:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Propiedad no encontrada');
      }
      
      console.log('✅ Propiedad cargada desde BD');
      
      // 3. Transformar a formato del formulario
      const formData = transformDatabaseToForm(data);
      console.log('✅ Datos transformados a FormData');
      
      return {
        success: true,
        data: formData
      };
      
    } catch (error: any) {
      console.error('❌ Error general al cargar:', error);
      return {
        success: false,
        error: error?.message || 'Error desconocido al cargar'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    saveProperty,
    loadProperty,
    isSaving,
    isLoading
  };
}