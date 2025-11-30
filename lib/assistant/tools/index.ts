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

  // ============================================================================
  // CREACIÓN - Crear nuevos registros
  // ============================================================================

  const crearPropiedad = tool({
    description: 'Crea una nueva propiedad rápida con datos básicos. Usa esto cuando el usuario quiera crear una propiedad directamente desde el chat.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre de la propiedad (ej: "Casa Playa", "Depto Centro")'),
      tipo: z.enum([
        'Casa',
        'Departamento',
        'Villa',
        'Local comercial',
        'Oficina',
        'Terreno',
        'Bodega',
        'Edificio'
      ]).describe('Tipo de propiedad'),
      estado: z.enum([
        'Renta largo plazo',
        'Renta vacacional',
        'Venta',
        'Uso personal',
        'Disponible'
      ]).describe('Estado o uso de la propiedad').optional(),
      ciudad: z.string().describe('Ciudad donde está ubicada').optional(),
    }),
    execute: async ({ nombre, tipo, estado, ciudad }) => {
      try {
        // Verificar si ya existe una propiedad con ese nombre
        const { data: existente } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .eq('owner_id', userId)
          .ilike('nombre_propiedad', nombre)
          .limit(1)

        if (existente && existente.length > 0) {
          return {
            accion: 'MENSAJE',
            mensaje: `Ya existe una propiedad con un nombre similar: "${existente[0].nombre_propiedad}". ¿Quieres usar otro nombre?`
          }
        }

        // Crear la propiedad
        const propiedadData = {
          owner_id: userId,
          nombre_propiedad: nombre,
          tipo_propiedad: tipo,
          estados: estado ? [estado] : ['Disponible'],
          ubicacion: ciudad ? {
            ciudad: ciudad,
            pais: 'México',
            calle: '',
            colonia: '',
            codigo_postal: '',
            estado: '',
            google_maps_link: '',
            referencias: ''
          } : null,
          dimensiones: {
            terreno: { valor: 0, unidad: 'm²' },
            construccion: { valor: 0, unidad: 'm²' }
          },
          espacios: [],
          servicios: [],
          wizard_step: 1,
          wizard_completed: false,
          is_draft: true
        }

        const { data: nuevaPropiedad, error } = await supabase
          .from('propiedades')
          .insert([propiedadData])
          .select('id, nombre_propiedad')
          .single()

        if (error) {
          console.error('[Assistant] Error creando propiedad:', error)
          return {
            accion: 'MENSAJE',
            mensaje: `Error al crear la propiedad: ${error.message}`
          }
        }

        return {
          accion: 'NAVEGAR',
          ruta: `/dashboard/catalogo/propiedad/${nuevaPropiedad.id}/home`,
          mensaje: `¡Propiedad "${nombre}" creada exitosamente! Te llevo a la página de la propiedad para que puedas completar los detalles.`
        }
      } catch (error: any) {
        console.error('[Assistant] Error en crearPropiedad:', error)
        return {
          accion: 'MENSAJE',
          mensaje: `Error inesperado: ${error?.message || 'Error desconocido'}`
        }
      }
    }
  })

  const crearTicket = tool({
    description: 'Crea un nuevo ticket de pago o tarea para una propiedad.',
    inputSchema: z.object({
      nombrePropiedad: z.string().describe('Nombre de la propiedad a la que asignar el ticket'),
      titulo: z.string().describe('Título del ticket (ej: "Pago de luz", "Reparación tubería")'),
      monto: z.number().describe('Monto estimado del pago').optional(),
      fecha: z.string().describe('Fecha programada en formato YYYY-MM-DD (ej: 2025-01-15)'),
      tipo: z.enum([
        'compra',
        'mantenimiento',
        'reparacion',
        'limpieza',
        'servicio',
        'otro'
      ]).describe('Tipo de ticket').optional(),
      prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).describe('Prioridad del ticket').optional(),
    }),
    execute: async ({ nombrePropiedad, titulo, monto, fecha, tipo, prioridad }) => {
      try {
        // Buscar la propiedad por nombre
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
            mensaje: `No encontré la propiedad "${nombrePropiedad}". Tus propiedades son: ${todas?.map(p => p.nombre_propiedad).join(', ') || 'ninguna'}. ¿Cuál quieres usar?`
          }
        }

        const propiedad = props[0]

        // Crear el ticket
        const ticketData = {
          propiedad_id: propiedad.id,
          tipo_ticket: tipo || 'otro',
          titulo: titulo,
          descripcion: null,
          fecha_programada: fecha,
          monto_estimado: monto || null,
          prioridad: prioridad || 'media',
          estado: 'pendiente',
          pagado: false,
          servicio_id: null
        }

        const { data: nuevoTicket, error } = await supabase
          .from('tickets')
          .insert([ticketData])
          .select('id')
          .single()

        if (error) {
          console.error('[Assistant] Error creando ticket:', error)
          return {
            accion: 'MENSAJE',
            mensaje: `Error al crear el ticket: ${error.message}`
          }
        }

        const montoStr = monto ? ` por $${monto.toLocaleString()}` : ''
        return {
          accion: 'MENSAJE',
          mensaje: `✅ Ticket "${titulo}"${montoStr} creado para "${propiedad.nombre_propiedad}" con fecha ${fecha}. ¿Quieres ver los tickets de esta propiedad?`
        }
      } catch (error: any) {
        console.error('[Assistant] Error en crearTicket:', error)
        return {
          accion: 'MENSAJE',
          mensaje: `Error inesperado: ${error?.message || 'Error desconocido'}`
        }
      }
    }
  })

  const crearContacto = tool({
    description: 'Crea un nuevo contacto/proveedor en el directorio.',
    inputSchema: z.object({
      nombre: z.string().describe('Nombre completo del contacto'),
      telefono: z.string().describe('Número de teléfono').optional(),
      email: z.string().describe('Correo electrónico').optional(),
      tipo: z.enum(['proveedor', 'otro']).describe('Tipo de contacto').default('proveedor'),
      categoria: z.string().describe('Categoría del proveedor (ej: Plomero, Electricista, Jardinero)').optional(),
    }),
    execute: async ({ nombre, telefono, email, tipo, categoria }) => {
      try {
        // Verificar si ya existe un contacto con el mismo nombre o email
        let query = supabase
          .from('contactos')
          .select('id, full_name')
          .eq('user_id', userId)
          .eq('activo', true)

        if (email) {
          query = query.or(`email.eq.${email},full_name.ilike.%${nombre}%`)
        } else {
          query = query.ilike('full_name', `%${nombre}%`)
        }

        const { data: existente } = await query.limit(1)

        if (existente && existente.length > 0) {
          return {
            accion: 'MENSAJE',
            mensaje: `Ya existe un contacto similar: "${existente[0].full_name}". ¿Quieres crear uno nuevo de todas formas?`
          }
        }

        // Crear el contacto
        const contactoData = {
          user_id: userId,
          full_name: nombre,
          telefono: telefono || null,
          email: email || null,
          tipo: tipo || 'proveedor',
          categoria_proveedor: categoria || null,
          activo: true
        }

        const { error } = await supabase
          .from('contactos')
          .insert([contactoData])

        if (error) {
          console.error('[Assistant] Error creando contacto:', error)
          return {
            accion: 'MENSAJE',
            mensaje: `Error al crear el contacto: ${error.message}`
          }
        }

        const catStr = categoria ? ` (${categoria})` : ''
        return {
          accion: 'MENSAJE',
          mensaje: `✅ Contacto "${nombre}"${catStr} agregado al directorio. ¿Quieres ver tu directorio de contactos?`
        }
      } catch (error: any) {
        console.error('[Assistant] Error en crearContacto:', error)
        return {
          accion: 'MENSAJE',
          mensaje: `Error inesperado: ${error?.message || 'Error desconocido'}`
        }
      }
    }
  })

  const registrarPago = tool({
    description: 'Marca un ticket como pagado. Usa esto cuando el usuario diga que ya pagó algo.',
    inputSchema: z.object({
      nombrePropiedad: z.string().describe('Nombre de la propiedad del ticket').optional(),
      tituloTicket: z.string().describe('Título o descripción del ticket a marcar como pagado'),
      monto: z.number().describe('Monto del pago realizado').optional(),
    }),
    execute: async ({ nombrePropiedad, tituloTicket, monto }) => {
      try {
        // Obtener propiedades del usuario
        const { data: props } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .eq('owner_id', userId)

        if (!props || props.length === 0) {
          return {
            accion: 'MENSAJE',
            mensaje: 'No tienes propiedades registradas.'
          }
        }

        let propiedadIds = props.map(p => p.id)

        // Si se especificó una propiedad, filtrar
        if (nombrePropiedad) {
          const propFiltrada = props.find(p =>
            p.nombre_propiedad.toLowerCase().includes(nombrePropiedad.toLowerCase())
          )
          if (propFiltrada) {
            propiedadIds = [propFiltrada.id]
          }
        }

        // Buscar tickets pendientes que coincidan
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, titulo, monto_estimado, propiedad_id, propiedades(nombre_propiedad)')
          .in('propiedad_id', propiedadIds)
          .eq('pagado', false)
          .ilike('titulo', `%${tituloTicket}%`)
          .order('fecha_programada', { ascending: true })
          .limit(5)

        if (!tickets || tickets.length === 0) {
          return {
            accion: 'MENSAJE',
            mensaje: `No encontré tickets pendientes que coincidan con "${tituloTicket}". ¿Quieres ver tus tickets pendientes?`
          }
        }

        // Si hay más de uno, pedir confirmación
        if (tickets.length > 1) {
          const lista = tickets.map((t: any) =>
            `• ${t.titulo} - $${t.monto_estimado || 0} (${t.propiedades?.nombre_propiedad})`
          ).join('\n')
          return {
            accion: 'MENSAJE',
            mensaje: `Encontré varios tickets:\n${lista}\n\n¿Cuál quieres marcar como pagado? Sé más específico.`
          }
        }

        // Marcar el ticket como pagado
        const ticket = tickets[0] as any
        const { error } = await supabase
          .from('tickets')
          .update({
            pagado: true,
            estado: 'completado',
            monto_estimado: monto || ticket.monto_estimado
          })
          .eq('id', ticket.id)

        if (error) {
          console.error('[Assistant] Error registrando pago:', error)
          return {
            accion: 'MENSAJE',
            mensaje: `Error al registrar el pago: ${error.message}`
          }
        }

        const montoFinal = monto || ticket.monto_estimado
        return {
          accion: 'MENSAJE',
          mensaje: `✅ ¡Pago registrado! El ticket "${ticket.titulo}" de ${ticket.propiedades?.nombre_propiedad} por $${montoFinal?.toLocaleString() || 0} ha sido marcado como pagado.`
        }
      } catch (error: any) {
        console.error('[Assistant] Error en registrarPago:', error)
        return {
          accion: 'MENSAJE',
          mensaje: `Error inesperado: ${error?.message || 'Error desconocido'}`
        }
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
    // Nuevas herramientas de creación
    crearPropiedad,
    crearTicket,
    crearContacto,
    registrarPago,
  }
}
