/**
 * API Route: Asistente IA de Ohana
 * Endpoint para interactuar con el asistente usando Claude
 */

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@supabase/supabase-js'
import { getAssistantSystemPrompt, ASSISTANT_CONFIG } from '@/lib/assistant/system-prompt'
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
    console.log('[Assistant] Llamando a Claude con', Object.keys(tools).length, 'herramientas')
    console.log('[Assistant] Modelo:', ASSISTANT_CONFIG.model)

    // Generar el system prompt con fecha actual
    const systemPrompt = getAssistantSystemPrompt()

    const result = await generateText({
      model: anthropic(ASSISTANT_CONFIG.model),
      system: systemPrompt,
      messages: formattedMessages,
      tools: tools,
      maxToolRoundtrips: 5,
      toolChoice: 'auto',
    })

    // Log detallado
    console.log('[Assistant] finishReason:', result.finishReason)
    console.log('[Assistant] text:', result.text?.substring(0, 200))
    console.log('[Assistant] toolCalls count:', result.toolCalls?.length ?? 0)
    console.log('[Assistant] toolResults count:', result.toolResults?.length ?? 0)

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('[Assistant] Tool calls:', JSON.stringify(result.toolCalls, null, 2).substring(0, 500))
    }
    if (result.toolResults && result.toolResults.length > 0) {
      console.log('[Assistant] Tool results:', JSON.stringify(result.toolResults, null, 2).substring(0, 500))
    }

    // Buscar acciones de UI y mensajes en los resultados
    const uiActions: Array<{ accion: string; filtros?: Record<string, any>; ruta?: string; mensaje?: string }> = []
    let toolMessages: string[] = []

    // Procesar toolResults (resultados de ejecución de herramientas)
    if (result.toolResults && Array.isArray(result.toolResults)) {
      console.log('[Assistant] Procesando toolResults:', result.toolResults.length)

      for (const toolResult of result.toolResults) {
        try {
          const resultValue = (toolResult as any)?.result
          console.log('[Assistant] Tool result value:', JSON.stringify(resultValue)?.substring(0, 300))

          if (resultValue && typeof resultValue === 'object') {
            // Capturar acciones de UI (NAVEGAR, FILTRAR_CATALOGO, MENSAJE)
            if (resultValue.accion) {
              console.log('[Assistant] Acción encontrada:', resultValue.accion)
              uiActions.push(resultValue)
            }
            // Capturar mensajes
            if (resultValue.mensaje) {
              toolMessages.push(String(resultValue.mensaje))
            }
            // Capturar errores
            if (resultValue.error) {
              toolMessages.push(`Error: ${String(resultValue.error)}`)
            }
          }
        } catch (e) {
          console.error('[Assistant] Error procesando tool result:', e)
        }
      }
    }

    // También revisar toolCalls por si hay resultados ahí
    if (result.toolCalls && Array.isArray(result.toolCalls)) {
      console.log('[Assistant] Tool calls encontrados:', result.toolCalls.length)
    }

    console.log('[Assistant] UI Actions:', JSON.stringify(uiActions))
    console.log('[Assistant] Tool Messages:', toolMessages)

    // Construir texto de respuesta - PRIORIZAR mensajes de herramientas
    let responseText = ''

    // 1. Si hay mensajes de herramientas, usarlos primero
    if (toolMessages.length > 0) {
      responseText = toolMessages.join('\n\n')
    }

    // 2. Si el modelo también generó texto, combinarlo (pero evitar duplicados)
    if (result.text && result.text.trim()) {
      const modelText = result.text.trim()
      // Solo agregar si no es redundante con los mensajes de herramientas
      if (!responseText) {
        responseText = modelText
      } else if (!toolMessages.some(msg => modelText.includes(msg.substring(0, 50)))) {
        // Si el texto del modelo no está ya en los mensajes, agregarlo
        responseText = `${modelText}\n\n${responseText}`
      }
    }

    // 3. Si aún no hay texto, revisar si hay acciones con mensajes
    if (!responseText && uiActions.length > 0) {
      const accionesConMensaje = uiActions.filter(a => a.mensaje)
      if (accionesConMensaje.length > 0) {
        responseText = accionesConMensaje.map(a => a.mensaje).join('\n\n')
      }
    }

    // 4. Fallback final
    if (!responseText) {
      responseText = '¿En qué más puedo ayudarte?'
    }

    console.log('[Assistant] Respuesta final:', String(responseText).slice(0, 100))

    // Devolver respuesta con posibles acciones de UI
    const response = {
      text: responseText,
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
