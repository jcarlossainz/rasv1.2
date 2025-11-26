import type { Config } from "tailwindcss";
import { colors } from './lib/constants/design-tokens'

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ============================================================================
        // COLORES PRINCIPALES DE LA MARCA OHANA
        // ============================================================================
        'ras-azul': colors.primary.azul,
        'ras-turquesa': colors.primary.turquesa,
        'ras-crema': colors.primary.crema,

        // ============================================================================
        // COLORES SEMÁNTICOS (para notificaciones y estados)
        // ============================================================================
        'semantic': {
          success: colors.semantic.success,
          error: colors.semantic.error,
          warning: colors.semantic.warning,
          info: colors.semantic.info,
        },

        // ============================================================================
        // COLORES POR MÓDULO (para diferenciación visual)
        // ============================================================================
        'module': {
          home: colors.modules.home,
          calendario: colors.modules.calendario,
          tickets: colors.modules.tickets,
          inventario: colors.modules.inventario,
          galeria: colors.modules.galeria,
          cuentas: colors.modules.cuentas,
          directorio: colors.modules.directorio,
          market: colors.modules.market,
        },
      },

      fontFamily: {
        'roboto': ['var(--font-roboto)', 'system-ui', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },

      // ============================================================================
      // BORDER RADIUS (desde design-tokens)
      // ============================================================================
      borderRadius: {
        'sm': '0.5rem',   // 8px  - Tags, badges
        'md': '0.75rem',  // 12px - Botones, inputs
        'lg': '1rem',     // 16px - Cards, modales
        'xl': '1.5rem',   // 24px - Elementos especiales
      },

      // ============================================================================
      // SHADOWS (desde design-tokens)
      // ============================================================================
      boxShadow: {
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
        'button': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'button-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      },

      // ============================================================================
      // ANIMATIONS (desde design-tokens)
      // ============================================================================
      animation: {
        'slide-in': 'slide-in-right 0.3s ease-out',
        'slide-out': 'slide-out-right 0.3s ease-in',
        'loading-bar': 'loading-bar 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms ease-in',
        'fade-out': 'fadeOut 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
      },

      // ============================================================================
      // TRANSITION DURATIONS (desde design-tokens)
      // ============================================================================
      transitionDuration: {
        'instant': '50ms',
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
    },
  },

  plugins: [],
};

export default config;
