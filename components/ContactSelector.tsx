'use client';

/**
 * CONTACT SELECTOR - Versión Funcional Simple
 * 
 * Este es un selector básico de contactos.
 * Por ahora usa datos mock, pero puedes conectarlo a Supabase después.
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface ContactSelectorProps {
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  tipo: 'propietario' | 'supervisor' | 'inquilino';
}

// Contactos de ejemplo (mock data)
const MOCK_CONTACTS = [
  { id: '1', nombre: 'Juan Pérez', email: 'juan@example.com' },
  { id: '2', nombre: 'María García', email: 'maria@example.com' },
  { id: '3', nombre: 'Carlos López', email: 'carlos@example.com' },
  { id: '4', nombre: 'Ana Martínez', email: 'ana@example.com' },
  { id: '5', nombre: 'Pedro Sánchez', email: 'pedro@example.com' },
];

export default function ContactSelector({
  value,
  onChange,
  placeholder,
  tipo
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [loading, setLoading] = useState(false);

  // Aquí podrías cargar contactos desde Supabase
  useEffect(() => {
    loadContacts();
  }, [tipo]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      // TODO: Conectar a Supabase
      // const { data, error } = await supabase
      //   .from('contactos')
      //   .select('*')
      //   .eq('tipo', tipo);
      
      // Por ahora usamos mock data
      setContacts(MOCK_CONTACTS);
      
    } catch (error) {
      logger.error('Error cargando contactos:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === value);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ras-azul focus:border-transparent font-roboto appearance-none bg-white"
      >
        <option value="">
          {loading ? 'Cargando...' : placeholder}
        </option>
        
        {contacts.map(contact => (
          <option key={contact.id} value={contact.id}>
            {contact.nombre} - {contact.email}
          </option>
        ))}
      </select>

      {/* Icono de dropdown */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg 
          className="w-5 h-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>

      {/* Indicador de contacto seleccionado */}
      {selectedContact && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Seleccionado:</strong> {selectedContact.nombre}
          </p>
        </div>
      )}

      {/* Mensaje informativo */}
      <p className="mt-1 text-xs text-gray-500">
        💡 Estos son contactos de ejemplo. Puedes conectarlo a tu base de datos.
      </p>
    </div>
  );
}
