'use client';

import { useState } from 'react';

interface Ticket {
  id: string;
  titulo: string;
  fecha_programada: string;
  monto_estimado: number;
  pagado: boolean;
  servicio_id: string | null;
  tipo_ticket: string;
  estado: string;
  prioridad: string;
  responsable: string | null;
  proveedor: string | null;
  propiedad_id: string;
  propiedad_nombre: string;
  dias_restantes: number;
  descripcion?: string | null;
}

interface TicketDetallesProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onRegistrarPago: (ticket: Ticket) => void;
}

export default function TicketDetalles({
  isOpen,
  onClose,
  ticket,
  onRegistrarPago
}: TicketDetallesProps) {
  if (!isOpen || !ticket) return null;

  const getTipoIcon = (tipo: string) => {
    const iconMap: Record<string, string> = {
      compra: '💵',
      mantenimiento: '🔧',
      reparacion: '🛠️',
      limpieza: '🧹',
      inspeccion: '🔍',
      servicio_recurrente: '📅',
      otro: '📋'
    };
    return iconMap[tipo] || '📋';
  };

  const getEstadoBadge = (diasRestantes: number) => {
    if (diasRestantes < 0) {
      return {
        text: 'VENCIDO',
        classes: 'bg-red-100 text-red-700 border-red-300'
      };
    }
    if (diasRestantes === 0) {
      return {
        text: 'HOY',
        classes: 'bg-yellow-100 text-yellow-700 border-yellow-300'
      };
    }
    if (diasRestantes <= 7) {
      return {
        text: 'PRÓXIMO',
        classes: 'bg-orange-100 text-orange-700 border-orange-300'
      };
    }
    return {
      text: 'PROGRAMADO',
      classes: 'bg-green-100 text-green-700 border-green-300'
    };
  };

  const getPrioridadBadge = (prioridad: string) => {
    const prioridadLower = prioridad.toLowerCase();
    const badges: Record<string, { classes: string }> = {
      baja: { classes: 'bg-gray-100 text-gray-700 border-gray-300' },
      media: { classes: 'bg-blue-100 text-blue-700 border-blue-300' },
      alta: { classes: 'bg-orange-100 text-orange-700 border-orange-300' },
      urgente: { classes: 'bg-red-100 text-red-700 border-red-300' }
    };
    return badges[prioridadLower] || badges.media;
  };

  const badge = getEstadoBadge(ticket.dias_restantes);
  const prioridadBadge = getPrioridadBadge(ticket.prioridad);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
              {getTipoIcon(ticket.tipo_ticket)}
            </div>
            <div>
              <h2 className="text-xl font-bold font-poppins">Detalles del Ticket</h2>
              <p className="text-sm text-white/80 capitalize">{ticket.tipo_ticket.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Título y Estado */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{ticket.titulo}</h3>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border-2 ${badge.classes}`}>
                {badge.text}
              </span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border-2 ${prioridadBadge.classes}`}>
                Prioridad: {ticket.prioridad}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border-2 bg-blue-100 text-blue-700 border-blue-300 capitalize">
                {ticket.estado}
              </span>
            </div>
          </div>

          {/* Descripción */}
          {ticket.descripcion && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Descripción</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.descripcion}</p>
            </div>
          )}

          {/* Información Principal - Grid 2 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Propiedad */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs font-semibold text-blue-700 uppercase">Propiedad</span>
              </div>
              <p className="text-lg font-bold text-blue-900">{ticket.propiedad_nombre}</p>
            </div>

            {/* Fecha Programada */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-purple-700 uppercase">Fecha Programada</span>
              </div>
              <p className="text-lg font-bold text-purple-900">
                {new Date(ticket.fecha_programada).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-purple-700 mt-1">
                {ticket.dias_restantes < 0
                  ? `${Math.abs(ticket.dias_restantes)} días atrasado`
                  : ticket.dias_restantes === 0
                  ? 'Vence hoy'
                  : `En ${ticket.dias_restantes} días`
                }
              </p>
            </div>

            {/* Monto Estimado */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-green-700 uppercase">Monto Estimado</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${ticket.monto_estimado?.toFixed(2) || '0.00'}
              </p>
            </div>

            {/* Responsable */}
            {ticket.responsable && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs font-semibold text-amber-700 uppercase">Responsable</span>
                </div>
                <p className="text-lg font-bold text-amber-900 capitalize">{ticket.responsable}</p>
              </div>
            )}
          </div>

          {/* Proveedor */}
          {ticket.proveedor && (
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs font-semibold text-indigo-700 uppercase">Proveedor</span>
              </div>
              <p className="text-lg font-bold text-indigo-900">{ticket.proveedor}</p>
            </div>
          )}

          {/* Tipo de ticket si es servicio */}
          {ticket.servicio_id && (
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">ℹ️ Nota:</span> Este ticket proviene de un servicio recurrente
              </p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onRegistrarPago(ticket);
                onClose();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl hover:shadow-xl transition-all font-bold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Registrar Pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
