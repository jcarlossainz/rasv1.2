# 🔐 Sistema de Roles y Control de Acceso - OHANA

**Fecha:** 26 de Noviembre 2025
**Branch:** `claude/continue-previous-session-01XwfwTDtHYvTUvfUafitNgY`
**Último commit:** `bf639a0`

---

## 📋 Resumen de Cambios en esta Sesión

### Commits Realizados

1. `802f12b` - REFACTOR: Mover Config a navegación de catálogo (solo admin)
2. `3a3d874` - REFACTOR: Mover acciones de propiedad a página Config
3. `34664b4` - STYLE: Simplificar tarjetas de propiedad en catálogo
4. `af91b1f` - STYLE: Agregar etiqueta Config en barra de navegación
5. `bf639a0` - FEAT: Implementar control de acceso por roles en catálogo

---

## 🎭 Sistema de Roles

### Definición de Roles

| Rol | Descripción | Cómo se identifica |
|-----|-------------|-------------------|
| **Administrador** | Propietario/creador de la propiedad | `propiedad.owner_id === user.id` |
| **Propietario** | Colaborador con rol 'propietario' | `propiedades_colaboradores.rol = 'propietario'` |
| **Supervisor** | Colaborador con rol 'supervisor' | `propiedades_colaboradores.rol = 'supervisor'` |

### Matriz de Acceso

| Sección | Admin | Propietario | Supervisor |
|---------|-------|-------------|------------|
| Home | ✅ | ✅ | ✅ |
| Calendario | ✅ | ✅ | ✅ |
| Tickets | ✅ | ✅ | ✅ |
| Inventario | ✅ | ✅ | ✅ |
| Galería | ✅ | ✅ | ✅ |
| Anuncio | ✅ | ✅ | ✅ |
| Balance | ✅ | ✅ | ❌ |
| Archivero | ✅ | ✅ | ❌ |
| Config | ✅ | ❌ | ❌ |

---

## 🏗️ Arquitectura Actual

### Página de Catálogo (`app/dashboard/catalogo/page.tsx`)

```typescript
interface Propiedad {
  id: string
  owner_id: string
  nombre: string
  codigo_postal: string | null
  created_at: string
  es_propio: boolean  // true = admin (owner)
  foto_portada?: string | null
  colaboradores?: { user_id: string; nombre: string; email: string }[]
  rol?: 'propietario' | 'supervisor' | null  // rol del colaborador
}
```

### Carga de Propiedades con Rol

```typescript
// QUERY 2: IDs de propiedades compartidas CON ROL
const { data: colaboraciones } = await supabase
  .from('propiedades_colaboradores')
  .select('propiedad_id, rol')
  .eq('user_id', userId)

// Crear mapa de roles por propiedad_id
const rolesMap = new Map(colaboraciones.map(c => [c.propiedad_id, c.rol]))

// Al transformar propiedades compartidas, incluir rol
propiedadesCompartidas = propsCompartidas.map((prop) => ({
  ...prop,
  es_propio: false,
  rol: rolesMap.get(prop.id) || null
}))
```

### Renderizado Condicional de Botones

```tsx
{/* Balance - Admin y Propietario (no supervisor) */}
{(prop.es_propio || prop.rol === 'propietario') && (
  <button onClick={() => abrirBalance(prop.id)}>Balance</button>
)}

{/* Archivero - Admin y Propietario (no supervisor) */}
{(prop.es_propio || prop.rol === 'propietario') && (
  <button onClick={() => abrirArchivo(prop.id)}>Archivero</button>
)}

{/* Config - Solo para administrador (owner) */}
{prop.es_propio && (
  <button onClick={() => abrirConfig(prop.id)}>Config</button>
)}
```

---

## 📁 Página de Configuración (`/config`)

### Ubicación
`app/dashboard/catalogo/propiedad/[id]/config/page.tsx`

### Funcionalidades
- **Acciones**: Compartir, Editar, Duplicar, Calendarios, Eliminar
- **Información del Sistema**: ID, fechas de creación/actualización
- **Colaboradores**: Lista de usuarios con acceso y su rol

### Control de Acceso
```typescript
// Verificar si es el administrador (owner_id)
if (propData.owner_id !== authUser.id) {
  toast.error('No tienes permisos para acceder a esta sección')
  router.push(`/dashboard/catalogo/propiedad/${propiedadId}/home`)
  return
}
```

---

## 🗃️ Estructura de Base de Datos Relevante

### Tabla: `propiedades`
```sql
CREATE TABLE propiedades (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),  -- Administrador
  nombre_propiedad TEXT,
  -- ... otros campos
);
```

### Tabla: `propiedades_colaboradores`
```sql
CREATE TABLE propiedades_colaboradores (
  id UUID PRIMARY KEY,
  propiedad_id UUID REFERENCES propiedades(id),
  user_id UUID REFERENCES auth.users(id),
  email_invitado TEXT,  -- Para invitaciones pendientes
  rol TEXT,  -- 'propietario', 'supervisor', etc.
  created_at TIMESTAMPTZ
);
```

---

## 🔜 PRÓXIMA SESIÓN: RLS (Row Level Security)

### Objetivo
Implementar RLS en Supabase para proteger datos a nivel de base de datos.

### Tablas Prioritarias para RLS

1. **`propiedades`**
   - Admin: CRUD completo
   - Colaboradores: Solo SELECT de propiedades compartidas

2. **`propiedades_colaboradores`**
   - Solo admin puede INSERT/UPDATE/DELETE
   - Colaboradores pueden ver sus propios registros

3. **`tickets`** / **`fechas_pago_servicios`**
   - Según rol: admin y propietario CRUD, supervisor solo SELECT

4. **`cuentas_bancarias`** / **`ingresos`**
   - Solo admin y propietario (supervisor sin acceso)

5. **`property_images`**
   - Admin: CRUD
   - Colaboradores: SELECT

### Políticas RLS Sugeridas

```sql
-- Ejemplo para propiedades
CREATE POLICY "Usuarios ven sus propiedades propias"
ON propiedades FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Usuarios ven propiedades compartidas"
ON propiedades FOR SELECT
USING (
  id IN (
    SELECT propiedad_id
    FROM propiedades_colaboradores
    WHERE user_id = auth.uid()
  )
);

-- Ejemplo para acceso según rol
CREATE POLICY "Solo admin y propietario ven balance"
ON cuentas_bancarias FOR SELECT
USING (
  propiedad_id IN (
    SELECT id FROM propiedades WHERE owner_id = auth.uid()
    UNION
    SELECT propiedad_id FROM propiedades_colaboradores
    WHERE user_id = auth.uid() AND rol = 'propietario'
  )
);
```

### Documentación Existente de RLS
- `.claude/GUIA_RAPIDA_RLS.md`
- `.claude/README_RLS_AUDIT.md`
- `.claude/archives/` - Scripts SQL anteriores

---

## 📊 Estado del Control de Acceso

### Frontend (Implementado) ✅
- [x] Botones condicionales en catálogo
- [x] Página Config solo para admin
- [x] Carga de rol desde propiedades_colaboradores
- [x] Navegación con etiquetas

### Backend/RLS (Pendiente) ❌
- [ ] RLS en tabla `propiedades`
- [ ] RLS en tabla `propiedades_colaboradores`
- [ ] RLS en tablas de tickets
- [ ] RLS en tablas de balance/cuentas
- [ ] RLS en storage (imágenes)
- [ ] Tests de políticas RLS

---

## ⚠️ IMPORTANTE

El control de acceso actual es **solo a nivel de frontend**. Un usuario malicioso con conocimientos técnicos podría:
1. Llamar directamente a la API de Supabase
2. Acceder a datos de propiedades que no le pertenecen
3. Modificar datos sin autorización

**Por eso la implementación de RLS es CRÍTICA para la seguridad del sistema.**

---

## 📝 Notas para la Próxima Sesión

1. **Revisar** documentación existente de RLS en `.claude/`
2. **Analizar** qué políticas ya existen (si hay)
3. **Implementar** RLS por rol siguiendo la matriz de acceso
4. **Probar** con usuarios de diferentes roles
5. **Documentar** políticas implementadas

---

**Última actualización:** 26 de Noviembre 2025
**Sesión:** claude/continue-previous-session-01XwfwTDtHYvTUvfUafitNgY
