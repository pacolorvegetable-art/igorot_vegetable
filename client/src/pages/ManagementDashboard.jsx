import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mountain,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  ImageIcon,
  Search,
  LogOut,
  Package,
  Leaf,
  AlertCircle,
  Check
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { uploadProductImage, deleteProductImage } from '../lib/imageUtils'

export default function ManagementDashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    weight: '',
    unit: 'kg',
    stock_quantity: '',
    is_available: true
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const openAddModal = () => {
    setModalMode('add')
    setSelectedProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      weight: '',
      unit: 'kg',
      stock_quantity: '',
      is_available: true
    })
    setImageFile(null)
    setImagePreview(null)
    setFormError(null)
    setShowModal(true)
  }

  const openEditModal = (product) => {
    setModalMode('edit')
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price?.toString() || '',
      weight: product.weight?.toString() || '',
      unit: product.unit || 'kg',
      stock_quantity: product.stock_quantity?.toString() || '',
      is_available: product.is_available
    })
    setImageFile(null)
    setImagePreview(product.image_url)
    setFormError(null)
    setShowModal(true)
  }

  const openDeleteConfirm = (product) => {
    setProductToDelete(product)
    setShowDeleteConfirm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.price) {
        throw new Error('Name and price are required')
      }

      let imageUrl = selectedProduct?.image_url || null

      // Upload new image if selected
      if (imageFile) {
        const productId = selectedProduct?.id || crypto.randomUUID()
        const { url } = await uploadProductImage(imageFile, productId)
        imageUrl = url

        // Delete old image if updating
        if (selectedProduct?.image_url) {
          try {
            await deleteProductImage(selectedProduct.image_url)
          } catch (err) {
            console.warn('Failed to delete old image:', err)
          }
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        unit: formData.unit,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
        is_available: formData.is_available,
        image_url: imageUrl
      }

      if (modalMode === 'add') {
        // Include seller_id only when creating new product
        productData.seller_id = user?.id
        const { error } = await supabase
          .from('product')
          .insert([productData])

        if (error) throw error
        setSuccessMessage('Product added successfully!')
      } else {
        // Don't update seller_id when editing
        const { error } = await supabase
          .from('product')
          .update(productData)
          .eq('id', selectedProduct.id)

        if (error) throw error
        setSuccessMessage('Product updated successfully!')
      }

      setShowModal(false)
      fetchProducts()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!productToDelete) return

    try {
      setIsSubmitting(true)

      // Delete image from storage if exists
      if (productToDelete.image_url) {
        try {
          await deleteProductImage(productToDelete.image_url)
        } catch (err) {
          console.warn('Failed to delete image:', err)
        }
      }

      const { error } = await supabase
        .from('product')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error

      setSuccessMessage('Product deleted successfully!')
      setShowDeleteConfirm(false)
      setProductToDelete(null)
      fetchProducts()
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Delete error:', error)
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-md">
                <Mountain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Igorot Vegetable</h1>
                <p className="text-[11px] text-muted-foreground">Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.role || 'Staff'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-fade-in-down">
            <Check className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-emerald-600" />
              Products
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your vegetable inventory
            </p>
          </div>
          
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-white text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all"
            />
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Leaf className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Get started by adding your first vegetable product'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Product Image */}
                <div className="aspect-square bg-muted relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Availability Badge */}
                  <div
                    className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium ${
                      product.is_available
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {product.is_available ? 'Available' : 'Unavailable'}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">
                        ₱{product.price?.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        per {product.unit || 'kg'}
                        {product.weight && ` • ${product.weight}kg`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {product.stock_quantity || 0}
                      </p>
                      <p className="text-[11px] text-muted-foreground">in stock</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-input bg-background hover:bg-muted transition-all"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(product)}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {modalMode === 'add' ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Product Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video rounded-lg border-2 border-dashed border-border hover:border-emerald-500 transition-colors cursor-pointer overflow-hidden bg-muted/30"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <Upload className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">Click to upload image</p>
                      <p className="text-xs">PNG, JPG up to 5MB (will be compressed)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fresh Cabbage"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the product..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>

              {/* Price and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="bundle">Bundle</option>
                    <option value="piece">Piece</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
              </div>

              {/* Weight and Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0.000"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_available ? 'bg-emerald-600' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      formData.is_available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-foreground">
                  {formData.is_available ? 'Available for sale' : 'Not available'}
                </label>
              </div>

              {/* Error Message */}
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-input hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : modalMode === 'add'
                      ? 'Add Product'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-scale-in">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Delete Product</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <strong>{productToDelete?.name}</strong>? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setProductToDelete(null)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-input hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
