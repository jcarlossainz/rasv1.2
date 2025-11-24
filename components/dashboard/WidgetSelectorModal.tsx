/**
 * WidgetSelectorModal Component
 * Modal simple para seleccionar qué widgets mostrar
 */

'use client';

import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import type { WidgetId } from '@/types/dashboard';
import { AVAILABLE_WIDGETS } from '@/types/dashboard';

interface WidgetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidgets: WidgetId[];
  onSelectWidgets: (widgets: WidgetId[]) => void;
}

export function WidgetSelectorModal({
  isOpen,
  onClose,
  currentWidgets,
  onSelectWidgets,
}: WidgetSelectorModalProps) {
  const [selectedWidgets, setSelectedWidgets] = React.useState<WidgetId[]>(currentWidgets);

  // Actualizar cuando cambien los widgets actuales
  React.useEffect(() => {
    setSelectedWidgets(currentWidgets);
  }, [currentWidgets]);

  const handleToggleWidget = (widgetId: WidgetId) => {
    if (selectedWidgets.includes(widgetId)) {
      // Desmarcar (mínimo 1)
      if (selectedWidgets.length > 1) {
        setSelectedWidgets(selectedWidgets.filter(id => id !== widgetId));
      }
    } else {
      // Marcar (máximo 4)
      if (selectedWidgets.length < 4) {
        setSelectedWidgets([...selectedWidgets, widgetId]);
      }
    }
  };

  const handleSave = () => {
    onSelectWidgets(selectedWidgets);
    onClose();
  };

  // Agrupar por categoría
  const widgetsByCategory = {
    financial: Object.values(AVAILABLE_WIDGETS).filter(w => w.category === 'financial'),
    properties: Object.values(AVAILABLE_WIDGETS).filter(w => w.category === 'properties'),
    operations: Object.values(AVAILABLE_WIDGETS).filter(w => w.category === 'operations'),
  };

  const categoryNames = {
    financial: '💰 Financiero',
    properties: '🏢 Propiedades',
    operations: '⚙️ Operaciones',
  };

  const categoryColors = {
    financial: 'bg-green-50 border-green-200',
    properties: 'bg-blue-50 border-blue-200',
    operations: 'bg-purple-50 border-purple-200',
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Seleccionar Widgets
              </Dialog.Title>
              <p className="text-sm text-gray-600 mt-1">
                Elige hasta 4 widgets para tu dashboard
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[500px] overflow-y-auto">
            <div className="space-y-6">
              {/* Contador */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                  {selectedWidgets.length} de 4 widgets seleccionados
                </p>
                {selectedWidgets.length === 4 && (
                  <p className="text-xs text-blue-700 mt-1">
                    Máximo alcanzado. Desmarca uno para seleccionar otro.
                  </p>
                )}
              </div>

              {/* Widgets por categoría */}
              {(Object.keys(widgetsByCategory) as Array<keyof typeof widgetsByCategory>).map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {categoryNames[category]}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {widgetsByCategory[category].map((widget) => {
                      const isSelected = selectedWidgets.includes(widget.id);
                      const isDisabled = !isSelected && selectedWidgets.length >= 4;

                      return (
                        <button
                          key={widget.id}
                          onClick={() => handleToggleWidget(widget.id)}
                          disabled={isDisabled}
                          className={`
                            p-4 rounded-lg border-2 text-left transition-all
                            ${isSelected
                              ? `${categoryColors[category]} border-2 shadow-md`
                              : 'bg-white border-gray-200 hover:border-gray-300'
                            }
                            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {widget.title}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {widget.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Guardar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
