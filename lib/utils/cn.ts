/**
 * CN UTILITY - Class Name Helper
 * ===============================
 * 
 * Utility para combinar clases de Tailwind CSS de forma inteligente.
 * Resuelve conflictos y permite condicionales fácilmente.
 * 
 * Basado en: clsx + tailwind-merge
 * 
 * USO:
 * cn('base-class', condition && 'conditional-class', className)
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de forma inteligente
 * 
 * @param inputs - Clases a combinar (strings, arrays, objetos, condicionales)
 * @returns String con clases combinadas y sin conflictos
 * 
 * @example
 * // Clases básicas
 * cn('text-red-500', 'bg-blue-500')
 * 
 * // Con condicionales
 * cn('base-class', isActive && 'active-class')
 * 
 * // Resuelve conflictos de Tailwind
 * cn('p-4', 'p-8') // => 'p-8' (mantiene el último)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default cn