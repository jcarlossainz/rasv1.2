/**
 * API Route: Estadísticas del sistema para el Owner Dashboard
 * Solo accesible para el email del propietario del sistema
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Email del propietario del sistema
const OWNER_EMAIL = 'juancarlossainzn@gmail.com'

// Cliente Supabase con permisos de servicio (bypassa RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación del usuario
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el token y verificar el usuario
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar que es el owner
    if (user.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener usuarios desde auth.users (la tabla real de autenticación)
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      console.error('Error listando usuarios:', usersError)
    }

    const users = authUsers?.users || []
    const totalUsuarios = users.length

    // Obtener total de propiedades
    const { count: totalPropiedades } = await supabaseAdmin
      .from('propiedades')
      .select('*', { count: 'exact', head: true })

    // Obtener todas las propiedades con sus owners
    const { data: todasPropiedades } = await supabaseAdmin
      .from('propiedades')
      .select('id, nombre_propiedad, owner_id')

    // Construir lista de usuarios con sus propiedades
    const usuariosConPropiedades = users.map(authUser => {
      const propiedadesDelUsuario = (todasPropiedades || [])
        .filter(p => p.owner_id === authUser.id)
        .map(p => ({
          id: p.id,
          nombre: p.nombre_propiedad || 'Sin nombre'
        }))

      return {
        id: authUser.id,
        email: authUser.email || 'Sin email',
        full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        created_at: authUser.created_at,
        propiedades: propiedadesDelUsuario,
        total_propiedades: propiedadesDelUsuario.length
      }
    })

    // Ordenar por cantidad de propiedades (descendente)
    usuariosConPropiedades.sort((a, b) => b.total_propiedades - a.total_propiedades)

    return NextResponse.json({
      totalUsuarios,
      totalPropiedades: totalPropiedades || 0,
      usuariosConPropiedades
    })

  } catch (error) {
    console.error('[Admin Stats Error]', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
