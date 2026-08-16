'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

interface CoachAvailability {
  id: string
  start_at: string
  end_at: string
  status: string
}

interface Court {
  id: string
  name: string
  location: string
}

interface CourtAvailability {
  id: string
  court_id: string
  start_at: string
  end_at: string
  status: string
  courts?: Court
}

export default function AvailabilityManager() {
  const supabase = createClient()

  // DATA STATE
  const [coachAvails, setCoachAvails] = useState<CoachAvailability[]>([])
  const [courtAvails, setCourtAvails] = useState<CourtAvailability[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [coachId, setCoachId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // INPUTS FOR NEW AVAILABILITY
  const [coachStart, setCoachStart] = useState('')
  const [coachEnd, setCoachEnd] = useState('')

  const [courtIdSelect, setCourtIdSelect] = useState('')
  const [courtStart, setCourtStart] = useState('')
  const [courtEnd, setCourtEnd] = useState('')

  // FETCH DATA
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCoachId(user.id)

      // Fetch coach availability
      const { data: cAvails } = await supabase
        .from('coach_availability')
        .select('*')
        .order('start_at', { ascending: true })
      setCoachAvails((cAvails || []) as CoachAvailability[])

      // Fetch court availability
      const { data: ctAvails } = await supabase
        .from('court_availability')
        .select('*, courts(id, name, location)')
        .order('start_at', { ascending: true })
      setCourtAvails((ctAvails || []) as CourtAvailability[])

      // Fetch active courts list
      const { data: cts } = await supabase
        .from('courts')
        .select('id, name, location')
        .eq('is_active', true)
      setCourts((cts || []) as Court[])
      if (cts && cts.length > 0) setCourtIdSelect(cts[0].id)
    } catch (err) {
      console.error('Failed to load availability schedules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // HANDLERS FOR CREATING
  const handleAddCoachAvail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachId || !coachStart || !coachEnd) return

    const start = new Date(coachStart).toISOString()
    const end = new Date(coachEnd).toISOString()

    if (start >= end) {
      alert('Start time must be before end time.')
      return
    }

    try {
      const { error } = await supabase.from('coach_availability').insert({
        coach_id: coachId,
        start_at: start,
        end_at: end,
        status: 'available',
      })

      if (error) throw error
      alert('Coach availability slot added!')
      setCoachStart('')
      setCoachEnd('')
      fetchData()
    } catch (err: any) {
      alert(err?.message || 'Failed to add availability.')
    }
  }

  const handleAddCourtAvail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courtIdSelect || !courtStart || !courtEnd) return

    const start = new Date(courtStart).toISOString()
    const end = new Date(courtEnd).toISOString()

    if (start >= end) {
      alert('Start time must be before end time.')
      return
    }

    try {
      const { error } = await supabase.from('court_availability').insert({
        court_id: courtIdSelect,
        start_at: start,
        end_at: end,
        status: 'available',
      })

      if (error) throw error
      alert('Court availability slot added!')
      setCourtStart('')
      setCourtEnd('')
      fetchData()
    } catch (err: any) {
      alert(err?.message || 'Failed to add availability.')
    }
  }

  // HANDLERS FOR DELETING
  const handleDeleteCoachAvail = async (id: string) => {
    const conf = confirm('Are you sure you want to delete this availability slot?')
    if (!conf) return
    try {
      const { error } = await supabase.from('coach_availability').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete. The slot may be referenced by an active booking.')
    }
  }

  const handleDeleteCourtAvail = async (id: string) => {
    const conf = confirm('Are you sure you want to delete this availability slot?')
    if (!conf) return
    try {
      const { error } = await supabase.from('court_availability').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete. The slot may be referenced by an active booking.')
    }
  }

  // FORMAT HELPERS
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading schedules...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Availability Planner</h1>
        <p className="mt-1 text-sm text-zinc-400">Manually schedule when you are available and when basketball courts are open for training.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* =========================================
            COACH SCHEDULE COLUMN
            ========================================= */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <h2 className="text-lg font-bold text-white">Coach JP Availability</h2>
            <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-500">Coach</span>
          </div>

          {/* Form */}
          <form onSubmit={handleAddCoachAvail} className="space-y-4 rounded-xl bg-zinc-950 p-4 border border-zinc-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Create New Time Slot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={coachStart}
                  onChange={(e) => setCoachStart(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={coachEnd}
                  onChange={(e) => setCoachEnd(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded bg-orange-500 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
            >
              Add Time Block
            </button>
          </form>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Coach Blocks</h3>
            {coachAvails.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-600 border border-dashed border-zinc-900 rounded-lg">
                No slots configured yet.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {coachAvails.map((s) => (
                  <div key={s.id} className="flex justify-between items-center rounded-lg border border-zinc-900 bg-zinc-950 p-3 text-xs">
                    <div>
                      <div className="font-semibold text-white">{formatSlotDate(s.start_at)}</div>
                      <div className="text-orange-500 font-bold mt-0.5">
                        {formatSlotTime(s.start_at)} - {formatSlotTime(s.end_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {s.status}
                      </span>
                      {s.status === 'available' && (
                        <button
                          onClick={() => handleDeleteCoachAvail(s.id)}
                          className="text-zinc-600 hover:text-red-500 text-sm"
                          title="Delete slot"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================
            COURT SCHEDULE COLUMN
            ========================================= */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <h2 className="text-lg font-bold text-white">Court Rental Schedule</h2>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-400">Court</span>
          </div>

          {/* Form */}
          <form onSubmit={handleAddCourtAvail} className="space-y-4 rounded-xl bg-zinc-950 p-4 border border-zinc-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Reserve Court Slot</h3>
            
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Select Basket Court</label>
              <select
                required
                value={courtIdSelect}
                onChange={(e) => setCourtIdSelect(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              >
                {courts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={courtStart}
                  onChange={(e) => setCourtStart(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={courtEnd}
                  onChange={(e) => setCourtEnd(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={courts.length === 0}
              className="w-full rounded bg-orange-500 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition disabled:opacity-50"
            >
              Add Court Block
            </button>
          </form>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Court Blocks</h3>
            {courtAvails.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-600 border border-dashed border-zinc-900 rounded-lg">
                No court sessions reserved yet.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {courtAvails.map((s) => (
                  <div key={s.id} className="flex justify-between items-center rounded-lg border border-zinc-900 bg-zinc-950 p-3 text-xs">
                    <div>
                      <div className="font-semibold text-white">🏀 {s.courts?.name}</div>
                      <div className="text-zinc-500 text-[10px] mt-0.5">{formatSlotDate(s.start_at)}</div>
                      <div className="text-orange-500 font-bold mt-0.5">
                        {formatSlotTime(s.start_at)} - {formatSlotTime(s.end_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {s.status}
                      </span>
                      {s.status === 'available' && (
                        <button
                          onClick={() => handleDeleteCourtAvail(s.id)}
                          className="text-zinc-600 hover:text-red-500 text-sm"
                          title="Delete slot"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
