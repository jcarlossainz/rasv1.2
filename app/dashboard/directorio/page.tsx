'use client'

/**
 * DIRECTORIO - Gestión de Contactos
 * Diseño profesional alineado con Cuentas y Calendario RAS
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import ContactoModal from './components/ContactoModal'

interface Contacto {
  id: string
  user_id: string
  full_name: string
  email: string
  telefono: string
  tipo: 'inquilino' | 'propietario' | 'proveedor' | 'supervisor'
  categoria_proveedor?: string
  activo: boolean
  notas?: string
  created_at: string
  updated_at: string
}

export default function DirectorioPage() {
  const router = useRouter()
  const toast = useToast()
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [showModal, setShowModal] = useState(false)
  const [contactoEditar, setContactoEditar] = useState<Contacto | null>(null)
  
  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string[]>([])
  
  // Vista: lista o tarjetas
  const [vistaActual, setVistaActual] = useState<'lista' | 'tarjetas'>('lista')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { 
      router.push('/login')
      return 
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    setUser({ ...profile, id: authUser.id })
    cargarContactos(authUser.id)
    setLoading(false)
  }

  const cargarContactos = async (userId: string) => {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('user_id', userId)
      .eq('activo', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error cargando contactos:', error)
      toast.error('Error al cargar contactos')
      return
    }
    
    setContactos(data || [])
  }

  const handleAgregarContacto = () => {
    setContactoEditar(null)
    setShowModal(true)
  }

  const handleEditarContacto = (contacto: Contacto, e: React.MouseEvent) => {
    e.stopPropagation()
    setContactoEditar(contacto)
    setShowModal(true)
  }

  const handleEliminarContacto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Usar toast para confirmación en lugar de confirm()
    const confirmar = window.confirm('¿Estás seguro que deseas eliminar este contacto?')
    if (!confirmar) {
      return
    }

    const { error } = await supabase
      .from('contactos')
      .update({ activo: false })
      .eq('id', id)

    if (error) {
      toast.error('Error al eliminar contacto')
      console.error(error)
      return
    }

    toast.success('Contacto eliminado correctamente')
    if (user?.id) {
      cargarContactos(user.id)
    }
  }

  const handleGuardarContacto = async (data: {
    nombre: string
    telefono: string
    correo: string
    tipo: 'inquilino' | 'propietario' | 'proveedor' | 'supervisor'
    provider_category?: string
  }) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado')
      return
    }

    const contactoData: any = {
      user_id: user.id,
      full_name: data.nombre,
      email: data.correo,
      telefono: data.telefono,
      tipo: data.tipo,
      categoria_proveedor: data.tipo === 'proveedor' ? data.provider_category : null,
      activo: true
    }

    if (contactoEditar) {
      const { error } = await supabase
        .from('contactos')
        .update(contactoData)
        .eq('id', contactoEditar.id)

      if (error) {
        toast.error('Error al actualizar contacto')
        console.error(error)
        return
      }
      toast.success('Contacto actualizado correctamente')
    } else {
      const { error } = await supabase
        .from('contactos')
        .insert(contactoData)

      if (error) {
        toast.error('Error al crear contacto')
        console.error(error)
        return
      }
      toast.success('Contacto creado correctamente')
    }

    setShowModal(false)
    setContactoEditar(null)
    cargarContactos(user.id)
  }

  const limpiarFiltros = () => {
    setFiltroTipo([])
    setBusqueda('')
  }

  const contactosFiltrados = contactos.filter(contacto => {
    const matchBusqueda = busqueda === '' || 
      contacto.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
      contacto.telefono?.includes(busqueda) ||
      contacto.email?.toLowerCase().includes(busqueda.toLowerCase())
    
    const matchTipo = filtroTipo.length === 0 || filtroTipo.includes(contacto.tipo)
    
    return matchBusqueda && matchTipo
  })


  if (loading) {
    return <Loading message="Cargando directorio..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Directorio"
        showBackButton
        onBackClick={() => router.push('/dashboard')}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Filtros - Solo búsqueda y acciones */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Búsqueda */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2 font-poppins">
                Buscar
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, teléfono o correo..."
                className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-ras-turquesa focus:border-transparent"
              />
            </div>

            {/* Botones de Vista */}
            <div className="flex items-end">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setVistaActual('lista')}
                  className={`p-2 rounded transition-all ${
                    vistaActual === 'lista'
                      ? 'bg-white shadow-sm text-ras-azul'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vista de lista"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button
                  onClick={() => setVistaActual('tarjetas')}
                  className={`p-2 rounded transition-all ${
                    vistaActual === 'tarjetas'
                      ? 'bg-white shadow-sm text-ras-azul'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vista de tarjetas"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Botón Agregar Contacto */}
            <div className="flex items-end">
              <button
                onClick={handleAgregarContacto}
                className="py-2 px-4 rounded-lg bg-gradient-to-r from-ras-azul to-ras-turquesa text-white font-semibold hover:shadow-lg transition-all text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar
              </button>
            </div>

            {/* Botón limpiar filtros */}
            {(filtroTipo.length > 0 || busqueda) && (
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  className="py-2 px-4 rounded-lg border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-ras-turquesa transition-all"
                  title="Limpiar todos los filtros"
                >
                  <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista/Tarjetas de contactos */}
        {contactosFiltrados.length > 0 ? (
          <>
            {/* VISTA DE LISTA (TABLA) */}
            {vistaActual === 'lista' && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Contacto</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Tipo</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contactosFiltrados.map((contacto) => (
                        <tr 
                          key={contacto.id}
                          className="hover:bg-ras-turquesa/5 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                contacto.tipo === 'inquilino' ? 'bg-blue-100' :
                                contacto.tipo === 'propietario' ? 'bg-green-100' :
                                contacto.tipo === 'supervisor' ? 'bg-orange-100' :
                                'bg-purple-100'
                              }`}>
                                {contacto.tipo === 'inquilino' ? (
                                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                ) : contacto.tipo === 'propietario' ? (
                                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                  </svg>
                                ) : contacto.tipo === 'supervisor' ? (
                                  <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <polyline points="17 11 19 13 23 9" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 7h-9" />
                                    <path d="M14 17H5" />
                                    <circle cx="17" cy="17" r="3" />
                                    <circle cx="7" cy="7" r="3" />
                                  </svg>
                                )}
                              </div>
                              {/* Nombre */}
                              <div className="font-semibold text-gray-800 font-poppins">
                                {contacto.full_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-700 font-medium">
                              {contacto.tipo === 'inquilino' ? 'Inquilino' :
                               contacto.tipo === 'propietario' ? 'Propietario' :
                               contacto.tipo === 'supervisor' ? 'Supervisor' :
                               'Proveedor'}
                              {contacto.categoria_proveedor && ` - ${contacto.categoria_proveedor}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Ver/Editar */}
                              <button
                                onClick={(e) => handleEditarContacto(contacto, e)}
                                className="p-2 hover:bg-ras-turquesa/10 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <svg className="w-5 h-5 text-ras-azul" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              {/* WhatsApp */}
                              {contacto.telefono && (
                                <a
                                  href={`https://wa.me/${contacto.telefono.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Enviar WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                </a>
                              )}
                              {/* Llamar */}
                              {contacto.telefono && (
                                <a
                                  href={`tel:${contacto.telefono}`}
                                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Llamar"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer con contador */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
                  <div className="text-xs font-semibold text-gray-600 font-poppins">
                    Mostrando {contactosFiltrados.length} contacto{contactosFiltrados.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA DE TARJETAS */}
            {vistaActual === 'tarjetas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contactosFiltrados.map((contacto) => (
                  <div
                    key={contacto.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar con icono */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          contacto.tipo === 'inquilino' ? 'bg-blue-100' :
                          contacto.tipo === 'propietario' ? 'bg-green-100' :
                          contacto.tipo === 'supervisor' ? 'bg-orange-100' :
                          'bg-purple-100'
                        }`}>
                          {contacto.tipo === 'inquilino' ? (
                            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          ) : contacto.tipo === 'propietario' ? (
                            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          ) : contacto.tipo === 'supervisor' ? (
                            <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <polyline points="17 11 19 13 23 9" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 7h-9" />
                              <path d="M14 17H5" />
                              <circle cx="17" cy="17" r="3" />
                              <circle cx="7" cy="7" r="3" />
                            </svg>
                          )}
                        </div>

                        {/* Nombre y badge */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-800 font-poppins truncate">
                            {contacto.full_name}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-md font-semibold ${
                              contacto.tipo === 'inquilino' ? 'bg-blue-100 text-blue-700' :
                              contacto.tipo === 'propietario' ? 'bg-green-100 text-green-700' :
                              contacto.tipo === 'supervisor' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {contacto.tipo === 'inquilino' ? '🏠 Inquilino' :
                               contacto.tipo === 'propietario' ? '👑 Propietario' :
                               contacto.tipo === 'supervisor' ? '✓ Supervisor' :
                               '🔧 Proveedor'}
                            </span>
                            {contacto.categoria_proveedor && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-600">
                                {contacto.categoria_proveedor}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        <button
                          onClick={(e) => handleEditarContacto(contacto, e)}
                          className="p-1.5 hover:bg-ras-turquesa/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4 text-ras-azul" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleEliminarContacto(contacto.id, e)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Información de contacto */}
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      {/* Teléfono */}
                      {contacto.telefono && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          <a 
                            href={`tel:${contacto.telefono}`} 
                            className="hover:text-ras-turquesa transition-colors font-medium"
                          >
                            {contacto.telefono}
                          </a>
                        </div>
                      )}

                      {/* Correo */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <a 
                          href={`mailto:${contacto.email}`} 
                          className="hover:text-ras-turquesa transition-colors truncate font-medium"
                        >
                          {contacto.email}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState 
            icon={
              <svg className="w-16 h-16 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title={contactos.length === 0 ? "No tienes contactos" : "No se encontraron resultados"}
            description={contactos.length === 0 ? "Usa el botón 'Agregar' para crear tu primer contacto" : "Intenta con otra búsqueda o cambia los filtros"}
          />
        )}
      </main>

      {/* Modal para agregar/editar contacto */}
      <ContactoModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setContactoEditar(null)
        }}
        onSave={handleGuardarContacto}
        contacto={contactoEditar ? {
          id: contactoEditar.id,
          nombre: contactoEditar.full_name,
          telefono: contactoEditar.telefono || '',
          correo: contactoEditar.email,
          tipo: contactoEditar.tipo,
          provider_category: contactoEditar.categoria_proveedor
        } : null}
      />
    </div>
  )
}