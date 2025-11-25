'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validation/schemas'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginInput) => {
    console.log('🔵 Form submitted')
    console.log('🔵 Email:', data.email)
    console.log('🔵 Password length:', data.password.length)

    setApiError('')
    setLoading(true)

    try {
      console.log('🟡 Intentando login...')

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      console.log('🟢 Respuesta de Supabase:', { data: authData, error: signInError })

      if (signInError) {
        console.error('🔴 Error de Supabase:', signInError)
        throw signInError
      }

      console.log('✅ Login exitoso!')
      console.log('✅ Usuario:', authData.user?.email)
      console.log('✅ Sesión:', authData.session ? 'Existe' : 'No existe')

      console.log('🚀 Redirigiendo a dashboard...')
      router.push('/dashboard')

    } catch (err: any) {
      console.error('❌ Error en el catch:', err)
      setApiError('Email o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-azul via-ras-turquesa to-ras-azul flex items-center justify-center p-4">
      {/* Card principal */}
      <div className="rounded-2xl w-full max-w-md overflow-hidden">

        {/* Header con logo */}
        <div className="pt-4 pb-2 px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Bienvenido</h2>
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo-ras-wizard.png"
              alt="Ohana Logo"
              width={180}
              height={180}
              className="object-contain"
            />
          </div>
          <h1 className="text-6xl font-bold text-white mb-4">OHANA</h1>
        </div>

        {/* Formulario */}
        <div className="px-8 pb-8">

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <input
                type="email"
                {...register('email')}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-ras-azul focus:border-transparent transition-all outline-none ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Correo electrónico"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-ras-azul focus:border-transparent transition-all outline-none ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Error message */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm text-red-700 font-medium">{apiError}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-ras-azul to-ras-turquesa text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Link para registro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white">
              ¿No tienes cuenta?{' '}
              <Link
                href="/register"
                className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors"
              >
                Crear cuenta gratis
              </Link>
            </p>
          </div>

          {/* Recuperar contraseña */}
          <div className="mt-4 text-center">
            <Link 
              href="/forgot-password" 
              className="text-xs text-gray-500 hover:text-ras-azul transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-white/70 text-xs">
          © 2025 OHANA. Sistema profesional de administración inmobiliaria.
        </p>
      </div>
    </div>
  )
}