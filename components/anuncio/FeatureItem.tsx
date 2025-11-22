import { ReactNode } from 'react'

interface FeatureItemProps {
  icon: string
  label: string
  value: ReactNode
  highlight?: boolean
}

/**
 * FeatureItem - Item de característica con icono
 * Diseño Apple-style para mostrar specs de la propiedad
 */
export default function FeatureItem({
  icon,
  label,
  value,
  highlight = false
}: FeatureItemProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-xl
        transition-all
        ${highlight
          ? 'bg-gradient-to-r from-ras-turquesa/10 to-ras-azul/10 border-2 border-ras-turquesa/30'
          : 'bg-gray-50 border border-gray-200'
        }
      `}
    >
      <div className={`
        text-3xl flex-shrink-0
        ${highlight ? 'scale-110' : ''}
      `}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-600 font-medium">{label}</div>
        <div className={`
          text-lg font-bold truncate
          ${highlight ? 'text-ras-azul' : 'text-gray-900'}
        `}>
          {value}
        </div>
      </div>
    </div>
  )
}
