'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';

interface NuevoTicketProps {
  isOpen: boolean;
  onClose: () => void;
  propiedadId?: string;
  propiedades: { id: string; nombre: string }[];
  onTicketCreado?: () => void;
}

export default function NuevoTicket({
  isOpen,
  onClose,
  propiedadId,
  propiedades,
  onTicketCreado
}: NuevoTicketProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    propiedad_id: propiedadId || '',
    tipo_ticket: 'compra',
    titulo: '',
    descripcion: '',
    fecha_pago: '',
    monto_estimado: '',
    prioridad: 'media',
    estado: 'pendiente',
    responsable: '',
    proveedor: ''
  });

  const tiposTicket = [
    { value: 'compra', label: 'Compra', icon: '💵' },
    { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
    { value: 'reparacion', label: 'Reparación', icon: '🛠️' },
    { value: 'limpieza', label: 'Limpieza', icon: '🧹' },
    { value: 'inspeccion', label: 'Inspección', icon: '🔍' },
    { value: 'otro', label: 'Otro', icon: '📋' }
  ];

  const responsables = [
    { value: 'propietario', label: 'Propietario' },
    { value: 'inquilino', label: 'Inquilino' },
    { value: 'supervisor', label: 'Supervisor' }
  ];

  const prioridades = [
    { value: 'baja', label: 'Baja', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'media', label: 'Media', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-300' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      setArchivos([...archivos, ...nuevosArchivos]);
    }
  };

  const removeFile = (index: number) => {
    setArchivos(archivos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tickets')
        .insert({
          propiedad_id: formData.propiedad_id,
          servicio_id: null, // NULL para tickets manuales
          tipo_ticket: formData.tipo_ticket,
          titulo: formData.titulo,
          descripcion: formData.descripcion || null,
          fecha_programada: formData.fecha_pago,
          monto_estimado: formData.monto_estimado ? parseFloat(formData.monto_estimado) : null,
          prioridad: formData.prioridad,
          estado: formData.estado,
          responsable: formData.responsable || null,
          proveedor: formData.proveedor || null,
          pagado: false,
          tiene_factura: false
        });

      if (error) throw error;

      // TODO: Subir archivos a Supabase Storage si hay archivos seleccionados
      // Implementar después de crear el bucket en Supabase Storage

      // Notificar éxito
      toast.success('✅ Ticket creado exitosamente');

      // Resetear form
      setFormData({
        propiedad_id: propiedadId || '',
        tipo_ticket: 'compra',
        titulo: '',
        descripcion: '',
        fecha_pago: '',
        monto_estimado: '',
        prioridad: 'media',
        estado: 'pendiente',
        responsable: '',
        proveedor: ''
      });
      setArchivos([]);

      onTicketCreado?.();
      onClose();
    } catch (error) {
      console.error('Error al crear ticket:', error);
      toast.error('❌ Error al crear el ticket. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-poppins">Nuevo Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Propiedad (solo si no está preseleccionada) */}
          {!propiedadId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Propiedad *
              </label>
              <select
                value={formData.propiedad_id}
                onChange={(e) => setFormData({ ...formData, propiedad_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent font-medium"
                required
              >
                <option value="">Selecciona una propiedad</option>
                {propiedades.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tipo de Ticket */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 font-poppins">
              Tipo de Ticket *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tiposTicket.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo_ticket: tipo.value })}
                  className={`
                    px-4 py-3 rounded-xl border-2 transition-all font-medium
                    ${formData.tipo_ticket === tipo.value
                      ? 'border-ras-turquesa bg-ras-turquesa text-white shadow-lg scale-105'
                      : 'border-gray-300 hover:border-ras-turquesa hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{tipo.icon}</span>
                    <span className="text-sm">{tipo.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Reparación de tubería en cocina"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent font-medium"
              required
              maxLength={255}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalles adicionales del ticket..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent resize-none"
            />
          </div>

          {/* Fecha y Monto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Fecha Programada *
              </label>
              <input
                type="date"
                value={formData.fecha_pago}
                onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
                required
              />
            </div>

            {/* Monto Estimado */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Monto Estimado
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  value={formData.monto_estimado}
                  onChange={(e) => setFormData({ ...formData, monto_estimado: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Responsable y Proveedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsable */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Responsable
              </label>
              <select
                value={formData.responsable}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent font-medium"
              >
                <option value="">Seleccionar responsable</option>
                {responsables.map((resp) => (
                  <option key={resp.value} value={resp.value}>
                    {resp.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
                Proveedor
              </label>
              <input
                type="text"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
            </div>
          </div>

          {/* Archivos Adjuntos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-poppins">
              Archivos Adjuntos
            </label>
            <div className="space-y-3">
              {/* Botón para subir archivos */}
              <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-ras-turquesa transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 text-gray-600 group-hover:text-ras-turquesa">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Seleccionar archivos</span>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>

              {/* Lista de archivos seleccionados */}
              {archivos.length > 0 && (
                <div className="space-y-2">
                  {archivos.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 font-poppins">
              Prioridad *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {prioridades.map((prioridad) => (
                <button
                  key={prioridad.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, prioridad: prioridad.value })}
                  className={`
                    px-4 py-3 rounded-xl border-2 transition-all font-semibold text-sm
                    ${formData.prioridad === prioridad.value
                      ? 'border-ras-azul bg-ras-azul text-white shadow-lg scale-105'
                      : `border-2 ${prioridad.color} hover:scale-105`
                    }
                  `}
                >
                  {prioridad.label}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl hover:shadow-xl transition-all disabled:opacity-50 font-bold"
            >
              {loading ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}