/**
 * Herramientas (Tools) del Asistente IA de Ohana
 * Define las acciones que el asistente puede ejecutar
 */

// @ts-nocheck
// TODO: Agregar tipos correctos cuando se estabilice la API del SDK

import { z } from 'zod'
import { tool } from 'ai'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con permisos de servicio
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// FACTORY PARA CREAR HERRAMIENTAS CON CONTEXTO DE USUARIO
// ============================================================================

export function createAssistantTools(userId: string) {
  const supabase = supabaseAdmin

  // ============================================================================
  // HERRAMIENTAS DE PROPIEDADES
  // ============================================================================

  const buscarPropiedades = tool({
    description: 'Busca y lista las propiedades del usuario. Puede filtrar por nombre, tipo o estado. Usa esto para encontrar una propiedad antes de navegar a ella.',
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
    description: 'Crea una nueva propiedad en el sistema.',
    parameters: z.object({
      nombre: z.string().describe('Nombre de la propiedad'),
      tipo: z.string().describe('Tipo de propiedad: Casa, Departamento, Villa, Oficina, Local comercial, Terreno, Bodega'),
      estados: z.array(z.string()).describe('Estados de la propiedad: Renta largo plazo, Renta vacacional, Venta, Mantenimiento, Propietario'),
      ciudad: z.string().optional().describe('Ciudad donde se ubica'),
      mobiliario: z.string().optional().describe('Amueblada, Semi-amueblada, Sin amueblar'),
    }),
    execute: async ({ nombre, tipo, estados, ciudad, mobiliario }) => {
      const nuevaPropiedad = {
        owner_id: userId,
        nombre_propiedad: nombre,
        tipo_propiedad: tipo,
        estados: estados,
        mobiliario: mobiliario || 'Sin amueblar',
        ubicacion: ciudad ? { ciudad, pais: 'México' } : null,
        espacios: [],
        photos: [],
        is_draft: false,
        status: 'active',
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
      nombrePropiedad: z.string().optional().describe('Nombre de la propiedad para buscar sus tickets'),
      estado: z.enum(['pendiente', 'completado', 'todos']).optional().describe('Estado del ticket'),
      urgencia: z.enum(['vencido', 'hoy', 'proximo', 'futuro', 'todos']).optional().describe('Urgencia del ticket'),
    }),
    execute: async ({ propiedadId, nombrePropiedad, estado, urgencia }) => {
      // Primero obtener las propiedades del usuario
      const { data: propiedades } = await supabase
        .from('propiedades')
        .select('id, nombre_propiedad')
        .eq('owner_id', userId)

      const propiedadIds = propiedades?.map(p => p.id) || []

      if (propiedadIds.length === 0) {
        return { total: 0, tickets: [], mensaje: 'No tienes propiedades registradas' }
      }

      // Si se proporciona nombre, buscar el ID
      let targetPropiedadId = propiedadId
      if (nombrePropiedad && !propiedadId) {
        const prop = propiedades?.find(p =>
          p.nombre_propiedad.toLowerCase().includes(nombrePropiedad.toLowerCase())
        )
        if (prop) targetPropiedadId = prop.id
      }

      let query = supabase
        .from('tickets')
        .select('*, propiedades(nombre_propiedad)')
        .in('propiedad_id', targetPropiedadId ? [targetPropiedadId] : propiedadIds)
        .order('fecha_programada', { ascending: true })

      if (estado && estado !== 'todos') {
        query = query.eq('pagado', estado === 'completado')
      }

      const { data, error } = await query

      if (error) {
        return { error: error.message, tickets: [] }
      }

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
      propiedadId: z.string().optional().describe('ID de la propiedad'),
      nombrePropiedad: z.string().optional().describe('Nombre de la propiedad (si no tienes el ID)'),
      titulo: z.string().describe('Título o concepto del ticket (ej: "Pago de luz", "Mantenimiento")'),
      monto: z.number().describe('Monto del pago'),
      fecha: z.string().describe('Fecha programada del pago (formato YYYY-MM-DD)'),
      descripcion: z.string().optional().describe('Descripción adicional'),
    }),
    execute: async ({ propiedadId, nombrePropiedad, titulo, monto, fecha, descripcion }) => {
      // Buscar la propiedad
      let targetPropiedadId = propiedadId
      let nombreProp = nombrePropiedad

      if (!propiedadId && nombrePropiedad) {
        const { data: props } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .eq('owner_id', userId)
          .ilike('nombre_propiedad', `%${nombrePropiedad}%`)
          .limit(1)

        if (props && props.length > 0) {
          targetPropiedadId = props[0].id
          nombreProp = props[0].nombre_propiedad
        }
      }

      if (!targetPropiedadId) {
        return { error: 'No encontré la propiedad. ¿Puedes especificar mejor el nombre?' }
      }

      const nuevoTicket = {
        propiedad_id: targetPropiedadId,
        titulo,
        descripcion: descripcion || null,
        monto_estimado: monto,
        fecha_programada: fecha,
        pagado: false,
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
        mensaje: `Ticket "${titulo}" creado exitosamente para ${nombreProp}`,
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
        balance: { mxn: balanceMXN, usd: balanceUSD },
        cuentas: (cuentas || []).map(c => ({
          id: c.id,
          nombre: c.nombre_cuenta,
          tipo: c.tipo_cuenta,
          saldo: c.saldo_actual,
          moneda: c.moneda,
        })),
        totalCuentas: cuentas?.length || 0,
      }
    }
  })

  const crearCuenta = tool({
    description: 'Crea una nueva cuenta bancaria o de efectivo.',
    parameters: z.object({
      nombre: z.string().describe('Nombre de la cuenta (ej: "BBVA Principal", "Efectivo Casa")'),
      tipo: z.enum(['Banco', 'Efectivo', 'Tarjeta de crédito', 'Inversión', 'Otro']).describe('Tipo de cuenta'),
      moneda: z.enum(['MXN', 'USD']).describe('Moneda de la cuenta'),
      saldoInicial: z.number().optional().describe('Saldo inicial de la cuenta'),
    }),
    execute: async ({ nombre, tipo, moneda, saldoInicial }) => {
      const nuevaCuenta = {
        user_id: userId,
        nombre_cuenta: nombre,
        tipo_cuenta: tipo,
        moneda: moneda,
        saldo_actual: saldoInicial || 0,
        activa: true,
      }

      const { data, error } = await supabase
        .from('cuentas')
        .insert(nuevaCuenta)
        .select()
        .single()

      if (error) {
        return { error: `Error al crear la cuenta: ${error.message}` }
      }

      return {
        exito: true,
        mensaje: `Cuenta "${nombre}" creada exitosamente`,
        cuenta: {
          id: data.id,
          nombre: data.nombre_cuenta,
          tipo: data.tipo_cuenta,
          saldo: data.saldo_actual,
          moneda: data.moneda,
        }
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

      const { data: propiedades } = await supabase
        .from('propiedades')
        .select('id')
        .eq('owner_id', userId)

      const propiedadIds = propiedades?.map(p => p.id) || []

      if (propiedadIds.length === 0) {
        return { ingresos: 0, egresos: 0, balance: 0, mensaje: 'No tienes propiedades registradas' }
      }

      const { data: ingresos } = await supabase
        .from('ingresos')
        .select('monto')
        .in('propiedad_id', propiedadIds)
        .gte('fecha_ingreso', fechaInicio)
        .lte('fecha_ingreso', fechaFin)

      const totalIngresos = (ingresos || []).reduce((sum, i) => sum + (i.monto || 0), 0)

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
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE DIRECTORIO / CONTACTOS
  // ============================================================================

  const buscarContactos = tool({
    description: 'Busca contactos en el directorio del usuario.',
    parameters: z.object({
      busqueda: z.string().optional().describe('Texto para buscar en nombre o empresa'),
      tipo: z.enum(['Inquilino', 'Proveedor', 'Propietario', 'Otro', 'todos']).optional().describe('Tipo de contacto'),
    }),
    execute: async ({ busqueda, tipo }) => {
      let query = supabase
        .from('directorio')
        .select('*')
        .eq('user_id', userId)
        .order('nombre', { ascending: true })

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,empresa.ilike.%${busqueda}%`)
      }

      if (tipo && tipo !== 'todos') {
        query = query.eq('tipo', tipo)
      }

      const { data, error } = await query

      if (error) {
        return { error: error.message, contactos: [] }
      }

      return {
        total: data?.length || 0,
        contactos: (data || []).map(c => ({
          id: c.id,
          nombre: c.nombre,
          tipo: c.tipo,
          empresa: c.empresa,
          telefono: c.telefono,
          email: c.email,
        }))
      }
    }
  })

  const crearContacto = tool({
    description: 'Crea un nuevo contacto en el directorio (inquilino, proveedor, propietario, etc.).',
    parameters: z.object({
      nombre: z.string().describe('Nombre completo del contacto'),
      tipo: z.enum(['Inquilino', 'Proveedor', 'Propietario', 'Otro']).describe('Tipo de contacto'),
      telefono: z.string().optional().describe('Número de teléfono'),
      email: z.string().optional().describe('Correo electrónico'),
      empresa: z.string().optional().describe('Empresa o compañía (para proveedores)'),
      notas: z.string().optional().describe('Notas adicionales'),
    }),
    execute: async ({ nombre, tipo, telefono, email, empresa, notas }) => {
      const nuevoContacto = {
        user_id: userId,
        nombre,
        tipo,
        telefono: telefono || null,
        email: email || null,
        empresa: empresa || null,
        notas: notas || null,
      }

      const { data, error } = await supabase
        .from('directorio')
        .insert(nuevoContacto)
        .select()
        .single()

      if (error) {
        return { error: `Error al crear el contacto: ${error.message}` }
      }

      return {
        exito: true,
        mensaje: `Contacto "${nombre}" (${tipo}) creado exitosamente`,
        contacto: {
          id: data.id,
          nombre: data.nombre,
          tipo: data.tipo,
        }
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE NAVEGACIÓN
  // ============================================================================

  const navegarASeccion = tool({
    description: `Navega a una sección específica de una propiedad o del sistema.

    Secciones de propiedad disponibles: home, calendario, tickets, inventario, galeria, anuncio, balance, archivero, config
    Secciones generales: dashboard, catalogo, cuentas, directorio, market, tickets, perfil

    Usa esta herramienta cuando el usuario diga cosas como:
    - "Llévame a la galería de Casa Playa"
    - "Quiero ver el balance de Amatista 3"
    - "Abre el calendario de mi departamento"
    - "Ve a configuración de la propiedad X"`,
    parameters: z.object({
      seccion: z.enum([
        'home', 'calendario', 'tickets', 'inventario', 'galeria',
        'anuncio', 'balance', 'archivero', 'config',
        'dashboard', 'catalogo', 'cuentas', 'directorio', 'market', 'perfil'
      ]).describe('Sección a la que navegar'),
      propiedadId: z.string().optional().describe('ID de la propiedad (para secciones de propiedad)'),
      nombrePropiedad: z.string().optional().describe('Nombre de la propiedad para buscarla'),
    }),
    execute: async ({ seccion, propiedadId, nombrePropiedad }) => {
      // Secciones generales (no requieren propiedad)
      const seccionesGenerales = ['dashboard', 'catalogo', 'cuentas', 'directorio', 'market', 'perfil']

      if (seccionesGenerales.includes(seccion)) {
        const rutas: Record<string, string> = {
          dashboard: '/dashboard',
          catalogo: '/dashboard/catalogo',
          cuentas: '/dashboard/cuentas',
          directorio: '/dashboard/directorio',
          market: '/dashboard/market',
          perfil: '/perfil',
        }

        return {
          accion: 'NAVEGAR',
          ruta: rutas[seccion],
          mensaje: `Te llevo a la sección de ${seccion}.`
        }
      }

      // Secciones de propiedad (requieren ID de propiedad)
      let targetPropiedadId = propiedadId
      let nombreProp = nombrePropiedad

      if (!propiedadId && nombrePropiedad) {
        const { data: props } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .eq('owner_id', userId)
          .ilike('nombre_propiedad', `%${nombrePropiedad}%`)
          .limit(1)

        if (props && props.length > 0) {
          targetPropiedadId = props[0].id
          nombreProp = props[0].nombre_propiedad
        }
      }

      if (!targetPropiedadId) {
        // Buscar propiedades para sugerir
        const { data: todasProps } = await supabase
          .from('propiedades')
          .select('id, nombre_propiedad')
          .eq('owner_id', userId)
          .limit(5)

        return {
          error: 'No encontré la propiedad',
          sugerencia: 'Estas son tus propiedades:',
          propiedades: todasProps?.map(p => ({ id: p.id, nombre: p.nombre_propiedad })) || []
        }
      }

      const ruta = `/dashboard/catalogo/propiedad/${targetPropiedadId}/${seccion}`

      return {
        accion: 'NAVEGAR',
        ruta,
        propiedadId: targetPropiedadId,
        nombrePropiedad: nombreProp,
        mensaje: `Te llevo a ${seccion} de "${nombreProp}".`
      }
    }
  })

  // ============================================================================
  // HERRAMIENTAS DE FILTRADO DE INTERFAZ
  // ============================================================================

  const filtrarCatalogo = tool({
    description: `Filtra las propiedades mostradas en el catálogo. Usa esta herramienta cuando el usuario pida filtrar o mostrar solo cierto tipo de propiedades.`,
    parameters: z.object({
      busqueda: z.string().optional().describe('Texto para buscar en el nombre'),
      tipo: z.string().optional().describe('Tipo: Casa, Departamento, Villa, Oficina, Local comercial, Terreno, Bodega'),
      estado: z.string().optional().describe('Estado: Renta largo plazo, Renta vacacional, Venta, Mantenimiento, Propietario'),
      propiedad: z.enum(['todos', 'propios', 'compartidos']).optional().describe('Propias o compartidas'),
      limpiarFiltros: z.boolean().optional().describe('Si es true, limpia todos los filtros'),
    }),
    execute: async ({ busqueda, tipo, estado, propiedad, limpiarFiltros }) => {
      if (limpiarFiltros) {
        return {
          accion: 'FILTRAR_CATALOGO',
          filtros: {},
          mensaje: 'He limpiado los filtros del catálogo.'
        }
      }

      const filtros: Record<string, string> = {}
      const filtrosAplicados: string[] = []

      if (busqueda) {
        filtros.busqueda = busqueda
        filtrosAplicados.push(`nombre: "${busqueda}"`)
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
        filtrosAplicados.push(propiedad === 'propios' ? 'propias' : 'compartidas')
      }

      return {
        accion: 'FILTRAR_CATALOGO',
        filtros,
        mensaje: filtrosAplicados.length > 0
          ? `Filtrado: ${filtrosAplicados.join(', ')}.`
          : 'Mostrando todas las propiedades.'
      }
    }
  })

  // ============================================================================
  // RETORNAR TODAS LAS HERRAMIENTAS
  // ============================================================================

  return {
    // Propiedades
    buscarPropiedades,
    obtenerDetallePropiedad,
    crearPropiedad,
    // Tickets
    buscarTickets,
    crearTicket,
    // Finanzas
    obtenerBalanceGeneral,
    obtenerResumenFinanciero,
    crearCuenta,
    // Directorio
    buscarContactos,
    crearContacto,
    // Navegación
    navegarASeccion,
    // Filtrado UI
    filtrarCatalogo,
  }
}
