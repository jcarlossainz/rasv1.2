import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export default function Input({ 
  label, 
  error, 
  helperText, 
  className = '', 
  ...props 
}: InputProps) {
  
  const baseStyles = 'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 font-roboto text-gray-800 placeholder:text-gray-400'
  const normalStyles = 'border-gray-300 bg-white focus:border-ras-turquesa focus:ring-2 focus:ring-ras-turquesa/20 focus:outline-none'
  const errorStyles = 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none'
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-2 text-gray-700 font-poppins">
          {label}
        </label>
      )}
      
      <input 
        className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
        {...props}
      />
      
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium font-roboto">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500 font-roboto">
          {helperText}
        </p>
      )}
    </div>
  )
}
