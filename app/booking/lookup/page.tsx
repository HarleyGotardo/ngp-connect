'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/client'

interface BookingDetails {
  id: string
  booking_reference: string
  start_at: string
  end_at: string
  training_fee: number
  court_fee: number
  total_amount: number
  status: string
  created_at: string
  service_name: string
  court_name: string
  court_location: string
  client_name: string
  client_email: string
  client_phone: string
  client_age: number
}

export default function BookingLookup() {
  const supabase = createClient()

  // FORM INPUTS
  const [reference, setReference] = useState('')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  
  // EXECUTION STATES
  const [searching, setSearching] = useState(false)
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  // CANCELLATION MODAL STATE
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  // SEARCH METHOD
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reference.trim() || !emailOrPhone.trim()) {
      setError('Please fill in both fields.')
      return
    }

    setSearching(true)
    setError(null)
    setBooking(null)
    setCancelSuccess(false)

    try {
      const { data, error: rpcErr } = await supabase.rpc('get_booking_by_reference', {
        p_reference: reference.trim().toUpperCase(),
        p_email_or_phone: emailOrPhone.trim()
      })

      if (rpcErr) throw rpcErr

      if (data && data.length > 0) {
        setBooking(data[0] as BookingDetails)
      } else {
        setError('No matching booking found. Please check your reference code and contact details.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'An error occurred during lookup.')
    } finally {
      setSearching(false)
    }
  }

  // CANCEL METHOD
  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return

    setCancelling(true)
    setCancelError(null)

    try {
      const { data: success, error: cancelErr } = await supabase.rpc('cancel_booking_by_client', {
        p_reference: booking.booking_reference,
        p_email_or_phone: emailOrPhone.trim(),
        p_reason: cancelReason.trim() || 'Client cancelled online'
      })

      if (cancelErr) throw cancelErr

      if (success) {
        setCancelSuccess(true)
        setShowCancelModal(false)
        setCancelReason('')
        
        // Refresh details by querying again
        const { data: updatedData } = await supabase.rpc('get_booking_by_reference', {
          p_reference: booking.booking_reference,
          p_email_or_phone: emailOrPhone.trim()
        })
        if (updatedData && updatedData.length > 0) {
          setBooking(updatedData[0] as BookingDetails)
        }
      } else {
        setCancelError('Failed to cancel the booking. Please check rules.')
      }
    } catch (err: any) {
      console.error(err)
      setCancelError(err?.message || 'Failed to cancel session. Ensure it is at least 24 hours prior to starting.')
    } finally {
      setCancelling(false)
    }
  }

  // CANCELLATION ELIGIBILITY HELPER
  const canCancelOnline = (startAtIso: string, status: string) => {
    if (status === 'CANCELLED' || status === 'COMPLETED' || status === 'REJECTED') {
      return false
    }
    const startTime = new Date(startAtIso).getTime()
    const now = Date.now()
    const limit = 24 * 60 * 60 * 1000 // 24 hours in ms
    return startTime - now > limit
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

  // STATUS COLOR BADGE
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/10 text-green-400 border border-green-500/30'
      case 'PENDING_PAYMENT':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
      case 'PAYMENT_REVIEW':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
      case 'CANCELLED':
        return 'bg-zinc-800 text-zinc-500 border border-zinc-700'
      case 'REJECTED':
        return 'bg-red-500/10 text-red-400 border border-red-500/30'
      case 'COMPLETED':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
      default:
        return 'bg-zinc-800 text-zinc-300'
    }
  }
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-955 text-zinc-900 dark:text-white font-sans selection:bg-orange-500 selection:text-black transition-colors duration-200">
      {/* Background radial accent */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_50%)] pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-955/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-black text-sm text-black tracking-wider transition-transform group-hover:scale-105">
              NGP
            </span>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent hidden sm:inline-block">
              NEW GEN PERFORMANCE
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:text-zinc-450 dark:hover:text-white transition"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">Find My Booking</h1>
          <p className="mt-2 text-sm text-zinc-550 dark:text-zinc-400">
            Check payment verification progress, booking status, or request a cancellation.
          </p>
        </div>

        {/* LOOKUP SEARCH FORM CARD */}
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-colors duration-200">
          <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Booking Reference
              </label>
              <input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. NGP-2026-00042"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Email or Contact Number
              </label>
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="e.g. athlete@gmail.com"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={searching}
                className="flex w-full items-center justify-center rounded-lg bg-orange-500 py-3 text-sm font-bold uppercase tracking-wider text-black transition duration-200 hover:bg-orange-400 disabled:opacity-50"
              >
                {searching ? 'Finding Booking...' : 'View Booking'}
              </button>
            </div>
          </form>
        </div>

        {/* ERROR STATUS */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* CANCEL SUCCESS NOTICE */}
        {cancelSuccess && (
          <div className="mt-8 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400 text-center font-medium">
            Session cancelled successfully. The coach has been notified and refund requests have been submitted.
          </div>
        )}

        {/* BOOKING RESULTS DISPLAY */}
        {booking && (
          <div className="mt-8 rounded-2xl border border-zinc-900 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            {/* Header / Badges */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-4 gap-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-widest block">Reference Code</span>
                <span className="text-xl font-black text-orange-500 tracking-wider mt-0.5 block">
                  {booking.booking_reference}
                </span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusBadgeClass(booking.status)}`}>
                {booking.status.replace('_', ' ')}
              </span>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-zinc-500 block">Training Service</span>
                <span className="font-bold text-white block">{booking.service_name}</span>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 block">Athlete Name</span>
                <span className="font-bold text-white block">{booking.client_name} ({booking.client_age}yo)</span>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 block">Schedule Date</span>
                <span className="font-semibold text-white block">{formatSlotDate(booking.start_at)}</span>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 block">Time Slot</span>
                <span className="font-semibold text-orange-500 block">
                  {formatSlotTime(booking.start_at)} - {formatSlotTime(booking.end_at)}
                </span>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-zinc-500 block">Basketball Court</span>
                <span className="font-semibold text-white block">
                  🏀 {booking.court_name}
                </span>
                <span className="text-xs text-zinc-400 block">{booking.court_location}</span>
              </div>
            </div>

            {/* Financial Invoice Details */}
            <div className="rounded-xl bg-zinc-950 p-6 space-y-3 text-sm border border-zinc-900">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 pb-1 border-b border-zinc-900/60">
                Payment Breakdowns
              </h4>
              <div className="flex justify-between">
                <span className="text-zinc-500">Coaching Fee</span>
                <span>₱{Number(booking.training_fee).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Court Rental Fee</span>
                <span>₱{Number(booking.court_fee).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-orange-500">
                <span>Total Charge</span>
                <span>₱{Number(booking.total_amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Self-service cancellation box */}
            <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-zinc-500 max-w-md leading-relaxed text-center sm:text-left">
                Online cancellation is allowed up to 24 hours prior to the session start.
                If within 24 hours, online cancellation is disabled. Please contact New Gen Performance.
              </p>
              
              {canCancelOnline(booking.start_at, booking.status) ? (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500 hover:text-white transition flex-shrink-0"
                >
                  Cancel Booking
                </button>
              ) : (
                <span className="text-xs font-bold text-zinc-600 bg-zinc-900 border border-zinc-850 px-4 py-2 rounded-lg cursor-not-allowed select-none flex-shrink-0">
                  Online Cancellation Unavailable
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CANCELLATION MODAL */}
      {showCancelModal && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2">Cancel Training Session</h3>
            <p className="text-xs text-zinc-400 mb-4">
              You are cancelling your booking for <span className="font-semibold text-white">{booking.service_name}</span> scheduled on {formatSlotDate(booking.start_at)}.
            </p>

            <form onSubmit={handleCancelBooking} className="space-y-4">
              {cancelError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {cancelError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Reason for Cancellation
                </label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Conflict in schedule..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => {
                    setShowCancelModal(false)
                    setCancelReason('')
                    setCancelError(null)
                  }}
                  className="rounded-lg border border-zinc-850 bg-zinc-850 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="rounded-lg bg-red-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-400 transition disabled:opacity-50"
                >
                  {cancelling ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
