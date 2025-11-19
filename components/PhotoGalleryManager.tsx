// 📁 src/components/property/PhotoGalleryManager.tsx
'use client';

import React, { useState } from 'react';
import UploadPhotoModal from './UploadPhotoModal';
import { 
  deletePropertyImage,
  updateCoverImage,
  updateImageSpace,
  updateImageCaption 
} from '@/lib/supabase-storage';
import type { PropertyImage, Space } from '@/types/property';

interface PhotoGalleryManagerProps {
  propertyId: string;
  photos: PropertyImage[];
  spaces: Space[];
  onPhotosUpdate: (photos: PropertyImage[]) => void;
}

type ViewMode = 'spaces' | 'grid';

const PhotoGalleryManager: React.FC<PhotoGalleryManagerProps> = ({
  propertyId,
  photos,
  spaces,
  onPhotosUpdate
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('spaces');
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [dragOverSpace, setDragOverSpace] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<PropertyImage | null>(null);

  // Estadísticas
  const stats = {
    total: photos.length,
    assigned: photos.filter(p => p.space_type).length,
    unassigned: photos.filter(p => !p.space_type).length,
    withCover: photos.filter(p => p.is_cover).length,
    bySpace: spaces.reduce((acc, space) => {
      acc[space.id] = photos.filter(p => p.space_type === space.id).length;
      return acc;
    }, {} as Record<string, number>)
  };

  // Fotos sin asignar
  const unassignedPhotos = photos.filter(p => !p.space_type);

  // Filtrar fotos por espacio (para vista grid)
  const filteredPhotos = selectedSpace === 'all' 
    ? photos 
    : selectedSpace === 'unassigned'
    ? unassignedPhotos
    : photos.filter(p => p.space_type === selectedSpace);

  // ===== DRAG & DROP =====
  const handleDragStart = (photoId: string) => {
    setDraggedPhoto(photoId);
  };

  const handleDragEnd = () => {
    setDraggedPhoto(null);
    setDragOverSpace(null);
  };

  const handleDragOver = (e: React.DragEvent, spaceId: string | null) => {
    e.preventDefault();
    setDragOverSpace(spaceId);
  };

  const handleDrop = async (e: React.DragEvent, targetSpaceId: string | null) => {
    e.preventDefault();
    if (!draggedPhoto) return;

    try {
      // 1. Primero actualizar en Supabase
      await updateImageSpace(draggedPhoto, targetSpaceId);

      // 2. Luego actualizar estado local
      const updatedPhotos = photos.map(photo =>
        photo.id === draggedPhoto
          ? { ...photo, space_type: targetSpaceId }
          : photo
      );

      onPhotosUpdate(updatedPhotos);
    } catch (error) {
      console.error('Error actualizando espacio:', error);
      alert('Error al asignar espacio');
    }

    setDraggedPhoto(null);
    setDragOverSpace(null);
  };

  // ===== CAPTION =====
  const handleSaveCaption = async (photoId: string) => {
    try {
      // 1. Primero actualizar en Supabase
      await updateImageCaption(photoId, captionText);

      // 2. Luego actualizar estado local
      const updatedPhotos = photos.map(photo =>
        photo.id === photoId
          ? { ...photo, caption: captionText }
          : photo
      );
      onPhotosUpdate(updatedPhotos);
      
      setEditingCaption(null);
      setCaptionText('');
    } catch (error) {
      console.error('Error actualizando caption:', error);
      alert('Error al guardar descripción');
    }
  };

  // ===== COVER =====
  const handleSetCover = async (photoId: string) => {
    try {
      // 1. Primero actualizar en Supabase
      await updateCoverImage(propertyId, photoId);

      // 2. Luego actualizar estado local
      const updatedPhotos = photos.map(photo => ({
        ...photo,
        is_cover: photo.id === photoId
      }));
      onPhotosUpdate(updatedPhotos);
    } catch (error) {
      console.error('Error actualizando portada:', error);
      alert('Error al marcar como portada');
    }
  };

  // ===== DELETE =====
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('¿Eliminar esta foto? Esta acción no se puede deshacer.')) return;

    try {
      await deletePropertyImage(photoId, propertyId);
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      
      // Si eliminamos la portada y quedan fotos, hacer la primera como portada
      const deletedPhoto = photos.find(p => p.id === photoId);
      if (deletedPhoto?.is_cover && updatedPhotos.length > 0) {
        updatedPhotos[0].is_cover = true;
        await updateCoverImage(propertyId, updatedPhotos[0].id!);
      }
      
      onPhotosUpdate(updatedPhotos);
    } catch (error) {
      console.error('Error eliminando foto:', error);
      alert('Error al eliminar la foto');
    }
  };

  // ===== REORDER (dentro del mismo espacio) =====
  const handleReorderPhotos = (spaceId: string | null, fromIndex: number, toIndex: number) => {
    const spacePhotos = photos.filter(p => p.space_type === spaceId);
    const otherPhotos = photos.filter(p => p.space_type !== spaceId);
    
    const reordered = [...spacePhotos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    
    // Actualizar order_index
    const updatedSpacePhotos = reordered.map((photo, index) => ({
      ...photo,
      order_index: index
    }));
    
    onPhotosUpdate([...otherPhotos, ...updatedSpacePhotos]);
  };

  return (
    <>
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Control Bar */}
        <div className="bg-white border-b-2 border-gray-200 shadow-sm">
          <div className="max-w-[1920px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* View Mode Tabs */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('spaces')}
                  className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all ${
                    viewMode === 'spaces'
                      ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🏠</span>
                    Por Espacios
                    {unassignedPhotos.length > 0 && (
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                        {unassignedPhotos.length}
                      </span>
                    )}
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('grid')}
                  className={`group relative px-5 py-2.5 rounded-lg font-semibold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-ras-azul to-ras-turquesa text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🖼️</span>
                    Vista Completa
                  </span>
                </button>
              </div>

              {/* Stats + Add Button */}
              <div className="flex items-center gap-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">{stats.assigned} asignadas</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700">{stats.unassigned} sin asignar</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="font-bold text-gray-900">
                    Total: {stats.total}
                  </div>
                </div>

                {/* Add Photos Button */}
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4"/>
                  </svg>
                  Agregar Fotos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1920px] mx-auto p-6">
            {/* Empty State */}
            {photos.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[500px]">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">📷</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No hay fotos aún
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comienza agregando fotos de tu propiedad para mostrar sus mejores características.
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-lg font-semibold hover:shadow-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 4v16m8-8H4"/>
                    </svg>
                    Subir Primeras Fotos
                  </button>
                </div>
              </div>
            )}

            {/* VIEW MODE: POR ESPACIOS */}
            {photos.length > 0 && viewMode === 'spaces' && (
              <div className="space-y-6">
                {/* Fotos Sin Asignar */}
                {unassignedPhotos.length > 0 && (
                  <div
                    className={`bg-white rounded-xl shadow-md border-2 transition-all ${
                      dragOverSpace === null
                        ? 'border-orange-400 ring-4 ring-orange-200'
                        : 'border-orange-300'
                    }`}
                    onDragOver={(e) => handleDragOver(e, null)}
                    onDrop={(e) => handleDrop(e, null)}
                  >
                    <div className="p-6 border-b-2 border-orange-100 bg-gradient-to-r from-orange-50 to-yellow-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl">⚠️</span>
                            Fotos Sin Asignar
                            <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                              {unassignedPhotos.length}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Arrastra estas fotos a un espacio específico para organizarlas
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {unassignedPhotos.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-lg">✅ Todas las fotos están asignadas</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {unassignedPhotos.map((photo) => (
                            <PhotoCard
                              key={photo.id}
                              photo={photo}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onSetCover={handleSetCover}
                              onDelete={handleDeletePhoto}
                              onEditCaption={handleEditCaption}
                              editingCaption={editingCaption}
                              captionText={captionText}
                              setCaptionText={setCaptionText}
                              onSaveCaption={handleSaveCaption}
                              onPreview={setSelectedPhotoPreview}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Espacios */}
                {spaces.map((space) => {
                  const spacePhotos = photos.filter(p => p.space_type === space.id);
                  
                  return (
                    <div
                      key={space.id}
                      className={`bg-white rounded-xl shadow-md border-2 transition-all ${
                        dragOverSpace === space.id
                          ? 'border-ras-azul ring-4 ring-ras-azul/20 scale-[1.01]'
                          : 'border-gray-200'
                      }`}
                      onDragOver={(e) => handleDragOver(e, space.id)}
                      onDrop={(e) => handleDrop(e, space.id)}
                    >
                      <div className="p-6 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              <span className="text-2xl">{space.icon || '🏠'}</span>
                              {space.name}
                              {spacePhotos.length > 0 && (
                                <span className="px-3 py-1 bg-ras-azul text-white text-sm font-bold rounded-full">
                                  {spacePhotos.length}
                                </span>
                              )}
                            </h3>
                            {space.description && (
                              <p className="text-sm text-gray-600 mt-1">{space.description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        {spacePhotos.length === 0 ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                            <p className="text-gray-400 text-lg">
                              📸 Arrastra fotos aquí para asignarlas a este espacio
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {spacePhotos.map((photo) => (
                              <PhotoCard
                                key={photo.id}
                                photo={photo}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onSetCover={handleSetCover}
                                onDelete={handleDeletePhoto}
                                onEditCaption={handleEditCaption}
                                editingCaption={editingCaption}
                                captionText={captionText}
                                setCaptionText={setCaptionText}
                                onSaveCaption={handleSaveCaption}
                                onPreview={setSelectedPhotoPreview}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* No Spaces */}
                {spaces.length === 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8 text-center">
                    <span className="text-5xl mb-4 block">⚠️</span>
                    <h3 className="text-xl font-bold text-yellow-900 mb-2">
                      No hay espacios creados
                    </h3>
                    <p className="text-yellow-700">
                      Crea espacios en el Paso 3 del wizard para organizar tus fotos por habitaciones.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE: GRID */}
            {photos.length > 0 && viewMode === 'grid' && (
              <div>
                {/* Filter Bar */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      Vista Completa de la Galería
                    </h3>
                    <select
                      value={selectedSpace}
                      onChange={(e) => setSelectedSpace(e.target.value)}
                      className="pl-4 pr-10 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 focus:ring-2 focus:ring-ras-azul focus:border-ras-azul transition-all"
                    >
                      <option value="all">🖼️ Todas las fotos ({photos.length})</option>
                      {unassignedPhotos.length > 0 && (
                        <option value="unassigned">⚠️ Sin asignar ({unassignedPhotos.length})</option>
                      )}
                      {spaces.map(space => (
                        <option key={space.id} value={space.id}>
                          {space.icon || '🏠'} {space.name} ({stats.bySpace[space.id] || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid */}
                {filteredPhotos.length === 0 ? (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-16 text-center">
                    <span className="text-6xl mb-4 block">📷</span>
                    <p className="text-xl text-gray-400">No hay fotos en este filtro</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredPhotos.map((photo) => {
                      const photoSpace = spaces.find(s => s.id === photo.space_type);
                      return (
                        <PhotoCardGrid
                          key={photo.id}
                          photo={photo}
                          space={photoSpace}
                          onSetCover={handleSetCover}
                          onDelete={handleDeletePhoto}
                          onEditCaption={handleEditCaption}
                          editingCaption={editingCaption}
                          captionText={captionText}
                          setCaptionText={setCaptionText}
                          onSaveCaption={handleSaveCaption}
                          onPreview={setSelectedPhotoPreview}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadPhotoModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        propertyId={propertyId}
        photos={photos}
        onPhotosChange={onPhotosUpdate}
      />

      {/* Photo Preview Modal */}
      {selectedPhotoPreview && (
        <PhotoPreviewModal
          photo={selectedPhotoPreview}
          onClose={() => setSelectedPhotoPreview(null)}
        />
      )}
    </>
  );
};

// ===== SUB-COMPONENTES =====

interface PhotoCardProps {
  photo: PropertyImage;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onSetCover: (id: string) => void;
  onDelete: (id: string) => void;
  onEditCaption: (id: string, caption: string | null) => void;
  editingCaption: string | null;
  captionText: string;
  setCaptionText: (text: string) => void;
  onSaveCaption: (id: string) => void;
  onPreview: (photo: PropertyImage) => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onDragStart,
  onDragEnd,
  onSetCover,
  onDelete,
  onEditCaption,
  editingCaption,
  captionText,
  setCaptionText,
  onSaveCaption,
  onPreview
}) => (
  <div
    draggable
    onDragStart={() => onDragStart(photo.id!)}
    onDragEnd={onDragEnd}
    className="relative group bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-xl hover:scale-105 transition-all cursor-move"
  >
    {/* Image */}
    <div 
      className="aspect-square bg-gray-100 cursor-pointer"
      onClick={() => onPreview(photo)}
    >
      <img
        src={photo.url_thumbnail || photo.url}
        alt={photo.caption || 'Foto'}
        className="w-full h-full object-cover"
      />
    </div>

    {/* Cover Badge */}
    {photo.is_cover && (
      <div className="absolute top-2 left-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold rounded-md shadow-lg">
          ⭐ Portada
        </span>
      </div>
    )}

    {/* Action Buttons */}
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
      {!photo.is_cover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetCover(photo.id!);
          }}
          className="px-2 py-1 bg-ras-azul text-white text-xs font-bold rounded-md hover:bg-ras-azul/90 shadow-lg transition-all"
          title="Marcar como portada"
        >
          ⭐
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(photo.id!);
        }}
        className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 shadow-lg transition-all"
        title="Eliminar"
      >
        🗑️
        </button>
    </div>

    {/* Caption */}
    <div className="p-2 bg-white border-t border-gray-200">
      {editingCaption === photo.id ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveCaption(photo.id!);
              if (e.key === 'Escape') onEditCaption(photo.id!, null);
            }}
            className="flex-1 px-1 py-0.5 text-xs border border-ras-azul rounded focus:ring-1 focus:ring-ras-azul"
            placeholder="Descripción..."
            autoFocus
          />
          <button
            onClick={() => onSaveCaption(photo.id!)}
            className="text-green-600 text-xs font-bold"
          >
            ✓
          </button>
        </div>
      ) : (
        <p 
          className="text-xs text-gray-600 truncate cursor-pointer hover:text-ras-azul"
          onClick={() => onEditCaption(photo.id!, photo.caption)}
        >
          {photo.caption || 'Sin descripción'}
        </p>
      )}
    </div>
  </div>
);

interface PhotoCardGridProps {
  photo: PropertyImage;
  space?: Space;
  onSetCover: (id: string) => void;
  onDelete: (id: string) => void;
  onEditCaption: (id: string, caption: string | null) => void;
  editingCaption: string | null;
  captionText: string;
  setCaptionText: (text: string) => void;
  onSaveCaption: (id: string) => void;
  onPreview: (photo: PropertyImage) => void;
}

const PhotoCardGrid: React.FC<PhotoCardGridProps> = ({
  photo,
  space,
  onSetCover,
  onDelete,
  onEditCaption,
  editingCaption,
  captionText,
  setCaptionText,
  onSaveCaption,
  onPreview
}) => (
  <div className="relative group bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all">
    {/* Image */}
    <div 
      className="aspect-square bg-gray-100 cursor-pointer"
      onClick={() => onPreview(photo)}
    >
      <img
        src={photo.url_thumbnail || photo.url}
        alt={photo.caption || 'Foto'}
        className="w-full h-full object-cover"
      />
    </div>

    {/* Badges */}
    <div className="absolute top-2 left-2 flex flex-col gap-2">
      {photo.is_cover && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold rounded-md shadow-lg">
          ⭐ Portada
        </span>
      )}
      {space && (
        <span className="inline-flex items-center px-2 py-1 bg-gray-900/80 text-white text-xs font-medium rounded-md shadow-lg">
          {space.icon} {space.name}
        </span>
      )}
    </div>

    {/* Action Buttons */}
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
      {!photo.is_cover && (
        <button
          onClick={() => onSetCover(photo.id!)}
          className="px-2 py-1 bg-ras-azul text-white text-xs font-bold rounded-md hover:bg-ras-azul/90 shadow-lg"
        >
          ⭐
        </button>
      )}
      <button
        onClick={() => onDelete(photo.id!)}
        className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 shadow-lg"
      >
        🗑️
      </button>
    </div>

    {/* Caption */}
    <div className="p-2 bg-white border-t border-gray-200">
      {editingCaption === photo.id ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveCaption(photo.id!);
              if (e.key === 'Escape') onEditCaption(photo.id!, null);
            }}
            className="flex-1 px-1 py-0.5 text-xs border border-ras-azul rounded focus:ring-1 focus:ring-ras-azul"
            autoFocus
          />
          <button
            onClick={() => onSaveCaption(photo.id!)}
            className="text-green-600 text-xs font-bold"
          >
            ✓
          </button>
        </div>
      ) : (
        <p 
          className="text-xs text-gray-600 truncate cursor-pointer hover:text-ras-azul"
          onClick={() => onEditCaption(photo.id!, photo.caption)}
        >
          {photo.caption || 'Sin descripción'}
        </p>
      )}
    </div>
  </div>
);

interface PhotoPreviewModalProps {
  photo: PropertyImage;
  onClose: () => void;
}

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({ photo, onClose }) => (
  <div 
    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
    onClick={onClose}
  >
    <button
      onClick={onClose}
      className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl transition-all"
    >
      ✕
    </button>
    <img
      src={photo.url}
      alt={photo.caption || 'Preview'}
      className="max-w-full max-h-full rounded-lg shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    />
    {photo.caption && (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-lg shadow-xl max-w-2xl">
        <p className="text-center">{photo.caption}</p>
      </div>
    )}
  </div>
);

export default PhotoGalleryManager;
