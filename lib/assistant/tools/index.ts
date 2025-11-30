/**
 * Herramientas (Tools) del Asistente IA de Ohana
 * Define las acciones que el asistente puede ejecutar
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con permisos de servicio
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function createAssistantTools(userId: string) {
  const supabase = supabaseAdmin

  // ============================================================================
  // HERRAMIENTAS DE PROPIEDADES
  // ============================================================================

  const buscarPropiedades = tool({
    description: 'Busca y lista las propiedades del usuario. Puede filtrar por nombre, tipo o estado.',
    inputSchema: z.object({
      busqueda: z.string().describe('Texto para buscar en el nombre').optional(),
      tipo: z.string().describe('Tipo de propiedad').optional(),
      estado: z.string().describe('Estado de la propiedad').optional(),
    }),
    execute: async ({ busqueda, tipo, estado }) => {
      let query = supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, estados, ubicacion')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (busqueda) {
        query = query.ilike('nombre_propiedad', `%${busqueda}%`)
      }
      if (tipo) {
        query = query.eq('tipo_propiedad', tipo)
      }

      const { data, error } = await query

      if (error) return { error: error.message, propiedades: [] }

      let propiedades = data || []
      if (estado) {
        propiedades = propiedades.filter((p: any) => p.estados?.includes(estado))
      }

      return {
        total: propiedades.length,
        propiedades: propiedades.map((p: any) => ({
          id: p.id,
          nombre: p.nombre_propiedad,
          tipo: p.tipo_propiedad,
          estados: p.estados,
          ciudad: p.ubicacion?.ciudad || 'Sin ubicación',
        }))
      }
    }
  })

  const obtenerDetallePropiedad = tool({
    description: 'Obtiene detalles de una propiedad por ID o nombre.',
    inputSchema: z.object({
      propiedadId: z.string().describe('ID de la propiedad').optional(),
      nombre: z.string().describe('Nombre de la propiedad').optional(),
    }),
    execute: async ({ propiedadId, nombre }) => {
      let query = supabase.from('propiedades').select('*').eq('owner_id', userId)

      if (propiedadId) {
        query = query.eq('id', propiedadId)
      } else if (nombre) {
        query = query.ilike('nombre_propiedad', `%${nombre}%`)
      } else {
        return { error: 'Proporciona ID o nombre' }
      }

      const { data, error } = await query.single()
      if (error) return { error: 'Propiedad no encontrada' }

      return {
        propiedad: {
          id: data.id,
          nombre: data.nombre_propiedad,
          tipo: data.tipo_propiedad,
          estados: data.estados,
          ubicacion: data.ubicacion,
          espacios: data.espacios?.length || 0,
        }
      }
    }
  })

  const crearPropiedad = tool({
    description: 'Crea una nueva propiedad.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre de la propiedad'),
      tipo: z.string().describe('Tipo: Casa, Departamento, Villa, etc.'),
      estados: z.array(z.string()).describe('Estados: Renta largo plazo, Venta, etc.'),
      ciudad: z.string().describe('Ciudad').optional(),
    }),
    execute: async ({ nombre, tipo, estados, ciudad }) => {
      const { data, error } = await supabase
        .from('propiedades')
        .insert({
          owner_id: userId,
          nombre_propiedad: nombre,
          tipo_propiedad: tipo,
          estados,
          ubicacion: ciudad ? { ciudad, pais: 'México' } : null,
          espacios: [],
          photos: [],
          is_draft: false,
          status: 'active',
        })
        .select()
        .single()

      if (error) return { error: error.message }

      return {
        exito: true,
        mensaje: `Propiedad "${nombre}" creada`,
        propiedad: { id: data.id, nombre: data.nombre_propiedad }
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE TICKETS
  // ============================================================================

  const buscarTickets = tool({
    description: 'Busca tickets de pago.',
    inputSchema: z.object({
      nombrePropiedad: z.string().describe('Nombre de la propiedad').optional(),
      estado: z.enum(['pendiente', 'completado', 'todos']).describe('Estado').optional(),
      urgencia: z.enum(['vencido', 'hoy', 'proximo', 'futuro', 'todos']).describe('Urgencia').optional(),
    }),
    execute: async ({ nombrePropiedad, estado, urgencia }) => {
      const { data: propiedades } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)

      const propIds = propiedades?.map((p: any) => p.id) || []
      if (propIds.length === 0) return { total: 0, tickets: [] }

      let targetIds = propIds
      if (nombrePropiedad) {
        const prop = propiedades?.find((p: any) =>
          p.nombre_propiedad.toLowerCase().includes(nombrePropiedad.toLowerCase())
        )
        if (prop) targetIds = [prop.id]
      }

      let query = supabase
        .from('tickets')
        .select('*, propiedades(nombre_propiedad)')
        .in('propiedad_id', targetIds)
        .order('fecha_programada', { ascending: true })

      if (estado && estado !== 'todos') {
        query = query.eq('pagado', estado === 'completado')
      }

      const { data, error } = await query
      if (error) return { error: error.message, tickets: [] }

      const hoy = new Date().toISOString().split('T')[0]
      let tickets = data || []

      if (urgencia && urgencia !== 'todos') {
        tickets = tickets.filter((t: any) => {
          if (urgencia === 'vencido') return t.fecha_programada < hoy && !t.pagado
          if (urgencia === 'hoy') return t.fecha_programada === hoy
          return t.fecha_programada > hoy
        })
      }

      return {
        total: tickets.length,
        tickets: tickets.slice(0, 10).map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          propiedad: t.propiedades?.nombre_propiedad,
          monto: t.monto_estimado,
          fecha: t.fecha_programada,
          estado: t.pagado ? 'completado' : 'pendiente',
        }))
      }
    }
  })

  const crearTicket = tool({
    description: 'Crea un nuevo ticket de pago.',
    inputSchema: z.object({
      nombrePropiedad: z.string().describe('Nombre de la propiedad'),
      titulo: z.string().describe('Concepto del pago'),
      monto: z.number().describe('Monto'),
      fecha: z.string().describe('Fecha YYYY-MM-DD'),
    }),
    execute: async ({ nombrePropiedad, titulo, monto, fecha }) => {
      const { data: props } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)
        .ilike('nombre_propiedad', `%${nombrePropiedad}%`)
        .limit(1)

      if (!props?.length) return { error: 'Propiedad no encontrada' }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          propiedad_id: props[0].id,
          titulo,
          monto_estimado: monto,
          fecha_programada: fecha,
          pagado: false,
        })
        .select()
        .single()

      if (error) return { error: error.message }

      return {
        exito: true,
        mensaje: `Ticket "${titulo}" creado para ${props[0].nombre_propiedad}`,
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS FINANCIERAS
  // ============================================================================

  const obtenerBalanceGeneral = tool({
    description: 'Obtiene el balance de cuentas del usuario.',
    inputSchema: z.object({
      moneda: z.string().describe('Filtrar por MXN o USD').optional(),
    }),
    execute: async ({ moneda }) => {
      const { data: cuentas } = await supabase
        .from('cuentas')
        .select('*')
        .eq('user_id', userId)
        .eq('activa', true)

      let filtradas = cuentas || []
      if (moneda) filtradas = filtradas.filter((c: any) => c.moneda === moneda)

      const balanceMXN = (cuentas || []).filter((c: any) => c.moneda === 'MXN')
        .reduce((sum: number, c: any) => sum + (c.saldo_actual || 0), 0)
      const balanceUSD = (cuentas || []).filter((c: any) => c.moneda === 'USD')
        .reduce((sum: number, c: any) => sum + (c.saldo_actual || 0), 0)

      return {
        balance: { mxn: balanceMXN, usd: balanceUSD },
        cuentas: filtradas.map((c: any) => ({
          nombre: c.nombre_cuenta,
          saldo: c.saldo_actual,
          moneda: c.moneda,
        })),
      }
    }
  })

  const crearCuenta = tool({
    description: 'Crea una cuenta bancaria.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre de la cuenta'),
      tipo: z.enum(['Banco', 'Efectivo', 'Tarjeta de crédito', 'Otro']).describe('Tipo'),
      moneda: z.enum(['MXN', 'USD']).describe('Moneda'),
      saldoInicial: z.number().describe('Saldo inicial').optional(),
    }),
    execute: async ({ nombre, tipo, moneda, saldoInicial }) => {
      const { data, error } = await supabase
        .from('cuentas')
        .insert({
          user_id: userId,
          nombre_cuenta: nombre,
          tipo_cuenta: tipo,
          moneda,
          saldo_actual: saldoInicial || 0,
          activa: true,
        })
        .select()
        .single()

      if (error) return { error: error.message }
      return { exito: true, mensaje: `Cuenta "${nombre}" creada` }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE CONTACTOS
  // ============================================================================

  const buscarContactos = tool({
    description: 'Busca contactos en el directorio.',
    inputSchema: z.object({
      busqueda: z.string().describe('Buscar por nombre').optional(),
      tipo: z.enum(['Inquilino', 'Proveedor', 'Propietario', 'Otro', 'todos']).describe('Tipo').optional(),
    }),
    execute: async ({ busqueda, tipo }) => {
      let query = supabase.from('directorio').select('*').eq('user_id', userId)

      if (busqueda) query = query.ilike('nombre', `%${busqueda}%`)
      if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo)

      const { data, error } = await query
      if (error) return { error: error.message, contactos: [] }

      return {
        total: data?.length || 0,
        contactos: (data || []).map((c: any) => ({
          nombre: c.nombre,
          tipo: c.tipo,
          telefono: c.telefono,
          email: c.email,
        }))
      }
    }
  })

  const crearContacto = tool({
    description: 'Crea un contacto.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre del contacto'),
      tipo: z.enum(['Inquilino', 'Proveedor', 'Propietario', 'Otro']).describe('Tipo'),
      telefono: z.string().describe('Teléfono').optional(),
      email: z.string().describe('Email').optional(),
    }),
    execute: async ({ nombre, tipo, telefono, email }) => {
      const { error } = await supabase
        .from('directorio')
        .insert({ user_id: userId, nombre, tipo, telefono, email })

      if (error) return { error: error.message }
      return { exito: true, mensaje: `Contacto "${nombre}" creado` }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE NAVEGACIÓN
  // ============================================================================

  const navegarASeccion = tool({
    description: 'Navega a una sección. Propiedad: home, calendario, tickets, inventario, galeria, anuncio, balance, archivero, config. General: dashboard, catalogo, cuentas, directorio, market, perfil.',
    inputSchema: z.object({
      seccion: z.enum([
        'home', 'calendario', 'tickets', 'inventario', 'galeria',
        'anuncio', 'balance', 'archivero', 'config',
        'dashboard', 'catalogo', 'cuentas', 'directorio', 'market', 'perfil'
      ]).describe('Sección'),
      nombrePropiedad: z.string().describe('Nombre de la propiedad').optional(),
    }),
    execute: async ({ seccion, nombrePropiedad }) => {
      const generales = ['dashboard', 'catalogo', 'cuentas', 'directorio', 'market', 'perfil']

      if (generales.includes(seccion)) {
        const rutas: Record<string, string> = {
          dashboard: '/dashboard',
          catalogo: '/dashboard/catalogo',
          cuentas: '/dashboard/cuentas',
          directorio: '/dashboard/directorio',
          market: '/dashboard/market',
          perfil: '/perfil',
        }
        return { accion: 'NAVEGAR', ruta: rutas[seccion], mensaje: `Te llevo a ${seccion}.` }
      }

      if (!nombrePropiedad) {
        const { data } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .eq('owner_id', userId)
          .limit(5)
        return { error: 'Especifica la propiedad', propiedades: data?.map((p: any) => p.nombre_propiedad) }
      }

      const { data: props } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)
        .ilike('nombre_propiedad', `%${nombrePropiedad}%`)
        .limit(1)

      if (!props?.length) return { error: 'Propiedad no encontrada' }

      return {
        accion: 'NAVEGAR',
        ruta: `/dashboard/catalogo/propiedad/${props[0].id}/${seccion}`,
        mensaje: `Te llevo a ${seccion} de "${props[0].nombre_propiedad}".`
      }
    }
  })

  const filtrarCatalogo = tool({
    description: 'Filtra propiedades en el catálogo.',
    inputSchema: z.object({
      busqueda: z.string().describe('Buscar por nombre').optional(),
      tipo: z.string().describe('Tipo de propiedad').optional(),
      estado: z.string().describe('Estado').optional(),
      limpiarFiltros: z.boolean().describe('Limpiar filtros').optional(),
    }),
    execute: async ({ busqueda, tipo, estado, limpiarFiltros }) => {
      if (limpiarFiltros) {
        return { accion: 'FILTRAR_CATALOGO', filtros: {}, mensaje: 'Filtros limpiados.' }
      }

      const filtros: Record<string, string> = {}
      if (busqueda) filtros.busqueda = busqueda
      if (tipo) filtros.tipo = tipo
      if (estado) filtros.estado = estado

      return {
        accion: 'FILTRAR_CATALOGO',
        filtros,
        mensaje: Object.keys(filtros).length ? `Filtrado aplicado.` : 'Mostrando todas.'
      }
    }
  })

  return {
    buscarPropiedades,
    obtenerDetallePropiedad,
    crearPropiedad,
    buscarTickets,
    crearTicket,
    obtenerBalanceGeneral,
    crearCuenta,
    buscarContactos,
    crearContacto,
    navegarASeccion,
    filtrarCatalogo,
  }
}
