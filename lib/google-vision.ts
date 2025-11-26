// Helper para Google Cloud Vision API - Detección de objetos en imágenes

export interface DetectedObject {
  name: string;
  confidence: number;
}

/**
 * Analiza una imagen con Google Cloud Vision API
 * @param imageUrl URL de la imagen a analizar
 * @returns Array de objetos detectados con confianza > 0.7
 */
export async function analyzeImage(imageUrl: string): Promise<DetectedObject[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;
    
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GOOGLE_VISION_API_KEY no está configurada');
    }

    // Endpoint de Google Cloud Vision API
    const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    // Request body
    const requestBody = {
      requests: [
        {
          image: {
            source: {
              imageUri: imageUrl
            }
          },
          features: [
            {
              type: 'OBJECT_LOCALIZATION', // Detección de objetos
              maxResults: 20 // Máximo 20 objetos por imagen
            },
            {
              type: 'LABEL_DETECTION', // Etiquetas generales (backup)
              maxResults: 10
            }
          ]
        }
      ]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.responses[0];

    // Extraer objetos localizados
    const localizedObjects = result.localizedObjectAnnotations || [];
    const labels = result.labelAnnotations || [];

    // Combinar y filtrar resultados
    const detectedObjects: DetectedObject[] = [];
    
    // Procesar objetos localizados (más específicos)
    localizedObjects.forEach((obj: any) => {
      if (obj.score >= 0.7) { // Filtro de confianza intermedia
        detectedObjects.push({
          name: translateToSpanish(obj.name),
          confidence: obj.score
        });
      }
    });

    // Si hay pocos objetos, agregar labels como backup
    if (detectedObjects.length < 3) {
      labels.forEach((label: any) => {
        if (label.score >= 0.75) {
          const translated = translateToSpanish(label.description);
          // Evitar duplicados
          if (!detectedObjects.some(obj => obj.name === translated)) {
            detectedObjects.push({
              name: translated,
              confidence: label.score
            });
          }
        }
      });
    }

    return detectedObjects;

  } catch (error) {
    console.error('Error en analyzeImage:', error);
    throw error;
  }
}

/**
 * Traduce nombres de objetos comunes del inglés al español
 */
function translateToSpanish(englishName: string): string {
  const translations: { [key: string]: string } = {
    // Muebles
    'Chair': 'Silla',
    'Table': 'Mesa',
    'Bed': 'Cama',
    'Sofa': 'Sofá',
    'Couch': 'Sofá',
    'Desk': 'Escritorio',
    'Cabinet': 'Gabinete',
    'Shelf': 'Estante',
    'Bookshelf': 'Librero',
    'Wardrobe': 'Armario',
    'Dresser': 'Cómoda',
    'Nightstand': 'Mesa de noche',
    
    // Cocina
    'Refrigerator': 'Refrigerador',
    'Stove': 'Estufa',
    'Oven': 'Horno',
    'Microwave': 'Microondas',
    'Sink': 'Fregadero',
    'Dishwasher': 'Lavavajillas',
    'Kitchen': 'Cocina',
    
    // Baño
    'Toilet': 'Inodoro',
    'Bathtub': 'Bañera',
    'Shower': 'Regadera',
    'Bathroom': 'Baño',
    'Mirror': 'Espejo',
    
    // Electrónicos
    'Television': 'Televisión',
    'TV': 'Televisión',
    'Computer': 'Computadora',
    'Laptop': 'Laptop',
    'Phone': 'Teléfono',
    'Air conditioner': 'Aire acondicionado',
    'Fan': 'Ventilador',
    'Lamp': 'Lámpara',
    'Light': 'Luz',
    
    // Decoración
    'Curtain': 'Cortina',
    'Pillow': 'Almohada',
    'Cushion': 'Cojín',
    'Rug': 'Tapete',
    'Carpet': 'Alfombra',
    'Plant': 'Planta',
    'Painting': 'Cuadro',
    'Picture': 'Cuadro',
    'Frame': 'Marco',
    'Vase': 'Florero',
    
    // Otros
    'Door': 'Puerta',
    'Window': 'Ventana',
    'Wall': 'Pared',
    'Floor': 'Piso',
    'Ceiling': 'Techo',
    'Stairs': 'Escaleras',
    'Balcony': 'Balcón',
    'Garden': 'Jardín',
    'Pool': 'Piscina',
    'Car': 'Coche',
    'Bicycle': 'Bicicleta',
    
    // Conceptos generales
    'Furniture': 'Mueble',
    'Room': 'Habitación',
    'Interior': 'Interior',
    'Exterior': 'Exterior',
    'Architecture': 'Arquitectura',
    'Building': 'Edificio',
    'House': 'Casa',
    'Apartment': 'Apartamento',
  };

  return translations[englishName] || englishName;
}

/**
 * Analiza múltiples imágenes en lote
 */
export async function analyzeMultipleImages(
  imageUrls: string[]
): Promise<Map<string, DetectedObject[]>> {
  const results = new Map<string, DetectedObject[]>();
  
  for (const url of imageUrls) {
    try {
      const objects = await analyzeImage(url);
      results.set(url, objects);
      
      // Delay para no saturar la API (opcional, ajustar según límites)
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error analizando ${url}:`, error);
      results.set(url, []);
    }
  }
  
  return results;
}