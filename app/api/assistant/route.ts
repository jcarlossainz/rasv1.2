/**
 * API Route: Asistente IA de Ohana
 * Endpoint para interactuar con el asistente usando Claude
 */

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
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

    // Formatear mensajes para el SDK
    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Crear herramientas con el contexto del usuario
    const tools = createAssistantTools(userId)

    // Generar respuesta usando Claude con herramientas
    const result = await generateText({
      model: anthropic(ASSISTANT_CONFIG.model),
      system: ASSISTANT_SYSTEM_PROMPT,
      messages: formattedMessages,
      tools: tools,
      maxToolRoundtrips: 5,
    })

    // Buscar si hay acciones de UI en los tool calls
    const uiActions: Array<{ accion: string; filtros: Record<string, any>; mensaje: string }> = []

    if (result.toolResults) {
      for (const toolResult of result.toolResults) {
        const resultValue = (toolResult as any).result
        if (resultValue && typeof resultValue === 'object' && 'accion' in resultValue) {
          uiActions.push(resultValue as any)
        }
      }
    }

    // Devolver respuesta con posibles acciones de UI
    const response = {
      text: result.text,
      uiActions: uiActions.length > 0 ? uiActions : undefined,
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })

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
