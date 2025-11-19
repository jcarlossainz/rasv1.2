import React from 'react'
import Button from './button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="w-24 h-24 mx-auto mb-6 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 flex items-center justify-center">
        {icon}
      </div>
      
      <h3 className="text-2xl font-bold text-gray-800 font-poppins mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 mb-6 font-roboto">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
