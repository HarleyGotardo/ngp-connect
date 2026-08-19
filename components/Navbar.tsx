'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Sun, Moon } from 'lucide-react'
import LogoIcon from './icons/LogoIcon'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const hasDarkClass = document.documentElement.classList.contains('dark')
      setTheme(hasDarkClass ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sections = ['services', 'how-it-works', 'reviews']
    const observerOptions = {
      root: null,
      rootMargin: '-25% 0px -55% 0px',
      threshold: 0,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)
    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    const handleScroll = () => {
      if (window.scrollY < 80) {
        setActiveSection('')
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 dark:border-zinc-900/60 dark:bg-zinc-955/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-800 md:hidden dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:text-white focus:outline-none transition-all duration-200"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-black shadow-md shadow-orange-500/20 transition-transform group-hover:scale-105">
              <LogoIcon className="h-5.5 w-5.5 text-black" />
            </div>
            <span className="font-extrabold text-sm tracking-widest bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent hidden sm:inline-block uppercase">
              NEW GEN PERFORMANCE
            </span>
          </Link>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] font-bold tracking-wide text-zinc-550 dark:text-zinc-400">
          <a
            href="#services"
            className={`relative py-1.5 transition-colors duration-250 group ${
              activeSection === 'services'
                ? 'text-orange-500 font-extrabold'
                : 'text-zinc-650 hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-500'
            }`}
          >
            <span>Programs</span>
            <span
              className={`absolute bottom-0 left-0 h-[2.5px] bg-orange-500 transition-all duration-300 ${
                activeSection === 'services' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </a>
          <a
            href="#how-it-works"
            className={`relative py-1.5 transition-colors duration-250 group ${
              activeSection === 'how-it-works'
                ? 'text-orange-500'
                : 'text-zinc-650 hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-500'
            }`}
          >
            <span>How To Book</span>
            <span
              className={`absolute bottom-0 left-0 h-[2.5px] bg-orange-500 transition-all duration-300 ${
                activeSection === 'how-it-works' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </a>
          <a
            href="#reviews"
            className={`relative py-1.5 transition-colors duration-250 group ${
              activeSection === 'reviews'
                ? 'text-orange-500'
                : 'text-zinc-650 hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-500'
            }`}
          >
            <span>Athlete Stories</span>
            <span
              className={`absolute bottom-0 left-0 h-[2.5px] bg-orange-500 transition-all duration-300 ${
                activeSection === 'reviews' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </a>
        </nav>

        {/* Desktop / Mobile Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:text-white transition-colors"
            title="Toggle color theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-orange-500 animate-in spin-in-45 duration-300" />
            ) : (
              <Moon className="h-4.5 w-4.5 animate-in spin-in-45 duration-300" />
            )}
          </button>

          <Link
            href="/booking/lookup"
            className="hidden sm:inline-block text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-450 dark:hover:text-zinc-300 transition"
          >
            Lookup Booking
          </Link>
          <Link
            href="/book"
            className="rounded-full bg-orange-500 px-5 py-2 sm:px-6 text-xs font-black uppercase tracking-widest text-black shadow-md shadow-orange-500/10 hover:shadow-orange-500/30 transition-all duration-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-950"          >
            Book Now
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 p-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-zinc-655 dark:text-zinc-400">

            <a
              href="#services"
              onClick={() => setIsOpen(false)}
              className={`p-2 rounded-lg transition ${
                activeSection === 'services'
                  ? 'bg-orange-500/10 text-orange-500 font-bold'
                  : 'hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-white'
              }`}
            >
              PROGRAMS
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsOpen(false)}
              className={`p-2 rounded-lg transition ${
                activeSection === 'how-it-works'
                  ? 'bg-orange-500/10 text-orange-500 font-bold'
                  : 'hover:bg-zinc-100 hover:text-zinc-955 dark:hover:bg-zinc-900 dark:hover:text-white'
              }`}
            >
              HOW TO BOOK
            </a>

            <a
              href="#reviews"
              onClick={() => setIsOpen(false)}
              className={`p-2 rounded-lg transition ${
                activeSection === 'reviews'
                  ? 'bg-orange-500/10 text-orange-500 font-bold'
                  : 'hover:bg-zinc-100 hover:text-zinc-955 dark:hover:bg-zinc-900 dark:hover:text-white'
              }`}
            >
              ATHLETE STORIES
            </a>
            <Link
              href="/booking/lookup"
              onClick={() => setIsOpen(false)}
              className="p-2 border-t border-zinc-200 dark:border-zinc-900 hover:bg-zinc-100 hover:text-zinc-955 dark:hover:bg-zinc-900 dark:hover:text-white rounded-lg transition text-xs font-semibold text-orange-500"
            >
              🔍 Lookup Booking Status
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
