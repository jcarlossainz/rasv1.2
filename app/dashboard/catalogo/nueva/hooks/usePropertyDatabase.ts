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
    fecha_inicio_contrato: dbData.fecha_inicio_contrato || '',
    duracion_contrato_valor: dbData.duracion_contrato_valor?.toString() || '',
    duracion_contrato_unidad: dbData.duracion_contrato_unidad || 'meses',
    frecuencia_pago: dbData.frecuencia_pago || 'mensual',
    dia_pago: dbData.dia_pago?.toString() || '',
    
    precio_renta_disponible: dbData.precio_renta_disponible?.toString() || '',
    requisitos_renta: dbData.requisitos_renta || [],
    requisitos_renta_custom: dbData.requisitos_renta_custom || [],
    
    amenidades_vacacional: dbData.amenidades_vacacional || [],
    
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
      
      // 2. Cargar propiedad
      const { data, error } = await supabase
        .from('propiedades')
        .select(`
          id,
          owner_id,
          empresa_id,
          nombre_propiedad,
          tipo_propiedad,
          estados,
          mobiliario,
          capacidad_personas,
          dimensiones,
          ubicacion,
          espacios,
          precios,
          datos_renta_largo_plazo,
          datos_renta_vacacional,
          datos_venta,
          propietario_id,
          supervisor_id,
          inquilino_id,
          propietarios_email,
          supervisores_email,
          inquilinos_email,
          servicios,
          descripcion_anuncio,
          estado_anuncio,
          created_at,
          updated_at
        `)
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