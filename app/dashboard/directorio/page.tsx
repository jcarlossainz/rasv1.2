'use client'

/**
 * DIRECTORIO - Gestión de Contactos
 * Diseño profesional alineado con Cuentas y Calendario RAS
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import TopBar from '@/components/ui/topbar'
import Loading from '@/components/ui/loading'
import EmptyState from '@/components/ui/emptystate'
import ProveedorModal from './components/ContactoModal'
import ModalAgregarPersona from '@/components/ModalAgregarPersona'

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

interface Colaborador {
  id: string
  propiedad_id: string
  user_id?: string
  email_invitado?: string
  rol: 'supervisor' | 'propietario' | 'promotor' | 'inquilino'
  nombre?: string
  email: string
  telefono?: string
  created_at: string
}

export default function DirectorioPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  const [contactos, setContactos] = useState<Contacto[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [showModalProveedor, setShowModalProveedor] = useState(false)
  const [showModalColaborador, setShowModalColaborador] = useState(false)
  const [proveedorEditar, setProveedorEditar] = useState<Contacto | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string[]>([])

  // Vista: lista o tarjetas
  const [vistaActual, setVistaActual] = useState<'lista' | 'tarjetas'>('lista')

  useEffect(() => {
    if (user?.id) {
      cargarContactos(user.id)
      cargarColaboradores(user.id)
    }
  }, [user])

  const cargarContactos = async (userId: string) => {
    const { data, error } = await supabase
      .from('contactos')
      .select(`
        id,
        user_id,
        full_name,
        email,
        telefono,
        tipo,
        categoria_proveedor,
        activo,
        notas,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('tipo', 'proveedor')
      .eq('activo', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando proveedores:', error)
      console.error('Detalles del error:', JSON.stringify(error, null, 2))
      // No mostrar error si la tabla no existe aún
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        toast.error('Error al cargar proveedores: ' + error.message)
      }
      setContactos([])
      return
    }

    setContactos(data || [])
  }

  const cargarColaboradores = async (userId: string) => {
    // Cargar colaboradores de todas las propiedades del usuario
    // Primero obtenemos las propiedades del usuario
    const { data: propiedades, error: errorProps } = await supabase
      .from('propiedades')
      .select('id')
      .eq('user_id', userId)

    if (errorProps) {
      console.error('Error cargando propiedades:', errorProps)
      console.error('Detalles del error propiedades:', JSON.stringify(errorProps, null, 2))
      toast.error('Error al cargar propiedades: ' + errorProps.message)
      setColaboradores([])
      return
    }

    if (!propiedades || propiedades.length === 0) {
      setColaboradores([])
      return
    }

    const propiedadIds = propiedades.map(p => p.id)

    // Ahora cargamos los colaboradores de esas propiedades
    const { data, error } = await supabase
      .from('propiedades_colaboradores')
      .select(`
        id,
        propiedad_id,
        user_id,
        email_invitado,
        rol,
        created_at
      `)
      .in('propiedad_id', propiedadIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando colaboradores:', error)
      console.error('Detalles del error colaboradores:', JSON.stringify(error, null, 2))
      toast.error('Error al cargar colaboradores: ' + error.message)
      setColaboradores([])
      return
    }

    // Transformar los datos para incluir email y nombre
    const colaboradoresConDatos = await Promise.all((data || []).map(async (col) => {
      if (col.user_id) {
        // Si tiene user_id, buscar en profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('nombre, email, telefono')
          .eq('id', col.user_id)
          .single()

        return {
          ...col,
          email: profile?.email || '',
          nombre: profile?.nombre || '',
          telefono: profile?.telefono || ''
        }
      } else {
        // Si es invitación por email
        return {
          ...col,
          email: col.email_invitado || '',
          nombre: col.email_invitado || '',
          telefono: ''
        }
      }
    }))

    setColaboradores(colaboradoresConDatos)
  }

  const handleAgregarProveedor = () => {
    setProveedorEditar(null)
    setShowModalProveedor(true)
  }

  const handleAgregarColaborador = () => {
    setShowModalColaborador(true)
  }

  const handleEditarProveedor = (proveedor: Contacto, e: React.MouseEvent) => {
    e.stopPropagation()
    setProveedorEditar(proveedor)
    setShowModalProveedor(true)
  }

  const handleEliminarProveedor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmar = window.confirm('¿Estás seguro que deseas eliminar este proveedor?')
    if (!confirmar) {
      return
    }

    const { error } = await supabase
      .from('contactos')
      .update({ activo: false })
      .eq('id', id)

    if (error) {
      toast.error('Error al eliminar proveedor')
      console.error(error)
      return
    }

    toast.success('Proveedor eliminado correctamente')
    if (user?.id) {
      cargarContactos(user.id)
    }
  }

  const handleEliminarColaborador = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmar = window.confirm('¿Estás seguro que deseas eliminar este colaborador?')
    if (!confirmar) {
      return
    }

    const { error } = await supabase
      .from('propiedades_colaboradores')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error al eliminar colaborador')
      console.error(error)
      return
    }

    toast.success('Colaborador eliminado correctamente')
    if (user?.id) {
      cargarColaboradores(user.id)
    }
  }

  const handleGuardarProveedor = async (data: {
    nombre: string
    telefono: string
    correo: string
    categoria: string
  }) => {
    if (!user?.id) {
      toast.error('Usuario no autenticado')
      return
    }

    const proveedorData: any = {
      user_id: user.id,
      full_name: data.nombre,
      email: data.correo,
      telefono: data.telefono,
      tipo: 'proveedor',
      categoria_proveedor: data.categoria,
      activo: true
    }

    if (proveedorEditar) {
      const { error } = await supabase
        .from('contactos')
        .update(proveedorData)
        .eq('id', proveedorEditar.id)

      if (error) {
        toast.error('Error al actualizar proveedor')
        console.error(error)
        return
      }
      toast.success('Proveedor actualizado correctamente')
    } else {
      const { error } = await supabase
        .from('contactos')
        .insert(proveedorData)

      if (error) {
        toast.error('Error al crear proveedor')
        console.error(error)
        return
      }
      toast.success('Proveedor creado correctamente')
    }

    setShowModalProveedor(false)
    setProveedorEditar(null)
    cargarContactos(user.id)
  }

  const handleAgregarPersona = async (email: string, rol: 'propietario' | 'supervisor' | 'promotor' | 'inquilino') => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener la primera propiedad del usuario (o permitir seleccionar en el futuro)
    const { data: propiedades, error: errorProps } = await supabase
      .from('propiedades')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (errorProps || !propiedades || propiedades.length === 0) {
      throw new Error('No tienes propiedades creadas')
    }

    const propiedadId = propiedades[0].id

    // Verificar si el usuario existe en profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    const colaboradorData: any = {
      propiedad_id: propiedadId,
      rol: rol
    }

    if (profile) {
      // Usuario registrado
      colaboradorData.user_id = profile.id
      colaboradorData.email_invitado = null
    } else {
      // Invitación pendiente
      colaboradorData.user_id = null
      colaboradorData.email_invitado = email
    }

    const { error } = await supabase
      .from('propiedades_colaboradores')
      .insert(colaboradorData)

    if (error) {
      console.error('Error al agregar colaborador:', error)
      throw new Error('Error al agregar colaborador')
    }

    toast.success('Colaborador agregado correctamente')
    setShowModalColaborador(false)
    cargarColaboradores(user.id)
  }

  const limpiarFiltros = () => {
    setFiltroTipo([])
    setBusqueda('')
  }

  // Fusionar colaboradores y proveedores en una sola lista
  type PersonaDirectorio = {
    id: string
    nombre: string
    email: string
    telefono: string
    tipo: 'supervisor' | 'propietario' | 'promotor' | 'inquilino' | 'proveedor'
    categoria?: string
    esColaborador: boolean
  }

  const todasLasPersonas: PersonaDirectorio[] = [
    ...colaboradores.map(col => ({
      id: col.id,
      nombre: col.nombre || col.email,
      email: col.email,
      telefono: col.telefono || '',
      tipo: col.rol,
      esColaborador: true
    })),
    ...contactos.map(cont => ({
      id: cont.id,
      nombre: cont.full_name,
      email: cont.email,
      telefono: cont.telefono,
      tipo: cont.tipo,
      categoria: cont.categoria_proveedor,
      esColaborador: false
    }))
  ]

  const personasFiltradas = todasLasPersonas.filter(persona => {
    const matchBusqueda = busqueda === '' ||
      persona.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      persona.telefono?.includes(busqueda) ||
      persona.email?.toLowerCase().includes(busqueda.toLowerCase())

    const matchTipo = filtroTipo.length === 0 || filtroTipo.includes(persona.tipo)

    return matchBusqueda && matchTipo
  })


  if (authLoading) {
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

            {/* Botones Agregar */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleAgregarColaborador}
                className="py-2 px-4 rounded-lg bg-gradient-to-r from-ras-azul to-ras-turquesa text-white font-semibold hover:shadow-lg transition-all text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Colaborador
              </button>
              <button
                onClick={handleAgregarProveedor}
                className="py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold hover:shadow-lg transition-all text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Proveedor
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

        {/* Lista/Tarjetas de personas */}
        {personasFiltradas.length > 0 ? (
          <>
            {/* VISTA DE LISTA (TABLA) */}
            {vistaActual === 'lista' && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-ras-azul to-ras-turquesa text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Persona</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Tipo</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {personasFiltradas.map((persona) => (
                        <tr
                          key={persona.id}
                          className="hover:bg-ras-turquesa/5 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                persona.tipo === 'inquilino' ? 'bg-blue-100' :
                                persona.tipo === 'propietario' ? 'bg-green-100' :
                                persona.tipo === 'supervisor' ? 'bg-orange-100' :
                                persona.tipo === 'promotor' ? 'bg-pink-100' :
                                'bg-purple-100'
                              }`}>
                                {persona.tipo === 'inquilino' ? (
                                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                ) : persona.tipo === 'propietario' ? (
                                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                  </svg>
                                ) : persona.tipo === 'supervisor' ? (
                                  <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <polyline points="17 11 19 13 23 9" />
                                  </svg>
                                ) : persona.tipo === 'promotor' ? (
                                  <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
                                {persona.nombre}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-700 font-medium">
                              {persona.tipo === 'inquilino' ? 'Inquilino' :
                               persona.tipo === 'propietario' ? 'Propietario' :
                               persona.tipo === 'supervisor' ? 'Supervisor' :
                               persona.tipo === 'promotor' ? 'Promotor' :
                               'Proveedor'}
                              {persona.categoria && ` - ${persona.categoria}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Editar solo proveedores */}
                              {!persona.esColaborador && (
                                <button
                                  onClick={(e) => {
                                    const prov = contactos.find(c => c.id === persona.id)
                                    if (prov) handleEditarProveedor(prov, e)
                                  }}
                                  className="p-2 hover:bg-ras-turquesa/10 rounded-lg transition-colors"
                                  title="Editar proveedor"
                                >
                                  <svg className="w-5 h-5 text-ras-azul" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              )}
                              {/* Eliminar */}
                              <button
                                onClick={(e) => {
                                  if (persona.esColaborador) {
                                    handleEliminarColaborador(persona.id, e)
                                  } else {
                                    handleEliminarProveedor(persona.id, e)
                                  }
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                              {/* WhatsApp */}
                              {persona.telefono && (
                                <a
                                  href={`https://wa.me/${persona.telefono.replace(/\D/g, '')}`}
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
                              {persona.telefono && (
                                <a
                                  href={`tel:${persona.telefono}`}
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
                    Mostrando {personasFiltradas.length} persona{personasFiltradas.length !== 1 ? 's' : ''}
                    {' '}({colaboradores.length} colaborador{colaboradores.length !== 1 ? 'es' : ''}, {contactos.length} proveedor{contactos.length !== 1 ? 'es' : ''})
                  </div>
                </div>
              </div>
            )}

            {/* VISTA DE TARJETAS */}
            {vistaActual === 'tarjetas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personasFiltradas.map((persona) => (
                  <div
                    key={persona.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar con icono */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          persona.tipo === 'inquilino' ? 'bg-blue-100' :
                          persona.tipo === 'propietario' ? 'bg-green-100' :
                          persona.tipo === 'supervisor' ? 'bg-orange-100' :
                          persona.tipo === 'promotor' ? 'bg-pink-100' :
                          'bg-purple-100'
                        }`}>
                          {persona.tipo === 'inquilino' ? (
                            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          ) : persona.tipo === 'propietario' ? (
                            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          ) : persona.tipo === 'supervisor' ? (
                            <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <polyline points="17 11 19 13 23 9" />
                            </svg>
                          ) : persona.tipo === 'promotor' ? (
                            <svg className="w-6 h-6 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
                            {persona.nombre}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-md font-semibold ${
                              persona.tipo === 'inquilino' ? 'bg-blue-100 text-blue-700' :
                              persona.tipo === 'propietario' ? 'bg-green-100 text-green-700' :
                              persona.tipo === 'supervisor' ? 'bg-orange-100 text-orange-700' :
                              persona.tipo === 'promotor' ? 'bg-pink-100 text-pink-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {persona.tipo === 'inquilino' ? '🏠 Inquilino' :
                               persona.tipo === 'propietario' ? '👑 Propietario' :
                               persona.tipo === 'supervisor' ? '✓ Supervisor' :
                               persona.tipo === 'promotor' ? '📣 Promotor' :
                               '🔧 Proveedor'}
                            </span>
                            {persona.categoria && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-600">
                                {persona.categoria}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-1.5 flex-shrink-0 ml-2">
                        {!persona.esColaborador && (
                          <button
                            onClick={(e) => {
                              const prov = contactos.find(c => c.id === persona.id)
                              if (prov) handleEditarProveedor(prov, e)
                            }}
                            className="p-1.5 hover:bg-ras-turquesa/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4 text-ras-azul" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            if (persona.esColaborador) {
                              handleEliminarColaborador(persona.id, e)
                            } else {
                              handleEliminarProveedor(persona.id, e)
                            }
                          }}
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
                      {persona.telefono && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          <a
                            href={`tel:${persona.telefono}`}
                            className="hover:text-ras-turquesa transition-colors font-medium"
                          >
                            {persona.telefono}
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
                          href={`mailto:${persona.email}`}
                          className="hover:text-ras-turquesa transition-colors truncate font-medium"
                        >
                          {persona.email}
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
            title={todasLasPersonas.length === 0 ? "No tienes personas en tu directorio" : "No se encontraron resultados"}
            description={todasLasPersonas.length === 0 ? "Usa los botones de arriba para agregar colaboradores o proveedores" : "Intenta con otra búsqueda o cambia los filtros"}
          />
        )}
      </main>

      {/* Modal para agregar colaborador */}
      <ModalAgregarPersona
        isOpen={showModalColaborador}
        onClose={() => setShowModalColaborador(false)}
        onAgregar={handleAgregarPersona}
        mostrarPromotor={true}
        mostrarInquilino={true}
      />

      {/* Modal para agregar/editar proveedor */}
      <ProveedorModal
        isOpen={showModalProveedor}
        onClose={() => {
          setShowModalProveedor(false)
          setProveedorEditar(null)
        }}
        onSave={handleGuardarProveedor}
        proveedor={proveedorEditar ? {
          id: proveedorEditar.id,
          nombre: proveedorEditar.full_name,
          telefono: proveedorEditar.telefono || '',
          correo: proveedorEditar.email,
          categoria: proveedorEditar.categoria_proveedor || ''
        } : null}
      />
    </div>
  )
}