'use client';

import { useEffect } from 'react';

interface ModalValidacionProps {
  isOpen: boolean;
  onClose: () => void;
  errores: string[];
  titulo?: string;  // ← NUEVO: título personalizable
  variant?: 'error' | 'warning';  // ← NUEVO: variante de color (opcional)
}

export default function ModalValidacion({ 
  isOpen, 
  onClose, 
  errores,
  titulo = 'Errores de validación',  // ← Default genérico
  variant = 'error'  // ← Default: rojo (error)
}: ModalValidacionProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Colores según variante
  const colors = {
    error: {
      header: 'bg-red-500',
      icon: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900'
    },
    warning: {
      header: 'bg-amber-500',
      icon: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900'
    }
  };

  const currentColors = colors[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className={`${currentColors.header} text-white px-6 py-4 rounded-t-2xl flex items-center gap-3`}>
          <svg 
            className="w-6 h-6 flex-shrink-0" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h3 className="text-lg font-bold font-poppins">{titulo}</h3>
        </div>

        {/* Body - Lista de errores */}
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {errores.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p className="text-sm">No hay errores que mostrar</p>
            </div>
          ) : (
            errores.map((error, index) => (
              <div 
                key={index} 
                className={`flex items-start gap-3 p-3 ${currentColors.bg} border ${currentColors.border} rounded-lg`}
              >
                <svg 
                  className={`w-5 h-5 ${currentColors.icon} flex-shrink-0 mt-0.5`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
                <p className={`text-sm ${currentColors.text} font-medium font-roboto`}>
                  {error}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-ras-azul to-ras-turquesa text-white rounded-xl hover:shadow-lg transition-all font-bold font-poppins"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}