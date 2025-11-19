'use client';

import React, { useState } from 'react';
import { PropertyFormData } from '@/types/property';
import PhotoGalleryManager from '@/components/PhotoGalleryManager';

interface Step6Props {
  data: PropertyFormData;
  onUpdate: (data: Partial<PropertyFormData>) => void;
  propertyId?: string; // ID de la propiedad (necesario para subir fotos)
}

export default function Step6_Galeria({ data, onUpdate, propertyId }: Step6Props) {
  const fotos = data.fotos || [];
  const espacios = data.espacios || [];
  
  // Manejar actualización de fotos
  const handlePhotosUpdate = (updatedPhotos: any[]) => {
    onUpdate({ fotos: updatedPhotos });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 font-poppins mb-2 flex items-center gap-3">
              <svg className="w-7 h-7 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Galería de Fotos
            </h2>

            {/* Resumen */}
            {fotos.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-ras-azul/10 border border-ras-azul/30 rounded-full text-xs font-semibold text-ras-azul">
                  📸 {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
                </span>
                
                {fotos.filter(f => f.is_cover).length > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full text-xs font-semibold text-yellow-800">
                    ⭐ {fotos.filter(f => f.is_cover).length} portada
                  </span>
                )}
                
                {fotos.filter(f => f.space_type).length > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 border border-green-300 rounded-full text-xs font-semibold text-green-800">
                    ✓ {fotos.filter(f => f.space_type).length} asignadas
                  </span>
                )}
              </div>
            ) : (
              <p className="text-gray-600">
                Agrega fotos profesionales de tu propiedad para atraer más clientes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Verificar que existe propertyId */}
      {!propertyId ? (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
          <div className="text-yellow-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-yellow-900 mb-2">
            Guarda la propiedad primero
          </h3>
          <p className="text-sm text-yellow-700 mb-4">
            Para poder subir fotos, primero necesitas guardar la propiedad en los pasos anteriores.
          </p>
          <p className="text-xs text-yellow-600">
            Haz clic en "Siguiente" en cualquier paso anterior para crear la propiedad y luego podrás agregar fotos.
          </p>
        </div>
      ) : fotos.length === 0 ? (
        // Estado vacío - Primera vez
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-ras-azul/10 to-ras-turquesa/10 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Agrega fotos profesionales
            </h3>
            
            <p className="text-gray-600 mb-8">
              Las propiedades con buenas fotos reciben hasta 10x más vistas.
              Comienza agregando entre 8-15 fotos de calidad.
            </p>

            {/* Tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="text-2xl mb-2">💡</div>
                <h4 className="font-bold text-blue-900 mb-1">Iluminación</h4>
                <p className="text-sm text-blue-800">
                  Usa luz natural durante el día. Evita flash directo.
                </p>
              </div>
              
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="text-2xl mb-2">📐</div>
                <h4 className="font-bold text-green-900 mb-1">Composición</h4>
                <p className="text-sm text-green-800">
                  Fotos horizontales, esquinas limpias, espacios ordenados.
                </p>
              </div>
              
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-bold text-purple-900 mb-1">Variedad</h4>
                <p className="text-sm text-purple-800">
                  Incluye todas las áreas: habitaciones, baños, cocina, exterior.
                </p>
              </div>
            </div>

            {/* Info sobre optimización */}
            <div className="bg-gradient-to-r from-ras-azul/5 to-ras-turquesa/5 border-2 border-ras-azul/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3 text-left">
                <div className="text-2xl">⚡</div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1">
                    Optimización Automática Incluida
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Compresión inteligente (reduce tamaño ~80%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Thumbnails para galería (300x300px)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Display optimizado para anuncios (1200px)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Formatos aceptados: JPG, PNG, WebP • Hasta 20 fotos a la vez
            </p>
          </div>
        </div>
      ) : (
        // Galería con fotos
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <PhotoGalleryManager
            propertyId={propertyId}
            photos={fotos}
            spaces={espacios}
            onPhotosUpdate={handlePhotosUpdate}
          />
        </div>
      )}

      {/* Recomendaciones si ya hay fotos pero son pocas */}
      {fotos.length > 0 && fotos.length < 8 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 mb-1">
                Agrega más fotos para destacar
              </h4>
              <p className="text-sm text-amber-800">
                Tienes {fotos.length} foto{fotos.length !== 1 && 's'}. 
                Las propiedades con 8-15 fotos tienen mucho mejor rendimiento. 
                Intenta agregar fotos de diferentes ángulos y espacios.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Excelente si tiene muchas fotos */}
      {fotos.length >= 10 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎉</div>
            <div className="flex-1">
              <h4 className="font-bold text-green-900 mb-1">
                ¡Excelente galería de fotos!
              </h4>
              <p className="text-sm text-green-800">
                Con {fotos.length} fotos, tu propiedad tendrá una presentación profesional 
                que atraerá mucho más interés de potenciales clientes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}