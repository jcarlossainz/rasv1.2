import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeImageWithOpenAI } from '@/lib/openai-vision';

// Cliente Supabase con permisos de servicio
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'propertyId es requerido' 
      }, { status: 400 });
    }

    // 1. Obtener la propiedad con sus espacios
    const { data: propertyData, error: propertyError } = await supabase
      .from('propiedades')
      .select('id, nombre_propiedad, espacios')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      return NextResponse.json({ 
        success: false, 
        error: `Error obteniendo propiedad: ${propertyError.message}` 
      }, { status: 500 });
    }

    // 2. Crear mapa de espacios (ID → Nombre)
    const spacesMap = new Map<string, string>();
    
    if (propertyData.espacios && Array.isArray(propertyData.espacios)) {
      propertyData.espacios.forEach((espacio: any) => {
        const id = espacio.id || espacio.type;
        const name = espacio.name || espacio.type || 'Sin nombre';
        spacesMap.set(id, name);
      });
    }

    // 3. Obtener todas las imágenes de la propiedad
    const { data: images, error: imagesError } = await supabase
      .from('property_images')
      .select('id, url, space_type')
      .eq('property_id', propertyId);

    if (imagesError) {
      return NextResponse.json({ 
        success: false, 
        error: `Error obteniendo imágenes: ${imagesError.message}` 
      }, { status: 500 });
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay imágenes para analizar' 
      }, { status: 404 });
    }

    // 4. Analizar cada imagen
    let totalObjectsDetected = 0;
    const inventoryItems = [];

    for (const image of images) {
      try {
        // Analizar imagen con OpenAI Vision
        const detectedObjects = await analyzeImageWithOpenAI(image.url);

        if (detectedObjects.length === 0) {
          continue;
        }

        // Extraer solo los nombres para labels
        const labels = detectedObjects.map(obj => obj.name);

        // Obtener el nombre del espacio
        const spaceName = image.space_type
          ? (spacesMap.get(image.space_type) || image.space_type)
          : null;

        // Crear items de inventario para cada objeto detectado
        for (const obj of detectedObjects) {
          inventoryItems.push({
            property_id: propertyId,
            image_id: image.id,
            image_url: image.url,
            object_name: obj.name,
            space_type: spaceName, // Guardamos el NOMBRE, no el ID
            detectado_por_ia: true,
            confidence: obj.confidence,
            labels: obj.description || labels.join(', '), // Usamos la descripción de OpenAI si existe
            created_at: new Date().toISOString()
          });
        }

        totalObjectsDetected += detectedObjects.length;

        // Delay de 300ms para no saturar la API de OpenAI
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error: any) {
        console.error(`Error analizando imagen ${image.id}:`, error?.message || error);
        // Continuar con la siguiente imagen
      }
    }

    // 5. Guardar todo en la base de datos
    if (inventoryItems.length > 0) {
      const { error: insertError } = await supabase
        .from('property_inventory')
        .insert(inventoryItems);

      if (insertError) {
        return NextResponse.json({ 
          success: false, 
          error: `Error guardando inventario: ${insertError.message}` 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'No se detectaron objetos en ninguna imagen' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Se detectaron ${totalObjectsDetected} objetos en ${images.length} imágenes`,
      objectsDetected: totalObjectsDetected,
      imagesAnalyzed: images.length
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error desconocido'
    }, { status: 500 });
  }
}
