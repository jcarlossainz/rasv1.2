// 📁 src/app/dashboard/propiedad/[id]/inventario/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { useConfirm } from '@/components/ui/confirm-modal';
import { logger } from '@/lib/logger';
import TopBar from '@/components/ui/topbar';
import Loading from '@/components/ui/loading';
import EmptyState from '@/components/ui/emptystate';
import EditItemModal from './components/EditItemModal';

interface InventoryItem {
  id: string;
  object_name: string;
  confidence: number;
  space_type: string | null;
  labels: string | null;
  image_url: string;
  image_id: string;
  created_at: string;
}

interface PropertyData {
  id: string;
  nombre_propiedad: string;
  tipo_propiedad: string;
}

interface SpaceData {
  id: string;
  nombre: string;
}

export default function InventarioPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const toast = useToast();
  const confirm = useConfirm();
  const { user, loading: authLoading } = useAuth();
  const logout = useLogout();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [spaces, setSpaces] = useState<SpaceData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpace, setFilterSpace] = useState<string>('all');

  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user, propertyId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar propiedad
      const { data: propertyData, error: propError } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad')
        .eq('id', propertyId)
        .single();

      if (propError) throw propError;
      setProperty(propertyData);

      // NOTA: Las tablas property_spaces y property_inventory aún no existen
      // Esta funcionalidad se implementará en una fase futura
      setSpaces([]);
      setInventory([]);

    } catch (error: any) {
      logger.error('Error cargando datos:', error);
      toast.error('Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('property_inventory')
        .select(`
          id,
          object_name,
          confidence,
          space_type,
          labels,
          image_url,
          image_id,
          created_at
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      logger.error('Error cargando inventario:', error);
    }
  };

  const handleAnalyzeAll = async () => {
    const confirmed = await confirm.warning(
      '¿Analizar todas las fotos de la galería?',
      'Este proceso puede tomar varios minutos dependiendo de la cantidad de imágenes.'
    );
    
    if (!confirmed) return;

    try {
      setAnalyzing(true);

      const response = await fetch('/api/vision/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        await loadInventory();
      } else {
        throw new Error(result.error);
      }

    } catch (error: any) {
      logger.error('Error en análisis:', error);
      toast.error('Error al analizar imágenes');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedItem: { object_name: string; labels: string; space_type: string }) => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('property_inventory')
        .update({
          object_name: updatedItem.object_name,
          labels: updatedItem.labels || null,
          space_type: updatedItem.space_type || null
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      await loadInventory();
      setShowEditModal(false);
      setEditingItem(null);
      toast.success('Item actualizado correctamente');
    } catch (error: any) {
      logger.error('Error actualizando item:', error);
      toast.error('Error al actualizar el item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await confirm.danger(
      '¿Eliminar este item del inventario?',
      'Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('property_inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setInventory(inventory.filter(item => item.id !== itemId));
      toast.success('Item eliminado correctamente');
    } catch (error: any) {
      logger.error('Error eliminando item:', error);
      toast.error('Error al eliminar el item');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Función para obtener el nombre real del espacio
  const getSpaceName = (spaceId: string | null): string => {
    if (!spaceId) return 'Sin espacio';
    
    const space = spaces.find(s => s.id === spaceId);
    return space ? space.nombre : 'Espacio desconocido';
  };

  // Filtrar inventario
  const filteredInventory = inventory.filter((item) => {
    // Filtro de búsqueda
    const matchesSearch = 
      item.object_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.labels && item.labels.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filtro por espacio
    const matchesSpace = 
      filterSpace === 'all' ||
      (filterSpace === 'sin-espacio' && !item.space_type) ||
      item.space_type === filterSpace;

    return matchesSearch && matchesSpace;
  });

  // Obtener espacios únicos del inventario
  const uniqueSpaces = Array.from(new Set(
    inventory
      .filter(item => item.space_type)
      .map(item => item.space_type as string)
  ));

  if (authLoading || loading) {
    return <Loading />;
  }

  if (!property) {
    return (
      <EmptyState 
        icon={
          <svg className="w-12 h-12 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        }
        title="Propiedad no encontrada"
        description="No se pudo cargar la información de la propiedad"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar 
        title={`Inventario - ${property?.nombre || ''}`}
        showBackButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Barra de acción superior */}
        {inventory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              {/* Botón Analizar a la IZQUIERDA */}
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzing}
                className="px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl hover:shadow-xl transition-all disabled:bg-gray-400 font-semibold"
              >
                {analyzing ? 'Analizando...' : '🔍 Analizar Galería'}
              </button>
              
              {/* Total de Items a la DERECHA */}
              <div className="text-right">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total de Items</h3>
                <p className="text-4xl font-bold text-ras-azul">{inventory.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Buscador */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por objeto o etiquetas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-ras-turquesa focus:outline-none transition-colors"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
            </div>

            {/* Filtro por espacio */}
            <div className="relative">
              <select
                value={filterSpace}
                onChange={(e) => setFilterSpace(e.target.value)}
                className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:border-ras-turquesa focus:border-ras-turquesa focus:outline-none transition-colors cursor-pointer"
              >
                <option value="all">📍 Todos los espacios</option>
                <option value="sin-espacio">🔹 Sin espacio</option>
                {uniqueSpaces.map(spaceId => (
                  <option key={spaceId} value={spaceId}>
                    {getSpaceName(spaceId)}
                  </option>
                ))}
              </select>
              <svg className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Tabla de inventario */}
        {filteredInventory.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Encabezados */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-3">
              <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-gray-600">
                <div className="col-span-1">Imagen</div>
                <div className="col-span-3">Objeto</div>
                <div className="col-span-3">Etiquetas</div>
                <div className="col-span-3">Espacio</div>
                <div className="col-span-2 text-center">Acciones</div>
              </div>
            </div>

            {/* Filas */}
            <div className="divide-y divide-gray-100">
              {filteredInventory.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-all">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Imagen */}
                    <div className="col-span-1">
                      <img
                        src={item.image_url}
                        alt={item.object_name}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                      />
                    </div>

                    {/* Objeto */}
                    <div className="col-span-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.object_name}
                      </div>
                    </div>

                    {/* Etiquetas */}
                    <div className="col-span-3">
                      {item.labels ? (
                        <div className="flex flex-wrap gap-1">
                          {item.labels.split(',').slice(0, 3).map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 font-medium"
                            >
                              {label.trim()}
                            </span>
                          ))}
                          {item.labels.split(',').length > 3 && (
                            <span className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600">
                              +{item.labels.split(',').length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sin etiquetas</span>
                      )}
                    </div>

                    {/* Espacio - MOSTRANDO NOMBRE REAL */}
                    <div className="col-span-3">
                      <span className="px-3 py-1 text-sm rounded-lg bg-blue-100 text-blue-700 font-medium">
                        {getSpaceName(item.space_type)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="col-span-2">
                      <div className="flex gap-2 justify-center">
                        {/* Editar */}
                        <button
                          onClick={() => handleEditItem(item)}
                          className="w-10 h-10 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 hover:scale-110 transition-all flex items-center justify-center group"
                          title="Editar"
                        >
                          <svg className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-10 h-10 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 hover:scale-110 transition-all flex items-center justify-center group"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState 
            icon={
              <svg className="w-12 h-12 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            }
            title={inventory.length === 0 ? "No hay items en el inventario" : "No se encontraron resultados"}
            description={inventory.length === 0 ? "Haz clic en 'Analizar Galería' para detectar objetos automáticamente" : "Intenta con otra búsqueda o cambia los filtros"}
            actionLabel={inventory.length === 0 ? "🔍 Analizar Galería" : undefined}
            onAction={inventory.length === 0 ? handleAnalyzeAll : undefined}
          />
        )}
      </main>

      {/* Modal de edición */}
      {showEditModal && editingItem && (
        <EditItemModal
          item={editingItem}
          spaces={spaces}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}