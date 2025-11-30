/**
 * Herramientas (Tools) del Asistente IA de Ohana
 * Define las acciones que el asistente puede ejecutar
 */

// @ts-nocheck
// TODO: Agregar tipos correctos cuando se estabilice la API del SDK

import { z } from 'zod'
import { tool } from 'ai'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con permisos de servicio (igual que la ruta API)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// FACTORY PARA CREAR HERRAMIENTAS CON CONTEXTO DE USUARIO
// ============================================================================

export function createAssistantTools(userId: string) {
  // Usar cliente con permisos de servicio
  const supabase = supabaseAdmin

  // ============================================================================
  // HERRAMIENTAS DE PROPIEDADES
  // ============================================================================

  const buscarPropiedades = tool({
    description: 'Busca y lista las propiedades del usuario. Puede filtrar por nombre, tipo o estado.',
    parameters: z.object({
      busqueda: z.string().optional().describe('Texto para buscar en el nombre de la propiedad'),
      tipo: z.string().optional().describe('Tipo de propiedad (Departamento, Casa, Villa, etc.)'),
      estado: z.string().optional().describe('Estado de la propiedad (Renta largo plazo, Venta, etc.)'),
    }),
    execute: async ({ busqueda, tipo, estado }) => {
      let query = supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, estados, ubicacion, created_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (busqueda) {
        query = query.ilike('nombre_propiedad', `%${busqueda}%`)
      }

      if (tipo) {
        query = query.eq('tipo_propiedad', tipo)
      }

      const { data, error } = await query

      if (error) {
        return { error: error.message, propiedades: [] }
      }

      // Filtrar por estado si se especifica (estados es un array)
      let propiedades = data || []
      if (estado) {
        propiedades = propiedades.filter(p =>
          p.estados && p.estados.includes(estado)
        )
      }

      return {
        total: propiedades.length,
        propiedades: propiedades.map(p => ({
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
    description: 'Obtiene los detalles completos de una propiedad específica por su ID o nombre.',
    parameters: z.object({
      propiedadId: z.string().optional().describe('ID de la propiedad'),
      nombre: z.string().optional().describe('Nombre de la propiedad para buscar'),
    }),
    execute: async ({ propiedadId, nombre }) => {
      let query = supabase
        .from('propiedades')
        .select('*')
        .eq('owner_id', userId)

      if (propiedadId) {
        query = query.eq('id', propiedadId)
      } else if (nombre) {
        query = query.ilike('nombre_propiedad', `%${nombre}%`)
      } else {
        return { error: 'Debes proporcionar el ID o nombre de la propiedad' }
      }

      const { data, error } = await query.single()

      if (error) {
        return { error: 'Propiedad no encontrada' }
      }

      return {
        propiedad: {
          id: data.id,
          nombre: data.nombre_propiedad,
          tipo: data.tipo_propiedad,
          estados: data.estados,
          mobiliario: data.mobiliario,
          ubicacion: data.ubicacion,
          espacios: data.espacios?.length || 0,
          servicios: data.servicios?.length || 0,
          fotos: data.photos?.length || 0,
          precios: data.precios,
          descripcion: data.descripcion_corta,
        }
      }
    }
  })

  const crearPropiedad = tool({
    description: 'Crea una nueva propiedad en el sistema. Requiere confirmación del usuario.',
    parameters: z.object({
      nombre: z.string().describe('Nombre de la propiedad'),
      tipo: z.string().describe('Tipo de propiedad (Departamento, Casa, Villa, Oficina, etc.)'),
      estados: z.array(z.string()).describe('Estados de la propiedad (Renta largo plazo, Renta vacacional, Venta, etc.)'),
      ciudad: z.string().optional().describe('Ciudad donde se ubica'),
      mobiliario: z.string().optional().describe('Amueblada, Semi-amueblada, Sin amueblar'),
      confirmado: z.boolean().describe('Si el usuario ha confirmado la creación'),
    }),
    execute: async ({ nombre, tipo, estados, ciudad, mobiliario, confirmado }) => {
      if (!confirmado) {
        return {
          requiereConfirmacion: true,
          mensaje: `¿Confirmas crear la propiedad "${nombre}" (${tipo}) con estado: ${estados.join(', ')}?`,
          datos: { nombre, tipo, estados, ciudad, mobiliario }
        }
      }

      
      const nuevaPropiedad = {
        owner_id: userId,
        nombre_propiedad: nombre,
        tipo_propiedad: tipo,
        estados: estados,
        mobiliario: mobiliario || 'Sin amueblar',
        ubicacion: ciudad ? { ciudad, pais: 'México' } : null,
        espacios: [],
        photos: [],
        is_draft: true,
        status: 'draft',
      }

      const { data, error } = await supabase
        .from('propiedades')
        .insert(nuevaPropiedad)
        .select()
        .single()

      if (error) {
        return { error: `Error al crear la propiedad: ${error.message}` }
      }

      return {
        exito: true,
        mensaje: `Propiedad "${nombre}" creada exitosamente`,
        propiedad: {
          id: data.id,
          nombre: data.nombre_propiedad,
          tipo: data.tipo_propiedad,
          estados: data.estados,
        }
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE TICKETS
  // ============================================================================

  const buscarTickets = tool({
    description: 'Busca tickets de pago. Puede filtrar por propiedad, estado o fecha.',
    parameters: z.object({
      propiedadId: z.string().optional().describe('ID de la propiedad'),
      estado: z.enum(['pendiente', 'completado', 'todos']).optional().describe('Estado del ticket'),
      urgencia: z.enum(['vencido', 'hoy', 'proximo', 'futuro', 'todos']).optional().describe('Urgencia del ticket'),
    }),
    execute: async ({ propiedadId, estado, urgencia }) => {
      
      // Primero obtener las propiedades del usuario
      const { data: propiedades } = await supabase
        .from('propiedades')
        .select('id')
        .eq('owner_id', userId)

      const propiedadIds = propiedades?.map(p => p.id) || []

      if (propiedadIds.length === 0) {
        return { total: 0, tickets: [], mensaje: 'No tienes propiedades registradas' }
      }

      let query = supabase
        .from('tickets')
        .select('*, propiedades(nombre_propiedad)')
        .in('propiedad_id', propiedadId ? [propiedadId] : propiedadIds)
        .order('fecha_programada', { ascending: true })

      if (estado && estado !== 'todos') {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query

      if (error) {
        return { error: error.message, tickets: [] }
      }

      // Filtrar por urgencia si se especifica
      const hoy = new Date().toISOString().split('T')[0]
      let tickets = data || []

      if (urgencia && urgencia !== 'todos') {
        tickets = tickets.filter(t => {
          const fechaTicket = t.fecha_programada
          if (urgencia === 'vencido') return fechaTicket < hoy && !t.pagado
          if (urgencia === 'hoy') return fechaTicket === hoy
          if (urgencia === 'proximo') {
            const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            return fechaTicket > hoy && fechaTicket <= en7Dias
          }
          return fechaTicket > hoy
        })
      }

      return {
        total: tickets.length,
        tickets: tickets.slice(0, 10).map(t => ({
          id: t.id,
          titulo: t.titulo,
          propiedad: t.propiedades?.nombre_propiedad || 'Sin propiedad',
          monto: t.monto_estimado,
          fecha: t.fecha_programada,
          estado: t.pagado ? 'completado' : 'pendiente',
        }))
      }
    }
  })

  const crearTicket = tool({
    description: 'Crea un nuevo ticket de pago para una propiedad.',
    parameters: z.object({
      propiedadId: z.string().describe('ID de la propiedad'),
      titulo: z.string().describe('Título o concepto del ticket (ej: "Pago de luz", "Mantenimiento")'),
      monto: z.number().describe('Monto del pago'),
      fecha: z.string().describe('Fecha programada del pago (formato YYYY-MM-DD)'),
      descripcion: z.string().optional().describe('Descripción adicional'),
      confirmado: z.boolean().describe('Si el usuario ha confirmado la creación'),
    }),
    execute: async ({ propiedadId, titulo, monto, fecha, descripcion, confirmado }) => {
      
      // Verificar que la propiedad pertenece al usuario
      const { data: propiedad } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('id', propiedadId)
        .eq('owner_id', userId)
        .single()

      if (!propiedad) {
        return { error: 'Propiedad no encontrada o no tienes acceso' }
      }

      if (!confirmado) {
        return {
          requiereConfirmacion: true,
          mensaje: `¿Confirmas crear el ticket "${titulo}" por $${monto.toLocaleString()} para ${propiedad.nombre_propiedad} con fecha ${fecha}?`,
          datos: { propiedadId, titulo, monto, fecha, descripcion, nombrePropiedad: propiedad.nombre_propiedad }
        }
      }

      const nuevoTicket = {
        propiedad_id: propiedadId,
        titulo,
        descripcion: descripcion || null,
        monto_estimado: monto,
        fecha_programada: fecha,
        pagado: false,
        estado: 'pendiente',
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert(nuevoTicket)
        .select()
        .single()

      if (error) {
        return { error: `Error al crear el ticket: ${error.message}` }
      }

      return {
        exito: true,
        mensaje: `Ticket "${titulo}" creado exitosamente para ${propiedad.nombre_propiedad}`,
        ticket: {
          id: data.id,
          titulo: data.titulo,
          monto: data.monto_estimado,
          fecha: data.fecha_programada,
        }
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS FINANCIERAS
  // ============================================================================

  const obtenerBalanceGeneral = tool({
    description: 'Obtiene el balance general del usuario: total de cuentas, ingresos y egresos.',
    parameters: z.object({}),
    execute: async () => {
      
      // Obtener cuentas
      const { data: cuentas, error: errorCuentas } = await supabase
        .from('cuentas')
        .select('*')
        .eq('user_id', userId)
        .eq('activa', true)

      if (errorCuentas) {
        return { error: errorCuentas.message }
      }

      const balanceMXN = (cuentas || [])
        .filter(c => c.moneda === 'MXN')
        .reduce((sum, c) => sum + (c.saldo_actual || 0), 0)

      const balanceUSD = (cuentas || [])
        .filter(c => c.moneda === 'USD')
        .reduce((sum, c) => sum + (c.saldo_actual || 0), 0)

      return {
        balance: {
          mxn: balanceMXN,
          usd: balanceUSD,
        },
        cuentas: (cuentas || []).map(c => ({
          nombre: c.nombre_cuenta,
          tipo: c.tipo_cuenta,
          saldo: c.saldo_actual,
          moneda: c.moneda,
        })),
        totalCuentas: cuentas?.length || 0,
      }
    }
  })

  const obtenerResumenFinanciero = tool({
    description: 'Obtiene un resumen financiero del mes actual o un periodo específico.',
    parameters: z.object({
      mes: z.number().optional().describe('Mes (1-12), si no se especifica usa el mes actual'),
      anio: z.number().optional().describe('Año, si no se especifica usa el año actual'),
    }),
    execute: async ({ mes, anio }) => {
      
      const ahora = new Date()
      const mesActual = mes || ahora.getMonth() + 1
      const anioActual = anio || ahora.getFullYear()

      const fechaInicio = `${anioActual}-${String(mesActual).padStart(2, '0')}-01`
      const fechaFin = `${anioActual}-${String(mesActual).padStart(2, '0')}-31`

      // Obtener propiedades del usuario
      const { data: propiedades } = await supabase
        .from('propiedades')
        .select('id')
        .eq('owner_id', userId)

      const propiedadIds = propiedades?.map(p => p.id) || []

      if (propiedadIds.length === 0) {
        return {
          ingresos: 0,
          egresos: 0,
          balance: 0,
          mensaje: 'No tienes propiedades registradas'
        }
      }

      // Obtener ingresos del periodo
      const { data: ingresos } = await supabase
        .from('ingresos')
        .select('monto')
        .in('propiedad_id', propiedadIds)
        .gte('fecha_ingreso', fechaInicio)
        .lte('fecha_ingreso', fechaFin)

      const totalIngresos = (ingresos || []).reduce((sum, i) => sum + (i.monto || 0), 0)

      // Obtener egresos del periodo (tickets completados)
      const { data: egresos } = await supabase
        .from('tickets')
        .select('monto_real')
        .in('propiedad_id', propiedadIds)
        .eq('pagado', true)
        .gte('fecha_pago_real', fechaInicio)
        .lte('fecha_pago_real', fechaFin)

      const totalEgresos = (egresos || []).reduce((sum, e) => sum + (e.monto_real || 0), 0)

      const nombreMes = new Date(anioActual, mesActual - 1).toLocaleString('es-MX', { month: 'long' })

      return {
        periodo: `${nombreMes} ${anioActual}`,
        ingresos: totalIngresos,
        egresos: totalEgresos,
        balance: totalIngresos - totalEgresos,
        cantidadIngresos: ingresos?.length || 0,
        cantidadEgresos: egresos?.length || 0,
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE FILTRADO DE INTERFAZ
  // ============================================================================

  const filtrarCatalogo = tool({
    description: `Filtra las propiedades mostradas en el catálogo. Usa esta herramienta cuando el usuario pida filtrar, buscar o mostrar propiedades específicas en la vista del catálogo.

    Tipos válidos: Casa, Departamento, Villa, Oficina, Local comercial, Terreno, Bodega
    Estados válidos: Renta largo plazo, Renta vacacional, Venta, Mantenimiento, Propietario
    Propiedad: todos, propios, compartidos`,
    parameters: z.object({
      busqueda: z.string().optional().describe('Texto para buscar en el nombre de la propiedad'),
      tipo: z.string().optional().describe('Tipo de propiedad: Casa, Departamento, Villa, Oficina, Local comercial, Terreno, Bodega'),
      estado: z.string().optional().describe('Estado de la propiedad: Renta largo plazo, Renta vacacional, Venta, Mantenimiento, Propietario'),
      propiedad: z.enum(['todos', 'propios', 'compartidos']).optional().describe('Filtrar por propiedades propias o compartidas'),
      limpiarFiltros: z.boolean().optional().describe('Si es true, limpia todos los filtros'),
    }),
    execute: async ({ busqueda, tipo, estado, propiedad, limpiarFiltros }) => {
      // Esta herramienta no ejecuta nada en el backend
      // Solo retorna la acción que el frontend debe ejecutar

      if (limpiarFiltros) {
        return {
          accion: 'FILTRAR_CATALOGO',
          filtros: {},
          mensaje: 'He limpiado todos los filtros del catálogo. Ahora se muestran todas las propiedades.'
        }
      }

      const filtrosAplicados: string[] = []
      const filtros: Record<string, string> = {}

      if (busqueda) {
        filtros.busqueda = busqueda
        filtrosAplicados.push(`nombre que contenga "${busqueda}"`)
      }

      if (tipo) {
        filtros.tipo = tipo
        filtrosAplicados.push(`tipo: ${tipo}`)
      }

      if (estado) {
        filtros.estado = estado
        filtrosAplicados.push(`estado: ${estado}`)
      }

      if (propiedad && propiedad !== 'todos') {
        filtros.propiedad = propiedad
        filtrosAplicados.push(propiedad === 'propios' ? 'solo propiedades propias' : 'solo propiedades compartidas')
      }

      const mensaje = filtrosAplicados.length > 0
        ? `He filtrado el catálogo para mostrar: ${filtrosAplicados.join(', ')}.`
        : 'No se especificaron filtros. Mostrando todas las propiedades.'

      return {
        accion: 'FILTRAR_CATALOGO',
        filtros,
        mensaje
      }
    }
  })

  // ============================================================================
  // RETORNAR TODAS LAS HERRAMIENTAS
  // ============================================================================

  return {
    buscarPropiedades,
    obtenerDetallePropiedad,
    crearPropiedad,
    buscarTickets,
    crearTicket,
    obtenerBalanceGeneral,
    obtenerResumenFinanciero,
    filtrarCatalogo,
  }
}
