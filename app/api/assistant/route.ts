/**
 * API Route: Asistente IA de Ohana
 * Endpoint para interactuar con el asistente usando Claude
 */

import { anthropic } from '@ai-sdk/anthropic'
import { streamText, convertToCoreMessages } from 'ai'
import { createClient } from '@supabase/supabase-js'
import { ASSISTANT_SYSTEM_PROMPT, ASSISTANT_CONFIG } from '@/lib/assistant/system-prompt'
import { createAssistantTools } from '@/lib/assistant/tools'

// Cliente Supabase con permisos de servicio (igual que vision/analyze)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Permitir streaming de hasta 30 segundos
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    // Obtener mensajes y userId del request
    const { messages, userId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Mensajes inválidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el userId existe (la autenticación se maneja en el cliente/middleware)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Usuario no identificado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Crear las herramientas con el contexto del usuario
    const tools = createAssistantTools(userId)

    // Generar respuesta con streaming usando Claude
    const result = await streamText({
      model: anthropic(ASSISTANT_CONFIG.model),
      system: ASSISTANT_SYSTEM_PROMPT,
      messages: convertToCoreMessages(messages),
      tools,
      toolChoice: 'auto',
    })

    // Devolver el stream
    return result.toDataStreamResponse()

  } catch (error) {
    console.error('[Assistant API Error]', error)

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    const errorStack = error instanceof Error ? error.stack : ''

    console.error('[Assistant API Error Details]', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
    })

    // Manejar errores específicos de Anthropic
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('api_key') || error.message.includes('ANTHROPIC_API_KEY')) {
        return new Response(
          JSON.stringify({ error: 'Error de configuración: API key de Anthropic no configurada o inválida.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (error.message.includes('rate_limit')) {
        return new Response(
          JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: `Error del asistente: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
