import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { getProducts } from '../services/productService'
import { getDashboardKpis, getRevenueByMonth } from '../services/settingsService'

const getCurrentMonthFilter = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthFilter)
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    lowStock: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    todaySpoilage: 0,
    loading: true
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [monthlyOrders, setMonthlyOrders] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        const [products, kpis] = await Promise.all([
          getProducts(),
          getDashboardKpis().catch(() => ({
            todayRevenue: 0,
            todaySpoilageLoss: 0,
            pendingOrders: 0
          }))
        ])

        if (cancelled) return

        setStats({
          totalProducts: products.length,
          availableProducts: products.filter(p => p.is_available).length,
          lowStock: products.filter(p => p.stock_quantity < 10).length,
          pendingOrders: kpis.pendingOrders,
          todayRevenue: kpis.todayRevenue,
          todaySpoilage: kpis.todaySpoilageLoss,
          loading: false
        })
      } catch (err) {
        if (cancelled) return

        console.error('Failed to load stats:', err)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    loadStats()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadMonthlyRevenue = async () => {
      try {
        const summary = await getRevenueByMonth(selectedMonth)

        if (cancelled) return

        setMonthlyRevenue(summary.totalRevenue || 0)
        setMonthlyOrders(summary.totalOrders || 0)
      } catch (error) {
        if (cancelled) return

        console.error('Failed to load monthly revenue:', error)
        setMonthlyRevenue(0)
        setMonthlyOrders(0)
      }
    }

    loadMonthlyRevenue()

    return () => {
      cancelled = true
    }
  }, [selectedMonth])

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'emerald',
      href: '/dashboard/products'
    },
    {
      title: 'Available',
      value: stats.availableProducts,
      icon: TrendingUp,
      color: 'blue',
      href: '/dashboard/products'
    },
    {
      title: 'Low Stock',
      value: stats.lowStock,
      icon: Package,
      color: 'amber',
      href: '/dashboard/products'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: ShoppingCart,
      color: 'purple',
      href: '/dashboard/orders'
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back! Here's an overview of your vegetable inventory.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <label htmlFor="revenue-month" className="text-sm font-medium text-foreground">
            Revenue Month
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              id="revenue-month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm sm:w-auto"
            />
            <p className="text-xs text-muted-foreground">
              Showing saved revenue for confirmed and paid orders.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        {stats.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* Today's Financial Summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 p-5">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-600/10 px-2 py-1 rounded-full">
                    {selectedMonth}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    ₱{monthlyRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    Monthly Revenue ({monthlyOrders} paid confirmed order{monthlyOrders === 1 ? '' : 's'})
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 p-5">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-600/10 px-2 py-1 rounded-full">Today</span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                    ₱{stats.todaySpoilage.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Spoilage Loss</p>
                </div>
              </div>
            </div>

            {/* Product Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <QuickActionCard
            title="Manage Products"
            description="Add, edit, or remove vegetables from your inventory"
            icon={Package}
            href="/dashboard/products"
            color="emerald"
          />
          <QuickActionCard
            title="View Orders"
            description="Check pending orders and confirm or reject them"
            icon={ShoppingCart}
            href="/dashboard/orders"
            color="blue"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, icon: Icon, color, href }) {
  const colorClasses = {
    emerald: 'bg-emerald-600/10 text-emerald-600',
    blue: 'bg-blue-600/10 text-blue-600',
    amber: 'bg-amber-600/10 text-amber-600',
    purple: 'bg-purple-600/10 text-purple-600'
  }

  return (
    <Link
      to={href}
      className="block rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className={`h-10 w-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </Link>
  )
}

function QuickActionCard({ title, description, icon: Icon, href, color }) {
  const colorClasses = {
    emerald: 'bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    blue: 'bg-blue-600/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
  }

  return (
    <Link
      to={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all"
    >
      <div className={`h-12 w-12 rounded-xl ${colorClasses[color]} flex items-center justify-center transition-colors`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  )
}
