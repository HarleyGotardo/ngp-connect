'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/client'

interface Booking {
  id: string
  booking_reference: string
  start_at: string
  end_at: string
  status: string
  total_amount: number
  services: { name: string }
  clients: { full_name: string }
  courts: { name: string }
}

interface Stats {
  todaySessionsCount: number
  pendingPaymentsCount: number
  upcomingConfirmedCount: number
  pendingRefundsCount: number
}

export default function AdminDashboard() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    todaySessionsCount: 0,
    pendingPaymentsCount: 0,
    upcomingConfirmedCount: 0,
    pendingRefundsCount: 0,
  })
  const [todaySchedule, setTodaySchedule] = useState<Booking[]>([])
  const [pendingReviews, setPendingReviews] = useState<Booking[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const todayStart = `${todayStr}T00:00:00.000Z`
        const todayEnd = `${todayStr}T23:59:59.999Z`

        // 1. Fetch Today's Sessions count & schedule
        const { data: todayData } = await supabase
          .from('bookings')
          .select('*, services(name), clients(full_name), courts(name)')
          .gte('start_at', todayStart)
          .lte('start_at', todayEnd)
          .order('start_at', { ascending: true })

        const schedule = (todayData || []) as Booking[]
        setTodaySchedule(schedule)

        // 2. Fetch Pending Payments (PENDING_PAYMENT or PAYMENT_REVIEW)
        const { data: pendingData } = await supabase
          .from('bookings')
          .select('*, services(name), clients(full_name), courts(name)')
          .in('status', ['PENDING_PAYMENT', 'PAYMENT_REVIEW'])
          .order('created_at', { ascending: false })

        const pending = (pendingData || []) as Booking[]
        setPendingReviews(pending.filter(b => b.status === 'PAYMENT_REVIEW'))

        // 3. Fetch Upcoming Confirmed Bookings
        const { count: confirmedCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'CONFIRMED')
          .gte('start_at', new Date().toISOString())

        // 4. Fetch Pending Refunds
        const { count: refundsCount } = await supabase
          .from('refunds')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        setStats({
          todaySessionsCount: schedule.filter(b => b.status === 'CONFIRMED').length,
          pendingPaymentsCount: pending.length,
          upcomingConfirmedCount: confirmedCount || 0,
          pendingRefundsCount: refundsCount || 0,
        })
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]'
      case 'PAYMENT_REVIEW':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]'
      case 'PENDING_PAYMENT':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]'
      case 'CANCELLED':
        return 'bg-zinc-800 text-zinc-500 border border-zinc-700 text-[10px]'
      default:
        return 'bg-zinc-800 text-zinc-300 text-[10px]'
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading metrics...
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Welcome Heading */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Good morning, Coach JP 👋</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Here&apos;s what is happening with NGP today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 p-6 shadow-sm dark:shadow-none transition-colors duration-200">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Today&apos;s Sessions</div>
          <div className="mt-2 text-3xl font-black text-zinc-900 dark:text-white">{stats.todaySessionsCount}</div>
        </div>

        {/* Metric 2 */}
        <Link href="/admin/bookings?filter=payment" className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 p-6 shadow-sm dark:shadow-none hover:border-orange-500/30 dark:hover:border-orange-500/20 transition group duration-200">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition">Pending Payments</div>
          <div className="mt-2 text-3xl font-black text-yellow-500">{stats.pendingPaymentsCount}</div>
        </Link>

        {/* Metric 3 */}
        <Link href="/admin/bookings?filter=confirmed" className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 p-6 shadow-sm dark:shadow-none hover:border-orange-500/30 dark:hover:border-orange-500/20 transition group duration-200">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition">Upcoming Confirmed</div>
          <div className="mt-2 text-3xl font-black text-green-500">{stats.upcomingConfirmedCount}</div>
        </Link>

        {/* Metric 4 */}
        <Link href="/admin/bookings?filter=refund" className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 p-6 shadow-sm dark:shadow-none hover:border-orange-500/30 dark:hover:border-orange-500/20 transition group duration-200">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition">Refunds Pending</div>
          <div className="mt-2 text-3xl font-black text-red-500">{stats.pendingRefundsCount}</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Today's Schedule Table */}
        <div className="lg:col-span-8 rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/20 p-6 shadow-sm dark:shadow-none transition-colors duration-200">
          <h2 className="text-lg font-bold mb-4 text-zinc-900 dark:text-white">Today&apos;s Schedule</h2>
          {todaySchedule.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">
              No sessions scheduled for today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="text-xs uppercase font-bold text-zinc-500 tracking-wider border-b border-zinc-200 dark:border-zinc-900">
                  <tr>
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Athlete</th>
                    <th className="pb-3">Service</th>
                    <th className="pb-3">Court</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/40">
                  {todaySchedule.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="py-3 font-semibold text-orange-500">
                        {formatTime(b.start_at)}
                      </td>
                      <td className="py-3 text-zinc-900 dark:text-white font-semibold">{b.clients?.full_name}</td>
                      <td className="py-3">{b.services?.name}</td>
                      <td className="py-3 text-xs">{b.courts?.name}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${getStatusBadge(b.status)}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Action Pending Verification */}
        <div className="lg:col-span-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/20 p-6 space-y-4 shadow-sm dark:shadow-none transition-colors duration-200">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Needs Review</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Verify screenshot receipts submitted by athletes for validation.
          </p>

          {pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950/20">
              No payments waiting review.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {pendingReviews.slice(0, 5).map((b) => (
                <div key={b.id} className="rounded-lg border border-zinc-250 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-white">{b.clients?.full_name}</div>
                    <div className="text-zinc-600 dark:text-zinc-500 mt-0.5">{b.services?.name}</div>
                    <div className="text-[10px] text-orange-500 font-semibold tracking-wider mt-1">{b.booking_reference}</div>
                  </div>
                  <Link
                    href="/admin/bookings"
                    className="rounded bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-orange-400"
                  >
                    Verify
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
