// 📁 lib/supabase/file-compression.ts

/**
 * 🗜️ COMPRESIÓN DE ARCHIVOS
 * Comprime cualquier archivo usando JSZip antes de subirlo
 */

import JSZip from 'jszip'

export async function compressFile(file: File): Promise<{
  compressed: Blob
  originalSize: number
  compressedSize: number
  compressionRatio: number
}> {
  try {
    // Crear instancia de JSZip
    const zip = new JSZip()

    // Agregar el archivo al zip con su nombre original
    zip.file(file.name, file)

    // Generar el archivo ZIP comprimido
    const compressed = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9 // Máxima compresión (0-9)
      }
    })

    const originalSize = file.size
    const compressedSize = compressed.size
    const compressionRatio = ((1 - compressedSize / originalSize) * 100)

    return {
      compressed,
      originalSize,
      compressedSize,
      compressionRatio
    }
  } catch (error) {
    console.error('❌ Error comprimiendo archivo:', error)
    throw error
  }
}

/**
 * 📊 HELPER: Formatear tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
