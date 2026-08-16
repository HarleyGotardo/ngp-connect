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

const STEPS = ['Service', 'Schedule', 'Details', 'Payment', 'Confirmation']

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

  // Slot selection state
  const [selectedSlot, setSelectedSlot] = useState<{
    start_at: string
    end_at: string
    coach_availability_id: string
    court_availability_id: string
    court_id: string
    coach_id: string
  } | null>(null)

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

  // CALCULATE COMBINED SLOTS
  // A slot is bookable if the coach is available AND there is an overlapping court availability block.
  const bookableSlots = useMemo(() => {
    if (!selectedService) return []

    const serviceDuration = selectedService.duration_minutes
    const slotsList: Array<{
      start_at: string
      end_at: string
      coach_availability_id: string
      court_availability_id: string
      court_id: string
      coach_id: string
      courtName: string
      courtLocation: string
      courtFee: number
      coachName: string
    }> = []

    for (const coachBlock of coachAvails) {
      if (coachBlock.status !== 'available') continue
      const coachStart = new Date(coachBlock.start_at)
      const coachEnd = new Date(coachBlock.end_at)

      for (const courtBlock of courtAvails) {
        if (courtBlock.status !== 'available') continue
        const court = courtBlock.courts
        if (!court) continue
        const courtStart = new Date(courtBlock.start_at)
        const courtEnd = new Date(courtBlock.end_at)

        // Overlap boundaries
        const overlapStart = new Date(Math.max(coachStart.getTime(), courtStart.getTime()))
        const overlapEnd = new Date(Math.min(coachEnd.getTime(), courtEnd.getTime()))
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)

        // Split the overlap window into slots based on the service's duration
        if (overlapMinutes >= serviceDuration) {
          let slotStart = new Date(overlapStart)
          while (true) {
            const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60 * 1000)
            if (slotEnd.getTime() > overlapEnd.getTime()) {
              break
            }

            slotsList.push({
              start_at: slotStart.toISOString(),
              end_at: slotEnd.toISOString(),
              coach_availability_id: coachBlock.id,
              court_availability_id: courtBlock.id,
              court_id: court.id,
              coach_id: coachBlock.coach_id,
              courtName: court.name,
              courtLocation: court.location,
              courtFee: Number(court.rental_price),
              coachName: coachBlock.profiles?.full_name || settings.coach_name,
            })

            // Step by duration to prevent overlaps
            slotStart = slotEnd
          }
        }
      }
    }

    // Sort slots by start_at
    return slotsList.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [selectedService, coachAvails, courtAvails, settings.coach_name])

  // Selected court price helper
  const selectedCourtDetails = useMemo(() => {
    if (!selectedSlot) return null
    return courts.find((c) => c.id === selectedSlot.court_id) || null
  }, [selectedSlot, courts])

  const totalAmount = useMemo(() => {
    if (!selectedService) return 0
    const trainingFee = Number(selectedService.price)
    const courtFee = selectedCourtDetails ? Number(selectedCourtDetails.rental_price) : 0
    return trainingFee + courtFee;
  }, [selectedService, selectedCourtDetails])

  // NAV HANDLERS
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

  // SUBMIT BOOKING
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentFile) {
      setError('Please upload a screenshot proof of payment.')
      return
    }
    // No reference number required per client feedback for lower friction

    setSubmitting(true)
    setError(null)

    try {
      // 1. Submit atomic booking via RPC (prevents race condition)
      const participantsList: any[] = [] // Optional placeholder for group bookings, could capture names later

      const { data: bookingResult, error: bookingErr } = await supabase.rpc(
        'create_booking_atomic',
        {
          p_service_id: selectedService?.id,
          p_coach_id: selectedSlot?.coach_id,
          p_court_id: selectedSlot?.court_id,
          p_coach_availability_id: selectedSlot?.coach_availability_id,
          p_court_availability_id: selectedSlot?.court_availability_id,
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
          p_participants: participantsList,
        }
      )

      if (bookingErr) throw bookingErr
      if (!bookingResult || bookingResult.length === 0) {
        throw new Error('Failed to create booking.')
      }

      const createdBookingId = bookingResult[0].booking_id
      const createdBookingRef = bookingResult[0].booking_reference

      setBookingRef(createdBookingRef)

      // 2. Upload payment proof to storage bucket
      const fileExt = paymentFile.name.split('.').pop()
      const fileName = `${createdBookingRef}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, paymentFile)

      if (uploadErr) throw uploadErr

      // 3. Create payment record
      const { error: paymentErr } = await supabase.from('payments').insert({
        booking_id: createdBookingId,
        payment_method: paymentMethod,
        amount: totalAmount,
        reference_number: referenceNumber.trim() || null,
        proof_storage_path: filePath,
        status: 'pending',
      })

      if (paymentErr) throw paymentErr

      // 4. Advance to Confirmation Screen
      setCurrentStep(4)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Failed to submit booking. The time slot may have just been taken by another client. Please check and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // DATE FORMAT HELPERS
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-white relative z-10">
      {/* STEP PROGRESS INDICATOR */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex flex-1 items-center last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold uppercase transition duration-200 ${idx <= currentStep
                    ? 'border-orange-500 bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold uppercase tracking-wider hidden sm:block ${idx <= currentStep ? 'text-orange-500' : 'text-zinc-500'
                    }`}
                >
                  {step}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition duration-200 ${idx < currentStep ? 'bg-orange-500' : 'bg-zinc-800'
                    }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ERROR MSG BOX */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* STEP BODY */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {/* STEP 1: SERVICE SELECTION */}
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
                    setSelectedSlot(null) // reset slot
                  }}
                  className={`cursor-pointer flex flex-col justify-between p-6 rounded-xl border-2 transition duration-200 ${selectedService?.id === service.id
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                >
                  <div>
                    <h3 className="text-lg font-bold">{service.name}</h3>
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                      {service.description}
                    </p>
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

        {/* STEP 2: SCHEDULE SELECTION */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Select Date & Time</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Available times matched with Coach JP and rented basketball courts for{' '}
              <span className="text-orange-500 font-semibold">{selectedService?.name}</span>.
            </p>

            {bookableSlots.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-base font-bold">No Available Slots Found</h3>
                <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
                  Coach Coach Paul has no active availability scheduled for this program duration. Please check back later or contact him directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {bookableSlots.map((slot, idx) => {
                  const isSelected =
                    selectedSlot?.start_at === slot.start_at &&
                    selectedSlot?.court_availability_id === slot.court_availability_id

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition duration-200 flex justify-between items-center ${isSelected
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                        }`}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold">
                          {formatSlotDate(slot.start_at)}
                        </div>
                        <div className="text-xs text-orange-500 font-semibold uppercase tracking-wider">
                          {formatSlotTime(slot.start_at)} - {formatSlotTime(slot.end_at)}
                        </div>
                        <div className="text-xs text-zinc-400">
                          🏀 {slot.courtName} ({slot.courtLocation})
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-zinc-500">Court Fee</div>
                        <div className="text-sm font-bold text-white">₱{slot.courtFee}</div>
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
                className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 hover:bg-orange-400 transition disabled:opacity-50"
              >
                Enter Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Athlete Information</h2>
            <p className="text-sm text-zinc-400 mb-6">Enter details about the training participant.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
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

              {/* Email */}
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

              {/* Phone */}
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

              {/* Age */}
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

            {/* MINOR DYNAMIC PARENT DATA */}
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

            {/* OPTIONAL SPECIFICS */}
            <div className="mt-8 border-t border-zinc-800 pt-8 space-y-6">
              <h3 className="text-base font-bold">Athlete Bio (Optional)</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Court Position
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Guard, Forward"
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. High School Varsity"
                    className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Specific Skill Goals
                  </label>
                  <input
                    type="text"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="e.g. Handle under pressure, Finishing"
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
                Review & Pay
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PAYMENT SUBMISSION */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitBooking}>
            <h2 className="text-xl font-bold mb-2">Review & Submit Payment</h2>
            <p className="text-sm text-zinc-400 mb-6">Review your booking calculations and upload manual payment details.</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Invoice Summary */}
              <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2">
                  Session Invoice
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Service Program</span>
                    <span className="font-semibold">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Training Fee</span>
                    <span className="font-semibold">₱{selectedService?.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500">Court Rental Fee</span>
                    <span className="font-semibold">₱{selectedCourtDetails?.rental_price.toLocaleString()}</span>
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
                      {selectedSlot ? `${formatSlotTime(selectedSlot.start_at)} - ${formatSlotTime(selectedSlot.end_at)}` : ''}
                    </span>
                  </div>
                  <div>
                    🏀 <span className="font-semibold text-zinc-300">{selectedCourtDetails?.name}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info & Form */}
              <div className="lg:col-span-7 space-y-6">
                {/* QR Guide */}
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-3">
                    Manual Payment Instructions
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {settings.payment_instructions}
                  </p>

                  {/* Dynamic payment options based on settings */}
                  <div className="grid grid-cols-2 gap-4">
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

                {/* Form fields */}
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
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    Maximum size: 5MB. Acceptable file types: JPG, PNG, WEBP.
                  </p>
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

        {/* STEP 5: CONFIRMATION */}
        {currentStep === 4 && (
          <div className="text-center py-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-white sm:text-3xl">Booking Submitted Successfully</h2>
            <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto">
              Your request has been received. Coach Coach Paul will review your payment reference details and update your booking status shortly.
            </p>

            <div className="mt-8 mx-auto max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 text-left">
              <div className="text-center border-b border-zinc-900 pb-3">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-widest block">Booking Reference</span>
                <span className="text-lg font-black text-orange-500 tracking-wider mt-1 block">
                  {bookingRef}
                </span>
              </div>

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
                <div className="flex justify-between">
                  <span className="text-zinc-500">Court</span>
                  <span className="font-semibold text-zinc-300">{selectedCourtDetails?.name}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-900 pt-2 text-sm font-bold">
                  <span className="text-zinc-400">Total Charged</span>
                  <span className="text-white">₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-zinc-950/40 border border-zinc-900 p-4 max-w-sm mx-auto text-xs text-zinc-400">
              💡 <span className="font-semibold">Tip:</span> Save your Reference Code. You can use it to lookup your confirmation status and cancel if needed.
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => {
                  // Reset states and go to home
                  router.push('/')
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition"
              >
                Go to Home
              </button>
              <button
                onClick={() => {
                  // Direct to lookup page
                  router.push('/booking/lookup')
                }}
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
