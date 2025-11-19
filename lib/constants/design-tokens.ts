/**
 * DESIGN TOKENS - Sistema de Diseño Centralizado RAS V_1.0
 * =========================================================
 * 
 * Este archivo centraliza TODOS los valores de diseño de la aplicación.
 * Cualquier cambio visual debe hacerse aquí, no en componentes individuales.
 * 
 * Uso:
 * import { colors, spacing, borderRadius } from '@/lib/constants/design-tokens'
 */

// ============================================================================
// COLORES
// ============================================================================

export const colors = {
  // Colores principales de la marca RAS
  primary: {
    azul: '#0B5D7A',        // ras-azul - Color principal
    turquesa: '#14A19C',    // ras-turquesa - Color secundario
    crema: '#F8F0E3',       // ras-crema - Color de fondo/accent
  },

  // Colores semánticos para notificaciones y estados
  semantic: {
    success: '#10b981',     // green-500 - Operaciones exitosas
    error: '#ef4444',       // red-500 - Errores y eliminaciones
    warning: '#f59e0b',     // amber-500 - Advertencias
    info: '#3b82f6',        // blue-500 - Información general
  },

  // Colores de estado para UI interactiva
  state: {
    hover: 'rgba(11, 93, 122, 0.1)',      // Hover sobre elementos
    active: 'rgba(11, 93, 122, 0.2)',     // Estado activo
    disabled: 'rgba(107, 114, 128, 0.5)', // Elementos deshabilitados
    focus: 'rgba(11, 93, 122, 0.3)',      // Focus ring
  },

  // Colores neutrales para texto y fondos
  neutral: {
    white: '#ffffff',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    black: '#000000',
  },

  // Colores funcionales por módulo
  modules: {
    home: '#10b981',        // Verde - Home/Inicio
    calendario: '#06b6d4',  // Cyan - Calendario
    tickets: '#f97316',     // Orange - Tickets
    inventario: '#f59e0b',  // Amber - Inventario
    galeria: '#ec4899',     // Pink - Galería
    cuentas: '#84cc16',     // Lime - Cuentas
    directorio: '#eab308',  // Yellow - Directorio
    market: '#c1666b',      // Rose - Market/Anuncios
  }
}

// ============================================================================
// TIPOGRAFÍA
// ============================================================================

export const typography = {
  // Familias de fuentes
  fontFamily: {
    primary: 'var(--font-poppins)',   // Títulos y elementos destacados
    secondary: 'var(--font-roboto)',  // Cuerpo de texto
    mono: 'ui-monospace, monospace',  // Código y datos técnicos
  },

  // Tamaños de fuente
  fontSize: {
    xs: '0.75rem',      // 12px - Texto muy pequeño, labels
    sm: '0.875rem',     // 14px - Texto pequeño, secundario
    base: '1rem',       // 16px - Texto base, párrafos
    lg: '1.125rem',     // 18px - Texto destacado
    xl: '1.25rem',      // 20px - Subtítulos pequeños
    '2xl': '1.5rem',    // 24px - Subtítulos
    '3xl': '1.875rem',  // 30px - Títulos de sección
    '4xl': '2.25rem',   // 36px - Títulos principales
    '5xl': '3rem',      // 48px - Títulos hero
  },

  // Pesos de fuente
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Alturas de línea
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  }
}

// ============================================================================
// ESPACIADO (SPACING)
// ============================================================================

export const spacing = {
  // Spacing interno (padding) - Usar dentro de componentes
  padding: {
    xs: '0.5rem',    // 8px  - Padding mínimo
    sm: '0.75rem',   // 12px - Padding pequeño
    md: '1rem',      // 16px - Padding estándar
    lg: '1.5rem',    // 24px - Padding generoso
    xl: '2rem',      // 32px - Padding amplio
    '2xl': '3rem',   // 48px - Padding muy amplio
  },

  // Spacing externo (margin/gap) - Usar entre componentes
  margin: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Gap entre elementos (flexbox/grid)
  gap: {
    xs: '0.5rem',    // 8px  - Elementos muy juntos
    sm: '0.75rem',   // 12px - Elementos cercanos
    md: '1rem',      // 16px - Separación estándar
    lg: '1.5rem',    // 24px - Separación generosa
    xl: '2rem',      // 32px - Separación amplia
  }
}

// ============================================================================
// BORDES REDONDEADOS (BORDER RADIUS)
// ============================================================================

export const borderRadius = {
  // Jerarquía de bordes redondeados por tipo de componente
  none: '0',
  sm: '0.5rem',     // 8px  - rounded-lg  - Tags, badges, thumbnails pequeños
  md: '0.75rem',    // 12px - rounded-xl  - Botones, inputs, cards secundarias
  lg: '1rem',       // 16px - rounded-2xl - Cards principales, modales
  xl: '1.5rem',     // 24px - rounded-3xl - Elementos especiales
  full: '9999px',   // rounded-full - Botones circulares, avatares
}

// Guía de uso por tipo de elemento:
export const borderRadiusGuide = {
  cards: {
    principal: borderRadius.lg,     // Cards grandes (catálogo, modales)
    secundaria: borderRadius.md,    // Cards internas (info de propiedad)
  },
  buttons: {
    rectangular: borderRadius.md,   // Botones estándar
    circular: borderRadius.full,    // Botones de acción flotantes
  },
  inputs: borderRadius.md,          // Todos los campos de formulario
  badges: borderRadius.sm,          // Tags, etiquetas, categorías
  images: {
    thumbnail: borderRadius.sm,     // Miniaturas pequeñas
    featured: borderRadius.md,      // Imágenes destacadas
  },
  modals: borderRadius.lg,          // Modales y overlays
}

// ============================================================================
// SOMBRAS (SHADOWS)
// ============================================================================

export const shadows = {
  // Sombras para elevación de elementos
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',                    // Sombra sutil
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',                  // Sombra estándar
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',                // Sombra notable
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',                // Sombra dramática
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',           // Sombra muy dramática
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',          // Sombra interna

  // Sombras específicas por contexto
  card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
  cardHover: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
  button: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  buttonHover: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
}

// ============================================================================
// TRANSICIONES Y ANIMACIONES
// ============================================================================

export const animations = {
  // Duraciones de transición
  duration: {
    instant: '50ms',
    fast: '150ms',      // Transiciones rápidas (hover, focus)
    normal: '200ms',    // Transiciones estándar
    slow: '300ms',      // Transiciones suaves
    slower: '500ms',    // Transiciones dramáticas
  },

  // Timing functions (curvas de animación)
  timing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Transiciones comunes predefinidas
  transition: {
    all: `all 200ms cubic-bezier(0.4, 0, 0.2, 1)`,
    colors: `background-color 200ms, border-color 200ms, color 200ms`,
    transform: `transform 200ms cubic-bezier(0.4, 0, 0.2, 1)`,
    opacity: `opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)`,
  },

  // Keyframes para animaciones comunes
  keyframes: {
    fadeIn: 'fadeIn 200ms ease-in',
    fadeOut: 'fadeOut 200ms ease-out',
    slideUp: 'slideUp 300ms ease-out',
    slideDown: 'slideDown 300ms ease-out',
    scaleIn: 'scaleIn 200ms ease-out',
    scaleOut: 'scaleOut 200ms ease-in',
  }
}

// ============================================================================
// LAYOUT Y CONTENEDORES
// ============================================================================

export const layout = {
  // Anchos máximos para contenedores
  maxWidth: {
    xs: '20rem',      // 320px
    sm: '24rem',      // 384px
    md: '28rem',      // 448px
    lg: '32rem',      // 512px
    xl: '36rem',      // 576px
    '2xl': '42rem',   // 672px - Contenido narrow
    '3xl': '48rem',   // 768px
    '4xl': '56rem',   // 896px
    '5xl': '64rem',   // 1024px - Contenido estándar
    '6xl': '72rem',   // 1152px
    '7xl': '80rem',   // 1280px - Contenedor principal RAS
    full: '100%',
  },

  // Breakpoints para responsive design
  breakpoints: {
    sm: '640px',    // Mobile landscape
    md: '768px',    // Tablet
    lg: '1024px',   // Desktop
    xl: '1280px',   // Large desktop
    '2xl': '1536px', // Extra large
  },

  // Z-index para capas
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    toast: 80,
  }
}

// ============================================================================
// CONFIGURACIÓN DE COMPONENTES ESPECÍFICOS
// ============================================================================

export const components = {
  // TopBar
  topbar: {
    height: '4rem',                      // 64px
    background: colors.primary.azul,
    color: colors.primary.crema,
  },

  // Botones
  button: {
    height: {
      sm: '2rem',    // 32px
      md: '2.5rem',  // 40px
      lg: '3rem',    // 48px
    },
    padding: {
      sm: spacing.padding.sm,
      md: spacing.padding.md,
      lg: spacing.padding.lg,
    },
  },

  // Cards
  card: {
    padding: spacing.padding.lg,
    borderRadius: borderRadius.lg,
    shadow: shadows.card,
    shadowHover: shadows.cardHover,
  },

  // Modales
  modal: {
    padding: spacing.padding.xl,
    borderRadius: borderRadius.lg,
    shadow: shadows.modal,
    backdropColor: 'rgba(0, 0, 0, 0.5)',
  },

  // Inputs
  input: {
    height: '2.75rem',                   // 44px
    padding: spacing.padding.md,
    borderRadius: borderRadius.md,
    borderColor: colors.neutral.gray[300],
    focusBorderColor: colors.primary.azul,
  },

  // Toast notifications
  toast: {
    padding: spacing.padding.md,
    borderRadius: borderRadius.md,
    shadow: shadows.xl,
    minWidth: '20rem',                   // 320px
    maxWidth: '28rem',                   // 448px
  }
}

// ============================================================================
// UTILIDADES DE GRADIENTES
// ============================================================================

export const gradients = {
  // Gradientes principales de la marca
  primary: `linear-gradient(135deg, ${colors.primary.azul} 0%, ${colors.primary.turquesa} 100%)`,
  primaryReverse: `linear-gradient(135deg, ${colors.primary.turquesa} 0%, ${colors.primary.azul} 100%)`,
  
  // Gradientes para fondos
  backgroundLight: `linear-gradient(135deg, ${colors.primary.crema} 0%, #ffffff 50%, ${colors.primary.crema} 100%)`,
  backgroundDark: `linear-gradient(135deg, ${colors.neutral.gray[900]} 0%, ${colors.neutral.gray[800]} 100%)`,
  
  // Gradientes para overlays
  overlayDark: `linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 100%)`,
  overlayLight: `linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.9) 100%)`,
}

// ============================================================================
// EXPORTACIONES AGRUPADAS
// ============================================================================

// Exportar todo junto para imports convenientes
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  borderRadiusGuide,
  shadows,
  animations,
  layout,
  components,
  gradients,
}

// Export default para import único
export default designTokens

// ============================================================================
// NOTAS DE USO
// ============================================================================

/**
 * EJEMPLOS DE USO:
 * 
 * 1. Import individual:
 *    import { colors, spacing } from '@/lib/constants/design-tokens'
 * 
 * 2. Import completo:
 *    import designTokens from '@/lib/constants/design-tokens'
 * 
 * 3. Uso en componentes:
 *    <div style={{
 *      backgroundColor: colors.primary.azul,
 *      padding: spacing.padding.lg,
 *      borderRadius: borderRadius.md,
 *    }}>
 * 
 * 4. Uso con Tailwind (definir en tailwind.config.ts):
 *    className="bg-ras-azul p-6 rounded-xl"
 * 
 * 5. Uso en styled-components o emotion:
 *    const Button = styled.button`
 *      background: ${colors.primary.azul};
 *      padding: ${spacing.padding.md};
 *    `
 */
