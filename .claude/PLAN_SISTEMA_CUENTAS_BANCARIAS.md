# 💰 PLAN: Sistema de Cuentas Bancarias para Balance

**Fecha:** 20 Nov 2025
**Branch:** `claude/fix-balance-component-01TNzKwsKzUP1tGaK1ERaWnT`
**Sesión:** Nueva implementación basada en ras_V1.0
**Estado:** 🟡 En progreso (0%)

---

## 📋 CONTEXTO

Este plan recrea el sistema de cuentas bancarias implementado exitosamente en `ras_V1.0` y lo adapta al repositorio actual `rasv1.2`.

### Objetivo

Implementar un sistema de cuentas bancarias/cash que permita a los usuarios gestionar múltiples cuentas asociadas a sus propiedades, con soporte para diferentes monedas y tipos de cuenta.

### Problema Actual

El sistema actual de "Cuentas" (`/dashboard/cuentas/page.tsx`) solo muestra movimientos (ingresos/egresos) agregados, sin permitir al usuario manejar diferentes cuentas (efectivo MXN, tarjeta USD, cuenta bancaria, etc.) por propiedad.

### Solución Propuesta

Crear una tabla `cuentas` que permita:
- Múltiples cuentas por usuario/propietario
- Asociación a una o varias propiedades
- Soporte para diferentes monedas (MXN, USD, EUR)
- Tipos de cuenta: Bancaria o Cash (Efectivo)
- Saldo inicial y actual
- Fechas de corte para estados de cuenta

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Nueva Tabla: `cuentas`

```sql
CREATE TABLE cuentas (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información básica
  nombre_cuenta VARCHAR(255) NOT NULL,
  descripcion TEXT,

  -- Configuración financiera
  saldo_inicial DECIMAL(12, 2) DEFAULT 0.00,
  saldo_actual DECIMAL(12, 2) DEFAULT 0.00,
  moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
  tipo_cuenta VARCHAR(20) NOT NULL,

  -- Información bancaria (opcional)
  banco VARCHAR(255),
  numero_cuenta VARCHAR(100),
  clabe VARCHAR(18),

  -- Asociaciones
  propietarios_ids UUID[],
  propiedades_ids UUID[],

  -- Configuración de reportes
  fecha_corte_dia INTEGER DEFAULT 1,
  genera_estados_cuenta BOOLEAN DEFAULT false,

  -- Estado
  activa BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_moneda CHECK (moneda IN ('MXN', 'USD', 'EUR')),
  CONSTRAINT check_tipo_cuenta CHECK (tipo_cuenta IN ('bancaria', 'efectivo')),
  CONSTRAINT check_fecha_corte CHECK (fecha_corte_dia >= 1 AND fecha_corte_dia <= 31)
);
```

**Índices necesarios:**
- `idx_cuentas_user_id` - Búsqueda por usuario
- `idx_cuentas_activa` - Filtro de cuentas activas
- `idx_cuentas_propiedades` (GIN) - Búsqueda en array de propiedades
- `idx_cuentas_user_activa` - Compuesto para queries frecuentes

---

## 🎨 COMPONENTES A CREAR

### 1. Tipos TypeScript (`/types/cuenta.ts`)

```typescript
export type TipoCuenta = 'bancaria' | 'efectivo'
export type Moneda = 'MXN' | 'USD' | 'EUR'

export interface Cuenta {
  id: string
  user_id: string
  nombre_cuenta: string
  descripcion?: string
  saldo_inicial: number
  saldo_actual: number
  moneda: Moneda
  tipo_cuenta: TipoCuenta
  banco?: string
  numero_cuenta?: string
  clabe?: string
  propietarios_ids: string[]
  propiedades_ids: string[]
  fecha_corte_dia: number
  genera_estados_cuenta: boolean
  activa: boolean
  created_at: string
  updated_at: string
}

export interface CuentaFormData {
  nombre_cuenta: string
  descripcion?: string
  saldo_inicial: number
  moneda: Moneda
  tipo_cuenta: TipoCuenta
  banco?: string
  numero_cuenta?: string
  clabe?: string
  propietarios_ids: string[]
  propiedades_ids: string[]
  fecha_corte_dia: number
  genera_estados_cuenta: boolean
}
```

### 2. Validaciones Zod (`/lib/validations/cuenta.schema.ts`)

```typescript
import { z } from 'zod'

export const cuentaSchema = z.object({
  nombre_cuenta: z.string().min(3).max(255),
  descripcion: z.string().max(1000).optional(),
  saldo_inicial: z.number().min(0).max(10_000_000),
  moneda: z.enum(['MXN', 'USD', 'EUR']),
  tipo_cuenta: z.enum(['bancaria', 'efectivo']),
  banco: z.string().min(2).max(255).optional(),
  numero_cuenta: z.string().min(4).max(100).optional(),
  clabe: z.string().length(18).regex(/^\d+$/).optional(),
  propietarios_ids: z.array(z.string().uuid()).min(1),
  propiedades_ids: z.array(z.string().uuid()).min(1),
  fecha_corte_dia: z.number().int().min(1).max(31),
  genera_estados_cuenta: z.boolean()
}).refine(data => {
  if (data.tipo_cuenta === 'bancaria') {
    return data.banco && data.banco.length > 0
  }
  return true
}, {
  message: 'Las cuentas bancarias deben tener un banco asociado',
  path: ['banco']
})
```

### 3. Modal AñadirCuentaModal (`/components/AñadirCuentaModal.tsx`)

**Funcionalidad:**
- Formulario con 4 secciones:
  1. Información Básica
  2. Información Bancaria (condicional)
  3. Asociaciones (propiedades)
  4. Configuración
- Validación en tiempo real
- Modo crear/editar
- Multi-select de propiedades
- Toggle tipo cuenta (bancaria/efectivo)
- Selector de moneda
- Input numérico para saldo

**Props:**
```typescript
interface AñadirCuentaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (cuenta: Cuenta) => void
  cuentaId?: string // Para edición
  propiedadIdPrecargada?: string
  userId: string
}
```

---

## 🔄 FLUJO DE USUARIO

### Escenario 1: Crear cuenta desde Catálogo

```
1. Usuario va a Catálogo
2. Click en botón "+" (TopBar dropdown)
3. Aparece menú con:
   - "Agregar propiedad"
   - "Añadir cuenta" ← NUEVO
4. Click en "Añadir cuenta"
5. Se abre AñadirCuentaModal
6. Usuario llena formulario:
   - Nombre: "Cuenta Efectivo Casa Playa"
   - Tipo: Efectivo
   - Moneda: MXN
   - Saldo inicial: $50,000
   - Propiedades: [Selecciona propiedades]
   - Fecha de corte: 1
7. Click "Guardar"
8. Sistema crea cuenta en Supabase
9. Toast de éxito
10. Modal se cierra
```

### Escenario 2: Ver cuentas en Balance

```
1. Usuario va a Dashboard
2. Click en card "Balance" (renombrado de "Cuentas")
3. Sistema muestra página /dashboard/balance (o /dashboard/cuentas renombrada)
4. Se muestran tarjetas de cuentas:
   - Nombre
   - Tipo + Moneda
   - Saldo actual
   - Propiedades asociadas
5. Usuario puede:
   - Ver detalles
   - Editar cuenta
   - Desactivar cuenta
   - Filtrar por propiedad/tipo/moneda
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base de Datos
- [ ] Crear script SQL: `.claude/sql/create_cuentas_table.sql`
- [ ] Crear índices necesarios
- [ ] Crear trigger para `updated_at`
- [ ] Crear trigger para inicializar `saldo_actual`
- [ ] Configurar RLS (desactivado por ahora - activar en Fase 7 del proyecto)
- [ ] Documentar instrucciones de ejecución

### Fase 2: Tipos TypeScript
- [ ] Crear `/types/cuenta.ts`
- [ ] Definir interfaces: `Cuenta`, `CuentaFormData`, `Moneda`, `TipoCuenta`
- [ ] Crear constantes: `SIMBOLOS_MONEDA`, `TIPOS_CUENTA_OPCIONES`, etc.
- [ ] Agregar helpers: `formatearMonto()`, `validarCLABE()`, etc.
- [ ] Exportar en `/types/index.ts` (si existe)

### Fase 3: Validaciones
- [ ] Crear `/lib/validations/cuenta.schema.ts`
- [ ] Implementar `cuentaSchema` con Zod
- [ ] Validaciones condicionales (banco requerido si tipo=bancaria)
- [ ] Mensajes de error personalizados
- [ ] Helpers de validación

### Fase 4: Modal de Añadir Cuenta
- [ ] Crear `/components/AñadirCuentaModal.tsx`
- [ ] Sección 1: Información Básica
- [ ] Sección 2: Información Bancaria (condicional)
- [ ] Sección 3: Asociaciones (multi-select propiedades)
- [ ] Sección 4: Configuración (fecha corte, estados cuenta)
- [ ] Validación en tiempo real
- [ ] Estados de loading/error
- [ ] Toast de éxito/error
- [ ] Modo edición (si `cuentaId` está presente)

### Fase 5: Integración en Catálogo
- [ ] Modificar `/app/dashboard/catalogo/page.tsx`
- [ ] Agregar estado `showAñadirCuenta`
- [ ] Agregar opción "Añadir cuenta" en dropdown del TopBar
- [ ] Renderizar `<AñadirCuentaModal />`
- [ ] Manejar callback `onSuccess`
- [ ] Recargar cuentas después de crear (opcional)

### Fase 6: Modificar Página Balance
- [ ] Decidir: ¿Renombrar `/dashboard/cuentas` a `/dashboard/balance`?
- [ ] O crear nueva ruta `/dashboard/balance` separada
- [ ] Modificar la página para mostrar:
  - Tarjetas de cuentas (en lugar de solo movimientos)
  - Saldo por cuenta
  - Filtros por propiedad/tipo/moneda
  - Botones: Ver, Editar, Desactivar
- [ ] Cargar cuentas desde tabla `cuentas`
- [ ] Mostrar movimientos por cuenta (futuro)

### Fase 7: Actualizar Dashboard
- [ ] Modificar `/app/dashboard/page.tsx`
- [ ] Renombrar card "Cuentas" → "Balance"
- [ ] Cargar métricas de cuentas
- [ ] Mostrar balance total por moneda
- [ ] Mostrar cantidad de cuentas activas
- [ ] Link correcto a página de balance

### Fase 8: Testing
- [ ] Probar creación de cuenta
- [ ] Probar edición de cuenta
- [ ] Probar desactivación de cuenta
- [ ] Probar filtros
- [ ] Probar con diferentes monedas
- [ ] Probar con múltiples propiedades
- [ ] Verificar responsividad
- [ ] Verificar validaciones

### Fase 9: Documentación
- [ ] Actualizar `PROJECT_PLAN.md`
- [ ] Crear reporte de sesión completada
- [ ] Documentar cambios en `.claude/`
- [ ] Comentar código complejo

### Fase 10: Commit y Push
- [ ] Commit con mensaje descriptivo
- [ ] Push al branch `claude/fix-balance-component-01TNzKwsKzUP1tGaK1ERaWnT`

---

## 🎯 PRIORIDADES

### P0 - Crítico (Debe funcionar YA)
1. Script SQL + instrucciones
2. Tipos TypeScript
3. Modal AñadirCuentaModal
4. Integración en catálogo

### P1 - Alto
5. Modificar página Balance
6. Renombrar en Dashboard
7. Testing básico

### P2 - Medio
8. Validaciones avanzadas
9. Editar/desactivar cuentas
10. Filtros

### P3 - Bajo (Futuro)
11. Movimientos por cuenta
12. Estados de cuenta automáticos
13. Exportación a PDF/Excel

---

## 🚨 CONSIDERACIONES IMPORTANTES

### 1. Propietarios vs Usuarios
- Actualmente el sistema tiene `owner_id` en propiedades
- **Decisión:** Por ahora, `propietarios_ids` apuntará a `auth.users`
- **Futuro:** Crear tabla `propietarios` separada

### 2. RLS (Row Level Security)
- Por ahora DESACTIVADO para facilitar desarrollo
- **DEBE** ser activado en Fase 7 del proyecto (antes de producción)

### 3. Nombre de Columnas
- Verificar si la tabla `propiedades` tiene `nombre` o `nombre_propiedad`
- **Acción:** Revisar en Supabase y adaptar queries

### 4. Compatibilidad con Sistema Actual
- La página actual de "Cuentas" muestra movimientos
- **Opciones:**
  - A) Renombrar `/dashboard/cuentas` → `/dashboard/balance` y modificar
  - B) Crear nueva ruta `/dashboard/balance` y dejar `/dashboard/cuentas` como está
- **Recomendación:** Opción A (renombrar y extender funcionalidad)

---

## 📊 ESTIMACIÓN DE TIEMPO

| Fase | Tiempo Estimado |
|------|----------------|
| Base de Datos | 30 min |
| Tipos TypeScript | 20 min |
| Validaciones | 15 min |
| Modal Añadir Cuenta | 2 horas |
| Integración Catálogo | 30 min |
| Modificar Balance | 1.5 horas |
| Actualizar Dashboard | 45 min |
| Testing | 1 hora |
| Documentación | 30 min |

**Total:** ~7.5 horas de trabajo

---

## 🔗 ARCHIVOS A CREAR/MODIFICAR

### Nuevos archivos:
- `.claude/sql/create_cuentas_table.sql`
- `.claude/INSTRUCCIONES_SQL_CUENTAS.md`
- `/types/cuenta.ts`
- `/lib/validations/cuenta.schema.ts`
- `/components/AñadirCuentaModal.tsx`

### Archivos a modificar:
- `/app/dashboard/catalogo/page.tsx` - Agregar opción "Añadir cuenta"
- `/app/dashboard/cuentas/page.tsx` - Renombrar y modificar para mostrar cuentas
- `/app/dashboard/page.tsx` - Renombrar "Cuentas" → "Balance"

---

## 💡 DIFERENCIAS CON EL OTRO REPOSITORIO

### Adaptaciones necesarias:

1. **Hooks de autenticación:**
   - Este repo ya tiene `useAuth` y `useLogout` creados
   - ✅ Usar estos hooks en lugar de `checkUser()` manual

2. **Estructura de carpetas:**
   - Verificar si existe `/lib/validations/` (crear si no existe)
   - Verificar si existe carpeta `.claude/sql/` (crear si no existe)

3. **Nombres de columnas:**
   - Verificar tabla `propiedades`: ¿`nombre` o `nombre_propiedad`?
   - Adaptar queries según lo que exista

4. **Estilos:**
   - Usar clases de Tailwind existentes en el proyecto
   - Mantener consistencia con diseño RAS

---

## ✅ CRITERIOS DE ACEPTACIÓN

La funcionalidad estará completa cuando:

1. ✅ Usuario puede crear cuenta bancaria/efectivo desde catálogo
2. ✅ Cuentas se pueden asociar a múltiples propiedades
3. ✅ Soporte para múltiples monedas (MXN, USD, EUR)
4. ✅ Página Balance muestra cuentas con saldos
5. ✅ Dashboard muestra balance total por moneda
6. ✅ Usuario puede editar y desactivar cuentas
7. ✅ Validaciones funcionan correctamente
8. ✅ UI consistente con resto del sistema
9. ✅ Sin errores en consola
10. ✅ Código documentado

---

## 🚀 PRÓXIMO PASO INMEDIATO

**AHORA:** Crear script SQL para la tabla `cuentas`

**Ubicación:** `.claude/sql/create_cuentas_table.sql`

**Incluir:**
- Definición de tabla
- Índices
- Triggers
- Comentarios
- RLS policies (comentadas)

---

**Última actualización:** 20 Nov 2025
**Estado:** Plan aprobado, listo para implementar
