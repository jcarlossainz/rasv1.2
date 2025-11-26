# Sistema de Roles y Control de Acceso - OHANA

**Fecha:** 26 de Noviembre 2025
**Estado:** RLS IMPLEMENTADO EN PRODUCCION

---

## Sistema de Roles

### Definicion de Roles

| Rol | Descripcion | Como se identifica |
|-----|-------------|-------------------|
| **Administrador** | Propietario/creador de la propiedad | `propiedad.owner_id === user.id` |
| **Propietario** | Colaborador con rol 'propietario' | `propiedades_colaboradores.rol = 'propietario'` |
| **Supervisor** | Colaborador con rol 'supervisor' | `propiedades_colaboradores.rol = 'supervisor'` |
| **Promotor** | Colaborador con rol 'promotor' | `propiedades_colaboradores.rol = 'promotor'` |

### Matriz de Acceso por Seccion

| Seccion | Admin | Propietario | Supervisor | Promotor |
|---------|-------|-------------|------------|----------|
| Home | CRUD | CRUD | CRUD | - |
| Calendario | CRUD | CRUD | CRUD | - |
| Tickets | CRUD | CRUD | CRUD | - |
| Inventario | CRUD | CRUD | CRUD | - |
| Galeria | CRUD | CRUD | R | R |
| Anuncio | CRUD | CRUD | R | R |
| Balance | CRUD | CRUD | - | - |
| Archivero | CRUD | CRUD | - | - |
| Config | CRUD | - | - | - |

**Leyenda:** CRUD = Create/Read/Update/Delete, R = Solo lectura, - = Sin acceso

---

## Arquitectura RLS

### Funciones Helper (PostgreSQL)

```sql
-- Obtener rol de usuario en una propiedad
get_user_role_for_property(property_uuid UUID, user_uuid UUID) -> TEXT
  - Retorna 'administrador' si es owner
  - Retorna rol de propiedades_colaboradores si es colaborador
  - Retorna NULL si no tiene acceso

-- Verificar acceso a propiedad
user_has_property_access(property_uuid UUID) -> BOOLEAN
  - Retorna TRUE si tiene cualquier rol

-- Verificar roles especificos
user_has_role(property_uuid UUID, allowed_roles TEXT[]) -> BOOLEAN
  - Retorna TRUE si el rol del usuario esta en allowed_roles
```

### Tablas y sus Politicas RLS

| Tabla | FK Columna | SELECT | INSERT | UPDATE | DELETE |
|-------|-----------|--------|--------|--------|--------|
| `propiedades` | owner_id | todos roles | auth user | admin/prop | admin |
| `propiedades_colaboradores` | propiedad_id | owner/self | owner | owner | owner |
| `profiles` | id | self/empresa | - | self | - |
| `tickets` | propiedad_id | admin/prop/sup | admin/prop/sup | admin/prop/sup | admin/prop |
| `calendar_events` | propiedad_id | admin/prop/sup | admin/prop/sup | admin/prop/sup | admin/prop |
| `property_images` | property_id | todos | admin/prop | admin/prop | admin/prop |
| `property_archivos` | property_id | admin/prop | admin/prop | admin/prop | admin/prop |
| `property_inventory` | property_id | admin/prop/sup | admin/prop/sup | admin/prop/sup | admin/prop |
| `cuentas` | user_id | self | self | self | self |
| `ingresos` | propiedad_id | admin/prop | admin/prop | admin/prop | admin/prop |
| `user_dashboard_config` | user_id | self | self | self | self |
| `servicios_inmueble` | propiedad_id | admin/prop/sup | admin/prop | admin/prop | admin/prop |
| `documentos` | propiedad_id/ticket_id | admin/prop(/sup) | admin/prop(/sup) | admin/prop | admin/prop |
| `contactos` | user_id | self | self | self | self |

**Leyenda:**
- admin = administrador
- prop = propietario
- sup = supervisor
- self = solo el usuario dueno

---

## Notas de Columnas Importantes

### Inconsistencias de Nomenclatura (ya manejadas en RLS)

| Tabla | Columna FK |
|-------|-----------|
| tickets | `propiedad_id` |
| calendar_events | `propiedad_id` |
| property_images | `property_id` |
| property_archivos | `property_id` |
| property_inventory | `property_id` |
| ingresos | `propiedad_id` |
| servicios_inmueble | `propiedad_id` |

### Tablas con logica especial

- **cuentas**: Usa `user_id` directo (no por propiedad). Tiene `propiedades_ids` como array.
- **contactos**: Usa `user_id` directo (agenda personal del usuario).
- **documentos**: Puede estar ligado a `propiedad_id` O a `ticket_id`.

---

## Implementacion Frontend

### Carga de Propiedades con Rol

```typescript
// Query colaboraciones con rol
const { data: colaboraciones } = await supabase
  .from('propiedades_colaboradores')
  .select('propiedad_id, rol')
  .eq('user_id', userId)

// Mapa de roles
const rolesMap = new Map(colaboraciones.map(c => [c.propiedad_id, c.rol]))

// Incluir rol en propiedades
propiedadesCompartidas = props.map((prop) => ({
  ...prop,
  es_propio: false,
  rol: rolesMap.get(prop.id) || null
}))
```

### Renderizado Condicional

```tsx
{/* Balance/Archivero - Admin y Propietario */}
{(prop.es_propio || prop.rol === 'propietario') && (
  <button>Balance</button>
)}

{/* Config - Solo Admin */}
{prop.es_propio && (
  <button>Config</button>
)}
```

---

## Archivos Relacionados

- `.claude/RLS_SYSTEM_V2.sql` - Script SQL completo de RLS
- `.claude/DATABASE_SCHEMA.md` - Esquema completo de la base de datos

---

## Estado de Implementacion

### Frontend
- [x] Botones condicionales en catalogo
- [x] Pagina Config solo para admin
- [x] Carga de rol desde propiedades_colaboradores

### Backend/RLS
- [x] Funciones helper creadas
- [x] RLS habilitado en todas las tablas
- [x] Politicas por rol implementadas
- [x] Probado en produccion

---

**Ultima actualizacion:** 26 de Noviembre 2025
