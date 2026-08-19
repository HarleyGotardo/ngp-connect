import Link from 'next/link'
import { createClient } from '@/lib/server'
import LogoIcon from '@/components/icons/LogoIcon'
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

  // Fetch Packages
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

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

  // Fetch active Bookings (to dynamically filter out taken slots for privacy/concurrency)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_at, end_at, coach_id, court_id, status')
    .neq('status', 'CANCELLED')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-955 text-zinc-900 dark:text-white font-sans selection:bg-orange-500 selection:text-black transition-colors duration-200">
      {/* Background Graphic Accent */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_50%)] pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-955/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-black transition-transform group-hover:scale-105">
              <LogoIcon className="h-5 w-5 text-black" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent hidden sm:inline-block">
              NEW GEN PERFORMANCE
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:text-zinc-450 dark:hover:text-white transition"
          >
            ← Exit Booking
          </Link>
        </div>
      </header>

      {/* Booking Form Title */}
      <div className="mx-auto max-w-4xl px-4 pt-12 text-center relative z-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
          Reserve Your Training Slot
        </h1>
        <p className="mt-2 text-sm text-zinc-550 dark:text-zinc-400 max-w-md mx-auto">
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
        bookings={(bookings as any) || []}
        packages={packages || []}
      />
    </div>
  )
}
