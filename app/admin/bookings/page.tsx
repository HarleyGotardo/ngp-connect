'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/client'

interface ClientInfo {
  full_name: string
  email: string
  phone: string
  age: number
  guardian_name?: string
  guardian_phone?: string
  basketball_position?: string
  experience_level?: string
  training_goals?: string
  notes?: string
}

interface Booking {
  id: string
  booking_reference: string
  client_id: string
  service_id: string
  coach_id: string
  court_id: string
  coach_availability_id: string
  court_availability_id: string
  start_at: string
  end_at: string
  training_fee: number
  court_fee: number
  total_amount: number
  status: string
  cancellation_reason?: string
  admin_notes?: string
  created_at: string
  services: { name: string; duration_minutes: number }
  clients: ClientInfo
  courts: { name: string; location: string }
  payments?: {
    id: string
    payment_method: string
    amount: number
    reference_number: string
    proof_storage_path: string
    status: string
    admin_note?: string
    submitted_at: string
  }[]
  refunds?: {
    id: string
    amount: number
    status: string
    requested_at: string
    processed_at?: string
    admin_note?: string
  }[]
}

export default function BookingsManager() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')

  // DATA STATE
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    filterParam === 'payment' ? 'PAYMENT_REVIEW' :
    filterParam === 'confirmed' ? 'CONFIRMED' : 'ALL'
  )

  // SELECTED BOOKING DRAWER STATE
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [adminNoteInput, setAdminNoteInput] = useState('')
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  
  // MODALS
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [isPending, startTransition] = useTransition()

  // FETCH DATA
  const fetchBookings = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          services(name, duration_minutes),
          clients(*),
          courts(name, location),
          payments(*),
          refunds(*)
        `)
        .order('created_at', { ascending: false })

      // Handle query parameter filters
      if (filterParam === 'refund') {
        // Query bookings with active refunds
        const { data: refundBookings } = await supabase
          .from('refunds')
          .select('booking_id')
          .eq('status', 'pending')
        const ids = (refundBookings || []).map(r => r.booking_id)
        query = query.in('id', ids)
      }

      const { data, error } = await query
      if (error) throw error
      setBookings(data as Booking[])
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParam])

  // DYNAMIC FILTERED BOOKINGS
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clients?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clients?.email.toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === 'ALL') return matchesSearch
    return b.status === statusFilter && matchesSearch
  })

  // GET SIGNED RECEIPT URL
  const getReceiptSignedUrl = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(path, 300) // 5 mins access
      if (error) throw error
      if (data) setReceiptUrl(data.signedUrl)
    } catch (err) {
      console.error('Failed to generate receipt link:', err)
    }
  }

  // SELECT BOOKING DRAWER INITIATOR
  const handleSelectBooking = (b: Booking) => {
    setSelectedBooking(b)
    setAdminNoteInput(b.admin_notes || '')
    setReceiptUrl(null)
    
    // If has payment proof, load signed url
    const payment = b.payments?.[0]
    if (payment?.proof_storage_path) {
      getReceiptSignedUrl(payment.proof_storage_path)
    }
  }

  // UPDATE NOTES
  const handleUpdateAdminNotes = async () => {
    if (!selectedBooking) return
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ admin_notes: adminNoteInput, updated_at: new Date().toISOString() })
        .eq('id', selectedBooking.id)

      if (error) throw error
      
      // Update local state
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, admin_notes: adminNoteInput } : b))
      setSelectedBooking(prev => prev ? { ...prev, admin_notes: adminNoteInput } : null)
    } catch (err) {
      alert('Failed to update notes.')
    }
  }

  // ADMIN ACTION: CONFIRM PAYMENT
  const handleConfirmPayment = async () => {
    if (!selectedBooking) return
    const payment = selectedBooking.payments?.[0]
    if (!payment) return

    try {
      // 1. Verify Payment Record
      const { error: payErr } = await supabase
        .from('payments')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
      if (payErr) throw payErr

      // 2. Update Booking status to CONFIRMED
      const { error: bookErr } = await supabase
        .from('bookings')
        .update({
          status: 'CONFIRMED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id)
      if (bookErr) throw bookErr

      alert('Payment confirmed and booking verified!')
      
      // Refresh views
      await fetchBookings()
      setSelectedBooking(null)
    } catch (err) {
      alert('Failed to confirm payment.')
    }
  }

  // ADMIN ACTION: REJECT PAYMENT
  const handleRejectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBooking || !rejectReason.trim()) return
    const payment = selectedBooking.payments?.[0]
    if (!payment) return

    try {
      // 1. Update Payment status to rejected
      const { error: payErr } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          admin_note: rejectReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
      if (payErr) throw payErr

      // 2. Update Booking status to REJECTED
      const { error: bookErr } = await supabase
        .from('bookings')
        .update({
          status: 'REJECTED',
          admin_notes: rejectReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id)
      if (bookErr) throw bookErr

      // 3. Free up availability blocks since payment is rejected
      if (selectedBooking.coach_availability_id) {
        await supabase
          .from('coach_availability')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('id', selectedBooking.coach_availability_id)
      }
      if (selectedBooking.court_availability_id) {
        await supabase
          .from('court_availability')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('id', selectedBooking.court_availability_id)
      }

      alert('Payment rejected and slot released.')
      setShowRejectModal(false)
      setRejectReason('')
      await fetchBookings()
      setSelectedBooking(null)
    } catch (err) {
      alert('Failed to reject payment.')
    }
  }

  // ADMIN ACTION: COMPLETE SESSION
  const handleCompleteSession = async () => {
    if (!selectedBooking) return
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('id', selectedBooking.id)
      if (error) throw error

      alert('Session marked as completed!')
      await fetchBookings()
      setSelectedBooking(null)
    } catch (err) {
      alert('Failed to update status.')
    }
  }

  // ADMIN ACTION: CANCEL BOOKING (BY ADMIN)
  const handleAdminCancelBooking = async () => {
    if (!selectedBooking) return
    const confirmCancel = confirm('Are you sure you want to cancel this booking? This will create a pending refund if payment was verified.')
    if (!confirmCancel) return

    try {
      // 1. Update Booking status
      const { error: bookErr } = await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          cancellation_reason: 'Cancelled by Coach',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id)
      if (bookErr) throw bookErr

      // 2. Check if a payment existed and was verified to create a refund record
      const payment = selectedBooking.payments?.[0]
      if (payment && payment.status === 'verified') {
        await supabase.from('refunds').insert({
          booking_id: selectedBooking.id,
          amount: selectedBooking.total_amount,
          status: 'pending',
        })
      }

      // 3. Free up availability
      if (selectedBooking.coach_availability_id) {
        await supabase
          .from('coach_availability')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('id', selectedBooking.coach_availability_id)
      }
      if (selectedBooking.court_availability_id) {
        await supabase
          .from('court_availability')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('id', selectedBooking.court_availability_id)
      }

      alert('Booking cancelled successfully.')
      await fetchBookings()
      setSelectedBooking(null)
    } catch (err) {
      alert('Failed to cancel booking.')
    }
  }

  // ADMIN ACTION: MARK REFUND AS COMPLETED
  const handleMarkRefunded = async () => {
    if (!selectedBooking) return
    const refund = selectedBooking.refunds?.[0]
    if (!refund) return

    try {
      const { error } = await supabase
        .from('refunds')
        .update({
          status: 'refunded',
          processed_at: new Date().toISOString(),
          admin_note: 'Refund processed manually by Coach.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', refund.id)
      if (error) throw error

      alert('Refund marked as completed!')
      await fetchBookings()
      setSelectedBooking(null)
    } catch (err) {
      alert('Failed to process refund.')
    }
  }

  // DATE HELPERS
  const formatSlotDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila'
    })
  }

  const formatSlotTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    })
  }

  // STATUS BADGE UTILITY
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/10 text-green-400 border border-green-500/20 text-xs'
      case 'PAYMENT_REVIEW':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs'
      case 'PENDING_PAYMENT':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs'
      case 'CANCELLED':
        return 'bg-zinc-800 text-zinc-500 border border-zinc-700 text-xs'
      case 'REJECTED':
        return 'bg-red-500/10 text-red-400 border border-red-500/20 text-xs'
      case 'COMPLETED':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs'
      default:
        return 'bg-zinc-800 text-zinc-350'
    }
  }

  return (
    <div className="space-y-6 relative text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Bookings Manager</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">View and update client schedule records, payments, and refunds.</p>
        </div>
      </div>

      {/* FILTER SHEETS */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 shadow-sm dark:shadow-none transition-colors duration-200">
        {/* Mobile Filter select */}
        <div className="block sm:hidden w-full">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Filter Booking Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
          >
            {['ALL', 'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((st) => (
              <option key={st} value={st}>{st.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Desktop Filter buttons */}
        <div className="hidden sm:flex flex-wrap gap-2 w-full sm:w-auto">
          {['ALL', 'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition duration-200 ${
                statusFilter === st
                  ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/10'
                  : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ref or client..."
          className="w-full sm:w-64 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
        />
      </div>

      {/* DATA VIEWS */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500 dark:text-zinc-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-2" />
          Fetching bookings...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-900 rounded-xl text-zinc-500 text-sm bg-white dark:bg-zinc-900/10">
          No bookings match the filters.
        </div>
      ) : (
        <>
          {/* Mobile Card List (hidden on desktop) */}
          <div className="md:hidden space-y-4">
            {filteredBookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-4 space-y-3 shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-black text-orange-500 text-xs tracking-wide">{b.booking_reference}</span>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base mt-0.5">{b.clients?.full_name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{b.services?.name}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusBadge(b.status)}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="text-xs space-y-1 border-t border-zinc-100 dark:border-zinc-900/40 pt-2 text-zinc-650 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">₱{Number(b.total_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatSlotDate(b.start_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="text-orange-500">{formatSlotTime(b.start_at)} - {formatSlotTime(b.end_at)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSelectBooking(b)}
                    className="w-full text-center rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition"
                  >
                    Manage Booking
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Data Table (hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/10 shadow-sm dark:shadow-none transition-colors duration-200">
            <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
              <thead className="text-xs uppercase font-bold text-zinc-500 tracking-wider border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20">
                <tr>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Athlete</th>
                  <th className="p-4">Training Service</th>
                  <th className="p-4">Schedule Date & Time</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/40">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/25 transition-colors">
                    <td className="p-4 font-black text-orange-500 tracking-wide">
                      {b.booking_reference}
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-white">
                      {b.clients?.full_name}
                    </td>
                    <td className="p-4 text-xs">
                      {b.services?.name}
                    </td>
                    <td className="p-4 text-xs space-y-0.5">
                      <span className="font-medium text-zinc-650 dark:text-zinc-300 block">{formatSlotDate(b.start_at)}</span>
                      <span className="text-orange-500/80 block">{formatSlotTime(b.start_at)} - {formatSlotTime(b.end_at)}</span>
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-white">
                      ₱{Number(b.total_amount).toLocaleString()}
                    </td>
                    <td className="p-4 text-xs">
                      <span className={`rounded-full px-2.5 py-1 font-bold uppercase ${getStatusBadge(b.status)}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSelectBooking(b)}
                        className="rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* DETAIL DRAWER PANEL */}
      {selectedBooking && (
        <>
          <div
            onClick={() => setSelectedBooking(null)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-zinc-950 border-l border-zinc-900 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Booking Details</span>
                  <span className="text-xl font-black text-orange-500 tracking-wide mt-1 block">
                    {selectedBooking.booking_reference}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 text-sm flex items-center justify-center hover:bg-zinc-800 text-zinc-405"
                >
                  ✕
                </button>
              </div>

              {/* Core Info list */}
              <div className="space-y-6 text-sm">
                {/* Athlete Bio */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Athlete Details</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-900 bg-zinc-900/20 p-4 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Name</span>
                      <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.full_name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Age</span>
                      <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.age} years old</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Phone</span>
                      <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.phone}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Email</span>
                      <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.email}</span>
                    </div>
                    {selectedBooking.clients?.guardian_name && (
                      <div className="col-span-2 mt-2 pt-2 border-t border-zinc-900/60 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-orange-500/80 font-bold block">Parent/Guardian</span>
                          <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.guardian_name}</span>
                        </div>
                        <div>
                          <span className="text-orange-500/80 font-bold block">Guardian Contact</span>
                          <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.guardian_phone}</span>
                        </div>
                      </div>
                    )}
                    {/* Basketball details */}
                    {(selectedBooking.clients?.basketball_position || selectedBooking.clients?.experience_level || selectedBooking.clients?.training_goals) && (
                      <div className="col-span-2 mt-2 pt-2 border-t border-zinc-900/60 space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          {selectedBooking.clients?.basketball_position && (
                            <div>
                              <span className="text-zinc-500 block">Position</span>
                              <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.basketball_position}</span>
                            </div>
                          )}
                          {selectedBooking.clients?.experience_level && (
                            <div>
                              <span className="text-zinc-500 block">Experience</span>
                              <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.experience_level}</span>
                            </div>
                          )}
                        </div>
                        {selectedBooking.clients?.training_goals && (
                          <div>
                            <span className="text-zinc-500 block">Training Goals</span>
                            <span className="font-semibold text-white mt-0.5 block">{selectedBooking.clients?.training_goals}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedBooking.clients?.notes && (
                      <div className="col-span-2 mt-1">
                        <span className="text-zinc-500 block">Client Notes</span>
                        <p className="text-zinc-400 mt-0.5 leading-relaxed">{selectedBooking.clients?.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule and Court details */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Session Schedule</h3>
                  <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4 text-xs space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Selected Program</span>
                      <span className="font-bold text-white">{selectedBooking.services?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Court Location</span>
                      <span className="font-semibold text-white">{selectedBooking.courts?.name} ({selectedBooking.courts?.location})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Session Slot</span>
                      <span className="font-semibold text-orange-500">
                        {formatSlotDate(selectedBooking.start_at)} · {formatSlotTime(selectedBooking.start_at)} - {formatSlotTime(selectedBooking.end_at)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-900/60 pt-2 font-bold">
                      <span className="text-zinc-400">Total Invoice</span>
                      <span className="text-white">₱{Number(selectedBooking.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Manual Payment Information */}
                {selectedBooking.payments && selectedBooking.payments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Payment Receipt</h3>
                    <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4 text-xs space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Method</span>
                        <span className="font-semibold text-white">{selectedBooking.payments[0].payment_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Reference Number</span>
                        <span className="font-bold text-orange-500 tracking-wider">{selectedBooking.payments[0].reference_number || 'None Provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Payment Status</span>
                        <span className="font-bold uppercase text-zinc-300">{selectedBooking.payments[0].status}</span>
                      </div>
                      
                      {/* Signed image URL */}
                      {receiptUrl && (
                        <div className="mt-3 pt-3 border-t border-zinc-900/60">
                          <span className="text-zinc-500 block mb-2">Screenshot Proof:</span>
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 p-2 hover:border-zinc-700 transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={receiptUrl}
                              alt="Receipt Screenshot"
                              className="max-h-48 mx-auto object-contain rounded"
                            />
                            <span className="text-[10px] text-center text-orange-500 mt-2 block font-semibold hover:underline">
                              🔍 Open Image in New Window
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cancellation Reason details */}
                {selectedBooking.cancellation_reason && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs">
                    <span className="text-red-400 font-bold uppercase tracking-wider block">Cancellation Info</span>
                    <p className="text-zinc-400 mt-1 leading-relaxed">{selectedBooking.cancellation_reason}</p>
                  </div>
                )}

                {/* Refunds Details */}
                {selectedBooking.refunds && selectedBooking.refunds.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">Refund Required</h3>
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Amount to Refund</span>
                        <span className="font-bold text-white">₱{Number(selectedBooking.refunds[0].amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Status</span>
                        <span className="font-bold uppercase text-red-400">{selectedBooking.refunds[0].status}</span>
                      </div>
                      {selectedBooking.refunds[0].processed_at && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Processed At</span>
                          <span>{formatSlotDate(selectedBooking.refunds[0].processed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Internal Admin Coach Notes */}
                <div className="space-y-2 pt-4 border-t border-zinc-900/60">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Internal Coach Notes
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="Add private note for this athlete..."
                      className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={handleUpdateAdminNotes}
                      className="rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-700 text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="mt-8 border-t border-zinc-900 pt-4 flex flex-wrap gap-2 justify-end">
              {/* PAYMENT VERIFICATION BUTTONS */}
              {selectedBooking.status === 'PAYMENT_REVIEW' && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    Reject Payment
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="rounded-lg bg-green-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-green-500"
                  >
                    Confirm Payment
                  </button>
                </>
              )}

              {/* CONFIRMED SESSION ACTIONS */}
              {selectedBooking.status === 'CONFIRMED' && (
                <>
                  <button
                    onClick={handleAdminCancelBooking}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10"
                  >
                    Cancel Booking
                  </button>
                  <button
                    onClick={handleCompleteSession}
                    className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400"
                  >
                    Mark Completed
                  </button>
                </>
              )}

              {/* REFUND ACTIONS */}
              {selectedBooking.refunds && selectedBooking.refunds.length > 0 && selectedBooking.refunds[0].status === 'pending' && (
                <button
                  onClick={handleMarkRefunded}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-500"
                >
                  Mark Refunded
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* REJECT PAYMENT MODAL */}
      {showRejectModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2">Reject Payment Receipt</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Provide a brief explanation/reason for rejection (e.g. Reference number doesn&apos;t match).
            </p>

            <form onSubmit={handleRejectPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Reason for Rejection
                </label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. No transaction matching reference found in GCash log..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                  }}
                  className="rounded-lg border border-zinc-850 bg-zinc-850 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-400 transition"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
