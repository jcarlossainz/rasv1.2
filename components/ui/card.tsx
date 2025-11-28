interface CardProps {
  title: string
  icon: React.ReactNode
  onClick?: () => void
}

export default function Card({ title, icon, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white/20 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-visible"
    >
      <div className="p-5 flex flex-col items-center gap-3">
        {/* Contenedor del ícono con efecto hover moderado */}
        <div className="transition-transform duration-400 ease-out group-hover:scale-[1.3]">
          {icon}
        </div>
        
        {/* Título */}
        <h3 className="text-base font-semibold text-gray-800 text-center">
          {title}
        </h3>
      </div>
    </div>
  )
}