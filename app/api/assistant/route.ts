/**
 * API Route: Asistente IA de Ohana
 * Endpoint para interactuar con el asistente usando Claude
 */

import { anthropic } from '@ai-sdk/anthropic'
import { streamText, convertToCoreMessages } from 'ai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ASSISTANT_SYSTEM_PROMPT, ASSISTANT_CONFIG } from '@/lib/assistant/system-prompt'
import { createAssistantTools } from '@/lib/assistant/tools'

// Permitir streaming de hasta 30 segundos
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    // Obtener el usuario autenticado usando auth-helpers (compatible con el middleware)
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Inicia sesión para usar el asistente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Obtener mensajes del request
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Mensajes inválidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Crear las herramientas con el contexto del usuario
    const tools = createAssistantTools(user.id)

    // Generar respuesta con streaming usando Claude
    const result = streamText({
      model: anthropic(ASSISTANT_CONFIG.model),
      system: ASSISTANT_SYSTEM_PROMPT,
      messages: convertToCoreMessages(messages),
      tools,
      toolChoice: 'auto',
    })

    // Devolver el stream
    return result.toTextStreamResponse()

  } catch (error) {
    console.error('[Assistant API Error]', error)

    // Manejar errores específicos de Anthropic
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('api_key')) {
        return new Response(
          JSON.stringify({ error: 'Error de configuración del asistente. Verifica la API key de Anthropic.' }),
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
      JSON.stringify({ error: 'Error interno del asistente. Intenta de nuevo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
