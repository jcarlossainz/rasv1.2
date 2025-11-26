'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import { useToast } from '@/hooks/useToast'
import { useDashboardConfig } from '@/hooks/useDashboardConfig'
import TopBar from '@/components/ui/topbar'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'
import Loading from '@/components/ui/loading'
import Modal from '@/components/ui/modal'
import { WidgetSelectorModal } from '@/components/dashboard'
import type { WidgetId } from '@/types/dashboard'

// Configuración de avatares predefinidos
// Imagen: ~773x516px, cuadrícula 3x2, sin texto
// Coordenadas X,Y de la esquina superior izquierda del recorte cuadrado
const AVATARES = [
  { id: 'avatar1', x: 42, y: 15 },    // Fila 1, Col 1 - monstruo verde cuernos
  { id: 'avatar2', x: 298, y: 25 },   // Fila 1, Col 2 - momia
  { id: 'avatar3', x: 555, y: 20 },   // Fila 1, Col 3 - oso café
  { id: 'avatar4', x: 42, y: 280 },   // Fila 2, Col 1 - robot
  { id: 'avatar5', x: 298, y: 290 },  // Fila 2, Col 2 - pacman
  { id: 'avatar6', x: 555, y: 280 },  // Fila 2, Col 3 - fantasma
]

// Tamaño del área del avatar en la imagen original
const CIRCLE_SIZE_ORIGINAL = 175

// Componente para mostrar un avatar individual desde el sprite sheet
function AvatarSprite({
  avatarId,
  size = 96,
  className = '',
  onClick
}: {
  avatarId: string | null
  size?: number
  className?: string
  onClick?: () => void
}) {
  const avatar = AVATARES.find(a => a.id === avatarId)

  if (!avatar) {
    // Avatar por defecto (placeholder)
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        onClick={onClick}
      >
        <svg className="w-1/2 h-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    )
  }

  // Escala para ajustar el avatar al tamaño deseado
  const scale = size / CIRCLE_SIZE_ORIGINAL

  return (
    <div
      className={`rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/avatars.png)',
        backgroundSize: `${750 * scale}px ${750 * scale}px`,
        backgroundPosition: `-${avatar.x * scale}px -${avatar.y * scale}px`,
        backgroundRepeat: 'no-repeat'
      }}
      onClick={onClick}
    />
  )
}

export default function PerfilPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const logout = useLogout()
  const toast = useToast()
  const { config, loading: configLoading, updateConfig } = useDashboardConfig()
  const [guardando, setGuardando] = useState(false)

  // Estados para el formulario de información personal
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [avatarId, setAvatarId] = useState<string | null>(null)

  // Estados para modal de cambio de contraseña
  const [showModalPassword, setShowModalPassword] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  // Estado para modal de selección de widgets
  const [showWidgetSelector, setShowWidgetSelector] = useState(false)

  // Estado para modal de selección de avatar
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [guardandoAvatar, setGuardandoAvatar] = useState(false)

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || user.full_name || '')
      setEmail(user.email || '')
      setTelefono(user.telefono || '')
      setAvatarId(user.avatar_url || null)
    }
  }, [user])

  const handleGuardarInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: nombre,
          telefono: telefono
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Información actualizada correctamente')
      if (refreshUser) await refreshUser()
    } catch (err) {
      toast.error('Error: ' + (err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const handleSeleccionarAvatar = async (nuevoAvatarId: string) => {
    setGuardandoAvatar(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: nuevoAvatarId })
        .eq('id', user.id)

      if (error) throw error

      setAvatarId(nuevoAvatarId)
      toast.success('Avatar actualizado correctamente')
      setShowAvatarSelector(false)
      if (refreshUser) await refreshUser()
    } catch (err) {
      toast.error('Error al actualizar avatar: ' + (err as Error).message)
    } finally {
      setGuardandoAvatar(false)
    }
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (passwordNueva !== passwordConfirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (passwordNueva.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setCambiandoPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordNueva
      })

      if (error) throw error

      toast.success('Contraseña actualizada correctamente')
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')
      setShowModalPassword(false)
    } catch (err) {
      toast.error('Error: ' + (err as Error).message)
    } finally {
      setCambiandoPassword(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  const handleSelectWidgets = async (newWidgets: WidgetId[]) => {
    try {
      await updateConfig({
        visible_widgets: newWidgets,
        widget_order: newWidgets,
      })
      toast.success('Widgets actualizados correctamente')
    } catch (error) {
      console.error('Error actualizando widgets:', error)
      toast.error('Error al actualizar widgets')
    }
  }

  if (authLoading) {
    return <Loading message="Cargando perfil..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Configuración"
        showHomeButton={true}
        showBackButton={true}
        showAddButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Sección: Información Personal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-bold font-poppins text-gray-800 mb-6">Información Personal</h2>
          
          <form onSubmit={handleGuardarInfo} className="space-y-5">
            {/* Foto de perfil */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <AvatarSprite
                  avatarId={avatarId}
                  size={96}
                  className="border-4 border-white shadow-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowAvatarSelector(true)}
                />
                {/* Botón para cambiar avatar */}
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-ras-turquesa rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:bg-ras-azul transition-colors"
                  title="Cambiar avatar"
                  onClick={() => setShowAvatarSelector(true)}
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Nombre completo */}
            <Input
              label="Nombre completo"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              required
            />

            {/* Email (solo lectura) */}
            <Input
              label="Email"
              type="email"
              value={email}
              disabled
              helperText="El email no se puede modificar"
            />

            {/* Teléfono */}
            <Input
              label="Teléfono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="10 dígitos"
              helperText="Formato: 5512345678"
            />

            <Button
              type="submit"
              disabled={guardando}
              variant="primary"
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </div>

        {/* Sección: Seguridad */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-bold font-poppins text-gray-800 mb-2">Seguridad</h2>
          <p className="text-sm text-gray-500 mb-6 font-roboto">
            Mantén tu cuenta segura actualizando tu contraseña regularmente.
          </p>

          <Button
            onClick={() => setShowModalPassword(true)}
            variant="outline"
          >
            🔒 Cambiar Contraseña
          </Button>
        </div>

        {/* Sección: Personalizar Dashboard */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold font-poppins text-gray-800 mb-2">Personalizar Dashboard</h2>
          <p className="text-sm text-gray-500 mb-6 font-roboto">
            Elige hasta 4 widgets para mostrar en tu dashboard principal.
          </p>

          <Button
            onClick={() => setShowWidgetSelector(true)}
            variant="outline"
            disabled={configLoading}
          >
            🎨 Seleccionar Widgets
          </Button>
        </div>

      </main>

      {/* Modal Cambiar Contraseña */}
      <Modal 
        isOpen={showModalPassword}
        onClose={() => {
          setShowModalPassword(false)
          setPasswordActual('')
          setPasswordNueva('')
          setPasswordConfirmar('')
        }}
        maxWidth="lg"
      >
        <h2 className="text-2xl font-bold font-poppins text-gray-800 mb-6">Cambiar Contraseña</h2>
        
        <form onSubmit={handleCambiarPassword} className="space-y-5">
          {/* Contraseña Actual */}
          <Input
            label="Contraseña actual"
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            placeholder="Tu contraseña actual"
            required
            helperText="Por seguridad, ingresa tu contraseña actual"
          />

          {/* Contraseña Nueva */}
          <Input
            label="Nueva contraseña"
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />

          {/* Confirmar Contraseña */}
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            placeholder="Repite la nueva contraseña"
            required
            error={passwordNueva && passwordConfirmar && passwordNueva !== passwordConfirmar ? 'Las contraseñas no coinciden' : undefined}
          />

          {/* Mensaje de validación positivo */}
          {passwordNueva && passwordConfirmar && passwordNueva === passwordConfirmar && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-600 font-medium">✅ Las contraseñas coinciden</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowModalPassword(false)
                setPasswordActual('')
                setPasswordNueva('')
                setPasswordConfirmar('')
              }}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={cambiandoPassword || passwordNueva !== passwordConfirmar || !passwordNueva || !passwordActual}
              variant="primary"
              className="flex-1"
            >
              {cambiandoPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Selección de Widgets */}
      {config && (
        <WidgetSelectorModal
          isOpen={showWidgetSelector}
          onClose={() => setShowWidgetSelector(false)}
          currentWidgets={config.visible_widgets}
          onSelectWidgets={handleSelectWidgets}
        />
      )}

      {/* Modal de Selección de Avatar */}
      <Modal
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        maxWidth="md"
      >
        <h2 className="text-2xl font-bold font-poppins text-gray-800 mb-6 text-center">Elige tu Avatar</h2>

        <div className="grid grid-cols-3 gap-6 mb-6 justify-items-center">
          {AVATARES.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleSeleccionarAvatar(avatar.id)}
              disabled={guardandoAvatar}
              className={`rounded-full transition-all hover:scale-110 ${
                guardandoAvatar ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <AvatarSprite
                avatarId={avatar.id}
                size={80}
                className={`${
                  avatarId === avatar.id
                    ? 'ring-4 ring-ras-turquesa ring-offset-2 shadow-lg'
                    : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                }`}
              />
            </button>
          ))}
        </div>

        {guardandoAvatar && (
          <div className="flex items-center justify-center gap-2 text-ras-turquesa mb-4">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span className="text-sm font-medium">Guardando...</span>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={() => setShowAvatarSelector(false)}
            variant="secondary"
            disabled={guardandoAvatar}
          >
            Cerrar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
