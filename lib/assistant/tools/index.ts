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

  // Herramienta simple de prueba
  const buscarPropiedades = tool({
    description: 'Busca y lista las propiedades del usuario.',
    parameters: z.object({
      busqueda: z.string().optional(),
    }),
    execute: async ({ busqueda }) => {
      let query = supabase
        .from('propiedades')
        .select('id, nombre_propiedad, tipo_propiedad, estados')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (busqueda) {
        query = query.ilike('nombre_propiedad', `%${busqueda}%`)
      }

      const { data, error } = await query

      if (error) {
        return { error: error.message, propiedades: [] }
      }

      return {
        total: (data || []).length,
        propiedades: (data || []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre_propiedad,
          tipo: p.tipo_propiedad,
          estados: p.estados,
        }))
      }
    }
  })

  return {
    buscarPropiedades,
  }
}
