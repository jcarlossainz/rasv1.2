// 📁 src/components/property/UploadPhotoModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { PropertyImage } from '@/types/property';
import { compressImageDual } from '@/lib/supabase/image-compression';
import { uploadPropertyImageDual } from '@/lib/supabase/supabase-storage';

interface UploadPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  photos: PropertyImage[];
  onPhotosChange: (photos: PropertyImage[]) => void;
}

const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  photos,
  onPhotosChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [currentFile, setCurrentFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  /**
   * Procesa y sube archivos con compresión dual
   */
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;

    try {
      const newPhotos: PropertyImage[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setCurrentFile(file.name);
        
        try {
          // 1. Comprimir imagen (dual: thumbnail + display)
          setUploadStatus(`📸 Procesando ${i + 1}/${totalFiles}: ${file.name}`);
          const compressed = await compressImageDual(file);

          // 2. Subir ambas versiones a Supabase Storage
          setUploadStatus(`☁️ Subiendo ${i + 1}/${totalFiles}: ${file.name}`);
          const uploaded = await uploadPropertyImageDual(
            compressed.thumbnail,
            compressed.display,
            propertyId,
            file.name
          );

          // 3. Agregar a la lista de fotos
          newPhotos.push({
            id: uploaded.id,
            url: uploaded.urls.display,
            url_thumbnail: uploaded.urls.thumbnail,
            is_cover: photos.length === 0 && i === 0, // Primera foto = portada por defecto
            order_index: photos.length + i,
            space_type: null,
            caption: null,
            uploaded_at: uploaded.metadata.uploadedAt,
            file_size: uploaded.metadata.fileSize,
            dimensions: uploaded.metadata.dimensions
          });

          successCount++;
        } catch (fileError) {
          console.error(`Error procesando ${file.name}:`, fileError);
          errorCount++;
        }

        // Actualizar progreso
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      // Actualizar estado
      if (successCount > 0) {
        onPhotosChange([...photos, ...newPhotos]);
      }
      
      // Mensaje final
      if (errorCount === 0) {
        setUploadStatus(`✅ ${successCount} foto(s) subida(s) exitosamente`);
      } else {
        setUploadStatus(`⚠️ ${successCount} exitosas, ${errorCount} con errores`);
      }

      // Cerrar modal después de 2 segundos si todo OK
      if (errorCount === 0) {
        setTimeout(() => {
          onClose();
          resetState();
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error subiendo fotos:', error);
      setUploadStatus(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
      setCurrentFile('');
    }
  };

  const resetState = () => {
    setUploadProgress(0);
    setUploadStatus('');
    setCurrentFile('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClose = () => {
    if (isUploading) {
      if (!confirm('¿Cancelar la subida en progreso?')) return;
    }
    onClose();
    resetState();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-ras-azul to-ras-turquesa p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">📸</span>
                Agregar Fotos
              </h2>
              <p className="text-white/80 mt-1">
                Las imágenes se optimizan automáticamente para web
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent"></div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">{uploadStatus}</div>
                  {currentFile && (
                    <div className="text-sm text-blue-700 mt-0.5 truncate">
                      Archivo: {currentFile}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out relative"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
                <div className="absolute right-0 -top-6 text-sm font-bold text-blue-700">
                  {uploadProgress}%
                </div>
              </div>

              {/* Info text */}
              <div className="text-xs text-blue-600 flex items-start gap-2">
                <span>ℹ️</span>
                <span>
                  Generando 2 versiones: <strong>thumbnail (300px)</strong> para miniaturas 
                  y <strong>display (1200px)</strong> para visualización completa
                </span>
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-3 border-dashed rounded-2xl p-12 text-center transition-all
              ${isDragging 
                ? 'border-ras-azul bg-ras-azul/5 scale-[1.02] shadow-lg' 
                : 'border-gray-300 hover:border-ras-azul/50 hover:bg-gray-50'
              }
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={isUploading}
            />
            
            <div className="flex flex-col items-center gap-4">
              {/* Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-ras-azul/10 to-ras-turquesa/10 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-ras-azul" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              
              {/* Text */}
              <div>
                <p className="text-xl font-bold text-gray-900 mb-2">
                  Arrastra fotos aquí
                </p>
                <p className="text-gray-600 mb-1">
                  o haz clic para seleccionar archivos
                </p>
                <p className="text-sm text-gray-400">
                  Formatos: JPG, PNG, WebP • Hasta 20 fotos a la vez
                </p>
              </div>
              
              {/* Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-8 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4"/>
                </svg>
                Seleccionar Archivos
              </button>
            </div>
          </div>

          {/* Info Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Optimización Automática */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 mb-1">
                    Optimización Automática
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li className="flex items-start gap-1">
                      <span className="text-green-600">✓</span>
                      <span><strong>Thumbnail:</strong> 300x300px (galería)</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-green-600">✓</span>
                      <span><strong>Display:</strong> 1200px ancho máx (anuncios)</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-green-600">✓</span>
                      <span>Compresión inteligente (80% calidad)</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-green-600">✓</span>
                      <span>Reducción: ~70-85% del tamaño original</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 mb-1">
                    Consejos Profesionales
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      <span>Usa fotos con buena iluminación natural</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      <span>Horizontal es mejor que vertical</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      <span>Limpia y ordena antes de fotografiar</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      <span>La primera foto será la portada</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Current Photos Count */}
          {photos.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
              <span className="font-semibold">📊 Fotos actuales:</span> {photos.length} 
              {photos.length >= 10 && (
                <span className="ml-2 text-green-600 font-semibold">
                  • ✅ Excelente galería
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isUploading && (
          <div className="bg-gray-50 border-t-2 border-gray-200 p-4 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPhotoModal;
