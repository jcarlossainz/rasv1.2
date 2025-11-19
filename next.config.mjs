/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚡ OPTIMIZACIONES DE RENDIMIENTO

  // Compression activada
  compress: true,

  // Optimización de imágenes
  images: {
    domains: [
      'via.placeholder.com',
      // Añade aquí tu dominio de Supabase Storage
      // Por ejemplo: 'your-project.supabase.co'
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental: Optimizaciones de paquetes
  experimental: {
    optimizePackageImports: [
      '@headlessui/react',
      '@supabase/auth-helpers-nextjs',
      '@supabase/supabase-js'
    ],
  },

  // Configuración de webpack para bundle splitting avanzado
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Bundle splitting optimizado
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,

          // Vendor chunk (node_modules)
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
            minChunks: 1,
            reuseExistingChunk: true,
          },

          // Supabase chunk separado (librería grande)
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/](@supabase|supabase)/,
            chunks: 'all',
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },

          // React chunk separado
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)/,
            chunks: 'all',
            priority: 40,
            minChunks: 1,
            reuseExistingChunk: true,
          },

          // Components compartidos
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };

      // Minimizar IDs para reducir tamaño
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }

    return config;
  },

  // Optimización de producción
  productionBrowserSourceMaps: false, // Deshabilitar source maps en producción

  // React strict mode para detectar problemas
  reactStrictMode: true,

  // SWC minify (más rápido que Terser)
  swcMinify: true,

  // Poweredby header deshabilitado (seguridad)
  poweredByHeader: false,

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
  },
};

export default nextConfig;
