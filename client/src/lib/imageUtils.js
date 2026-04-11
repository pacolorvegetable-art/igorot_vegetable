import imageCompression from 'browser-image-compression'
import { supabase } from './supabaseClient'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2,          // Max 200KB
  maxWidthOrHeight: 800,   // Max dimension
  useWebWorker: true,
  fileType: 'image/webp'   // Convert to WebP for better compression
}

export async function compressImage(file) {
  try {
    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS)
    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    // Return original file if compression fails
    return file
  }
}

export async function uploadProductImage(file, productId) {
  try {
    // Compress the image first
    const compressedFile = await compressImage(file)
    
    // Generate unique filename
    const fileExt = 'webp'
    const fileName = `${productId}-${Date.now()}.${fileExt}`
    const filePath = `products/${fileName}`

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp'
      })

    if (error) {
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return { url: urlData.publicUrl, path: filePath }
  } catch (error) {
    console.error('Image upload failed:', error)
    throw error
  }
}

export async function deleteProductImage(imagePath) {
  try {
    // Extract path from full URL if needed
    const path = imagePath.includes('product-images/')
      ? imagePath.split('product-images/')[1]
      : imagePath

    const { error } = await supabase.storage
      .from('product-images')
      .remove([path])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Image deletion failed:', error)
    throw error
  }
}
