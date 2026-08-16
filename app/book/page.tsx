import Link from 'next/link'
import { createClient } from '@/lib/server'
import BookingFlow from '@/components/booking/BookingFlow'

export const dynamic = 'force-dynamic'

export default async function BookPage() {
  const supabase = await createClient()

  // Fetch Services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)

  // Fetch Courts
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('is_active', true)

  // Fetch Settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  // Fetch Coach Availabilities
  const { data: coachAvails } = await supabase
    .from('coach_availability')
    .select('*, profiles(full_name)')
    .eq('status', 'available')

  // Fetch Court Availabilities
  const { data: courtAvails } = await supabase
    .from('court_availability')
    .select('*, courts(*)')
    .eq('status', 'available')

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500 selection:text-black">
      {/* Background Graphic Accent */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_50%)]" />

      {/* Header bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-black text-sm text-black tracking-wider transition-transform group-hover:scale-105">
              NGP
            </span>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent hidden sm:inline-block">
              NEW GEN PERFORMANCE
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition"
          >
            ← Exit Booking
          </Link>
        </div>
      </header>

      {/* Booking Form Title */}
      <div className="mx-auto max-w-4xl px-4 pt-12 text-center relative z-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Reserve Your Training Slot
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          Complete self-service scheduling. Lock in Coach JP and your training court instantly.
        </p>
      </div>

      {/* Flow Component */}
      <BookingFlow
        services={services || []}
        courts={courts || []}
        settings={settings || {
          business_name: 'New Gen Performance',
          coach_name: 'Coach Paul',
          gcash_name: 'Coach Paul M.',
          gcash_number: '09171234567',
          maya_name: 'Coach Paul M.',
          maya_number: '09171234567',
          payment_instructions: 'Please pay total via GCash/Maya and upload proof.',
          cancellation_hours: 24
        }}
        coachAvails={(coachAvails as any) || []}
        courtAvails={(courtAvails as any) || []}
      />
    </div>
  )
}
