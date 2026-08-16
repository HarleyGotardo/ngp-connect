export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/server'
import Navbar from '@/components/Navbar'

// Fallback demo data in case the database queries fail or are empty
const FALLBACK_SETTINGS = {
  business_name: 'New Gen Performance',
  coach_name: 'John Paul Maldo',
  business_description: 'Personalized basketball training designed to help athletes build better skills, improve performance, and train with purpose.',
  contact_phone: '0917-123-4567',
  contact_email: 'coach.jp.maldo@gmail.com',
  instagram_url: '#',
  facebook_url: '#',
  cancellation_hours: 24,
}

const FALLBACK_SERVICES = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    name: '1-on-1 Training (5-Session Bundle)',
    description: 'Personalized individual coaching. Focuses on game translation skills (speed, deceleration, direction change). 1hr per session. Requires a minimum bundle of 5 sessions (₱5,000 total). plus court fee.',
    duration_minutes: 60,
    price: 5000.00,
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    name: 'Small Group Training (5 Players)',
    description: 'Training block optimized for exactly 5 players of the same positions. Focuses on structural space reads, defensive rotations, and live game conditioning. Price to be finalized.',
    duration_minutes: 90,
    price: 0.00,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Performance Camp',
    description: 'Intense group performance camp targeting deceleration, footwork, speed, and in-game transitions. Open for minimum 20 athletes, maximum 40 athletes. Pricing to be finalized.',
    duration_minutes: 120,
    price: 0.00,
  }
]

const FALLBACK_REVIEWS = [
  {
    id: 'r1',
    client_name: 'Marcus Rivera',
    rating: 5,
    review_text: 'Coach JPs attention to detail corrected my shooting release in just 3 sessions. His skill workouts are game-focused and incredibly intense.',
  },
  {
    id: 'r2',
    client_name: 'Kenzo Sy',
    rating: 5,
    review_text: 'The 2-on-1 sessions helped my brother and me develop better chemistry on court. Coach JP explains the "why" behind every movement pattern.',
  }
]

export default async function Home() {
  let settings = FALLBACK_SETTINGS
  let services = FALLBACK_SERVICES
  let reviews = FALLBACK_REVIEWS

  try {
    const supabase = await createClient()

    const { data: dbSettings } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (dbSettings) settings = dbSettings

    const { data: dbServices } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
    if (dbServices && dbServices.length > 0) services = dbServices

    const { data: dbReviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_active', true)
    if (dbReviews && dbReviews.length > 0) reviews = dbReviews
  } catch (error) {
    console.error('Failed to load database values:', error)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-955 text-zinc-900 dark:text-white font-sans selection:bg-orange-500 selection:text-black transition-colors duration-200">
      {/* BACKGROUND GRAPHIC GRADIENTS */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_45%)]" />
      <div className="absolute top-[800px] left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.06),transparent_50%)] pointer-events-none" />

      {/* HEADER / NAVIGATION */}
      <Navbar />

      {/* HERO SECTION (Hormozi Frame: Hook, Pain Point, Grand Slam Offer CTA) */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl lg:max-w-4xl">
            {/* Unique Brand Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-3.5 py-1 text-xs font-semibold text-orange-500 uppercase tracking-widest mb-6">
              <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              The New Generation Basketball Training System
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-955 dark:text-white sm:text-6xl lg:text-7xl leading-tight">
              STOP WASTING HOURS ON DRILLS THAT{' '}
              <span className="text-orange-500 block sm:inline underline decoration-orange-500/30 underline-offset-8">
                DON&apos;T TRANSLATE TO GAMES.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Conditioning built into real gameplay scenarios. Acceleration, deceleration, change of direction, and speed studied from elite US coaching clinics.
              <span className="text-zinc-900 dark:text-white font-bold block mt-3">Where learning is fun, engaging, and purposeful — not an old-school coach screaming at you.</span>
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-8 py-4 text-base font-bold uppercase tracking-widest text-black shadow-xl shadow-orange-500/20 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Book Your First Session
              </Link>
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900 dark:text-white px-8 py-4 text-base font-bold uppercase tracking-widest transition"
              >
                Explore The Method
              </a>
            </div>
          </div>
        </div>

        {/* Court Diagram Graphic */}
        <div className="absolute right-0 bottom-0 top-12 w-1/2 opacity-5 hidden lg:block select-none pointer-events-none">
          <svg className="h-full w-full stroke-orange-500" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="90" height="90" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="15" strokeWidth="0.5" />
            <path d="M 5,20 L 35,20 L 35,80 L 5,80" strokeWidth="0.5" />
            <path d="M 95,20 L 65,20 L 65,80 L 95,80" strokeWidth="0.5" />
            <circle cx="20" cy="50" r="10" strokeWidth="0.5" />
            <circle cx="80" cy="50" r="10" strokeWidth="0.5" />
            <line x1="50" y1="5" x2="50" y2="95" strokeWidth="0.5" />
          </svg>
        </div>
      </section>

      {/* VALUE POSITION (Hormozi Frame: Unique Value Delivery) */}
      <section className="border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 py-20 sm:py-28" id="about">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500">The New Generation System</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
              Why NGP Beats Old-School Training
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Deceleration and Acceleration dynamics */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900/30 p-8 hover:border-orange-500/20 transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mb-6 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Deceleration & Acceleration</h3>
              <p className="text-zinc-550 dark:text-zinc-400 leading-relaxed text-sm">
                Most players know how to run, but not how to stop. Master decelerating mechanics, lateral change of directions, and explosive re-acceleration studied directly from elite US coaches clinics.
              </p>
            </div>

            {/* In-game translation conditioning */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900/30 p-8 hover:border-orange-500/20 transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mb-6 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">In-Game Conditioning</h3>
              <p className="text-zinc-550 dark:text-zinc-400 leading-relaxed text-sm">
                No mindless suicide sprint lines. Our conditioning workouts simulate actual transition states, defensive coverage closes, and live game movement patterns so you never gas out during key quarters.
              </p>
            </div>

            {/* Fun & Engaging Active Learning */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900/30 p-8 hover:border-orange-500/20 transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mb-6 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Engaging & Screamless Learning</h3>
              <p className="text-zinc-550 dark:text-zinc-400 leading-relaxed text-sm">
                Athletes improve when they feel confident and have fun. Coach JP guides through encouraging communication and active constraint scenarios — not by screaming at you from the sideline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS / OFFER SECTION */}
      <section className="border-t border-zinc-200 dark:border-zinc-900 bg-zinc-100/30 dark:bg-zinc-955/40 py-20 sm:py-28" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 font-bold">Offer Stack</h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
              Choose Your Training Program
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {services.map((service) => {
              return (
                <div
                  key={service.id}
                  className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/50 overflow-hidden hover:border-orange-500/20 transition duration-200"
                >
                  {/* Card Header */}
                  <div className="p-8 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white min-h-[50px]">{service.name}</h3>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl font-extrabold text-orange-500">
                        ₱{Number(service.price).toLocaleString()}
                      </span>
                      <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        / {service.duration_minutes} mins
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-1.5">
                      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-550 dark:text-zinc-400 font-medium">
                        ⏱️ {service.duration_minutes} Minutes Duration
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <p className="text-zinc-655 dark:text-zinc-400 text-xs leading-relaxed mb-8">
                      {service.description}
                    </p>
                    <Link
                      href={`/book?service=${service.id}`}
                      className="w-full flex items-center justify-center rounded-xl bg-zinc-800 border border-zinc-800 dark:bg-zinc-850 dark:border-zinc-850 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-orange-500 hover:border-orange-500 hover:text-black"
                    >
                      Check Availability
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW BOOKING WORKS (Zero friction highlight) */}
      <section className="border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 py-20 sm:py-28" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 font-bold">Booking Process</h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
              Zero-Friction Scheduling
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-zinc-200 dark:text-zinc-800">01</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 hidden lg:block" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Select Program</h3>
              <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                Choose 1-on-1, Small Group of 5, or Performance Camp.
              </p>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-zinc-200 dark:text-zinc-800">02</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 hidden lg:block" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Pick Time Slot</h3>
              <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                Select your preferred slot matching Coach JP and the basketball court.
              </p>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-zinc-200 dark:text-zinc-800">03</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1 hidden lg:block" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Submit Payment</h3>
              <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                Submit payment via GCash/Maya and enter your reference number.
              </p>
            </div>

            {/* Step 4 */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-zinc-200 dark:text-zinc-800">04</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Start Training</h3>
              <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                You receive a unique lookup code. Coach JP reviews payment reference and confirms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MEET COACH SECTION */}
      <section className="border-t border-zinc-200 dark:border-zinc-900 bg-zinc-100/30 dark:bg-zinc-955/40 py-20 sm:py-28" id="coach">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Bio Column */}
            <div className="lg:col-span-7">
              <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 font-bold">The Coach</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
                Meet Coach {settings.coach_name}
              </h2>
              <div className="mt-6 border-l-4 border-orange-500 pl-6 text-zinc-700 dark:text-zinc-300 italic text-base leading-relaxed">
                &ldquo;We focus on dynamic basketball conditioning and biomechanics. Every drill simulates real game constraints. Learning is an engaging experience.&rdquo;
              </div>
              <p className="mt-6 text-zinc-550 dark:text-zinc-400 text-sm leading-relaxed">
                Coach {settings.coach_name} trains athletes by implementing modern basketball systems studied from elite coaching clinics in the United States. NGP programs move away from static drills and screaming coaches, using game scenarios to improve deceleration, change of direction, and court speed.
              </p>
            </div>

            {/* Visual Column / Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/60 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-500/10 blur-xl" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Training Guidelines</h3>
                <ul className="space-y-4 text-xs text-zinc-550 dark:text-zinc-400">
                  <li className="flex gap-3">
                    <span className="text-orange-500 font-extrabold">✓</span>
                    <span>Required: Athlete Full Name, Email, and Phone Number.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-500 font-extrabold">✓</span>
                    <span>Please cancel bookings at least {settings.cancellation_hours} hours in advance if schedule conflict occurs.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY NGP / TRUST */}
      <section className="border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-20 sm:py-28" id="why-ngp">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 font-bold">Why Train with NGP?</h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
              The New Gen Advantage
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Item 1 */}
            <div className="flex gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-sm font-bold flex-shrink-0">✓</span>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">US-Clinic Studied Methods</h4>
                <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                  Every drill is backed by modern sports science to improve your kinetic chains, lateral stop and go mechanics.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-sm font-bold flex-shrink-0">✓</span>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">Clear Court Billing</h4>
                <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                  Transparent breakdown. Total fee calculates Coaching Fee + Court Rental explicitly.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-sm font-bold flex-shrink-0">✓</span>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">Active Conditioning</h4>
                <p className="text-zinc-550 dark:text-zinc-400 text-xs leading-relaxed">
                  Conditioning exercises are integrated directly into basketball situational plays for real-game endurance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 dark:border-zinc-900 bg-zinc-100/30 dark:bg-zinc-955/40 py-20 sm:py-28" id="reviews">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 font-bold">Athlete Feedback</h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-955 dark:text-white">
              What NGP Athletes Are Saying
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 p-8 hover:border-zinc-300 dark:hover:border-zinc-800 transition"
              >
                <div>
                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-4 text-orange-500">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <span key={starIndex} className="text-lg">
                        {starIndex < review.rating ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <p className="text-zinc-750 dark:text-zinc-300 text-sm italic leading-relaxed">
                    &ldquo;{review.review_text}&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-900/60 flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{review.client_name}</span>
                  <span className="text-xs text-zinc-550 dark:text-zinc-500 font-semibold uppercase tracking-wider">NGP Athlete</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="relative overflow-hidden py-24 sm:py-32 border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent z-0 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-955 dark:text-white sm:text-5xl uppercase">
            YOUR NEXT LEVEL STARTS WITH YOUR NEXT SESSION
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-550 dark:text-zinc-400">
            Ditch outdated screamed drills. Choose your program, pick your schedule, submit GCash, and prepare for games with purpose.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/book"
              className="rounded-xl bg-orange-500 px-8 py-4 text-base font-bold uppercase tracking-widest text-black shadow-xl shadow-orange-500/20 transition hover:bg-orange-400"
            >
              Book Your Training
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-black text-sm text-black">
                NGP
              </span>
              <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-white">
                NEW GEN PERFORMANCE
              </span>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-650 dark:text-zinc-500 font-semibold tracking-wide uppercase">
              <a href="#about" className="hover:text-zinc-950 dark:hover:text-zinc-300 transition">New Gen Method</a>
              <a href="#services" className="hover:text-zinc-955 dark:hover:text-zinc-300 transition">Programs</a>
              <a href="#coach" className="hover:text-zinc-955 dark:hover:text-zinc-300 transition">The Coach</a>
              <Link href="/booking/lookup" className="hover:text-zinc-955 dark:hover:text-zinc-300 transition">Lookup Booking</Link>
              <Link href="/admin/login" className="hover:text-orange-500 transition">Coach Portal</Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-650">
            <div>
              &copy; {new Date().getFullYear()} New Gen Performance. All rights reserved. Managed by Coach {settings.coach_name}.
            </div>
            <div className="flex gap-4">
              <span>Cancellation Policy: Cancellations are allowed up to {settings.cancellation_hours} hours prior.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
