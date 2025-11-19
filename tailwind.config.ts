import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'ras-azul': '#0B5D7A',
        'ras-turquesa': '#14A19C',
        'ras-crema': '#F8F0E3',
      },
      fontFamily: {
        'roboto': ['var(--font-roboto)', 'system-ui', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
    },
  },
  
  plugins: [],
  
  animation: {
    'slide-in': 'slide-in-right 0.3s ease-out',
    'slide-out': 'slide-out-right 0.3s ease-in',
    'loading-bar': 'loading-bar 1.5s ease-in-out infinite',
  }
  
  };

  

export default config;