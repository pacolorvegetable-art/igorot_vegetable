import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Upload,
  ImageIcon,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Percent,
  Tag
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService'
import { compressImage } from '../lib/imageUtils'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProducts()
      setProducts(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (productData, imageFile) => {
    await createProduct(productData, imageFile)
    setShowAddModal(false)
    await loadProducts()
  }

  const handleEditProduct = async (productData, imageFile) => {
    await updateProduct(selectedProduct.id, {
      ...productData,
      old_image_url: selectedProduct.image_url
    }, imageFile)
    setShowEditModal(false)
    setSelectedProduct(null)
    await loadProducts()
  }

  const handleDeleteProduct = async () => {
    try {
      await deleteProduct(selectedProduct.id, selectedProduct.image_url)
      setShowDeleteModal(false)
      setSelectedProduct(null)
      await loadProducts()
    } catch (err) {
      setError(err.message || 'Failed to delete product')
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your vegetable inventory
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No products found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Get started by adding your first product'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            )}
          </div>
        ) : (
          /* Products Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => {
                  setSelectedProduct(product)
                  setShowEditModal(true)
                }}
                onDelete={() => {
                  setSelectedProduct(product)
                  setShowDeleteModal(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductFormModal
          title="Add New Product"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProduct}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <ProductFormModal
          title="Edit Product"
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false)
            setSelectedProduct(null)
          }}
          onSubmit={handleEditProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <DeleteConfirmModal
          productName={selectedProduct.name}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedProduct(null)
          }}
          onConfirm={handleDeleteProduct}
        />
      )}
    </DashboardLayout>
  )
}

function ProductCard({ product, onEdit, onDelete }) {
  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative aspect-square bg-muted">
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
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
          product.is_available
            ? 'bg-emerald-600/90 text-white'
            : 'bg-muted-foreground/90 text-white'
        }`}>
          {product.is_available ? 'Available' : 'Unavailable'}
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-card/90 text-foreground hover:bg-card transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-card/90 text-destructive hover:bg-card transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-lg font-bold text-emerald-600">
            ₱{parseFloat(product.price).toFixed(2)}
            <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Stock: {product.stock_quantity}
          </p>
        </div>
      </div>
    </div>
  )
}

function ProductFormModal({ title, product, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || '',
    stock_quantity: product?.stock_quantity || 0,
    unit: product?.unit || 'kg',
    is_available: product?.is_available !== false,
    category: product?.category || 'highland_vegetables',
    availability_type: product?.availability_type || 'on_hand',
    sale_percent: product?.sale_percent || 0,
    harvested_at: product?.harvested_at || ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(product?.image_url || null)
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setCompressing(true)
      setError(null)

      // Preview original
      const originalUrl = URL.createObjectURL(file)
      setImagePreview(originalUrl)

      // Compress
      const compressed = await compressImage(file)
      setImageFile(compressed)

      // Update preview with compressed version
      const compressedUrl = URL.createObjectURL(compressed)
      setImagePreview(compressedUrl)
      URL.revokeObjectURL(originalUrl)

      console.log(`Original: ${(file.size / 1024).toFixed(1)}KB → Compressed: ${(compressed.size / 1024).toFixed(1)}KB`)
    } catch {
      setError('Failed to process image')
      setImageFile(file)
    } finally {
      setCompressing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.price) {
      setError('Name and price are required')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit(formData, imageFile)
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card z-10">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors overflow-hidden"
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {compressing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Compressing...</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload image
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Images are auto-compressed to save space
                  </p>
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sayote"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Category
              </span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="highland_vegetables">Highland Vegetables</option>
              <option value="lowland_vegetables">Lowland Vegetables</option>
              <option value="fruits">Fruits</option>
            </select>
          </div>

          {/* Availability Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Availability
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, availability_type: 'on_hand' })}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.availability_type === 'on_hand'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-2 border-green-500'
                    : 'border border-input bg-background hover:bg-muted'
                }`}
              >
                📦 On-Hand
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, availability_type: 'pre_order' })}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  formData.availability_type === 'pre_order'
                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-2 border-orange-500'
                    : 'border border-input bg-background hover:bg-muted'
                }`}
              >
                🕐 Pre-Order
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.availability_type === 'on_hand' 
                ? 'Product is in stock and ready to ship'
                : 'Product will be harvested after order is placed'}
            </p>
          </div>

          {/* Harvested When */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Harvested When
              </span>
            </label>
            <input
              type="date"
              value={formData.harvested_at}
              onChange={(e) => setFormData({ ...formData, harvested_at: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {formData.harvested_at && (
              <p className="text-xs text-muted-foreground mt-1">
                {(() => {
                  const harvest = new Date(formData.harvested_at)
                  const today = new Date()
                  const diffDays = Math.floor((today - harvest) / (1000 * 60 * 60 * 24))
                  if (diffDays === 0) return '🌿 Harvested today - Super fresh!'
                  if (diffDays === 1) return '🌿 Harvested yesterday - Very fresh!'
                  if (diffDays <= 3) return `🌿 Harvested ${diffDays} days ago - Fresh`
                  if (diffDays <= 7) return `📦 Harvested ${diffDays} days ago`
                  return `📦 Harvested ${diffDays} days ago`
                })()}
              </p>
            )}
          </div>

          {/* Sale Percent */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                Sale Discount
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={formData.sale_percent}
                onChange={(e) => setFormData({ ...formData, sale_percent: parseInt(e.target.value) })}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-emerald-600"
              />
              <div className="flex items-center gap-1 min-w-[4rem]">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.sale_percent}
                  onChange={(e) => setFormData({ ...formData, sale_percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-14 px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            {formData.sale_percent > 0 && formData.price && (
              <p className="text-xs text-emerald-600 mt-1">
                Sale price: ₱{(formData.price * (1 - formData.sale_percent / 100)).toFixed(2)} 
                <span className="text-muted-foreground line-through ml-1">₱{parseFloat(formData.price).toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Price & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Price (₱) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="bundle">Bundle</option>
                <option value="piece">Piece</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>

          {/* Stock Quantity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Stock Quantity
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="is_available" className="text-sm font-medium text-foreground cursor-pointer">
              Available for sale
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || compressing}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ productName, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-6">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Delete Product</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{productName}</strong>? This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            {deleting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
