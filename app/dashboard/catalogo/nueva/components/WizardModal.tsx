/**
 * WizardModal - VERSIÓN ACTUALIZADA
 * 
 * Modal compatible con el nuevo sistema de guardado
 * 
 * @version 2.0
 */

'use client';

import { useEffect, useState } from 'react';
import WizardContainer from './WizardContainer';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  propertyId?: string;
  onComplete?: (propertyId: string) => void | Promise<void>;
}

export default function WizardModal({
  isOpen,
  onClose,
  mode = 'create',
  propertyId,
  onComplete
}: WizardModalProps) {
  
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleComplete = async (propertyId: string) => {
    // Llamar callback antes de cerrar
    if (onComplete) {
      try {
        await Promise.resolve(onComplete(propertyId));
      } catch (error) {
        console.error('Error en onComplete:', error);
      }
    }
    
    // Cerrar modal
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 
        transition-all duration-300 ease-out
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Contenedor del Modal */}
      <div 
        className={`
          absolute inset-0 overflow-y-auto
          transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Header con botón cerrar */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-ras-azul/70 to-ras-turquesa/70 backdrop-blur-md border-b border-white/10 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {mode === 'create' ? 'Nueva Propiedad' : 'Editar Propiedad'}
                </h2>
                <p className="text-xs text-white/80">
                  Completa los 5 pasos del formulario
                </p>
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full border-2 border-white/30 bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
              aria-label="Cerrar"
            >
              <svg 
                className="w-5 h-5 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido del Wizard */}
        <div className="relative min-h-[calc(100vh-80px)] bg-gray-50">
          <WizardContainer
            mode={mode}
            propertyId={propertyId}
            onComplete={handleComplete}
            onCancel={handleClose}
          />
        </div>
      </div>
    </div>
  );
}