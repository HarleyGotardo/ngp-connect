'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'

interface Service {
  id: string
  name: string
  description: string
  duration_minutes: number
  price: number
}

interface Court {
  id: string
  name: string
  location: string
  description: string
  rental_price: number
}

interface CoachAvailability {
  id: string
  coach_id: string
  start_at: string
  end_at: string
  status: string
  profiles?: {
    full_name: string
  }
}

interface CourtAvailability {
  id: string
  court_id: string
  start_at: string
  end_at: string
  status: string
  courts?: Court
}

interface Settings {
  business_name: string
  coach_name: string
  gcash_name: string
  gcash_number: string
  maya_name: string
  maya_number: string
  payment_instructions: string
  cancellation_hours: number
}

interface BookingFlowProps {
  services: Service[]
  courts: Court[]
  settings: Settings
  coachAvails: CoachAvailability[]
  courtAvails: CourtAvailability[]
}

// --------------------------------------------------------------------------
// Slot types
// --------------------------------------------------------------------------
type SlotMode = 'combined' | 'coach_only' | 'court_only'

interface BookableSlot {
  mode: SlotMode
  start_at: string
  end_at: string
  coach_availability_id: string | null
  court_availability_id: string | null
  court_id: string | null
  coach_id: string | null
  courtName: string | null
  courtLocation: string | null
  courtFee: number
  trainingFee: number
  coachName: string | null
}

const STEPS = ['Service', 'Schedule', 'Details', 'Payment', 'Confirmation']

// --------------------------------------------------------------------------
// Mode meta
// --------------------------------------------------------------------------
const MODE_META: Record<SlotMode, { label: string; badgeLabel: string; color: string; border: string; bg: string; hoverBg: string; badgeText: string; dot: string }> = {
  combined: {
    label: '🟢 Coach + Court',
    badgeLabel: 'Coach + Court',
    color: 'text-emerald-400',
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    hoverBg: 'hover:bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  coach_only: {
    label: '🟠 Coach Only',
    badgeLabel: 'Coach Only',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    hoverBg: 'hover:bg-orange-500/20',
    badgeText: 'text-orange-500',
    dot: 'bg-orange-400',
  },
  court_only: {
    label: '🔵 Court Only',
    badgeLabel: 'Court Only',
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    hoverBg: 'hover:bg-blue-500/20',
    badgeText: 'text-blue-400',
    dot: 'bg-blue-400',
  },
}

export default function BookingFlow({
  services,
  courts,
  settings,
  coachAvails,
  courtAvails,
}: BookingFlowProps) {
  const router = useRouter()
  const supabase = createClient()

  // STATE
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [activeMode, setActiveMode] = useState<SlotMode>('combined')
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null)

  // Client Details
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [position, setPosition] = useState('')
  const [experience, setExperience] = useState('')
  const [goals, setGoals] = useState('')
  const [clientNotes, setClientNotes] = useState('')

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState('GCash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentFile, setPaymentFile] = useState<File | null>(null)

  // Execution states
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingRef, setBookingRef] = useState<string | null>(null)

  // --------------------------------------------------------------------------
  // Compute 3 slot categories from availability data
  // --------------------------------------------------------------------------
  const { combinedSlots, coachOnlySlots, courtOnlySlots } = useMemo(() => {
    if (!selectedService) return { combinedSlots: [], coachOnlySlots: [], courtOnlySlots: [] }

    const duration = selectedService.duration_minutes
    const combined: BookableSlot[] = []
    const coachOnly: BookableSlot[] = []
    const courtOnly: BookableSlot[] = []

    // Pair coach + court overlapping blocks → combined & coach-only
    const pairedCourtIds = new Set<string>()

    for (const coachBlock of coachAvails) {
      if (coachBlock.status !== 'available') continue
      const cs = new Date(coachBlock.start_at).getTime()
      const ce = new Date(coachBlock.end_at).getTime()

      // Find overlapping court blocks
      const overlapping = courtAvails.filter((cb) => {
        if (cb.status !== 'available' || !cb.courts) return false
        const bcs = new Date(cb.start_at).getTime()
        const bce = new Date(cb.end_at).getTime()
        return bcs < ce && bce > cs
      })

      if (overlapping.length > 0) {
        // Combined slots — one per overlapping court
        for (const courtBlock of overlapping) {
          pairedCourtIds.add(courtBlock.id)
          const court = courtBlock.courts!
          const overlapStart = Math.max(cs, new Date(courtBlock.start_at).getTime())
          const overlapEnd = Math.min(ce, new Date(courtBlock.end_at).getTime())
          let slotStart = overlapStart
          while (slotStart + duration * 60_000 <= overlapEnd) {
            const slotEnd = slotStart + duration * 60_000
            combined.push({
              mode: 'combined',
              start_at: new Date(slotStart).toISOString(),
              end_at: new Date(slotEnd).toISOString(),
              coach_availability_id: coachBlock.id,
              court_availability_id: courtBlock.id,
              court_id: court.id,
              coach_id: coachBlock.coach_id,
              courtName: court.name,
              courtLocation: court.location,
              courtFee: Number(court.rental_price),
              trainingFee: Number(selectedService.price),
              coachName: coachBlock.profiles?.full_name || settings.coach_name,
            })
            slotStart = slotEnd
          }
        }
      } else {
        // Coach-only slots — no matching court in this window
        let slotStart = cs
        while (slotStart + duration * 60_000 <= ce) {
          const slotEnd = slotStart + duration * 60_000
          coachOnly.push({
            mode: 'coach_only',
            start_at: new Date(slotStart).toISOString(),
            end_at: new Date(slotEnd).toISOString(),
            coach_availability_id: coachBlock.id,
            court_availability_id: null,
            court_id: null,
            coach_id: coachBlock.coach_id,
            courtName: null,
            courtLocation: null,
            courtFee: 0,
            trainingFee: Number(selectedService.price),
            coachName: coachBlock.profiles?.full_name || settings.coach_name,
          })
          slotStart = slotEnd
        }
      }
    }

    // Court-only slots — court blocks with no overlapping coach
    for (const courtBlock of courtAvails) {
      if (courtBlock.status !== 'available' || !courtBlock.courts) continue
      if (pairedCourtIds.has(courtBlock.id)) continue // already in combined

      const court = courtBlock.courts
      const bcs = new Date(courtBlock.start_at).getTime()
      const bce = new Date(courtBlock.end_at).getTime()

      // Also skip if there IS coach overlap (it would be in combined)
      const hasCoachOverlap = coachAvails.some((cb) => {
        if (cb.status !== 'available') return false
        const cbs = new Date(cb.start_at).getTime()
        const cbe = new Date(cb.end_at).getTime()
        return cbs < bce && cbe > bcs
      })
      if (hasCoachOverlap) continue

      let slotStart = bcs
      while (slotStart + duration * 60_000 <= bce) {
        const slotEnd = slotStart + duration * 60_000
        courtOnly.push({
          mode: 'court_only',
          start_at: new Date(slotStart).toISOString(),
          end_at: new Date(slotEnd).toISOString(),
          coach_availability_id: null,
          court_availability_id: courtBlock.id,
          court_id: court.id,
          coach_id: null,
          courtName: court.name,
          courtLocation: court.location,
          courtFee: Number(court.rental_price),
          trainingFee: 0,
          coachName: null,
        })
        slotStart = slotEnd
      }
    }

    const sortFn = (a: BookableSlot, b: BookableSlot) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime()

    return {
      combinedSlots: combined.sort(sortFn),
      coachOnlySlots: coachOnly.sort(sortFn),
      courtOnlySlots: courtOnly.sort(sortFn),
    }
  }, [selectedService, coachAvails, courtAvails, settings.coach_name])

  const slotsByMode: Record<SlotMode, BookableSlot[]> = {
    combined: combinedSlots,
    coach_only: coachOnlySlots,
    court_only: courtOnlySlots,
  }

  const totalAmount = useMemo(() => {
    if (!selectedSlot) return 0
    return selectedSlot.trainingFee + selectedSlot.courtFee
  }, [selectedSlot])

  // --------------------------------------------------------------------------
  // Nav handlers
  // --------------------------------------------------------------------------
  const nextStep = () => {
    setError(null)
    if (currentStep === 0 && !selectedService) {
      setError('Please select a service program.')
      return
    }
    if (currentStep === 1 && !selectedSlot) {
      setError('Please select an available date and time slot.')
      return
    }
    if (currentStep === 2) {
      if (!fullName.trim() || !email.trim() || !phone.trim() || age === '') {
        setError('Please fill in all mandatory fields.')
        return
      }
      if (Number(age) < 18 && (!guardianName.trim() || !guardianPhone.trim())) {
        setError('Under 18 requires parent/guardian contact details.')
        return
      }
    }
    setCurrentStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setError(null)
    setCurrentStep((prev) => prev - 1)
  }

  // --------------------------------------------------------------------------
  // Submit booking
  // --------------------------------------------------------------------------
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentFile) {
      setError('Please upload a screenshot proof of payment.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: bookingResult, error: bookingErr } = await supabase.rpc(
        'create_booking_atomic',
        {
          p_service_id: selectedService?.id,
          p_coach_id: selectedSlot?.coach_id ?? null,
          p_court_id: selectedSlot?.court_id ?? null,
          p_coach_availability_id: selectedSlot?.coach_availability_id ?? null,
          p_court_availability_id: selectedSlot?.court_availability_id ?? null,
          p_start_at: selectedSlot?.start_at,
          p_end_at: selectedSlot?.end_at,
          p_client_name: fullName,
          p_client_email: email,
          p_client_phone: phone,
          p_client_age: Number(age),
          p_guardian_name: Number(age) < 18 ? guardianName : null,
          p_guardian_phone: Number(age) < 18 ? guardianPhone : null,
          p_position: position || null,
          p_experience: experience || null,
          p_goals: goals || null,
          p_client_notes: clientNotes || null,
          p_participants: [],
        }
      )

      if (bookingErr) throw bookingErr
      if (!bookingResult || bookingResult.length === 0) {
        throw new Error('Failed to create booking.')
      }

      const createdBookingId = bookingResult[0].booking_id
      const createdBookingRef = bookingResult[0].booking_reference
      setBookingRef(createdBookingRef)

      // Upload payment proof
      const fileExt = paymentFile.name.split('.').pop()
      const fileName = `${createdBookingRef}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, paymentFile)

      if (uploadErr) throw uploadErr

      // Create payment record
      const { error: paymentErr } = await supabase.from('payments').insert({
        booking_id: createdBookingId,
        payment_method: paymentMethod,
        amount: totalAmount,
        reference_number: referenceNumber.trim() || null,
        proof_storage_path: filePath,
        status: 'pending',
      })

      if (paymentErr) throw paymentErr

      setCurrentStep(4)
    } catch (err: any) {
      console.error(err)
      setError(
        err?.message ||
          'Failed to submit booking. The time slot may have just been taken. Please check and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // --------------------------------------------------------------------------
  // Date helpers
  // --------------------------------------------------------------------------
  const formatSlotDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    })

  const formatSlotTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    })

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-white relative z-10">
      {/* STEP PROGRESS */}
      <div className="mb-10">
        {/* Mobile */}
        <div className="block sm:hidden space-y-3">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-405">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-orange-500">{STEPS[currentStep]}</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 border border-zinc-900 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full transition-all duration-300 shadow-md shadow-orange-500/20"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex flex-1 items-center last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold uppercase transition duration-200 ${
                    idx <= currentStep
                      ? 'border-orange-500 bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold uppercase tracking-wider hidden sm:block ${
                    idx <= currentStep ? 'text-orange-500' : 'text-zinc-500'
                  }`}
                >
                  {step}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition duration-200 ${
                    idx < currentStep ? 'bg-orange-500' : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* STEP BODY */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-xl shadow-2xl">

        {/* ================================================================
            STEP 1: SERVICE SELECTION
        ================================================================ */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Select Training Program</h2>
            <p className="text-sm text-zinc-400 mb-6">Choose your basketball training service structure.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    setSelectedSlot(null)
                  }}
                  className={`cursor-pointer flex flex-col justify-between p-6 rounded-xl border-2 transition duration-200 ${
                    selectedService?.id === service.id
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold">{service.name}</h3>
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{service.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-baseline">
                    <span className="text-lg font-black text-orange-500">
                      ₱{Number(service.price).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-400">{service.duration_minutes} Mins</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 hover:bg-orange-400 transition"
              >
                Continue to Schedule
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2: SCHEDULE — 3-MODE SLOT PICKER
        ================================================================ */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Select Date &amp; Time</h2>
            <p className="text-sm text-zinc-400 mb-5">
              Pick your booking type and choose a slot for{' '}
              <span className="text-orange-500 font-semibold">{selectedService?.name}</span>.
            </p>

            {/* Mode toggle pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(['combined', 'coach_only', 'court_only'] as SlotMode[]).map((mode) => {
                const meta = MODE_META[mode]
                const count = slotsByMode[mode].length
                const isActive = activeMode === mode
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setActiveMode(mode)
                      setSelectedSlot(null)
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? `${meta.border} ${meta.bg} ${meta.color} shadow-md`
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    {meta.badgeLabel}
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        isActive ? 'bg-white/10' : 'bg-zinc-800'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Mode description banner */}
            <div
              className={`mb-5 rounded-lg border p-3 text-xs leading-relaxed ${MODE_META[activeMode].border} ${MODE_META[activeMode].bg} ${MODE_META[activeMode].color}`}
            >
              {activeMode === 'combined' && (
                <>
                  <span className="font-bold">Coach + Court</span> — Coach JP is available <em>and</em> a court is open at the same time. You pay both the coaching fee and court rental.
                </>
              )}
              {activeMode === 'coach_only' && (
                <>
                  <span className="font-bold">Coach Only</span> — Book a session with Coach JP without renting a court. You pay the coaching fee only. You are responsible for your own court arrangement.
                </>
              )}
              {activeMode === 'court_only' && (
                <>
                  <span className="font-bold">Court Only</span> — Rent the court without a coaching session. You pay the court rental fee only. No coaching is included.
                </>
              )}
            </div>

            {/* Slot grid */}
            {slotsByMode[activeMode].length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                <svg className="mx-auto h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-bold text-zinc-400">No Slots Available</h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-xs mx-auto">
                  No {MODE_META[activeMode].badgeLabel.toLowerCase()} slots are scheduled for this program duration. Try a different mode or check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                {slotsByMode[activeMode].map((slot, idx) => {
                  const meta = MODE_META[slot.mode]
                  const isSelected =
                    selectedSlot?.start_at === slot.start_at &&
                    selectedSlot?.coach_availability_id === slot.coach_availability_id &&
                    selectedSlot?.court_availability_id === slot.court_availability_id

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? `${meta.border} ${meta.bg} ring-1 ${meta.border}`
                          : `border-zinc-800 bg-zinc-950 ${meta.hoverBg} hover:border-zinc-700`
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        {/* Left: date/time/court */}
                        <div className="space-y-1 min-w-0">
                          <div className="text-xs font-bold text-zinc-300">
                            {formatSlotDate(slot.start_at)}
                          </div>
                          <div className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                            {formatSlotTime(slot.start_at)} – {formatSlotTime(slot.end_at)}
                          </div>
                          {slot.mode !== 'coach_only' && slot.courtName && (
                            <div className="text-[11px] text-zinc-500 truncate">
                              🏀 {slot.courtName}
                              {slot.courtLocation ? ` (${slot.courtLocation})` : ''}
                            </div>
                          )}
                          {slot.mode === 'coach_only' && (
                            <div className="text-[11px] text-zinc-500">
                              🏋️ Coach JP · No court included
                            </div>
                          )}
                        </div>

                        {/* Right: fee badge */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">
                            {slot.mode === 'combined' ? 'Total Fee' : slot.mode === 'coach_only' ? 'Training Fee' : 'Court Fee'}
                          </span>
                          <div className={`text-sm font-black mt-0.5 ${meta.color}`}>
                            ₱{(slot.trainingFee + slot.courtFee).toLocaleString()}
                          </div>
                          {slot.mode === 'combined' && (
                            <div className="text-[9px] text-zinc-600 mt-0.5">
                              ₱{slot.trainingFee} + ₱{slot.courtFee}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!selectedSlot}
                className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 hover:bg-orange-400 transition disabled:opacity-40"
              >
                Enter Details
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 3: CLIENT DETAILS
        ================================================================ */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Athlete Information</h2>
            <p className="text-sm text-zinc-400 mb-6">Enter details about the training participant.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. johndoe@gmail.com"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Contact Number (Mobile) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 16"
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {age !== '' && Number(age) < 18 && (
              <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/5 p-6 space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500">
                  Parent or Guardian Authorization Required (Minor)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Parent/Guardian Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Robert Doe"
                      className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-750 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Guardian Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="e.g. 09177654321"
                      className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-750 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-zinc-800 pt-8 space-y-6">
              <h3 className="text-base font-bold">Athlete Bio (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Court Position</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Guard, Forward"
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Experience Level</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. High School Varsity"
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Specific Skill Goals</label>
                  <input
                    type="text"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="e.g. Finishing, Handles"
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Any Other Notes for Coach JP
                </label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Tell Coach JP about any injuries, specific needs, or schedule notes..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 hover:bg-orange-400 transition"
              >
                Review &amp; Pay
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 4: PAYMENT SUBMISSION
        ================================================================ */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitBooking}>
            <h2 className="text-xl font-bold mb-2">Review &amp; Submit Payment</h2>
            <p className="text-sm text-zinc-400 mb-6">Review your booking and upload manual payment details.</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Invoice Summary */}
              <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2">
                  Session Invoice
                </h3>

                {/* Mode badge */}
                {selectedSlot && (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${MODE_META[selectedSlot.mode].border} ${MODE_META[selectedSlot.mode].bg} ${MODE_META[selectedSlot.mode].color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${MODE_META[selectedSlot.mode].dot}`} />
                    {MODE_META[selectedSlot.mode].badgeLabel}
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Service Program</span>
                    <span className="font-semibold">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Training Fee</span>
                    <span className={`font-semibold ${selectedSlot?.trainingFee === 0 ? 'text-zinc-600 line-through' : ''}`}>
                      ₱{selectedSlot?.trainingFee.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Court Rental Fee</span>
                    <span className={`font-semibold ${selectedSlot?.courtFee === 0 ? 'text-zinc-600 line-through' : ''}`}>
                      ₱{selectedSlot?.courtFee.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-orange-500">
                    <span>Total Amount Due</span>
                    <span>₱{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2 text-xs text-zinc-500">
                  <div>
                    📅 <span className="font-semibold text-zinc-300">{selectedSlot ? formatSlotDate(selectedSlot.start_at) : ''}</span>
                  </div>
                  <div>
                    🕒 <span className="font-semibold text-zinc-300">
                      {selectedSlot ? `${formatSlotTime(selectedSlot.start_at)} – ${formatSlotTime(selectedSlot.end_at)}` : ''}
                    </span>
                  </div>
                  {selectedSlot?.courtName && (
                    <div>
                      🏀 <span className="font-semibold text-zinc-300">{selectedSlot.courtName}</span>
                    </div>
                  )}
                  {!selectedSlot?.courtName && (
                    <div>
                      🏋️ <span className="font-semibold text-zinc-300">Coach JP · No court</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment form */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-3">
                    Manual Payment Instructions
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {settings.payment_instructions}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {settings.gcash_number && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="text-xs text-zinc-500">GCash</div>
                        <div className="font-bold text-white text-sm mt-0.5">{settings.gcash_number}</div>
                        <div className="text-[10px] text-zinc-400">{settings.gcash_name}</div>
                      </div>
                    )}
                    {settings.maya_number && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="text-xs text-zinc-500">Maya</div>
                        <div className="font-bold text-white text-sm mt-0.5">{settings.maya_number}</div>
                        <div className="text-[10px] text-zinc-400">{settings.maya_name}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Payment Channel
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Maya">Maya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Upload Payment Proof / Screenshot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file && file.size > 5 * 1024 * 1024) {
                        setError('File size must be under 5MB.')
                        setPaymentFile(null)
                      } else {
                        setError(null)
                        setPaymentFile(file)
                      }
                    }}
                    className="mt-2 w-full text-sm text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-500">Maximum size: 5MB. Acceptable: JPG, PNG, WEBP.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-800 pt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={submitting}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-orange-500 px-8 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 hover:bg-orange-400 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting Request...' : 'Submit Booking'}
              </button>
            </div>
          </form>
        )}

        {/* ================================================================
            STEP 5: CONFIRMATION
        ================================================================ */}
        {currentStep === 4 && (
          <div className="text-center py-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-white sm:text-3xl">Booking Submitted Successfully</h2>
            <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto">
              Your request has been received. Coach JP will review your payment and update your booking status shortly.
            </p>

            <div className="mt-8 mx-auto max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 text-left">
              <div className="text-center border-b border-zinc-900 pb-3">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-widest block">Booking Reference</span>
                <span className="text-lg font-black text-orange-500 tracking-wider mt-1 block">{bookingRef}</span>
              </div>

              {/* Mode summary */}
              {selectedSlot && (
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${MODE_META[selectedSlot.mode].border} ${MODE_META[selectedSlot.mode].bg} ${MODE_META[selectedSlot.mode].color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${MODE_META[selectedSlot.mode].dot}`} />
                    {MODE_META[selectedSlot.mode].badgeLabel}
                  </span>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="font-bold text-yellow-500 uppercase tracking-wider">Pending Confirmation</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Service</span>
                  <span className="font-semibold text-zinc-300">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Time</span>
                  <span className="font-semibold text-zinc-300">
                    {selectedSlot ? `${formatSlotDate(selectedSlot.start_at)} · ${formatSlotTime(selectedSlot.start_at)}` : ''}
                  </span>
                </div>
                {selectedSlot?.courtName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Court</span>
                    <span className="font-semibold text-zinc-300">{selectedSlot.courtName}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-900 pt-2 text-sm font-bold">
                  <span className="text-zinc-400">Total Charged</span>
                  <span className="text-white">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-zinc-950/40 border border-zinc-900 p-4 max-w-sm mx-auto text-xs text-zinc-400">
              💡 <span className="font-semibold">Tip:</span> Save your Reference Code. You can use it to look up your status and cancel if needed.
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition"
              >
                Go to Home
              </button>
              <button
                onClick={() => router.push('/booking/lookup')}
                className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
              >
                Lookup Status
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
