// 📁 src/app/dashboard/propiedad/[id]/inventario/components/EditItemModal.tsx
'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface InventoryItem {
  id: string;
  object_name: string;
  labels: string | null;
  space_type: string | null;
  image_url: string;
}

interface SpaceData {
  id: string;
  nombre: string;
}

interface EditItemModalProps {
  item: InventoryItem;
  spaces: SpaceData[];
  propertyId: string;
  isNew?: boolean;
  onClose: () => void;
  onSave: (data: { object_name: string; labels: string; space_type: string; image_url?: string }) => void;
}

export default function EditItemModal({ item, spaces, propertyId, isNew = false, onClose, onSave }: EditItemModalProps) {
  const [objectName, setObjectName] = useState(item.object_name);
  const [labels, setLabels] = useState(item.labels || '');
  const [spaceType, setSpaceType] = useState(item.space_type || '');
  const [imageUrl, setImageUrl] = useState(item.image_url || '');
  const [imagePreview, setImagePreview] = useState<string | null>(item.image_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Mostrar preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir a Supabase Storage
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `propiedades/${propertyId}/inventory/${timestamp}_${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setImageUrl(urlData.publicUrl);
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen. Intenta nuevamente.');
      setImagePreview(item.image_url || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      object_name: objectName.trim(),
      labels: labels.trim(),
      space_type: spaceType,
      image_url: imageUrl || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-ras-primary to-ras-secondary text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{isNew ? 'Agregar Objeto' : 'Editar Item'}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Sección de imagen */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imagen {isNew ? '(opcional)' : ''}
            </label>

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt={objectName || 'Preview'}
                  className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-lg text-sm font-medium shadow-md transition-all"
                >
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-ras-turquesa hover:bg-gray-50 transition-all"
              >
                {isUploading ? (
                  <div className="w-8 h-8 border-4 border-ras-turquesa border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-gray-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <p className="text-sm text-gray-500">Haz clic para subir una imagen</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG (máx. 5MB)</p>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Campo: Objeto */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Objeto *
            </label>
            <input
              type="text"
              value={objectName}
              onChange={(e) => setObjectName(e.target.value)}
              placeholder="Ej: Silla, Mesa, Lámpara..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-ras-turquesa focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Campo: Descripción */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="Descripción breve del objeto..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-ras-turquesa focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Campo: Espacio */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Espacio
            </label>
            <select
              value={spaceType}
              onChange={(e) => setSpaceType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-ras-turquesa focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="">Sin espacio asignado</option>
              {spaces.map(space => (
                <option key={space.id} value={space.id}>
                  {space.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              {isNew ? 'Agregar' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}