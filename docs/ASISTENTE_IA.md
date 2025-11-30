# Asistente IA de Ohana - Documentación Técnica

## Resumen

El Asistente IA de Ohana es un chatbot conversacional integrado en el sistema de administración de propiedades. Utiliza **Claude Sonnet 4** como modelo de lenguaje y el **Vercel AI SDK** para la orquestación de herramientas.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  components/assistant/                                           │
│  ├── AssistantChat.tsx      → Componente principal del chat     │
│  ├── AssistantProvider.tsx  → Provider global (estado abierto)  │
│  └── index.ts               → Exportaciones                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /api/assistant
┌─────────────────────────────────────────────────────────────────┐
│                           API                                    │
├─────────────────────────────────────────────────────────────────┤
│  app/api/assistant/route.ts                                      │
│  ├── Recibe: { userId, messages[] }                             │
│  ├── Llama a Claude con herramientas                            │
│  ├── Procesa toolResults y uiActions                            │
│  └── Retorna: { text, uiActions[] }                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LÓGICA DEL ASISTENTE                        │
├─────────────────────────────────────────────────────────────────┤
│  lib/assistant/                                                  │
│  ├── system-prompt.ts       → Prompt del sistema + config       │
│  ├── tools/index.ts         → 10 herramientas disponibles       │
│  └── filters-context.tsx    → Context para filtros de catálogo  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  Tablas utilizadas:                                              │
│  ├── propiedades            → CRUD de propiedades               │
│  ├── tickets                → CRUD de tickets de pago           │
│  ├── contactos              → CRUD de proveedores               │
│  ├── cuentas                → Consulta de balance               │
│  └── propiedades_colaboradores → Colaboradores                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuración del Modelo

```typescript
// lib/assistant/system-prompt.ts
export const ASSISTANT_CONFIG = {
  name: 'Ohana Assistant',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.3,  // Respuestas consistentes
}
```

**Parámetros de ejecución (route.ts):**
- `maxToolRoundtrips: 5` - Máximo de iteraciones de herramientas
- `toolChoice: 'auto'` - Claude decide cuándo usar herramientas

---

## Herramientas Disponibles (10 total)

### Navegación (2)

| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| `navegarASeccion` | Lleva al usuario a una sección del sistema | `seccion`: nueva-propiedad, catalogo, dashboard, tickets, calendario, cuentas, directorio, market, perfil |
| `navegarAPropiedad` | Navega a una sección específica de una propiedad | `nombrePropiedad`, `seccion`: home, calendario, tickets, inventario, galeria, anuncio, balance, archivero, config |

### Consultas (4)

| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| `buscarPropiedades` | Lista las propiedades del usuario | `busqueda` (opcional) |
| `buscarTickets` | Lista tickets de pago | `estado`: pendiente, completado, todos |
| `obtenerBalance` | Muestra balance de cuentas bancarias | ninguno |
| `filtrarCatalogo` | Filtra propiedades en pantalla | `tipo`, `estado`, `limpiar` |

### Creación (4)

| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| `crearPropiedad` | Crea una propiedad nueva | `nombre`, `tipo`, `estado` (opcional), `ciudad` (opcional) |
| `crearTicket` | Crea un ticket de pago | `nombrePropiedad`, `titulo`, `fecha`, `monto` (opcional), `tipo` (opcional), `prioridad` (opcional) |
| `crearContacto` | Agrega un proveedor al directorio | `nombre`, `telefono` (opcional), `email` (opcional), `categoria` (opcional) |
| `registrarPago` | Marca un ticket como pagado | `tituloTicket`, `nombrePropiedad` (opcional), `monto` (opcional) |

---

## Flujo de Ejecución

```
1. Usuario escribe mensaje en AssistantChat
                    │
                    ▼
2. POST /api/assistant con { userId, messages[] }
                    │
                    ▼
3. route.ts genera systemPrompt con fecha actual
                    │
                    ▼
4. generateText() llama a Claude con herramientas
                    │
                    ▼
5. Claude decide si usar herramienta o responder directo
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   USA HERRAMIENTA         RESPONDE DIRECTO
        │                       │
        ▼                       │
6. Herramienta ejecuta         │
   consulta/insert en          │
   Supabase                    │
        │                       │
        ▼                       │
7. Retorna { accion, mensaje } │
        │                       │
        └───────────┬───────────┘
                    ▼
8. route.ts extrae uiActions y toolMessages
                    │
                    ▼
9. Construye responseText priorizando:
   - toolMessages (mensajes de herramientas)
   - result.text (texto del modelo)
   - uiActions con mensaje
   - Fallback
                    │
                    ▼
10. Retorna { text, uiActions } al frontend
                    │
                    ▼
11. AssistantChat procesa uiActions:
    - NAVEGAR → router.push(ruta)
    - FILTRAR_CATALOGO → dispatchEvent
    - MENSAJE → solo muestra texto
```

---

## Tipos de Acciones de UI

```typescript
interface UIAction {
  accion: 'NAVEGAR' | 'FILTRAR_CATALOGO' | 'MENSAJE'
  ruta?: string           // Para NAVEGAR
  filtros?: object        // Para FILTRAR_CATALOGO
  mensaje?: string        // Texto para mostrar
}
```

### NAVEGAR
```typescript
// Ejemplo de respuesta
{
  accion: 'NAVEGAR',
  ruta: '/dashboard/catalogo/propiedad/abc123/home',
  mensaje: '¡Propiedad creada! Te llevo a la página.'
}
```
**Frontend:** `router.push(action.ruta)` + minimiza chat

### FILTRAR_CATALOGO
```typescript
{
  accion: 'FILTRAR_CATALOGO',
  filtros: { tipo: 'Casa', estado: 'Renta' },
  mensaje: 'Filtrando por tipo Casa y estado Renta'
}
```
**Frontend:** `dispatchEvent('assistant-filter-catalogo', filtros)`

### MENSAJE
```typescript
{
  accion: 'MENSAJE',
  mensaje: 'Tienes 5 propiedades: Casa Playa, Depto Centro...'
}
```
**Frontend:** Solo muestra el mensaje

---

## Ejemplos de Uso

### Crear Propiedad
```
Usuario: "Quiero crear una casa llamada Mi Casa en Guadalajara"

→ Claude ejecuta: crearPropiedad(
    nombre="Mi Casa",
    tipo="Casa",
    ciudad="Guadalajara"
  )

→ Herramienta retorna:
  {
    accion: 'NAVEGAR',
    ruta: '/dashboard/catalogo/propiedad/xyz/home',
    mensaje: '¡Propiedad "Mi Casa" creada! Te llevo a la página.'
  }

→ Usuario ve mensaje + es navegado a la propiedad
```

### Consultar Propiedades
```
Usuario: "¿Cuántas propiedades tengo?"

→ Claude ejecuta: buscarPropiedades()

→ Herramienta retorna:
  {
    accion: 'MENSAJE',
    mensaje: 'Tienes 3 propiedades:\n• Casa Playa (Casa)\n• Depto Centro (Departamento)\n• Oficina Norte (Oficina)'
  }

→ Usuario ve la lista
```

### Crear Ticket
```
Usuario: "Crear ticket de luz para mi depto el 15 de enero por $500"

→ Claude ejecuta: crearTicket(
    nombrePropiedad="depto",
    titulo="Pago de luz",
    fecha="2025-01-15",
    monto=500,
    tipo="servicio"
  )

→ Herramienta retorna:
  {
    accion: 'MENSAJE',
    mensaje: '✅ Ticket "Pago de luz" por $500 creado para "Depto Centro"'
  }
```

### Registrar Pago
```
Usuario: "Ya pagué la luz de casa playa"

→ Claude ejecuta: registrarPago(
    tituloTicket="luz",
    nombrePropiedad="casa playa"
  )

→ Herramienta retorna:
  {
    accion: 'MENSAJE',
    mensaje: '✅ ¡Pago registrado! El ticket "Pago de luz" de Casa Playa ha sido marcado como pagado.'
  }
```

---

## Problemas Conocidos

### 1. Respuestas vacías ("¿En qué más puedo ayudarte?")
**Causa:** El modelo no ejecuta la herramienta o no genera texto.
**Solución pendiente:** Forzar `toolChoice: 'required'` para ciertas consultas.

### 2. El modelo anuncia en vez de ejecutar
**Causa:** El modelo dice "Voy a crear..." pero no ejecuta.
**Solución:** Ajustar system prompt para ejecutar directamente.

### 3. Fechas relativas
**Causa:** "mañana" o "próximo lunes" no se convierten.
**Solución:** El prompt incluye FECHA DE HOY para que Claude calcule.

---

## Mejoras Pendientes

### Alta Prioridad
- [ ] Forzar ejecución de herramientas cuando corresponda
- [ ] Mejorar detección de intención del usuario
- [ ] Agregar confirmación antes de crear/modificar

### Media Prioridad
- [ ] Agregar herramienta `editarPropiedad`
- [ ] Agregar herramienta `eliminarTicket`
- [ ] Agregar herramienta `buscarContactos`
- [ ] Cache de datos frecuentes

### Baja Prioridad
- [ ] Historial de conversaciones persistente
- [ ] Modo voz (speech-to-text)
- [ ] Notificaciones proactivas

---

## Archivos Clave

```
rasv1.2/
├── app/api/assistant/
│   └── route.ts                    # API endpoint principal
├── components/assistant/
│   ├── AssistantChat.tsx           # UI del chat
│   ├── AssistantProvider.tsx       # Estado global
│   └── index.ts                    # Exports
├── lib/assistant/
│   ├── system-prompt.ts            # Prompt + config
│   ├── tools/index.ts              # 10 herramientas
│   └── filters-context.tsx         # Context de filtros
└── docs/
    └── ASISTENTE_IA.md             # Esta documentación
```

---

## Variables de Entorno Requeridas

```env
ANTHROPIC_API_KEY=sk-ant-...        # API key de Anthropic
NEXT_PUBLIC_SUPABASE_URL=...        # URL de Supabase
SUPABASE_SERVICE_ROLE_KEY=...       # Service role key
```

---

## Testing Manual

1. **Consulta básica:** "¿Cuántas propiedades tengo?"
2. **Crear propiedad:** "Crear casa llamada Test"
3. **Crear ticket:** "Crear ticket de agua para [propiedad] el 20 de este mes"
4. **Crear contacto:** "Agregar proveedor Juan, plomero"
5. **Registrar pago:** "Ya pagué el agua"
6. **Navegación:** "Llévame al calendario de [propiedad]"

---

*Última actualización: 2025-11-30*
