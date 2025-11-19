'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import TopBar from '@/components/ui/topbar'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'
import Loading from '@/components/ui/loading'
import Modal from '@/components/ui/modal'

export default function PerfilPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()
  const [guardando, setGuardando] = useState(false)

  // Estados para el formulario de información personal
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  // Estados para modal de cambio de contraseña
  const [showModalPassword, setShowModalPassword] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || user.full_name || '')
      setEmail(user.email || '')
      setTelefono(user.telefono || '')
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

      alert('✅ Información actualizada correctamente')
      setUser({ ...user, full_name: nombre, telefono: telefono })
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (passwordNueva !== passwordConfirmar) {
      alert('❌ Las contraseñas no coinciden')
      return
    }

    if (passwordNueva.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres')
      return
    }

    setCambiandoPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordNueva
      })

      if (error) throw error

      alert('✅ Contraseña actualizada correctamente')
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')
      setShowModalPassword(false)
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    } finally {
      setCambiandoPassword(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  if (authLoading) {
    return <Loading message="Cargando perfil..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar 
        title="Configuración"
        showBackButton={true}
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
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  {/* Por ahora solo el placeholder, después se agregará la funcionalidad de subir foto */}
                  <svg className="w-12 h-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                {/* Botón de cámara para subir foto (funcionalidad pendiente) */}
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-ras-turquesa rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:bg-ras-azul transition-colors"
                  title="Cambiar foto (próximamente)"
                  onClick={() => alert('Funcionalidad de foto disponible próximamente')}
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
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
    </div>
  )
}
