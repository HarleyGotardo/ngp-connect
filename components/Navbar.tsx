'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900 bg-zinc-900/40 text-zinc-400 hover:text-white md:hidden focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 font-black text-base text-black tracking-wider transition-transform group-hover:scale-105">
              NGP
            </span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent hidden sm:inline-block">
              NEW GEN PERFORMANCE
            </span>
          </Link>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide text-zinc-400">
          <a href="#about" className="transition hover:text-white">NEW GEN METHOD</a>
          <a href="#services" className="transition hover:text-white">PROGRAMS</a>
          <a href="#how-it-works" className="transition hover:text-white">HOW TO BOOK</a>
          <a href="#coach" className="transition hover:text-white">THE COACH</a>
          <a href="#reviews" className="transition hover:text-white">ATHLETE STORIES</a>
        </nav>

        {/* Desktop / Mobile Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/booking/lookup"
            className="hidden sm:inline-block text-xs font-medium text-zinc-500 hover:text-zinc-300 transition"
          >
            Lookup Booking
          </Link>
          <Link
            href="/book"
            className="rounded-lg bg-orange-500 px-3.5 py-2 sm:px-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Book Now
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-zinc-900 bg-zinc-950 p-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-zinc-400">
            <a
              href="#about"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-zinc-900 hover:text-white rounded-lg transition"
            >
              NEW GEN METHOD
            </a>
            <a
              href="#services"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-zinc-900 hover:text-white rounded-lg transition"
            >
              PROGRAMS
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-zinc-900 hover:text-white rounded-lg transition"
            >
              HOW TO BOOK
            </a>
            <a
              href="#coach"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-zinc-900 hover:text-white rounded-lg transition"
            >
              THE COACH
            </a>
            <a
              href="#reviews"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-zinc-900 hover:text-white rounded-lg transition"
            >
              ATHLETE STORIES
            </a>
            <Link
              href="/booking/lookup"
              onClick={() => setIsOpen(false)}
              className="p-2 border-t border-zinc-900 hover:bg-zinc-900 hover:text-white rounded-lg transition text-xs font-semibold text-orange-500"
            >
              🔍 Lookup Booking Status
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
