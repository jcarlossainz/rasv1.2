'use client';

import React, { useState } from 'react';
import { PropertyFormData, Ubicacion } from '@/types/property';
import Input from '@/components/ui/input';
import { getAddressFromGoogleMapsLink } from '@/lib/googleMaps/googleMaps';

interface Step2Props {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
}

const AMENIDADES_COMPLEJO = [
  'Alberca',
  'Gimnasio',
  'Recepción',
  'Seguridad 24/7',
  'Estacionamiento de visitas',
  'Salón de eventos',
  'Área de juegos infantiles',
  'Cancha de tenis',
  'Cancha de paddle',
  'Jardines comunes',
  'Terraza común',
  'BBQ área',
  'Business center',
  'Pet park'
];

export default function Step2_Ubicacion({ data, onUpdate }: Step2Props) {
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  
  // Obtener ubicación actual o inicializar objeto vacío
  const ubicacion = data.ubicacion || {};

  const handleUbicacionChange = (field: keyof Ubicacion, value: any) => {
    onUpdate({
      ubicacion: {
        ...ubicacion,
        [field]: value
      }
    });
  };

  const handleAutoFillAddress = async () => {
    if (!ubicacion.google_maps_link) {
      alert('Por favor ingresa un link de Google Maps');
      return;
    }

    setIsLoadingAddress(true);

    try {
      const addressData = await getAddressFromGoogleMapsLink(ubicacion.google_maps_link);

      if (addressData) {
        // Actualizar todos los campos de dirección
        onUpdate({
          ubicacion: {
            ...ubicacion,
            calle: addressData.calle || ubicacion.calle,
            colonia: addressData.colonia || ubicacion.colonia,
            ciudad: addressData.ciudad || ubicacion.ciudad,
            estado: addressData.estado || ubicacion.estado,
            codigo_postal: addressData.codigo_postal || ubicacion.codigo_postal,
            pais: addressData.pais || ubicacion.pais
          }
        });
        
        alert('✓ Dirección cargada exitosamente. Puedes modificar los campos si es necesario.');
      } else {
        alert('No se pudo extraer la dirección del link. Verifica que sea un link válido de Google Maps.');
      }
    } catch (error) {
      console.error('Error al cargar dirección:', error);
      alert('Ocurrió un error al cargar la dirección. Por favor intenta de nuevo.');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const toggleAmenidad = (amenidad: string) => {
    const currentAmenidades = ubicacion.amenidades_complejo || [];
    const newAmenidades = currentAmenidades.includes(amenidad)
      ? currentAmenidades.filter(a => a !== amenidad)
      : [...currentAmenidades, amenidad];
    handleUbicacionChange('amenidades_complejo', newAmenidades);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
      {/* SECCIÓN: DIRECCIÓN */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 font-poppins flex items-center gap-2">
            <svg className="w-6 h-6 text-ras-azul" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Dirección</span>
          </h2>
        </div>

        <div className="space-y-6">
          {/* Link de Google Maps */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-semibold text-gray-900">
                Link de Google Maps
              </label>
              {/* Google Maps Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335"/>
                <path d="M12 2c-1.93 0-3.67.78-4.93 2.05C5.78 5.33 5 7.07 5 9c0 2.5 1.5 5.5 4 8.5.83.99 1.67 1.83 2.33 2.5" fill="#FBBC04"/>
                <path d="M12 2c1.93 0 3.67.78 4.93 2.05C18.22 5.33 19 7.07 19 9c0 2.5-1.5 5.5-4 8.5-.83.99-1.67 1.83-2.33 2.5" fill="#4285F4"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
                <circle cx="12" cy="9" r="1.5" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={ubicacion.google_maps_link || ''}
                onChange={(e) => handleUbicacionChange('google_maps_link', e.target.value)}
                placeholder="Pega aquí el link de Google Maps"
                className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto"
              />
              <button
                type="button"
                onClick={handleAutoFillAddress}
                disabled={isLoadingAddress || !ubicacion.google_maps_link}
                className={`
                  px-4 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-colors
                  ${isLoadingAddress || !ubicacion.google_maps_link
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-ras-azul text-white hover:bg-ras-azul/90'
                  }
                `}
              >
                {isLoadingAddress ? 'Cargando...' : 'Guardar link'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              El link se guardará y auto-rellenará los campos de dirección. Puedes modificarlos después.
            </p>
          </div>

          {/* Campos de dirección */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calle y número */}
          <div className="md:col-span-2">
            <Input
              id="calle"
              label="Calle y número"
              type="text"
              value={ubicacion.calle || ''}
              onChange={(e) => handleUbicacionChange('calle', e.target.value)}
              placeholder="Ej: Av. Bonampak 123"
            />
          </div>

          {/* Colonia */}
          <div>
            <Input
              id="colonia"
              label="Colonia"
              type="text"
              value={ubicacion.colonia || ''}
              onChange={(e) => handleUbicacionChange('colonia', e.target.value)}
              placeholder="Ej: Supermanzana 15"
            />
          </div>

          {/* Código Postal */}
          <div>
            <Input
              id="codigo_postal"
              label="Código Postal"
              type="text"
              value={ubicacion.codigo_postal || ''}
              onChange={(e) => handleUbicacionChange('codigo_postal', e.target.value)}
              placeholder="Ej: 77500"
            />
          </div>

          {/* Ciudad */}
          <div>
            <Input
              id="ciudad"
              label="Ciudad"
              type="text"
              value={ubicacion.ciudad || ''}
              onChange={(e) => handleUbicacionChange('ciudad', e.target.value)}
              placeholder="Ej: Cancún"
            />
          </div>

          {/* Estado */}
          <div>
            <Input
              id="estado"
              label="Estado"
              type="text"
              value={ubicacion.estado || ''}
              onChange={(e) => handleUbicacionChange('estado', e.target.value)}
              placeholder="Ej: Quintana Roo"
            />
          </div>

          {/* País */}
          <div className="md:col-span-2">
            <Input
              id="pais"
              label="País"
              type="text"
              value={ubicacion.pais || ''}
              onChange={(e) => handleUbicacionChange('pais', e.target.value)}
              placeholder="Ej: México"
            />
          </div>

          {/* Referencias adicionales */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Referencias adicionales
            </label>
            <textarea
              value={ubicacion.referencias || ''}
              onChange={(e) => handleUbicacionChange('referencias', e.target.value)}
              placeholder="Ej: Entre Av. Tulum y Av. Sayil, edificio color azul con portón negro"
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto resize-none"
            />
          </div>
        </div>
        </div>
      </div>

      {/* DIVISOR */}
      <div className="border-t border-gray-200"></div>

      {/* SECCIÓN: COMPLEJO/CONDOMINIO */}
      <div>
        {/* Header con toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 font-poppins flex items-center gap-2">
              <svg className="w-6 h-6 text-ras-azul" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Complejo</span>
            </h2>
            
            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => handleUbicacionChange('es_complejo', !ubicacion.es_complejo)}
              className={`
                relative inline-flex h-7 w-14 items-center rounded-full transition-colors
                ${ubicacion.es_complejo ? 'bg-ras-azul' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-5 w-5 transform rounded-full bg-white transition-transform
                  ${ubicacion.es_complejo ? 'translate-x-8' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            ¿Pertenece a un complejo o condominio?
          </p>
        </div>

        {/* Campos adicionales si pertenece a complejo */}
        {ubicacion.es_complejo && (
          <div className="space-y-6">
            {/* Nombre del complejo */}
            <div>
              <Input
                id="nombre_complejo"
                label="Nombre del complejo o condominio"
                type="text"
                value={ubicacion.nombre_complejo || ''}
                onChange={(e) => handleUbicacionChange('nombre_complejo', e.target.value)}
                placeholder="Ej: Torres Laguna"
              />
            </div>

            {/* Amenidades del complejo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Amenidades del complejo
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMENIDADES_COMPLEJO.map(amenidad => (
                  <label
                    key={amenidad}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all
                      ${(ubicacion.amenidades_complejo || []).includes(amenidad)
                        ? 'border-ras-azul bg-ras-azul/5 text-ras-azul'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={(ubicacion.amenidades_complejo || []).includes(amenidad)}
                      onChange={() => toggleAmenidad(amenidad)}
                      className="rounded text-ras-azul focus:ring-ras-azul"
                    />
                    <span className="text-sm font-medium">{amenidad}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}