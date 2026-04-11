import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Loader2,
  ChevronRight,
  X
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getCustomers } from '../services/customerService'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await getCustomers()
      setCustomers(data)
    } catch (err) {
      console.error('Failed to load customers:', err)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer)
  }

  const closeCustomerDetails = () => {
    setSelectedCustomer(null)
  }

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchQuery)
    )
  })

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage registered customers
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Customers List */}
          <div className={`flex-1 ${selectedCustomer ? 'hidden lg:block lg:max-w-md' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-xl border border-border">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-foreground">No customers found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery 
                    ? 'Try adjusting your search'
                    : 'Customers will appear here when they sign up'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedCustomer?.id === customer.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {customer.name?.charAt(0)?.toUpperCase() || customer.email?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {customer.name || 'Unnamed Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {customer.email}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Details Panel */}
          {selectedCustomer && (
            <div className="flex-1 lg:flex-none lg:w-[400px] xl:w-[500px]">
              <div className="rounded-xl border border-border bg-card overflow-hidden sticky top-20">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-border bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {selectedCustomer.name?.charAt(0)?.toUpperCase() || selectedCustomer.email?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          {selectedCustomer.name || 'Unnamed Customer'}
                        </h2>
                        <p className="text-sm text-muted-foreground">Customer</p>
                      </div>
                    </div>
                    <button
                      onClick={closeCustomerDetails}
                      className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Contact Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{selectedCustomer.email}</span>
                      </div>
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>Joined {formatDate(selectedCustomer.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
