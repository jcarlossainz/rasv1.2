// 📁 src/lib/image-compression.ts

/**
 * 📸 COMPRESIÓN DUAL DE IMÁGENES
 * Genera 2 versiones: thumbnail (300x300) y display (1200px ancho máx)
 */
export async function compressImageDual(file: File): Promise<{
  thumbnail: Blob;
  display: Blob;
  originalSize: number;
  compressedSize: number;
}> {
  try {
    // 1. Cargar imagen
    const img = await loadImage(file);

    // 2. Generar THUMBNAIL (300x300, cuadrado)
    const thumbnail = await resizeImage(img, 300, 300, 0.8, true);

    // 3. Generar DISPLAY (1200px ancho máx, mantener aspecto)
    const display = await resizeImage(img, 1200, 1200, 0.8, false);

    const compressedSize = thumbnail.size + display.size;

    return {
      thumbnail,
      display,
      originalSize: file.size,
      compressedSize
    };

  } catch (error) {
    console.error('❌ Error comprimiendo imagen:', error);
    throw error;
  }
}

/**
 * 🔧 HELPER: Cargar imagen desde File
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error cargando imagen'));
    };

    img.src = url;
  });
}

/**
 * 🔧 HELPER: Redimensionar imagen
 * @param img - Imagen fuente
 * @param maxWidth - Ancho máximo
 * @param maxHeight - Alto máximo
 * @param quality - Calidad de compresión (0-1)
 * @param crop - Si es true, hace crop cuadrado. Si es false, mantiene aspecto
 */
function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  crop: boolean = false
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo obtener contexto 2D'));
      return;
    }

    let width = img.width;
    let height = img.height;

    if (crop) {
      // CROP CUADRADO (para thumbnails)
      const size = Math.min(width, height);
      const x = (width - size) / 2;
      const y = (height - size) / 2;

      canvas.width = maxWidth;
      canvas.height = maxHeight;

      ctx.drawImage(
        img,
        x, y, size, size, // source
        0, 0, maxWidth, maxHeight // destination
      );

    } else {
      // MANTENER ASPECTO (para display)
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
    }

    // Convertir a Blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Error convirtiendo canvas a blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * 📊 HELPER: Formatear tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}