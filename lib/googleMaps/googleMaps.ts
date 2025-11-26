// lib/googleMaps.ts
// Utilidad para extraer información de dirección desde Google Maps

interface AddressComponents {
  calle: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  pais: string;
}

/**
 * Expande un link acortado de Google Maps usando nuestra API
 */
async function expandShortenedLink(shortLink: string): Promise<string | null> {
  try {
    const response = await fetch('/api/expand-maps-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ link: shortLink })
    });

    if (!response.ok) {
      throw new Error('Error al expandir link');
    }

    const data = await response.json();
    return data.expandedUrl;
  } catch (error) {
    console.error('Error expandiendo link:', error);
    return null;
  }
}

/**
 * Extrae coordenadas de un link de Google Maps
 */
export async function extractCoordinatesFromLink(link: string): Promise<{ lat: number; lng: number } | null> {
  try {
    let urlToProcess = link;
    
    // Si es un link acortado, expandirlo primero
    if (link.includes('goo.gl') || link.includes('maps.app.goo.gl')) {
      const expandedLink = await expandShortenedLink(link);
      if (expandedLink) {
        urlToProcess = expandedLink;
      }
    }
    
    // Patrones comunes de Google Maps
    // https://www.google.com/maps/place/.../@21.161908,-86.8515279,17z/...
    // https://www.google.com/maps?q=21.161908,-86.8515279
    
    // Patrón 1: @lat,lng
    const pattern1 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match1 = urlToProcess.match(pattern1);
    if (match1) {
      return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
    }

    // Patrón 2: ?q=lat,lng
    const pattern2 = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match2 = urlToProcess.match(pattern2);
    if (match2) {
      return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
    }

    // Patrón 3: /place/.../@lat,lng
    const pattern3 = /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match3 = urlToProcess.match(pattern3);
    if (match3) {
      return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
    }

    // Patrón 4: !3d y !4d (formato alternativo)
    const pattern4 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const match4 = urlToProcess.match(pattern4);
    if (match4) {
      return { lat: parseFloat(match4[1]), lng: parseFloat(match4[2]) };
    }

    return null;
  } catch (error) {
    console.error('Error extrayendo coordenadas:', error);
    return null;
  }
}

/**
 * Obtiene información de dirección usando Google Geocoding API
 */
export async function getAddressFromCoordinates(
  lat: number, 
  lng: number
): Promise<AddressComponents | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key no configurada en .env.local');
      alert('API Key de Google Maps no configurada. Verifica tu archivo .env.local');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es`;

    const response = await fetch(url);

    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      alert(`Error de Google Maps API: ${data.error_message || 'Verifica que Geocoding API esté habilitada y la API Key sea correcta'}`);
      return null;
    }

    if (data.status === 'INVALID_REQUEST') {
      alert('Las coordenadas extraídas no son válidas');
      return null;
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      alert(`No se pudo obtener la dirección. Status: ${data.status}`);
      return null;
    }

    // Extraer componentes de dirección
    const result = data.results[0];
    const components = result.address_components;

    const addressData: AddressComponents = {
      calle: '',
      colonia: '',
      ciudad: '',
      estado: '',
      codigo_postal: '',
      pais: ''
    };

    // Mapear componentes
    components.forEach((component: any) => {
      const types = component.types;

      if (types.includes('street_number')) {
        addressData.calle = component.long_name + ' ';
      }
      if (types.includes('route')) {
        addressData.calle += component.long_name;
      }
      if (types.includes('sublocality') || types.includes('neighborhood')) {
        addressData.colonia = component.long_name;
      }
      if (types.includes('locality')) {
        addressData.ciudad = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        addressData.estado = component.long_name;
      }
      if (types.includes('postal_code')) {
        addressData.codigo_postal = component.long_name;
      }
      if (types.includes('country')) {
        addressData.pais = component.long_name;
      }
    });

    return addressData;
  } catch (error) {
    console.error('Error obteniendo dirección:', error);
    alert('Error de red al conectar con Google Maps. Verifica tu conexión.');
    return null;
  }
}

/**
 * Función principal: extrae dirección completa desde un link de Google Maps
 */
export async function getAddressFromGoogleMapsLink(link: string): Promise<AddressComponents | null> {
  // 1. Extraer coordenadas del link (AWAIT es crucial aquí)
  const coords = await extractCoordinatesFromLink(link);

  if (!coords) {
    alert('No se pudieron extraer coordenadas del link. Verifica que sea un link válido de Google Maps.');
    return null;
  }

  // Validar que las coordenadas sean números válidos
  if (isNaN(coords.lat) || isNaN(coords.lng)) {
    alert('Las coordenadas extraídas no son válidas');
    return null;
  }

  // 2. Obtener dirección desde las coordenadas
  const address = await getAddressFromCoordinates(coords.lat, coords.lng);

  return address;
}