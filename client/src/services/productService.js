import { supabase } from '../lib/supabaseClient'
import { uploadProductImage, deleteProductImage } from '../lib/imageUtils'
import { apiGet, invalidateCacheTags } from './api'

const PRODUCTS_CACHE = {
  ttlMs: 5 * 60 * 1000,
  tags: ['products']
}

export async function getProducts(options = {}) {
  return apiGet('/products', {
    params: {
      availableOnly: options.availableOnly ? 'true' : undefined,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder
    },
    cache: PRODUCTS_CACHE
  })
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from('product')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProduct(productData, imageFile) {
  // Get the current user's ID for seller_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // First create the product to get the ID
  const { data: product, error: createError } = await supabase
    .from('product')
    .insert({
      name: productData.name,
      price: productData.price,
      stock_quantity: productData.stock_quantity || 0,
      unit: productData.unit || 'kg',
      is_available: productData.is_available !== false,
      category: productData.category || 'highland_vegetables',
      availability_type: productData.availability_type || 'on_hand',
      sale_percent: productData.sale_percent || 0,
      harvested_at: productData.harvested_at || null,
      seller_id: user.id
    })
    .select()
    .single()

  if (createError) throw createError

  // If there's an image, upload it and update the product
  if (imageFile) {
    try {
      const { url } = await uploadProductImage(imageFile, product.id)
      
      const { data: updatedProduct, error: updateError } = await supabase
        .from('product')
        .update({ image_url: url })
        .eq('id', product.id)
        .select()
        .single()

      if (updateError) throw updateError
      await invalidateCacheTags(['products'])
      return updatedProduct
    } catch (imageError) {
      console.error('Image upload failed, product created without image:', imageError)
      await invalidateCacheTags(['products'])
      return product
    }
  }

  await invalidateCacheTags(['products'])
  return product
}

export async function updateProduct(id, productData, imageFile) {
  const updateData = {
    name: productData.name,
    price: productData.price,
    stock_quantity: productData.stock_quantity || 0,
    unit: productData.unit || 'kg',
    is_available: productData.is_available !== false,
    category: productData.category || 'highland_vegetables',
    availability_type: productData.availability_type || 'on_hand',
    sale_percent: productData.sale_percent || 0,
    harvested_at: productData.harvested_at || null
  }

  // If there's a new image, upload it
  if (imageFile) {
    try {
      // Delete old image if it exists
      if (productData.old_image_url) {
        await deleteProductImage(productData.old_image_url).catch(() => {})
      }

      const { url } = await uploadProductImage(imageFile, id)
      updateData.image_url = url
    } catch (imageError) {
      console.error('Image upload failed:', imageError)
      throw new Error('Failed to upload image')
    }
  }

  const { data, error } = await supabase
    .from('product')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  await invalidateCacheTags(['products'])
  return data
}

export async function deleteProduct(id, imageUrl) {
  // Delete the image from storage first
  if (imageUrl) {
    await deleteProductImage(imageUrl).catch((err) => {
      console.error('Failed to delete image:', err)
    })
  }

  const { error } = await supabase
    .from('product')
    .delete()
    .eq('id', id)

  if (error) throw error
  await invalidateCacheTags(['products'])
}
