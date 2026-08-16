'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'

interface Profile {
  full_name: string
  role: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Side Navigation Items
  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: '📊' },
    { name: 'Bookings', href: '/admin/bookings', icon: '🎟️' },
    { name: 'Availability', href: '/admin/availability', icon: '📅' },
    { name: 'Services', href: '/admin/services', icon: '⚡' },
    { name: 'Courts', href: '/admin/courts', icon: '🏀' },
    { name: 'Clients', href: '/admin/clients', icon: '👥' },
    { name: 'Testimonials', href: '/admin/reviews', icon: '⭐' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
  ]

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/admin/login')
        return
      }

      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof as Profile)
      }
      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <span className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">Loading Session...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white font-sans">
      {/* SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-900 bg-zinc-900/40 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-black text-sm text-black">
            NGP
          </span>
          <span className="font-extrabold text-sm tracking-tight text-white uppercase">Coach Portal</span>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-6 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 text-sm font-bold border border-orange-500/20">
            {profile?.full_name?.charAt(0) || 'C'}
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">{profile?.full_name || 'Coach JP'}</div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mt-1 inline-block">
              {profile?.role || 'Coach'}
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-4 text-sm font-semibold tracking-wide">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/10'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <span>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-black text-sm text-black">
              NGP
            </span>
            <span className="font-extrabold text-sm tracking-tight">COACH PORTAL</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* MOBILE NAVIGATION OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 bg-zinc-950 pt-20 px-4 space-y-2 md:hidden animate-in slide-in-from-top duration-200">
            <nav className="space-y-1 text-sm font-semibold tracking-wide">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </Link>
                )
              })}
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                <span>🚪</span>
                Sign Out
              </button>
            </nav>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 relative z-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
