'use client'

import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md' 
}: ModalProps) {
  
  if (!isOpen) return null
  
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }
  
  return (
    <div 
      onClick={onClose} 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5 backdrop-blur-sm"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`bg-white rounded-2xl ${maxWidths[maxWidth]} w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        {title && (
          <div className="mb-6">
            <h2 className="text-3xl font-bold font-poppins text-gray-800">{title}</h2>
          </div>
        )}
        
        {children}
      </div>
    </div>
  )
}
