/**
 * WidgetSelectorModal Component
 * Modal con drag and drop para seleccionar y ordenar widgets
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WidgetId } from '@/types/dashboard';

interface WidgetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidgets: WidgetId[];
  onSelectWidgets: (widgets: WidgetId[]) => void;
}

// Widgets disponibles simplificados
const WIDGETS_DISPONIBLES: { id: WidgetId; title: string }[] = [
  { id: 'pending_tickets', title: 'Tickets para hoy' },
  { id: 'monthly_income', title: 'Tickets próximos 7 días' },
  { id: 'monthly_expenses', title: 'Tickets pendientes' },
  { id: 'total_properties', title: 'Total de propiedades' },
];

// Componente de tarjeta arrastrable
function DraggableWidget({
  id,
  title,
  isInDropZone = false
}: {
  id: WidgetId;
  title: string;
  isInDropZone?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        px-4 py-3 rounded-xl border-2 cursor-grab active:cursor-grabbing
        transition-all select-none
        ${isDragging ? 'opacity-50 scale-105 shadow-lg' : ''}
        ${isInDropZone
          ? 'bg-ras-turquesa/10 border-ras-turquesa text-gray-800'
          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
        }
      `}
    >
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}

// Componente de overlay durante el drag
function DragOverlayWidget({ title }: { title: string }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-ras-turquesa bg-ras-turquesa/20 shadow-xl cursor-grabbing">
      <span className="text-sm font-medium text-gray-800">{title}</span>
    </div>
  );
}

// Zona donde se sueltan los widgets seleccionados
function DropZone({
  children,
  selectedCount
}: {
  children: React.ReactNode;
  selectedCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'dropzone' });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[120px] p-4 rounded-2xl border-2 border-dashed transition-all
        ${isOver ? 'border-ras-turquesa bg-ras-turquesa/5' : 'border-gray-300 bg-gray-50'}
      `}
    >
      {selectedCount === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
          Arrastra widgets aquí (máximo 4)
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function WidgetSelectorModal({
  isOpen,
  onClose,
  currentWidgets,
  onSelectWidgets,
}: WidgetSelectorModalProps) {
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetId[]>(currentWidgets);
  const [activeId, setActiveId] = useState<WidgetId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setSelectedWidgets(currentWidgets);
  }, [currentWidgets]);

  const availableWidgets = WIDGETS_DISPONIBLES.filter(
    w => !selectedWidgets.includes(w.id)
  );

  const selectedWidgetData = selectedWidgets.map(id =>
    WIDGETS_DISPONIBLES.find(w => w.id === id)!
  ).filter(Boolean);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as WidgetId);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as WidgetId;
    const overId = over.id;

    const isActiveInSelected = selectedWidgets.includes(activeId);
    const isOverDropzone = overId === 'dropzone' || selectedWidgets.includes(overId as WidgetId);

    // Si el widget está en disponibles y lo arrastramos a la zona de seleccionados
    if (!isActiveInSelected && isOverDropzone && selectedWidgets.length < 4) {
      setSelectedWidgets(prev => [...prev, activeId]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      // Si se suelta fuera, remover de seleccionados
      const activeId = active.id as WidgetId;
      if (selectedWidgets.includes(activeId)) {
        setSelectedWidgets(prev => prev.filter(id => id !== activeId));
      }
      return;
    }

    const activeId = active.id as WidgetId;
    const overId = over.id as WidgetId;

    // Reordenar dentro de seleccionados
    if (selectedWidgets.includes(activeId) && selectedWidgets.includes(overId)) {
      const oldIndex = selectedWidgets.indexOf(activeId);
      const newIndex = selectedWidgets.indexOf(overId);
      if (oldIndex !== newIndex) {
        setSelectedWidgets(arrayMove(selectedWidgets, oldIndex, newIndex));
      }
    }
  };

  const handleRemoveWidget = (widgetId: WidgetId) => {
    setSelectedWidgets(prev => prev.filter(id => id !== widgetId));
  };

  const handleSave = () => {
    if (selectedWidgets.length >= 1) {
      onSelectWidgets(selectedWidgets);
      onClose();
    }
  };

  const activeWidget = activeId ? WIDGETS_DISPONIBLES.find(w => w.id === activeId) : null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              Seleccionar Widgets
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Zona de widgets seleccionados */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Widgets en tu dashboard
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedWidgets.length}/4
                  </span>
                </div>
                <SortableContext items={selectedWidgets} strategy={rectSortingStrategy}>
                  <DropZone selectedCount={selectedWidgets.length}>
                    {selectedWidgetData.map(widget => (
                      <div key={widget.id} className="relative group">
                        <DraggableWidget
                          id={widget.id}
                          title={widget.title}
                          isInDropZone
                        />
                        <button
                          onClick={() => handleRemoveWidget(widget.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </DropZone>
                </SortableContext>
              </div>

              {/* Widgets disponibles */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Widgets disponibles
                </h3>
                <SortableContext items={availableWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 gap-3">
                    {availableWidgets.map(widget => (
                      <DraggableWidget
                        key={widget.id}
                        id={widget.id}
                        title={widget.title}
                      />
                    ))}
                  </div>
                </SortableContext>
                {availableWidgets.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Todos los widgets están seleccionados
                  </p>
                )}
              </div>

              <DragOverlay>
                {activeWidget ? (
                  <DragOverlayWidget title={activeWidget.title} />
                ) : null}
              </DragOverlay>
            </DndContext>
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
              disabled={selectedWidgets.length === 0}
              className="px-4 py-2 text-sm font-medium bg-ras-turquesa text-white hover:bg-ras-azul rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
