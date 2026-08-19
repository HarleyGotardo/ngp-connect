'use client'

import { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import CourtMap from '@/components/booking/CourtMap'

interface Service {
  id: string
  name: string
  description: string
  duration_minutes: number
  price: number
  original_price?: number
}

interface Court {
  id: string
  name: string
  location: string
  description: string
  rental_price: number
  latitude?: number
  longitude?: number
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
  gcash_qr_path?: string
  maya_qr_path?: string
  bank_name?: string
  bank_account_name?: string
  bank_account_number?: string
  bank_qr_path?: string
}

interface Package {
  id: string
  name: string
  description?: string
  number_of_sessions: number
  price: number
  original_price?: number
  is_active: boolean
}

interface BookingFlowProps {
  services: Service[]
  courts: Court[]
  settings: Settings
  packages: Package[]
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
  latitude?: number
  longitude?: number
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
  packages,
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
  const [mapModalCourt, setMapModalCourt] = useState<{ name: string; location: string; latitude: number; longitude: number } | null>(null)

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

  // Execution states
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingRef, setBookingRef] = useState<string | null>(null)

  // Booking Category (session vs package purchase)
  const [bookingType, setBookingType] = useState<'session' | 'package'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('tab') === 'packages' ? 'package' : 'session'
    }
    return 'session'
  })

  // Date selection states for client timetable
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateStripStart, setDateStripStart] = useState<Date>(new Date())

  const quickDays = useMemo(() => {
    const list = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(dateStripStart)
      d.setDate(dateStripStart.getDate() + i)
      list.push(d)
    }
    return list
  }, [dateStripStart])

  // Package State
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [purchaseSuccessCode, setPurchaseSuccessCode] = useState<string | null>(null)

  // Redemption State
  const [packageCodeInput, setPackageCodeInput] = useState('')
  const [validatingCode, setValidatingCode] = useState(false)
  const [packageValidated, setPackageValidated] = useState<boolean | null>(null)
  const [validatedPackageId, setValidatedPackageId] = useState<string | null>(null)
  const [remainingSessionsLeft, setRemainingSessionsLeft] = useState<number>(0)

  const handleValidatePackageCode = async () => {
    if (!packageCodeInput.trim()) return
    setValidatingCode(true)
    setPackageValidated(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('client_packages')
        .select('id, remaining_sessions, status')
        .eq('package_code', packageCodeInput.trim().toUpperCase())
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (fetchErr) throw fetchErr

      if (data && data.remaining_sessions > 0) {
        setPackageValidated(true)
        setRemainingSessionsLeft(data.remaining_sessions)
        setValidatedPackageId(data.id)
      } else {
        setPackageValidated(false)
      }
    } catch (err) {
      console.error(err)
      setPackageValidated(false)
    } finally {
      setValidatingCode(false)
    }
  }

  const resetPackageFlow = () => {
    setSelectedPackage(null)
    setPurchaseSuccess(false)
    setPurchaseSuccessCode(null)
    setFullName('')
    setEmail('')
    setPhone('')
    setAge('')
    setGuardianName('')
    setGuardianPhone('')
    setReferenceNumber('')
  }

  const handlePackagePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPackage || submitting) return

    if (!referenceNumber.trim()) {
      setError('Please enter the payment transaction reference number.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 1. Create client record
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .insert({
          full_name: fullName,
          email: email,
          phone: phone,
          age: Number(age),
          guardian_name: Number(age) < 18 ? guardianName : null,
          guardian_phone: Number(age) < 18 ? guardianPhone : null,
        })
        .select('id')
        .single()

      if (clientErr) throw clientErr
      if (!clientData) throw new Error('Failed to create client record.')

      // 2. Create client package request
      const { data: pkgData, error: pkgErr } = await supabase
        .from('client_packages')
        .insert({
          package_id: selectedPackage.id,
          client_id: clientData.id,
          total_sessions: selectedPackage.number_of_sessions,
          remaining_sessions: 0,
          status: 'PAYMENT_REVIEW',
          payment_method: paymentMethod,
          payment_reference: referenceNumber.trim(),
          proof_storage_path: 'reference-only',
        })
        .select('package_code')
        .single()

      if (pkgErr) throw pkgErr
      if (!pkgData) throw new Error('Failed to retrieve package code.')

      setPurchaseSuccessCode(pkgData.package_code)
      setPurchaseSuccess(true)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Failed to submit package purchase. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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
              latitude: court.latitude,
              longitude: court.longitude,
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
          latitude: court.latitude,
          longitude: court.longitude,
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

    if (paymentMethod === 'Redeem Package Code') {
      if (!packageValidated || !validatedPackageId) {
        setError('Please enter and validate a valid package redemption code.')
        return
      }
    } else {
      if (!referenceNumber.trim()) {
        setError('Please enter the payment transaction reference number.')
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      if (paymentMethod === 'Redeem Package Code') {
        const { data: bookingResult, error: bookingErr } = await supabase.rpc(
          'create_booking_with_package',
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
            p_client_package_id: validatedPackageId,
          }
        )

        if (bookingErr) throw bookingErr
        if (!bookingResult || bookingResult.length === 0) {
          throw new Error('Failed to create booking using package credits.')
        }

        const createdBookingRef = bookingResult[0].booking_reference
        setBookingRef(createdBookingRef)
        setCurrentStep(4)
      } else {
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

        // Create payment record without file upload, proof_storage_path set to 'reference-only'
        const { error: paymentErr } = await supabase.from('payments').insert({
          booking_id: createdBookingId,
          payment_method: paymentMethod,
          amount: totalAmount,
          reference_number: referenceNumber.trim(),
          proof_storage_path: 'reference-only',
          status: 'pending',
        })

        if (paymentErr) throw paymentErr
        setCurrentStep(4)
      }
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

  const datesWithSlots = useMemo(() => {
    const set = new Set<string>()
    slotsByMode[activeMode].forEach((s) => {
      const d = new Date(s.start_at)
      set.add(d.toDateString())
    })
    return set
  }, [slotsByMode, activeMode])

  const slotsOnDate = useMemo(() => {
    return slotsByMode[activeMode].filter((s) => {
      const d = new Date(s.start_at)
      return isSameDay(d, selectedDate)
    })
  }, [slotsByMode, activeMode, selectedDate])
  const availableDatesForMode = useMemo(() => {
    const dates: string[] = []
    const seen = new Set<string>()
    slotsByMode[activeMode].forEach((s) => {
      const dStr = new Date(s.start_at).toDateString()
      if (!seen.has(dStr)) {
        seen.add(dStr)
        dates.push(s.start_at)
      }
    })
    return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [slotsByMode, activeMode])
  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-zinc-900 dark:text-white relative z-10">
      
      {/* Booking Type Switcher Toggle (Only show if not in success state) */}
      {!purchaseSuccess && currentStep < 4 && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-955 p-1 border border-zinc-200 dark:border-zinc-900">
            <button
              onClick={() => {
                setBookingType('session')
                setError(null)
              }}
              className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                bookingType === 'session'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/10'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Book Session
            </button>
            <button
              onClick={() => {
                setBookingType('package')
                setError(null)
              }}
              className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                bookingType === 'package'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/10'
                  : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Buy Package
            </button>
          </div>
        </div>
      )}

      {bookingType === 'package' ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/60 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-colors duration-200">
          {purchaseSuccess ? (
            /* PURCHASE SUCCESS SCREEN */
            <div className="text-center py-10 space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <Check className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold tracking-tight">Package Order Submitted!</h3>
                <p className="text-sm text-zinc-550 dark:text-zinc-400 max-w-md mx-auto">
                  Thank you for registering. Your payment verification request is under review.
                </p>
              </div>

              {/* Package Code Box */}
              <div className="max-w-sm mx-auto p-6 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 dark:text-zinc-500 block mb-1">
                    Redemption Code
                  </span>
                  <span className="font-mono text-xl font-extrabold text-orange-500 tracking-wider">
                    {purchaseSuccessCode}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed text-center">
                  Copy and save this code. Once approved by the administrator, you can enter this code in the booking checkout screen to claim your session credits.
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={resetPackageFlow}
                  className="rounded-lg bg-orange-500 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
                >
                  Book a Session Now
                </button>
              </div>
            </div>
          ) : !selectedPackage ? (
            /* SELECT PACKAGE DEAL */
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <h3 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Choose a Training Package</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">
                  Save on training bundles! Sessions are credited immediately upon administrator payment verification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-800 transition"
                  >
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                          {pkg.number_of_sessions} Sessions
                        </span>
                        <h4 className="text-lg font-bold text-zinc-900 dark:text-white mt-2 leading-snug">
                          {pkg.name}
                        </h4>
                      </div>
                      
                      {pkg.description && (
                        <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                          {pkg.description}
                        </p>
                      )}

                      <div className="flex items-baseline pt-2 border-t border-zinc-100 dark:border-zinc-900">
                        <span className="text-xs text-zinc-500 mr-2">Deal Price:</span>
                        {pkg.original_price && (
                          <span className="text-xs text-zinc-400 line-through mr-2">
                            ₱{Number(pkg.original_price).toLocaleString()}
                          </span>
                        )}
                        <span className="text-lg font-extrabold text-orange-500">
                          ₱{Number(pkg.price).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-900 hover:bg-orange-500 hover:text-black text-white py-2.5 text-xs font-bold uppercase tracking-wider transition border border-zinc-800 dark:border-zinc-800"
                      >
                        Select Package
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* PACKAGE PURCHASE CHECKOUT */
            <form onSubmit={handlePackagePurchaseSubmit} className="space-y-8">
              {/* Selected Package Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500">Selected Package</span>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">{selectedPackage.name}</h4>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400">{selectedPackage.number_of_sessions} Sessions · ₱{Number(selectedPackage.price).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition"
                >
                  Change
                </button>
              </div>

              {/* Step 1: Student Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-orange-500 border-b border-zinc-150 dark:border-zinc-900 pb-1">
                  1. Student Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Stephen Curry"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. curry@gmail.com"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 09171234567"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Age <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Student age"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Parent guardian info for minors */}
                {Number(age) > 0 && Number(age) < 18 && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-955/30 p-4 space-y-4 animate-in slide-in-from-top duration-200">
                    <h5 className="text-xs font-bold text-orange-500 uppercase tracking-wide">
                      Minor Student Parent / Guardian Consent details
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Guardian Full Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          placeholder="Parent or guardian name"
                          className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Guardian Contact Phone <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          placeholder="Contact phone"
                          className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Payment Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-orange-500 border-b border-zinc-150 dark:border-zinc-900 pb-1">
                  2. Make Payment
                </h4>
                
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-2">
                    Instructions
                  </h4>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mb-4">
                    {settings.payment_instructions}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {settings.gcash_number && (
                      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">GCash</div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">{settings.gcash_number}</div>
                        <div className="text-[10px] text-zinc-550 dark:text-zinc-400">{settings.gcash_name}</div>
                      </div>
                    )}
                    {settings.maya_number && (
                      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">Maya</div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">{settings.maya_number}</div>
                        <div className="text-[10px] text-zinc-550 dark:text-zinc-400">{settings.maya_name}</div>
                      </div>
                    )}
                    {settings.bank_account_number && (
                      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">Bank ({settings.bank_name})</div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">{settings.bank_account_number}</div>
                        <div className="text-[10px] text-zinc-550 dark:text-zinc-400">{settings.bank_account_name}</div>
                      </div>
                    )}
                  </div>

                  {/* QR Image */}
                  {paymentMethod === 'GCash' && settings.gcash_qr_path && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">Scan GCash QR Code</div>
                      <img
                        src={settings.gcash_qr_path}
                        alt="GCash QR Code"
                        className="h-40 w-40 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800 animate-in fade-in duration-200"
                      />
                    </div>
                  )}
                  {paymentMethod === 'Maya' && settings.maya_qr_path && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">Scan Maya QR Code</div>
                      <img
                        src={settings.maya_qr_path}
                        alt="Maya QR Code"
                        className="h-40 w-40 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800 animate-in fade-in duration-200"
                      />
                    </div>
                  )}
                  {paymentMethod === 'Bank Transfer' && (settings.bank_qr_path || '/bank_qr.jpg') && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">Scan Bank Transfer QR Code</div>
                      <img
                        src={settings.bank_qr_path || '/bank_qr.jpg'}
                        alt="Bank Transfer QR Code"
                        className="h-40 w-40 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800 animate-in fade-in duration-200"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-555 dark:text-zinc-400">Payment Channel</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="GCash">GCash</option>
                      <option value="Maya">Maya</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Transaction Reference Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter payment reference number"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm outline-none focus:border-orange-500 transition-colors placeholder-zinc-400 dark:placeholder-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  className="rounded-lg border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition px-6 py-3 text-xs font-bold uppercase tracking-wider"
                >
                  Back to Packages
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-orange-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <>
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
                      : 'border-zinc-200 bg-zinc-100 text-zinc-450 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
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
                    idx < currentStep ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-800'
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
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/60 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-colors duration-200">

        {/* ================================================================
            STEP 1: SERVICE SELECTION
        ================================================================ */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-xl font-bold mb-2 text-zinc-950 dark:text-white">Select Training Program</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mb-6">Choose your basketball training service structure.</p>

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
                      : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{service.name}</h3>
                    <p className="mt-2 text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed">{service.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-900 flex justify-between items-baseline">
                    <div className="flex items-baseline gap-1.5">
                      {service.original_price && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through font-semibold">
                          ₱{Number(service.original_price).toLocaleString()}
                        </span>
                      )}
                      <span className="text-lg font-black text-orange-500">
                        ₱{Number(service.price).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{service.duration_minutes} Mins</span>
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
            <h2 className="text-xl font-bold mb-1 text-zinc-955 dark:text-white">Select Date &amp; Time</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mb-5">
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
                      const firstSlot = slotsByMode[mode]?.[0]
                      if (firstSlot) {
                        const slotDate = new Date(firstSlot.start_at)
                        setSelectedDate(slotDate)
                        setDateStripStart(slotDate)
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? `${meta.border} ${meta.bg} ${meta.color} shadow-md`
                        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 text-zinc-500 hover:border-zinc-305 dark:hover:border-zinc-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    {meta.badgeLabel}
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        isActive ? 'bg-black/10 dark:bg-white/10' : 'bg-zinc-205'
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

            {/* Scrollable Horizontal Date Strip */}
            {slotsByMode[activeMode].length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-2">
                  Choose Booking Date
                </label>
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                  {/* Calendar Input Picker (Full Calendar View) */}
                  <div className="relative shrink-0 min-w-[200px]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500 text-sm">
                      📅
                    </div>
                    <input
                      type="date"
                      value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
                      min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                      onChange={(e) => {
                        if (e.target.value) {
                          const parts = e.target.value.split('-')
                          const newD = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                          setSelectedDate(newD)
                          setSelectedSlot(null)
                          setDateStripStart(newD)
                        }
                      }}
                      className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 pl-9 pr-4 py-2.5 text-xs font-bold uppercase tracking-wider outline-none focus:border-orange-500 transition cursor-pointer text-zinc-800 dark:text-zinc-200"
                    />
                  </div>

                  {/* Scrollable Quick Selection Strip Flanked by Pagination Arrows */}
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      disabled={isSameDay(dateStripStart, new Date()) || dateStripStart < new Date()}
                      onClick={() => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const prev = new Date(dateStripStart)
                        prev.setDate(prev.getDate() - 7)
                        setDateStripStart(prev < today ? today : prev)
                      }}
                      className="px-3 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 text-zinc-500 font-bold hover:border-orange-500/40 disabled:opacity-30 disabled:hover:border-zinc-200 transition shrink-0"
                      title="Previous Week"
                    >
                      ←
                    </button>

                    <div className="flex-1 overflow-x-auto scrollbar-none pb-0.5">
                      <div className="flex gap-1.5 whitespace-nowrap">
                        {quickDays.map((d, idx) => {
                          const isSelected = isSameDay(d, selectedDate)
                          const hasSlots = datesWithSlots.has(d.toDateString())
                          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                          const dayNum = d.getDate()

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedDate(d)
                                setSelectedSlot(null)
                              }}
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 text-[11px] font-bold uppercase tracking-wider transition ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                                  : 'border-zinc-250 dark:border-zinc-905 bg-white dark:bg-zinc-955 text-zinc-550 dark:text-zinc-400 hover:border-zinc-305 dark:hover:border-zinc-800'
                              }`}
                            >
                              <span>{dayName} {dayNum}</span>
                              {hasSlots && (
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(dateStripStart)
                        next.setDate(next.getDate() + 7)
                        setDateStripStart(next)
                      }}
                      className="px-3 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 text-zinc-550 font-bold hover:border-orange-500/40 transition shrink-0"
                      title="Next Week"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Timetable Grid or Empty State */}
            {slotsByMode[activeMode].length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-955/40">
                <svg className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-bold text-zinc-550 dark:text-zinc-400">No Slots Available</h3>
                <p className="mt-1 text-xs text-zinc-455 dark:text-zinc-500 max-w-xs mx-auto">
                  No {MODE_META[activeMode].badgeLabel.toLowerCase()} slots are scheduled for this program duration. Try a different mode or check back later.
                </p>
              </div>
            ) : slotsOnDate.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-805 rounded-xl bg-zinc-50/50 dark:bg-zinc-955/20 px-4">
                <svg className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-bold text-zinc-550 dark:text-zinc-400">No Slots Available for this Date</h3>
                <p className="mt-1 text-xs text-zinc-455 dark:text-zinc-500 max-w-xs mx-auto mb-4">
                  There are no scheduled training sessions on this day. Please select a date highlighted with an orange dot indicator.
                </p>
                {availableDatesForMode.length > 0 && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900 max-w-md mx-auto">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                      📅 Available dates for {MODE_META[activeMode].badgeLabel}:
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {availableDatesForMode.map((isoDate) => {
                        const d = new Date(isoDate)
                        const formatted = d.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                          timeZone: 'Asia/Manila',
                        })
                        return (
                          <button
                            key={isoDate}
                            type="button"
                            onClick={() => {
                              setSelectedDate(d)
                              setSelectedSlot(null)
                              setDateStripStart(d)
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-zinc-250 bg-white hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 hover:bg-orange-500 hover:text-black transition"
                          >
                            {formatted}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-900 rounded-2xl bg-zinc-50/30 dark:bg-zinc-955/10 max-h-[460px] scrollbar-thin">
                <div className="min-w-[680px] p-4">
                  {/* Table headers (Courts columns / Coach columns) */}
                  <div
                    className="grid gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-3 mb-2 text-center text-xs font-bold uppercase tracking-wider text-zinc-500"
                    style={{
                      gridTemplateColumns: `80px repeat(${activeMode === 'coach_only' ? 1 : courts.length}, 1fr)`,
                    }}
                  >
                    <div className="text-left pl-2">Time</div>
                    {activeMode === 'coach_only' ? (
                      <div className="text-center">Available Coach Slots</div>
                    ) : (
                      courts.map((court) => (
                        <div key={court.id} className="text-center truncate flex items-center justify-center gap-1.5 pl-2">
                          <span>🏀 {court.name}</span>
                          <span
                            role="button"
                            onClick={() => {
                              setMapModalCourt({
                                name: court.name,
                                location: court.location || '',
                                latitude: court.latitude || 10.3157,
                                longitude: court.longitude || 123.8854,
                              })
                            }}
                            className="text-[10px] text-orange-500 hover:text-orange-400 hover:underline cursor-pointer font-bold inline-flex items-center gap-0.5"
                            title="View Venue Map"
                          >
                            🗺️ <span className="text-[9px] font-semibold text-zinc-500 hover:text-orange-400">(Map)</span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Table hours rows */}
                  <div className="space-y-1.5">
                    {(() => {
                      const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
                      return HOURS.map((hour) => {
                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                        const ampm = hour >= 12 ? 'PM' : 'AM'
                        const timeLabel = `${displayHour}:00 ${ampm}`

                        return (
                          <div
                            key={hour}
                            className="grid gap-2 items-center text-center py-1 border-b border-zinc-100/50 dark:border-zinc-900/30 last:border-b-0"
                            style={{
                              gridTemplateColumns: `80px repeat(${activeMode === 'coach_only' ? 1 : courts.length}, 1fr)`,
                            }}
                          >
                            {/* Hour label */}
                            <div className="text-left text-[11px] font-bold text-zinc-400 dark:text-zinc-500 pl-2">
                              {timeLabel}
                            </div>

                            {/* Slot cell containers */}
                            {activeMode === 'coach_only' ? (
                              (() => {
                                const cellSlots = slotsOnDate.filter((s) => new Date(s.start_at).getHours() === hour)
                                return (
                                  <div className="flex flex-col gap-1.5 justify-center items-center min-h-[48px]">
                                    {cellSlots.length > 0 ? (
                                      cellSlots.map((slot, sIdx) => {
                                        const isSelected =
                                          selectedSlot?.start_at === slot.start_at &&
                                          selectedSlot?.coach_availability_id === slot.coach_availability_id
                                        
                                        return (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`w-full max-w-sm rounded-xl border-2 p-2.5 text-xs transition duration-200 ${
                                              isSelected
                                                ? 'border-orange-500 bg-orange-500/10 text-orange-500 font-bold shadow-md shadow-orange-500/5'
                                                : 'border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-300 hover:border-orange-500/30'
                                            }`}
                                          >
                                            <div className="font-extrabold">{formatSlotTime(slot.start_at)} – {formatSlotTime(slot.end_at)}</div>
                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-500 font-semibold mt-0.5">
                                              ₱{Number(slot.trainingFee).toLocaleString()}
                                            </div>
                                          </button>
                                        )
                                      })
                                    ) : (
                                      <span className="text-[10px] text-zinc-300 dark:text-zinc-800 italic select-none">-</span>
                                    )}
                                  </div>
                                )
                              })()
                            ) : (
                              courts.map((court) => {
                                const cellSlots = slotsOnDate.filter((s) => {
                                  const d = new Date(s.start_at)
                                  return d.getHours() === hour && s.court_id === court.id
                                })

                                return (
                                  <div key={court.id} className="flex flex-col gap-1.5 justify-center items-center min-h-[48px] border-l border-zinc-200/40 dark:border-zinc-900/20 first:border-l-0">
                                    {cellSlots.length > 0 ? (
                                      cellSlots.map((slot, sIdx) => {
                                        const isSelected =
                                          selectedSlot?.start_at === slot.start_at &&
                                          selectedSlot?.coach_availability_id === slot.coach_availability_id &&
                                          selectedSlot?.court_availability_id === slot.court_availability_id
                                        
                                        const meta = MODE_META[slot.mode]
                                        
                                        return (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`w-full max-w-[180px] rounded-xl border-2 p-2 text-xs transition duration-200 ${
                                              isSelected
                                                ? `${meta.border} ${meta.bg} ${meta.color} font-bold shadow-md`
                                                : `border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-300 hover:border-orange-500/30`
                                            }`}
                                          >
                                            <div className="font-extrabold leading-tight">{formatSlotTime(slot.start_at)} – {formatSlotTime(slot.end_at)}</div>
                                            <div className="text-[10px] font-semibold mt-0.5 opacity-90">
                                              ₱{(slot.trainingFee + slot.courtFee).toLocaleString()}
                                            </div>
                                          </button>
                                        )
                                      })
                                    ) : (
                                      <span className="text-[10px] text-zinc-300 dark:text-zinc-800 italic select-none">-</span>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-lg border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition px-6 py-3 text-sm font-bold uppercase tracking-wider"
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
            <h2 className="text-xl font-bold mb-2 text-zinc-950 dark:text-white">Athlete Information</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mb-6">Enter details about the training participant.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. johndoe@gmail.com"
                  className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Contact Number (Mobile) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 16"
                  className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                      Parent/Guardian Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Robert Doe"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-750 outline-none focus:border-orange-500 transition-colors duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                      Guardian Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="e.g. 09177654321"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-755 outline-none focus:border-orange-500 transition-colors duration-200"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-zinc-800 pt-8 space-y-6">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Athlete Bio (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Court Position</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Guard, Forward"
                    className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Experience Level</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. High School Varsity"
                    className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Specific Skill Goals</label>
                  <input
                    type="text"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="e.g. Finishing, Handles"
                    className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Any Other Notes for Coach JP
                </label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Tell Coach JP about any injuries, specific needs, or schedule notes..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 resize-none transition-colors duration-200"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={prevStep}
                className="rounded-lg border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition px-6 py-3 text-sm font-bold uppercase tracking-wider"
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
            <h2 className="text-xl font-bold mb-2 text-zinc-955 dark:text-white">Review &amp; Submit Payment</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mb-6">Review your booking and upload manual payment details.</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Invoice Summary */}
              <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-900 pb-2">
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
                    <span className="font-semibold text-zinc-850 dark:text-zinc-300">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Training Fee</span>
                    <span className={`font-semibold text-zinc-850 dark:text-zinc-300 ${selectedSlot?.trainingFee === 0 ? 'text-zinc-400 line-through' : ''}`}>
                      ₱{selectedSlot?.trainingFee.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-900 pb-3">
                    <span className="text-zinc-500">Court Rental Fee</span>
                    <span className={`font-semibold text-zinc-850 dark:text-zinc-300 ${selectedSlot?.courtFee === 0 ? 'text-zinc-400 line-through' : ''}`}>
                      ₱{selectedSlot?.courtFee.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-orange-500">
                    <span>Total Amount Due</span>
                    <span>
                      {paymentMethod === 'Redeem Package Code' && packageValidated === true
                        ? '₱0.00 (Package Credit)'
                        : `₱${totalAmount.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-900 space-y-2 text-xs text-zinc-550 dark:text-zinc-500">
                  <div>
                    📅 <span className="font-semibold text-zinc-800 dark:text-zinc-300">{selectedSlot ? formatSlotDate(selectedSlot.start_at) : ''}</span>
                  </div>
                  <div>
                    🕒 <span className="font-semibold text-zinc-800 dark:text-zinc-300">
                      {selectedSlot ? `${formatSlotTime(selectedSlot.start_at)} – ${formatSlotTime(selectedSlot.end_at)}` : ''}
                    </span>
                  </div>
                  {selectedSlot?.courtName && (
                    <div>
                      🏀 <span className="font-semibold text-zinc-800 dark:text-zinc-300">{selectedSlot.courtName}</span>
                    </div>
                  )}
                  {!selectedSlot?.courtName && (
                    <div>
                      🏋️ <span className="font-semibold text-zinc-800 dark:text-zinc-300">Coach JP · No court</span>
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
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mb-4">
                    {settings.payment_instructions}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {settings.gcash_number && (
                      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">GCash</div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">{settings.gcash_number}</div>
                        <div className="text-[10px] text-zinc-550 dark:text-zinc-400">{settings.gcash_name}</div>
                      </div>
                    )}
                    {settings.maya_number && (
                      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">Maya</div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">{settings.maya_number}</div>
                        <div className="text-[10px] text-zinc-550 dark:text-zinc-400">{settings.maya_name}</div>
                      </div>
                    )}
                    {settings.bank_account_number && (
                      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
                        <div className="text-[10px] text-zinc-500 font-semibold uppercase">Bank ({settings.bank_name})</div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm mt-0.5">{settings.bank_account_number}</div>
                        <div className="text-[10px] text-zinc-550 dark:text-zinc-400">{settings.bank_account_name}</div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic QR Display */}
                  {paymentMethod === 'GCash' && settings.gcash_qr_path && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">Scan GCash QR Code</div>
                      <img
                        src={settings.gcash_qr_path}
                        alt="GCash QR Code"
                        className="h-40 w-40 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800"
                      />
                    </div>
                  )}
                  {paymentMethod === 'Maya' && settings.maya_qr_path && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">Scan Maya QR Code</div>
                      <img
                        src={settings.maya_qr_path}
                        alt="Maya QR Code"
                        className="h-40 w-40 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800"
                      />
                    </div>
                  )}
                  {paymentMethod === 'Bank Transfer' && (settings.bank_qr_path || '/bank_qr.jpg') && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">Scan Bank Transfer QR Code</div>
                      <img
                        src={settings.bank_qr_path || '/bank_qr.jpg'}
                        alt="Bank Transfer QR Code"
                        className="h-40 w-40 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                    Payment Channel
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value)
                      setError(null)
                    }}
                    className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Maya">Maya</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Redeem Package Code">Redeem Package Code</option>
                  </select>
                </div>

                {paymentMethod === 'Redeem Package Code' ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                      Package Redemption Code <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        required
                        value={packageCodeInput}
                        onChange={(e) => {
                          setPackageCodeInput(e.target.value.toUpperCase())
                          setPackageValidated(null)
                        }}
                        placeholder="e.g. NGP-PKG-A1B2C3"
                        className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 uppercase font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleValidatePackageCode}
                        disabled={validatingCode || !packageCodeInput.trim()}
                        className="rounded-lg bg-orange-500 hover:bg-orange-400 text-black px-5 text-xs font-bold uppercase transition disabled:opacity-40"
                      >
                        {validatingCode ? 'Checking...' : 'Validate'}
                      </button>
                    </div>
                    {packageValidated === true && (
                      <p className="mt-2 text-xs text-emerald-500 font-bold flex items-center gap-1">
                        ✓ Code verified! {remainingSessionsLeft} sessions left in this package.
                      </p>
                    )}
                    {packageValidated === false && (
                      <p className="mt-2 text-xs text-red-500 font-semibold">
                        ✗ Invalid, inactive, or exhausted package code.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Payment Reference Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter GCash/Maya reference number"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 transition-colors duration-200"
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-550 dark:text-zinc-500">Please make sure to input the correct transaction reference number for verification.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-200 dark:border-zinc-800 pt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={submitting}
                className="rounded-lg border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition disabled:opacity-50 px-6 py-3 text-sm font-bold uppercase tracking-wider"
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

            <h2 className="text-2xl font-black text-zinc-950 dark:text-white sm:text-3xl">Booking Submitted Successfully</h2>
            <p className="mt-3 text-sm text-zinc-550 dark:text-zinc-400 max-w-md mx-auto">
              Your request has been received. Coach JP will review your payment and update your booking status shortly.
            </p>

            <div className="mt-8 mx-auto max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 p-6 space-y-4 text-left">
              <div className="text-center border-b border-zinc-200 dark:border-zinc-900 pb-3">
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
                  <span className="font-semibold text-zinc-800 dark:text-zinc-300">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Time</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-300">
                    {selectedSlot ? `${formatSlotDate(selectedSlot.start_at)} · ${formatSlotTime(selectedSlot.start_at)}` : ''}
                  </span>
                </div>
                {selectedSlot?.courtName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Court</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">{selectedSlot.courtName}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-900 pt-2 text-sm font-bold">
                  <span className="text-zinc-400">Total Charged</span>
                  <span className="text-zinc-950 dark:text-white">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-zinc-100 dark:bg-zinc-955/40 border border-zinc-200 dark:border-zinc-900 p-4 max-w-sm mx-auto text-xs text-zinc-550 dark:text-zinc-400">
              💡 <span className="font-semibold">Tip:</span> Save your Reference Code. You can use it to look up your status and cancel if needed.
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="rounded-lg border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-850 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition px-6 py-3 text-sm font-bold uppercase tracking-wider"
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
    </>
  )}

      {/* CLIENT SIDE VIEW MAP MODAL */}
      {mapModalCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{mapModalCourt.name}</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">📍 {mapModalCourt.location}</p>
                <p className="text-[10px] font-mono text-zinc-450 dark:text-zinc-500 mt-1">
                  Coords: {mapModalCourt.latitude.toFixed(6)}, {mapModalCourt.longitude.toFixed(6)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapModalCourt(null)}
                className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-sm flex items-center justify-center dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition"
              >
                ✕
              </button>
            </div>
            
            <div className="h-[300px] w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <CourtMap
                latitude={mapModalCourt.latitude}
                longitude={mapModalCourt.longitude}
                readOnly={true}
              />
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapModalCourt.latitude},${mapModalCourt.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
              >
                🗺️ View in Google Maps
              </a>
              <button
                type="button"
                onClick={() => setMapModalCourt(null)}
                className="rounded-lg bg-orange-500 hover:bg-orange-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
