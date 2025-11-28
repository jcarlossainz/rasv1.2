interface CardProps {
  title: string
  icon: React.ReactNode
  onClick?: () => void
}

export default function Card({ title, icon, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center gap-3 cursor-pointer"
    >
      {/* Contenedor del ícono con efecto hover */}
      <div className="transition-transform duration-400 ease-out group-hover:scale-[1.1]">
        {icon}
      </div>

      {/* Título */}
      <h3 className="text-base font-semibold text-gray-800 text-center">
        {title}
      </h3>
    </div>
  )
}