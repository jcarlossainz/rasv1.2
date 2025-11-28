// Helper para OpenAI Vision API - Detección de objetos en imágenes

export interface DetectedObject {
  name: string;
  confidence: number;
  description?: string;
}

/**
 * Analiza una imagen con OpenAI Vision API (GPT-4o)
 * @param imageUrl URL de la imagen a analizar
 * @returns Array de objetos detectados
 */
export async function analyzeImageWithOpenAI(imageUrl: string): Promise<DetectedObject[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    console.log('Analizando imagen con OpenAI:', imageUrl);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente especializado en inventariar propiedades inmobiliarias.
Tu tarea es analizar imágenes y listar TODOS los objetos, muebles, electrodomésticos y elementos visibles.

IMPORTANTE:
- Lista CADA objeto individual que veas (si hay 2 sillas, lista "Silla" dos veces o indica "2 Sillas")
- Sé específico: en lugar de "mueble" di "sofá de 3 plazas", "mesa de centro", etc.
- Incluye: muebles, electrodomésticos, decoración, iluminación, textiles, plantas, arte, etc.
- NO incluyas elementos estructurales como paredes, pisos, techos, ventanas o puertas a menos que sean decorativos
- Responde SOLO con un JSON válido, sin texto adicional`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analiza esta imagen y lista todos los objetos visibles para un inventario de propiedad.

Responde ÚNICAMENTE con un JSON en este formato exacto:
{
  "objetos": [
    {"nombre": "Nombre del objeto en español", "descripcion": "Breve descripción o características"},
    ...
  ]
}

Ejemplo:
{
  "objetos": [
    {"nombre": "Sofá de 3 plazas", "descripcion": "Color gris, tela"},
    {"nombre": "Mesa de centro", "descripcion": "Madera oscura, rectangular"},
    {"nombre": "Lámpara de pie", "descripcion": "Metal negro, pantalla blanca"},
    {"nombre": "Televisión", "descripcion": "Pantalla plana, aproximadamente 55 pulgadas"},
    {"nombre": "Cojín decorativo", "descripcion": "Azul marino"},
    {"nombre": "Cojín decorativo", "descripcion": "Beige con patrón"}
  ]
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));

    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      throw new Error('No se recibió respuesta de OpenAI');
    }

    console.log('OpenAI content:', content);

    // Parsear el JSON de la respuesta
    let parsedResponse;
    try {
      // Limpiar posibles caracteres extra
      const cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      parsedResponse = JSON.parse(cleanContent);
    } catch {
      console.error('Error parseando respuesta de OpenAI:', content);
      throw new Error('Error parseando respuesta de OpenAI');
    }

    // Convertir al formato esperado
    const detectedObjects: DetectedObject[] = [];

    if (parsedResponse.objetos && Array.isArray(parsedResponse.objetos)) {
      parsedResponse.objetos.forEach((obj: { nombre: string; descripcion?: string }) => {
        if (obj.nombre) {
          detectedObjects.push({
            name: obj.nombre,
            confidence: 0.95, // OpenAI no da confianza, asumimos alta
            description: obj.descripcion || ''
          });
        }
      });
    }

    return detectedObjects;

  } catch (error) {
    console.error('Error en analyzeImageWithOpenAI:', error);
    throw error;
  }
}

/**
 * Analiza múltiples imágenes en lote con OpenAI
 */
export async function analyzeMultipleImagesWithOpenAI(
  imageUrls: string[]
): Promise<Map<string, DetectedObject[]>> {
  const results = new Map<string, DetectedObject[]>();

  for (const url of imageUrls) {
    try {
      const objects = await analyzeImageWithOpenAI(url);
      results.set(url, objects);

      // Delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error analizando ${url}:`, error);
      results.set(url, []);
    }
  }

  return results;
}
