-- ============================================================================
-- 🏢 RAS - SUPABASE STORAGE SETUP SCRIPT
-- ============================================================================
-- Sistema: Realty Administration System
-- Versión: 1.0.0
-- Fecha: 18 de Noviembre 2025
-- Descripción: Script para configurar Storage buckets
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN DE STORAGE BUCKETS
-- ============================================================================

-- IMPORTANTE: Este script debe ejecutarse desde el panel de Supabase Storage
-- o usando la API de Supabase, NO como SQL directo.

-- Los buckets se crean desde la interfaz de Supabase o usando JavaScript:

-- ============================================================================
-- INSTRUCCIONES PARA CREAR BUCKETS MANUALMENTE
-- ============================================================================

/*
  Ve a Storage en el panel de Supabase y crea los siguientes buckets:

  1. BUCKET: property-images
     - Descripción: Fotos de propiedades (galería e inventario)
     - Public: true
     - Allowed MIME types: image/jpeg, image/png, image/webp
     - Max file size: 10 MB
     - File size limit: 10485760 bytes

  2. BUCKET: property-documents
     - Descripción: Documentos adjuntos (contratos, comprobantes)
     - Public: false
     - Allowed MIME types: application/pdf, image/jpeg, image/png
     - Max file size: 20 MB
     - File size limit: 20971520 bytes

  3. BUCKET: user-avatars
     - Descripción: Avatares de usuarios
     - Public: true
     - Allowed MIME types: image/jpeg, image/png, image/webp
     - Max file size: 2 MB
     - File size limit: 2097152 bytes
*/

-- ============================================================================
-- STORAGE POLICIES (Row Level Security para buckets)
-- ============================================================================

-- IMPORTANTE: Estas políticas deben aplicarse desde el panel de Storage > Policies

-- BUCKET: property-images
-- Policy 1: Cualquiera puede ver las imágenes (lectura pública)
-- Policy 2: Solo propietarios pueden subir imágenes a sus propiedades
-- Policy 3: Solo propietarios pueden eliminar imágenes de sus propiedades

/*
  LECTURA PÚBLICA (SELECT):
  Nombre: "Public can view property images"
  Bucket: property-images
  Allowed operation: SELECT
  Policy: true (sin restricciones)

  UPLOAD (INSERT):
  Nombre: "Users can upload to their properties"
  Bucket: property-images
  Allowed operation: INSERT
  Policy:
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM propiedades WHERE owner_id = auth.uid()
    )

  DELETE:
  Nombre: "Users can delete their property images"
  Bucket: property-images
  Allowed operation: DELETE
  Policy:
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM propiedades WHERE owner_id = auth.uid()
    )
*/

-- BUCKET: property-documents
-- Policy 1: Solo propietarios pueden ver sus documentos
-- Policy 2: Solo propietarios pueden subir documentos
-- Policy 3: Solo propietarios pueden eliminar documentos

/*
  SELECT:
  Nombre: "Users can view their property documents"
  Bucket: property-documents
  Allowed operation: SELECT
  Policy:
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM propiedades WHERE owner_id = auth.uid()
    )

  INSERT:
  Nombre: "Users can upload documents to their properties"
  Bucket: property-documents
  Allowed operation: INSERT
  Policy:
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM propiedades WHERE owner_id = auth.uid()
    )

  DELETE:
  Nombre: "Users can delete their property documents"
  Bucket: property-documents
  Allowed operation: DELETE
  Policy:
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM propiedades WHERE owner_id = auth.uid()
    )
*/

-- BUCKET: user-avatars
-- Policy 1: Todos pueden ver avatares (lectura pública)
-- Policy 2: Usuario solo puede subir/actualizar su propio avatar
-- Policy 3: Usuario solo puede eliminar su propio avatar

/*
  SELECT:
  Nombre: "Public can view avatars"
  Bucket: user-avatars
  Allowed operation: SELECT
  Policy: true

  INSERT/UPDATE:
  Nombre: "Users can upload their own avatar"
  Bucket: user-avatars
  Allowed operation: INSERT, UPDATE
  Policy:
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text

  DELETE:
  Nombre: "Users can delete their own avatar"
  Bucket: user-avatars
  Allowed operation: DELETE
  Policy:
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
*/

-- ============================================================================
-- ESTRUCTURA DE CARPETAS EN BUCKETS
-- ============================================================================

/*
  property-images/
    ├── {property_id}/
    │   ├── original/
    │   │   ├── {timestamp}-{filename}.jpg
    │   │   └── ...
    │   ├── display/
    │   │   ├── {timestamp}-{filename}.webp
    │   │   └── ...
    │   └── thumbnail/
    │       ├── {timestamp}-{filename}.webp
    │       └── ...

  property-documents/
    ├── {property_id}/
    │   ├── contratos/
    │   │   └── {filename}.pdf
    │   ├── comprobantes/
    │   │   └── {filename}.pdf
    │   └── otros/
    │       └── {filename}.pdf

  user-avatars/
    ├── {user_id}/
    │   └── avatar.jpg
*/

-- ============================================================================
-- JAVASCRIPT CODE PARA CREAR BUCKETS PROGRAMÁTICAMENTE
-- ============================================================================

/*
// Ejecutar esto desde la consola de JavaScript o un script Node.js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // Usa service role key, no anon key
)

async function setupBuckets() {
  // 1. Crear bucket para imágenes de propiedades
  const { data: propertyImages, error: error1 } = await supabase
    .storage
    .createBucket('property-images', {
      public: true,
      fileSizeLimit: 10485760, // 10 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    })

  if (error1 && error1.message !== 'Bucket already exists') {
    console.error('Error creating property-images bucket:', error1)
  } else {
    console.log('✅ Bucket property-images created')
  }

  // 2. Crear bucket para documentos
  const { data: propertyDocs, error: error2 } = await supabase
    .storage
    .createBucket('property-documents', {
      public: false,
      fileSizeLimit: 20971520, // 20 MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
    })

  if (error2 && error2.message !== 'Bucket already exists') {
    console.error('Error creating property-documents bucket:', error2)
  } else {
    console.log('✅ Bucket property-documents created')
  }

  // 3. Crear bucket para avatares
  const { data: userAvatars, error: error3 } = await supabase
    .storage
    .createBucket('user-avatars', {
      public: true,
      fileSizeLimit: 2097152, // 2 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    })

  if (error3 && error3.message !== 'Bucket already exists') {
    console.error('Error creating user-avatars bucket:', error3)
  } else {
    console.log('✅ Bucket user-avatars created')
  }
}

setupBuckets()
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
