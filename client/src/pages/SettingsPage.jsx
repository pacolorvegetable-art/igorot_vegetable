import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Settings,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Upload,
  QrCode,
  Smartphone
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getOperatingHours,
  updateAllOperatingHours
} from '../services/settingsService'
import { supabase } from '../lib/supabaseClient'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('payment')
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your store configuration
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payment'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="h-4 w-4 inline-block mr-2" />
            Payment Methods
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'hours'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4 inline-block mr-2" />
            Operating Hours
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'payment' && <PaymentMethodsSection />}
        {activeTab === 'hours' && <OperatingHoursSection />}
      </div>
    </DashboardLayout>
  )
}

// ============================================================================
// Payment Methods Section
// ============================================================================
function PaymentMethodsSection() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)
  const [formData, setFormData] = useState({
    type: 'gcash',
    account_name: '',
    account_number: '',
    qr_code_url: '',
    is_active: true
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadMethods()
  }, [])

  const loadMethods = async () => {
    try {
      setLoading(true)
      const data = await getPaymentMethods()
      setMethods(data)
    } catch (err) {
      console.error('Failed to load payment methods:', err)
      toast.error('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'gcash',
      account_name: '',
      account_number: '',
      qr_code_url: '',
      is_active: true
    })
    setEditingMethod(null)
    setShowForm(false)
  }

  const handleEdit = (method) => {
    setFormData({
      type: method.type,
      account_name: method.account_name,
      account_number: method.account_number,
      qr_code_url: method.qr_code_url || '',
      is_active: method.is_active
    })
    setEditingMethod(method)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.account_name || !formData.account_number) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, formData)
        toast.success('Payment method updated')
      } else {
        await createPaymentMethod(formData)
        toast.success('Payment method added')
      }
      loadMethods()
      resetForm()
    } catch (err) {
      console.error('Failed to save payment method:', err)
      toast.error('Failed to save payment method')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return
    
    try {
      await deletePaymentMethod(id)
      toast.success('Payment method deleted')
      loadMethods()
    } catch (err) {
      console.error('Failed to delete payment method:', err)
      toast.error('Failed to delete payment method')
    }
  }

  const handleQRUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `qr-${Date.now()}.${fileExt}`
      const filePath = `payment-qr/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, qr_code_url: publicUrl }))
      toast.success('QR code uploaded')
    } catch (err) {
      console.error('Failed to upload QR code:', err)
      if (err.message?.includes('Bucket not found')) {
        toast.error('Storage not configured. Please paste an image URL instead.')
      } else {
        toast.error('Upload failed. Please paste an image URL instead.')
      }
    } finally {
      setUploading(false)
    }
  }

  const typeLabels = {
    gcash: 'GCash',
    maya: 'Maya',
    bank: 'Bank Transfer',
    cod: 'Cash on Delivery'
  }

  const typeIcons = {
    gcash: '💚',
    maya: '💜',
    bank: '🏦',
    cod: '💵'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Payment Method
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Account Name *</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Account Number *</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="e.g. 09171234567"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-input"
                />
                <label htmlFor="is_active" className="text-sm">Active</label>
              </div>
            </div>

            {/* QR Code Upload */}
            <div>
              <label className="block text-sm font-medium mb-1.5">QR Code Image (optional)</label>
              <div className="space-y-3">
                {/* URL Input */}
                <div>
                  <input
                    type="url"
                    value={formData.qr_code_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, qr_code_url: e.target.value }))}
                    placeholder="Paste image URL here..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste a direct link to your QR code image, or upload below
                  </p>
                </div>

                {/* File Upload */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQRUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {uploading ? 'Uploading...' : 'Click to upload QR code'}
                      </span>
                    </label>
                  </div>
                  {formData.qr_code_url && (
                    <div className="relative">
                      <img
                        src={formData.qr_code_url}
                        alt="QR Code"
                        className="h-24 w-24 rounded-lg border border-border object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, qr_code_url: '' }))}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Save className="h-4 w-4" />
                {editingMethod ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Methods List */}
      {methods.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground">No payment methods</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add payment methods so customers can pay for their orders
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map(method => (
            <div
              key={method.id}
              className={`rounded-xl border bg-card p-4 ${
                method.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeIcons[method.type]}</span>
                  <div>
                    <p className="font-semibold">{typeLabels[method.type]}</p>
                    {!method.is_active && (
                      <span className="text-xs text-muted-foreground">(Inactive)</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(method)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Account Name</p>
                  <p className="font-medium">{method.account_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Number</p>
                  <p className="font-medium font-mono">{method.account_number}</p>
                </div>
              </div>

              {method.qr_code_url && (
                <div className="mt-3 pt-3 border-t border-border">
                  <img
                    src={method.qr_code_url}
                    alt="QR Code"
                    className="w-full h-32 object-contain rounded-lg bg-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Operating Hours Section
// ============================================================================
function OperatingHoursSection() {
  const [hours, setHours] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadHours()
  }, [])

  const loadHours = async () => {
    try {
      setLoading(true)
      const data = await getOperatingHours()
      // Sort by day_of_week, but put Sunday (0) at the end
      const sorted = data.sort((a, b) => {
        const aDay = a.day_of_week === 0 ? 7 : a.day_of_week
        const bDay = b.day_of_week === 0 ? 7 : b.day_of_week
        return aDay - bDay
      })
      setHours(sorted)
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to load operating hours:', err)
      toast.error('Failed to load operating hours')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (id, field, value) => {
    setHours(hours.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateAllOperatingHours(hours)
      toast.success('Operating hours saved')
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save operating hours:', err)
      toast.error('Failed to save operating hours')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-col space-y-1.5 p-4 sm:p-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="sm:text-2xl font-semibold tracking-tight text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Operating Hours
          </h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md h-9 rounded-md px-3 text-xs gap-1"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Days List */}
      <div className="p-4 sm:p-6 pt-0 space-y-2">
        {hours.map(day => {
          // Get short day name
          const shortDayNames = {
            'Sunday': 'Sun',
            'Monday': 'Mon',
            'Tuesday': 'Tue',
            'Wednesday': 'Wed',
            'Thursday': 'Thu',
            'Friday': 'Fri',
            'Saturday': 'Sat'
          }
          const shortName = shortDayNames[day.day_name] || day.day_name.slice(0, 3)

          return (
            <div
              key={day.id}
              className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg border"
            >
              {/* Day Name */}
              <div className="w-16 sm:w-20 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium">{shortName}</p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={day.is_open}
                onClick={() => handleChange(day.id, 'is_open', !day.is_open)}
                className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  day.is_open ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    day.is_open ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Time inputs or Closed label */}
              {day.is_open ? (
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <input
                    type="time"
                    value={day.open_time || ''}
                    onChange={(e) => handleChange(day.id, 'open_time', e.target.value)}
                    className="flex rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-xs w-24 sm:w-28"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <input
                    type="time"
                    value={day.close_time || ''}
                    onChange={(e) => handleChange(day.id, 'close_time', e.target.value)}
                    className="flex rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-xs w-24 sm:w-28"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Closed</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
