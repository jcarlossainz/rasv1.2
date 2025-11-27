// 📁 src/app/dashboard/propiedad/[id]/inventario/components/EditItemModal.tsx
'use client';

import { useState, useEffect } from 'react';

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
  onClose: () => void;
  onSave: (data: { object_name: string; labels: string; space_type: string }) => void;
}

export default function EditItemModal({ item, spaces, onClose, onSave }: EditItemModalProps) {
  const [objectName, setObjectName] = useState(item.object_name);
  const [labels, setLabels] = useState(item.labels || '');
  const [spaceType, setSpaceType] = useState(item.space_type || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      object_name: objectName.trim(),
      labels: labels.trim(),
      space_type: spaceType
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-ras-primary to-ras-secondary text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Editar Item</h2>
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
          {/* Imagen del item */}
          <div className="mb-6">
            <img
              src={item.image_url}
              alt={item.object_name}
              className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
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
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}