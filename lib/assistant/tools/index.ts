/**
 * Herramientas del Asistente IA de Ohana
 * Enfoque: Navegación e interacción con la UI
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function createAssistantTools(userId: string) {
  const supabase = supabaseAdmin

  // ============================================================================
  // NAVEGACIÓN - Llevar al usuario a diferentes secciones
  // ============================================================================

  const navegarASeccion = tool({
    description: 'Navega a una sección del sistema. Usa esto para llevar al usuario a crear propiedades, ver tickets, calendario, etc.',
    inputSchema: z.object({
      seccion: z.enum([
        'nueva-propiedad',
        'catalogo',
        'dashboard',
        'tickets',
        'calendario',
        'cuentas',
        'directorio',
        'market',
        'perfil'
      ]).describe('Sección a la que navegar'),
    }),
    execute: async ({ seccion }) => {
      const rutas: Record<string, string> = {
        'nueva-propiedad': '/dashboard/catalogo/nueva',
        'catalogo': '/dashboard/catalogo',
        'dashboard': '/dashboard',
        'tickets': '/dashboard/tickets',
        'calendario': '/dashboard/calendario',
        'cuentas': '/dashboard/cuentas',
        'directorio': '/dashboard/directorio',
        'market': '/dashboard/market',
        'perfil': '/perfil',
      }

      const mensajes: Record<string, string> = {
        'nueva-propiedad': 'Te llevo al wizard para crear una nueva propiedad. Ahí podrás agregar todos los detalles.',
        'catalogo': 'Te llevo al catálogo de propiedades.',
        'dashboard': 'Te llevo al dashboard principal.',
        'tickets': 'Te llevo a la sección de tickets de pago.',
        'calendario': 'Te llevo al calendario.',
        'cuentas': 'Te llevo a la sección de cuentas bancarias.',
        'directorio': 'Te llevo al directorio de contactos.',
        'market': 'Te llevo al marketplace.',
        'perfil': 'Te llevo a tu perfil.',
      }

      return {
        accion: 'NAVEGAR',
        ruta: rutas[seccion],
        mensaje: mensajes[seccion]
      }
    }
  })

  const navegarAPropiedad = tool({
    description: 'Navega a una sección específica de una propiedad (calendario, tickets, inventario, galería, etc.)',
    inputSchema: z.object({
      nombrePropiedad: z.string().describe('Nombre de la propiedad'),
      seccion: z.enum([
        'home', 'calendario', 'tickets', 'inventario',
        'galeria', 'anuncio', 'balance', 'archivero', 'config'
      ]).describe('Sección de la propiedad'),
    }),
    execute: async ({ nombrePropiedad, seccion }) => {
      // Buscar la propiedad
      const { data: props } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)
        .ilike('nombre_propiedad', `%${nombrePropiedad}%`)
        .limit(1)

      if (!props || props.length === 0) {
        // Listar propiedades disponibles
        const { data: todas } = await supabase
          .from('propiedades')
          .select('nombre_propiedad')
          .eq('owner_id', userId)
          .limit(5)

        return {
          accion: 'MENSAJE',
          mensaje: `No encontré "${nombrePropiedad}". Tus propiedades son: ${todas?.map(p => p.nombre_propiedad).join(', ') || 'ninguna'}`
        }
      }

      const prop = props[0]
      const seccionNombres: Record<string, string> = {
        home: 'inicio',
        calendario: 'calendario',
        tickets: 'tickets de pago',
        inventario: 'inventario',
        galeria: 'galería de fotos',
        anuncio: 'anuncio público',
        balance: 'balance financiero',
        archivero: 'archivos',
        config: 'configuración',
      }

      return {
        accion: 'NAVEGAR',
        ruta: `/dashboard/catalogo/propiedad/${prop.id}/${seccion}`,
        mensaje: `Te llevo a ${seccionNombres[seccion]} de "${prop.nombre_propiedad}".`
      }
    }
  })

  // ============================================================================
  // CONSULTAS - Obtener información
  // ============================================================================

  const buscarPropiedades = tool({
    description: 'Lista las propiedades del usuario.',
    inputSchema: z.object({
      busqueda: z.string().describe('Filtrar por nombre').optional(),
    }),
    execute: async ({ busqueda }) => {
      let query = supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, estados, ubicacion')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (busqueda) {
        query = query.ilike('nombre_propiedad', `%${busqueda}%`)
      }

      const { data, error } = await query

      if (error) {
        return { accion: 'MENSAJE', mensaje: `Error: ${error.message}` }
      }

      if (!data || data.length === 0) {
        return {
          accion: 'MENSAJE',
          mensaje: 'No tienes propiedades registradas. ¿Quieres crear una nueva?'
        }
      }

      const lista = data.map((p: any) =>
        `• ${p.nombre_propiedad} (${p.tipo_propiedad}) - ${p.estados?.join(', ') || 'Sin estado'}`
      ).join('\n')

      return {
        accion: 'MENSAJE',
        mensaje: `Tienes ${data.length} propiedad(es):\n${lista}`
      }
    }
  })

  const buscarTickets = tool({
    description: 'Lista los tickets de pago pendientes.',
    inputSchema: z.object({
      estado: z.enum(['pendiente', 'completado', 'todos']).describe('Filtrar por estado').optional(),
    }),
    execute: async ({ estado }) => {
      // Obtener propiedades del usuario
      const { data: props } = await supabase
        .from('propiedades')
        .select('id')
        .eq('owner_id', userId)

      if (!props || props.length === 0) {
        return { accion: 'MENSAJE', mensaje: 'No tienes propiedades registradas.' }
      }

      let query = supabase
        .from('tickets')
        .select('*, propiedades(nombre_propiedad)')
        .in('propiedad_id', props.map((p: any) => p.id))
        .order('fecha_programada', { ascending: true })

      if (estado === 'pendiente') {
        query = query.eq('pagado', false)
      } else if (estado === 'completado') {
        query = query.eq('pagado', true)
      }

      const { data, error } = await query.limit(10)

      if (error) {
        return { accion: 'MENSAJE', mensaje: `Error: ${error.message}` }
      }

      if (!data || data.length === 0) {
        return { accion: 'MENSAJE', mensaje: 'No tienes tickets registrados.' }
      }

      const lista = data.map((t: any) => {
        const estado = t.pagado ? '✅' : '⏳'
        return `${estado} ${t.titulo} - $${t.monto_estimado} (${t.propiedades?.nombre_propiedad})`
      }).join('\n')

      return {
        accion: 'MENSAJE',
        mensaje: `Tickets:\n${lista}`
      }
    }
  })

  const obtenerBalance = tool({
    description: 'Muestra el balance de cuentas bancarias.',
    inputSchema: z.object({}),
    execute: async () => {
      const { data: cuentas } = await supabase
        .from('cuentas')
        .select('*')
        .eq('user_id', userId)
        .eq('activa', true)

      if (!cuentas || cuentas.length === 0) {
        return { accion: 'MENSAJE', mensaje: 'No tienes cuentas registradas.' }
      }

      const balanceMXN = cuentas.filter((c: any) => c.moneda === 'MXN')
        .reduce((sum: number, c: any) => sum + (c.saldo_actual || 0), 0)
      const balanceUSD = cuentas.filter((c: any) => c.moneda === 'USD')
        .reduce((sum: number, c: any) => sum + (c.saldo_actual || 0), 0)

      let mensaje = `Balance total:\n`
      if (balanceMXN > 0) mensaje += `• MXN: $${balanceMXN.toLocaleString()}\n`
      if (balanceUSD > 0) mensaje += `• USD: $${balanceUSD.toLocaleString()}\n`

      mensaje += `\nCuentas:\n`
      mensaje += cuentas.map((c: any) => `• ${c.nombre_cuenta}: $${c.saldo_actual} ${c.moneda}`).join('\n')

      return { accion: 'MENSAJE', mensaje }
    }
  })

  // ============================================================================
  // FILTRADO DE UI
  // ============================================================================

  const filtrarCatalogo = tool({
    description: 'Filtra las propiedades mostradas en el catálogo.',
    inputSchema: z.object({
      tipo: z.string().describe('Tipo: Casa, Departamento, Villa, etc.').optional(),
      estado: z.string().describe('Estado: Venta, Renta largo plazo, etc.').optional(),
      limpiar: z.boolean().describe('Limpiar todos los filtros').optional(),
    }),
    execute: async ({ tipo, estado, limpiar }) => {
      if (limpiar) {
        return {
          accion: 'FILTRAR_CATALOGO',
          filtros: {},
          mensaje: 'Filtros limpiados. Mostrando todas las propiedades.'
        }
      }

      const filtros: Record<string, string> = {}
      const aplicados: string[] = []

      if (tipo) {
        filtros.tipo = tipo
        aplicados.push(`tipo: ${tipo}`)
      }
      if (estado) {
        filtros.estado = estado
        aplicados.push(`estado: ${estado}`)
      }

      return {
        accion: 'FILTRAR_CATALOGO',
        filtros,
        mensaje: aplicados.length > 0
          ? `Filtrando por ${aplicados.join(', ')}.`
          : 'Mostrando todas las propiedades.'
      }
    }
  })

  return {
    navegarASeccion,
    navegarAPropiedad,
    buscarPropiedades,
    buscarTickets,
    obtenerBalance,
    filtrarCatalogo,
  }
}
