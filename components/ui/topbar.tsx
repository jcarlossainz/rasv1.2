'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

// Configuración de avatares (mismo que en perfil)
const AVATARES = [
  { id: 'ballena', src: '/avatars_logo/Ballena.png', label: 'Ballena' },
  { id: 'estrella', src: '/avatars_logo/Estrella.png', label: 'Estrella' },
  { id: 'foca', src: '/avatars_logo/Foca.png', label: 'Foca' },
  { id: 'pez', src: '/avatars_logo/Pez.png', label: 'Pez' },
  { id: 'pulpo', src: '/avatars_logo/Pulpo.png', label: 'Pulpo' },
]

interface TopBarProps {
  title: string
  showBackButton?: boolean
  showAddButton?: boolean
  showHomeButton?: boolean
  showUserInfo?: boolean
  userEmail?: string
  onLogout?: () => void
  onBackClick?: () => void
  onNuevoTicket?: () => void
  onRegistrarPago?: () => void
  onNuevaReservacion?: () => void
}

export default function TopBar({
  title,
  showBackButton = false,
  showAddButton = false,
  showHomeButton = false,
  showUserInfo = false,
  userEmail,
  onLogout,
  onBackClick,
  onNuevoTicket,
  onRegistrarPago,
  onNuevaReservacion
}: TopBarProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  // Obtener avatar del usuario
  const avatarId = user?.avatar_url || null
  const avatar = AVATARES.find(a => a.id === avatarId)

  const hoy = new Date().toLocaleDateString('es-MX', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })

  const handleBack = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  return (
    <>
      <div className="sticky top-0 z-50 bg-gradient-to-b from-ras-azul/95 to-ras-turquesa/50 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Botón Home */}
          {showHomeButton && (
            <button
              onClick={() => router.push('/dashboard')}
              className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
              aria-label="Ir a Dashboard"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Botón Atrás */}
          {showBackButton && (
            <button 
              onClick={handleBack} 
              className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
              aria-label="Volver"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Botón + con Dropdown */}
          {showAddButton && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
                aria-label="Crear nuevo"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute top-14 left-0 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-50">
                  {/* Agregar Propiedad */}
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      router.push('/dashboard/catalogo')
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('openWizard'))
                      }, 100)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 11.5 12 4l9 7.5M5 10.5V20h14v-9.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">Agregar propiedad</span>
                  </button>

                  {/* Nuevo Ticket */}
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      if (onNuevoTicket) {
                        onNuevoTicket()
                      } else {
                        window.dispatchEvent(new CustomEvent('openNewTicketModal'))
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">Nuevo ticket</span>
                  </button>

                  {/* Nueva Reservación */}
                  {onNuevaReservacion && (
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        onNuevaReservacion()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-pink-50 transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">Nueva reservación</span>
                    </button>
                  )}

                  {/* Registrar Pago */}
                  {onRegistrarPago && (
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        onRegistrarPago()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">Registrar pago</span>
                    </button>
                  )}

                  {/* Nueva Cuenta */}
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      window.dispatchEvent(new CustomEvent('openNewCuentaModal'))
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-green-50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 15h0M2 9.5h20" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">Nueva cuenta</span>
                  </button>

                  {/* Nuevo Proveedor */}
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      window.dispatchEvent(new CustomEvent('openNewProveedorModal'))
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 7v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7m-18 0h18M3 7l1.8-3.6A1 1 0 0 1 5.7 3h12.6a1 1 0 0 1 .9.6L21 7M9 11v6m6-6v6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">Nuevo proveedor</span>
                  </button>

                  {/* Nuevo Contacto */}
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      window.dispatchEvent(new CustomEvent('openNewContactoModal'))
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-yellow-50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM20 8v6m3-3h-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">Nuevo contacto</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Título */}
          <h1 className="text-xl font-bold text-ras-crema font-poppins">{title}</h1>
          
          <div className="flex-1"></div>
          
          {/* Avatar del usuario (para futuro agente IA) - DESACTIVADO hasta integrar IA
          {showUserInfo && (
            <div
              className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-all"
              aria-label="Agente IA"
            >
              {avatar ? (
                <img
                  src={avatar.src}
                  alt={avatar.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-6 h-6 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </div>
          )}
          */}

          {/* Botón Configuración */}
          {showUserInfo && (
            <button
              onClick={() => router.push('/perfil')}
              className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
              aria-label="Configuración"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
              </svg>
            </button>
          )}

          {/* Botón Logout */}
          {showUserInfo && onLogout && (
            <button 
              onClick={onLogout}
              className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
              aria-label="Cerrar sesión"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* Badges rectangulares después */}
          {/* Info del usuario */}
          {showUserInfo && userEmail && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/30 bg-white/10 text-ras-crema text-xs font-medium">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="5"/>
                <path d="M20 21a8 8 0 1 0-16 0" strokeLinecap="round"/>
              </svg>
              <span>{userEmail.split('@')[0]}</span>
            </div>
          )}

          {/* Versión Ohana */}
          <div className="hidden sm:block px-3 py-1.5 rounded-full border border-white/30 bg-white/10 text-ras-crema text-xs font-medium">
            Ohana v1.0
          </div>

          {/* Fecha */}
          <div className="hidden sm:block px-3 py-1.5 rounded-full border border-white/30 bg-white/10 text-ras-crema text-xs font-medium">
            {hoy}
          </div>
        </div>
      </div>

      {/* Click fuera para cerrar dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        ></div>
      )}
    </>
  )
}