'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/client'
import { Plus, X, MapPin, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { showSuccess, showError, showWarning, confirmDanger } from '@/lib/swal'

interface CoachAvailability {
  id: string
  coach_id: string
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

// Calendar Settings
const START_HOUR = 8 // 8:00 AM
const END_HOUR = 22 // 10:00 PM
const HOUR_HEIGHT = 60 // 1 hour = 60px (so 1 minute = 1px)
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT

export default function AvailabilityManager() {
  const supabase = createClient()

  // DATA STATE
  const [coachAvails, setCoachAvails] = useState<CoachAvailability[]>([])
  const [courtAvails, setCourtAvails] = useState<CourtAvailability[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [coachId, setCoachId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // CALENDAR NAVIGATION
  const [currentDate, setCurrentDate] = useState(new Date())

  // MODAL / ADD / DETAIL STATE
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string
    type: 'coach' | 'court'
    title: string
    start: string
    end: string
    courtName?: string
    location?: string
    status: string
  } | null>(null)

  // ADD FORM STATES
  const [formType, setFormType] = useState<'coach' | 'court'>('coach')
  const [formCourtId, setFormCourtId] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [alsoCreateCourtBlocks, setAlsoCreateCourtBlocks] = useState(false)
  const [selectedFormCourtIds, setSelectedFormCourtIds] = useState<string[]>([])
  const [alsoCreateCoachBlock, setAlsoCreateCoachBlock] = useState(false)

  // SELECTION DRAG HIGHLIGHTER STATES
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionDay, setSelectionDay] = useState<Date | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState(0)
  const [selectStartMin, setSelectStartMin] = useState(0)
  const [selectEndMin, setSelectEndMin] = useState(0)

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

      // Fetch active courts
      const { data: cts } = await supabase
        .from('courts')
        .select('id, name, location')
        .eq('is_active', true)
      setCourts((cts || []) as Court[])
      if (cts && cts.length > 0) setFormCourtId(cts[0].id)
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

  // WEEK COMPUTATIONS (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
  }, [currentDate])

  const monthYearHeader = useMemo(() => {
    if (weekDays.length === 0) return ''
    const start = weekDays[0]
    const end = weekDays[6]
    
    const startMonth = start.toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Manila' })
    const startYear = start.getFullYear()
    const endMonth = end.toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Manila' })
    const endYear = end.getFullYear()

    if (startYear !== endYear) {
      return `${startMonth} ${startYear} – ${endMonth} ${endYear}`
    }
    if (startMonth !== endMonth) {
      return `${startMonth} – ${endMonth} ${startYear}`
    }
    return `${startMonth} ${startYear}`
  }, [weekDays])

  const handlePrevWeek = () => {
    const d = new Date(currentDate)
    d.setDate(currentDate.getDate() - 7)
    setCurrentDate(d)
  }

  const handleNextWeek = () => {
    const d = new Date(currentDate)
    d.setDate(currentDate.getDate() + 7)
    setCurrentDate(d)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // EVENT GRID MATH
  const getEventPosition = (startAt: string, endAt: string) => {
    const start = new Date(startAt)
    const end = new Date(endAt)

    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()

    const gridStartMinutes = START_HOUR * 60
    const top = Math.max(0, startMinutes - gridStartMinutes)
    const height = Math.max(30, endMinutes - startMinutes)

    return { top, height }
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  // MOUSE DRAG / CLICK SCHEDULING SELECTION
  const handleMouseDown = (dayDate: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.event-card')) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const minutes = Math.floor(clickY)
    const rounded = Math.round(minutes / 30) * 30

    setIsSelecting(true)
    setSelectionDay(dayDate)
    setSelectionAnchor(rounded)
    setSelectStartMin(rounded)
    setSelectEndMin(rounded + 60) // default 1 hour
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionDay) return

    const rect = e.currentTarget.getBoundingClientRect()
    const currentY = e.clientY - rect.top
    const minutes = Math.floor(currentY)
    const roundedCurrent = Math.round(minutes / 30) * 30

    const start = Math.min(selectionAnchor, roundedCurrent)
    const end = Math.max(selectionAnchor + 30, roundedCurrent)

    setSelectStartMin(Math.max(0, start))
    setSelectEndMin(Math.min(TOTAL_HEIGHT, end))
  }

  const handleMouseUp = () => {
    if (!isSelecting || !selectionDay) return

    setIsSelecting(false)
    
    // Format selection to form inputs
    const pad = (num: number) => String(num).padStart(2, '0')
    const formattedDate = `${selectionDay.getFullYear()}-${pad(selectionDay.getMonth() + 1)}-${pad(selectionDay.getDate())}`
    
    const startHour = START_HOUR + Math.floor(selectStartMin / 60)
    const startMin = selectStartMin % 60
    const formattedStart = `${pad(startHour)}:${pad(startMin)}`

    const endHour = START_HOUR + Math.floor(selectEndMin / 60)
    const endMin = selectEndMin % 60
    const formattedEnd = `${pad(Math.min(END_HOUR, endHour))}:${pad(endMin)}`

    setFormDate(formattedDate)
    setFormStartTime(formattedStart)
    setFormEndTime(formattedEnd)
    setAlsoCreateCourtBlocks(false)
    setSelectedFormCourtIds([])
    setAlsoCreateCoachBlock(false)
    setShowAddModal(true)
  }

  // FORM SUBMISSION
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDate || !formStartTime || !formEndTime) return

    const startISO = new Date(`${formDate}T${formStartTime}:00`).toISOString()
    const endISO = new Date(`${formDate}T${formEndTime}:00`).toISOString()

    if (startISO >= endISO) {
      showWarning('Invalid Time', 'Start time must be before end time.')
      return
    }

    try {
      if (formType === 'coach') {
        if (!coachId) {
          showWarning('Not Logged In', 'You must be logged in as coach.')
          return
        }
        const { error } = await supabase.from('coach_availability').insert({
          coach_id: coachId,
          start_at: startISO,
          end_at: endISO,
          status: 'available',
        })
        if (error) throw error

        if (alsoCreateCourtBlocks && selectedFormCourtIds.length > 0) {
          const courtInserts = selectedFormCourtIds.map((courtId) => ({
            court_id: courtId,
            start_at: startISO,
            end_at: endISO,
            status: 'available',
          }))
          const { error: courtErr } = await supabase.from('court_availability').insert(courtInserts)
          if (courtErr) throw courtErr
        }

        showSuccess('Saved!', alsoCreateCourtBlocks && selectedFormCourtIds.length > 0
          ? 'Coach slot + court blocks added!'
          : 'Coach availability slot added!')
      } else {
        if (!formCourtId) {
          showWarning('No Court Selected', 'Please select a court.')
          return
        }
        const { error } = await supabase.from('court_availability').insert({
          court_id: formCourtId,
          start_at: startISO,
          end_at: endISO,
          status: 'available',
        })
        if (error) throw error

        if (alsoCreateCoachBlock) {
          if (!coachId) {
            showWarning('Missing Coach ID', 'Could not open coach slot automatically.')
          } else {
            const { error: coachErr } = await supabase.from('coach_availability').insert({
              coach_id: coachId,
              start_at: startISO,
              end_at: endISO,
              status: 'available',
            })
            if (coachErr) throw coachErr
          }
        }

        showSuccess('Saved!', alsoCreateCoachBlock
          ? 'Court block + coach slot added!'
          : 'Court availability block added!')
      }

      setShowAddModal(false)
      setSelectionDay(null)
      fetchData()
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to save block.')
    }
  }

  // DELETE SUBMISSIONS
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    const slotLabel = selectedEvent.type === 'coach' ? 'Coach' : 'Court'
    const confirmed = await confirmDanger(
      `Delete ${slotLabel} Slot`,
      `This will permanently release this availability block. If a session was booked on it, the booking will lose its slot reference.`,
      'Yes, delete'
    )
    if (!confirmed) return

    try {
      if (selectedEvent.type === 'coach') {
        const { error } = await supabase.from('coach_availability').delete().eq('id', selectedEvent.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('court_availability').delete().eq('id', selectedEvent.id)
        if (error) throw error
      }

      showSuccess('Deleted', 'Availability block released successfully.')
      setShowDetailModal(false)
      setSelectedEvent(null)
      fetchData()
    } catch (err: any) {
      showError('Error', err?.message || 'Delete failed. Slot may be booked by a client.')
    }
  }

  const handleOpenDetail = (event: any) => {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading Calendar...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Availability Planner</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Google Calendar interactive scheduling view for NGP.</p>
        </div>
        
        <button
          onClick={() => {
            const now = new Date()
            const pad = (num: number) => String(num).padStart(2, '0')
            setFormDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
            setFormStartTime('09:00')
            setFormEndTime('10:00')
            setFormType('coach')
            setAlsoCreateCourtBlocks(false)
            setSelectedFormCourtIds([])
            setAlsoCreateCoachBlock(false)
            setShowAddModal(true)
          }}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 shadow-lg shadow-orange-500/10 transition"
        >
          + Add Time Block
        </button>
      </div>

      {/* CALENDAR CONTROLS SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
          >
            Today
          </button>
          
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button
              onClick={handlePrevWeek}
              className="bg-white hover:bg-zinc-100 dark:bg-zinc-900 px-3 py-2 text-xs dark:hover:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
              title="Previous Week"
            >
              ◀
            </button>
            <button
              onClick={handleNextWeek}
              className="bg-white hover:bg-zinc-100 dark:bg-zinc-900 px-3 py-2 text-xs dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
              title="Next Week"
            >
              ▶
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white ml-2">{monthYearHeader}</h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-orange-500/20 border border-orange-500/40 block" />
            <span className="text-zinc-650 dark:text-zinc-400">Coach Availability</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-blue-500/20 border border-blue-500/40 block" />
            <span className="text-zinc-650 dark:text-zinc-400">Court Availability</span>
          </div>
        </div>
      </div>

      {/* Mobile Agenda View (hidden on desktop) */}
      <div className="block md:hidden space-y-4">
        {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, new Date())
          const coachEventsThisDay = coachAvails.filter(s => isSameDay(new Date(s.start_at), day))
          const courtEventsThisDay = courtAvails.filter(s => isSameDay(new Date(s.start_at), day))
          const hasEvents = coachEventsThisDay.length > 0 || courtEventsThisDay.length > 0

          const padHelper = (num: number) => String(num).padStart(2, '0')
          const dayDateStr = `${day.getFullYear()}-${padHelper(day.getMonth() + 1)}-${padHelper(day.getDate())}`

          return (
            <div key={idx} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-4 space-y-3 shadow-sm dark:shadow-none transition-colors duration-200">
              {/* Day Header */}
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center font-extrabold text-xs ${
                    isToday ? 'bg-orange-500 text-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                  }`}>
                    {day.getDate()}
                  </span>
                  <span className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                    {day.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })}
                  </span>
                </div>
                
                {/* Plus button to add slot directly for this day */}
                <button
                  onClick={() => {
                    setFormDate(dayDateStr)
                    setFormStartTime('09:00')
                    setFormEndTime('10:00')
                    setFormType('coach')
                    setSelectionDay(day)
                    setAlsoCreateCourtBlocks(false)
                    setSelectedFormCourtIds([])
                    setAlsoCreateCoachBlock(false)
                    setShowAddModal(true)
                  }}
                  className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center hover:bg-orange-500 hover:text-black transition"
                  title="Add block for this day"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Day's Events */}
              {!hasEvents ? (
                <div className="text-center py-4 text-xs text-zinc-400 dark:text-zinc-500 italic">
                  No availability blocks scheduled
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Coach blocks */}
                  {coachEventsThisDay.map((s) => {
                    const displayStart = new Date(s.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
                    const displayEnd = new Date(s.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          handleOpenDetail({
                            id: s.id,
                            type: 'coach',
                            title: 'Coach JP Available',
                            start: s.start_at,
                            end: s.end_at,
                            status: s.status,
                          })
                        }}
                        className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 text-orange-500 text-xs flex justify-between items-center cursor-pointer hover:bg-orange-500/10 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold uppercase text-[9px] text-orange-500">Coach JP Available</div>
                          <div className="font-bold text-zinc-900 dark:text-white">{displayStart} - {displayEnd}</div>
                        </div>
                        <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">{s.status}</span>
                      </div>
                    )
                  })}

                  {/* Court blocks */}
                  {courtEventsThisDay.map((s) => {
                    const displayStart = new Date(s.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
                    const displayEnd = new Date(s.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          handleOpenDetail({
                            id: s.id,
                            type: 'court',
                            title: s.courts?.name || 'Court Block',
                            start: s.start_at,
                            end: s.end_at,
                            courtName: s.courts?.name,
                            location: s.courts?.location,
                            status: s.status,
                          })
                        }}
                        className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs flex justify-between items-center cursor-pointer hover:bg-blue-500/10 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold uppercase text-[9px] text-blue-500">Court Reserved</div>
                          <div className="font-bold text-zinc-900 dark:text-white">{s.courts?.name}</div>
                          <div className="text-[10px] text-zinc-550">{displayStart} - {displayEnd}</div>
                        </div>
                        <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">{s.status}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* WEEK CALENDAR GRID (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/10">
        <div className="min-w-[800px] select-none">
          {/* Day Headers */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-zinc-200 dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-900/20 py-2 text-center text-xs">
            <div className="flex items-center justify-center font-bold text-zinc-400 dark:text-zinc-500">GMT+08</div>
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, new Date())
              return (
                <div key={idx} className="border-l border-zinc-200 dark:border-zinc-900/50 py-1">
                  <div className="font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-wide">
                    {day.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' })}
                  </div>
                  <div className={`mt-1.5 mx-auto h-7 w-7 rounded-full flex items-center justify-center font-extrabold text-sm ${
                    isToday ? 'bg-orange-500 text-black shadow shadow-orange-500/20' : 'text-zinc-800 dark:text-white'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time and Columns body */}
          <div 
            className="grid grid-cols-[80px_repeat(7,1fr)] relative" 
            style={{ height: `${TOTAL_HEIGHT}px` }}
            onMouseLeave={() => setIsSelecting(false)}
          >
            {/* Horizontal Hour Lines (Overlay backdrop) */}
            <div className="absolute inset-0 grid grid-rows-14 pointer-events-none z-0">
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, hourIdx) => (
                <div key={hourIdx} className="border-b border-zinc-200/60 dark:border-zinc-900/40 w-full" style={{ height: `${HOUR_HEIGHT}px` }} />
              ))}
            </div>

            {/* Left side Hour Labels */}
            <div className="flex flex-col text-zinc-400 dark:text-zinc-500 text-[10px] font-bold text-right pr-3 select-none relative z-10">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                const h = START_HOUR + i
                const ampm = h >= 12 ? 'PM' : 'AM'
                const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
                return (
                  <div key={i} style={{ height: `${HOUR_HEIGHT}px` }} className="pt-1">
                    {displayHour} {ampm}
                  </div>
                )
              })}
            </div>

            {/* Day columns */}
            {weekDays.map((day, colIdx) => {
              // Filters coach/court events on this day
              const coachEventsThisDay = coachAvails.filter(s => isSameDay(new Date(s.start_at), day))
              const courtEventsThisDay = courtAvails.filter(s => isSameDay(new Date(s.start_at), day))
              const isHighlighterVisible = (isSelecting || showAddModal) && selectionDay && isSameDay(selectionDay, day)

              return (
                <div
                  key={colIdx}
                  onMouseDown={(e) => handleMouseDown(day, e)}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="border-l border-zinc-200 dark:border-zinc-900/60 h-full relative hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10 cursor-crosshair transition-colors z-10"
                >
                  {/* Highlighter Block */}
                  {isHighlighterVisible && (
                    <div
                      style={{
                        top: `${selectStartMin}px`,
                        height: `${selectEndMin - selectStartMin}px`
                      }}
                      className={`absolute w-[90%] left-0 z-0 rounded-lg border-2 border-dashed pointer-events-none animate-pulse ${
                        formType === 'coach'
                          ? 'bg-orange-500/20 border-orange-500/60 text-orange-400'
                          : 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                      }`}
                    />
                  )}

                  {/* ---- Overlap-aware event rendering ---- */}
                  {(() => {
                    // Build a list of "merged" slots for this day
                    const rendered: React.ReactNode[] = []

                    // Track which court events were paired with a coach event
                    const pairedCourtIds = new Set<string>()

                    // 1. Iterate coach events; find overlapping court events
                    coachEventsThisDay.forEach((coach) => {
                      const coachStart = new Date(coach.start_at).getTime()
                      const coachEnd   = new Date(coach.end_at).getTime()

                      // Find all court events that overlap this coach block
                      const overlappingCourts = courtEventsThisDay.filter((court) => {
                        const cs = new Date(court.start_at).getTime()
                        const ce = new Date(court.end_at).getTime()
                        return cs < coachEnd && ce > coachStart
                      })

                      if (overlappingCourts.length > 0) {
                        // Paired — render ONE combined card spanning the full coach time
                        overlappingCourts.forEach((court) => pairedCourtIds.add(court.id))

                        const pos = getEventPosition(coach.start_at, coach.end_at)
                        const dStart = new Date(coach.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
                        const dEnd   = new Date(coach.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
                        const courtNames = overlappingCourts.map(c => c.courts?.name).filter(Boolean).join(', ')

                        rendered.push(
                          <div
                            key={`combined-${coach.id}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              // Open coach detail on click (representative)
                              handleOpenDetail({
                                id: coach.id,
                                type: 'coach',
                                title: 'Coach JP + Court Open',
                                start: coach.start_at,
                                end: coach.end_at,
                                status: coach.status,
                              })
                            }}
                            style={{ top: `${pos.top}px`, height: `${pos.height}px` }}
                            className="event-card absolute w-[90%] left-0 z-10 rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-2 text-[10px] flex flex-col justify-between transition-all cursor-pointer shadow-md shadow-emerald-500/5 hover:-translate-y-[1px]"
                          >
                            <div>
                              <div className="font-extrabold tracking-wide uppercase text-[8px] text-emerald-400 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 -ml-0.5" />
                                Coach + Court
                              </div>
                              <div className="font-bold text-zinc-950 dark:text-white mt-0.5 leading-tight truncate">
                                JP + {courtNames || 'Court'}
                              </div>
                            </div>
                            <div className="font-bold mt-1 text-[9px] opacity-90 leading-none">
                              {dStart} – {dEnd}
                            </div>
                          </div>
                        )
                      } else {
                        // Standalone coach block — orange
                        const pos = getEventPosition(coach.start_at, coach.end_at)
                        const dStart = new Date(coach.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
                        const dEnd   = new Date(coach.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })

                        rendered.push(
                          <div
                            key={coach.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetail({
                                id: coach.id,
                                type: 'coach',
                                title: 'Coach JP Block',
                                start: coach.start_at,
                                end: coach.end_at,
                                status: coach.status,
                              })
                            }}
                            style={{ top: `${pos.top}px`, height: `${pos.height}px` }}
                            className="event-card absolute w-[90%] left-0 z-10 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 p-2 text-[10px] flex flex-col justify-between transition-all cursor-pointer shadow hover:shadow-orange-500/5 hover:-translate-y-[1px]"
                          >
                            <div>
                              <div className="font-extrabold tracking-wide uppercase text-[8px] text-orange-500">Coach Block</div>
                              <div className="font-bold text-zinc-950 dark:text-white mt-0.5 leading-none">JP Availability</div>
                            </div>
                            <div className="font-bold mt-1 text-[9px] opacity-90 leading-none">{dStart} - {dEnd}</div>
                          </div>
                        )
                      }
                    })

                    // 2. Render unpaired court events — blue
                    courtEventsThisDay
                      .filter(s => !pairedCourtIds.has(s.id))
                      .forEach((s) => {
                        const pos = getEventPosition(s.start_at, s.end_at)
                        const dStart = new Date(s.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })
                        const dEnd   = new Date(s.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })

                        rendered.push(
                          <div
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetail({
                                id: s.id,
                                type: 'court',
                                title: s.courts?.name || 'Court Block',
                                start: s.start_at,
                                end: s.end_at,
                                courtName: s.courts?.name,
                                location: s.courts?.location,
                                status: s.status,
                              })
                            }}
                            style={{ top: `${pos.top}px`, height: `${pos.height}px` }}
                            className="event-card absolute w-[90%] left-0 z-10 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-2 text-[10px] flex flex-col justify-between transition-all cursor-pointer shadow hover:shadow-blue-500/5 hover:-translate-y-[1px]"
                          >
                            <div>
                              <div className="font-extrabold tracking-wide uppercase text-[8px] text-blue-500">Court Reserved</div>
                              <div className="font-bold text-zinc-950 dark:text-white mt-0.5 leading-tight truncate">{s.courts?.name}</div>
                            </div>
                            <div className="font-bold mt-1 text-[9px] opacity-90 leading-none">{dStart} - {dEnd}</div>
                          </div>
                        )
                      })

                    return rendered
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* =========================================
          ADD SLOT DIALOG MODAL
          ========================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <h3 className="text-lg font-bold mb-4">Add Availability Time Block</h3>
            
            <form onSubmit={handleSaveAvailability} className="space-y-4">
              {/* Type Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Block Type</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('coach')}
                    className={`rounded-lg py-2.5 text-xs font-bold uppercase transition ${
                      formType === 'coach'
                        ? 'bg-orange-500 text-black'
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    Coach JP Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('court')}
                    className={`rounded-lg py-2.5 text-xs font-bold uppercase transition ${
                      formType === 'court'
                        ? 'bg-orange-500 text-black'
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    Court Rental Open
                  </button>
                </div>
              </div>

              {/* Also open availability for courts (conditional) */}
              {formType === 'coach' && (
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={alsoCreateCourtBlocks}
                      onChange={(e) => {
                        setAlsoCreateCourtBlocks(e.target.checked)
                        if (e.target.checked && courts.length > 0 && selectedFormCourtIds.length === 0) {
                          setSelectedFormCourtIds([courts[0].id])
                        }
                      }}
                      className="rounded border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Also open availability for rented courts
                    </span>
                  </label>

                  {alsoCreateCourtBlocks && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <span className="block text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
                        Select courts to open:
                      </span>
                      <div className="space-y-2">
                        {courts.map((court) => {
                          const isChecked = selectedFormCourtIds.includes(court.id)
                          return (
                            <label key={court.id} className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFormCourtIds((prev) => [...prev, court.id])
                                  } else {
                                    setSelectedFormCourtIds((prev) => prev.filter((id) => id !== court.id))
                                  }
                                }}
                                className="rounded border-zinc-200 bg-zinc-100 dark:border-zinc-805 dark:bg-zinc-900 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5"
                              />
                              <span>
                                {court.name} <span className="text-[10px] text-zinc-450">({court.location})</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Court Dropdown (conditional) */}
              {formType === 'court' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Select Basket Court</label>
                    <select
                      required
                      value={formCourtId}
                      onChange={(e) => setFormCourtId(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                    >
                      {courts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={alsoCreateCoachBlock}
                        onChange={(e) => setAlsoCreateCoachBlock(e.target.checked)}
                        className="rounded border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Also open Coach JP availability for this period
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-650 dark:text-zinc-400">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-650 dark:text-zinc-400">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-655 dark:text-zinc-400">End Time</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectionDay(null)
                  }}
                  className="rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-855 dark:bg-zinc-850 dark:text-white dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formType === 'court' && courts.length === 0}
                  className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition disabled:opacity-50"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          DETAIL SLOT DIALOG MODAL
          ========================================= */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-900 pb-3 mb-4">
              <div>
                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                  selectedEvent.type === 'coach' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {selectedEvent.type === 'coach' ? 'Coach Availability' : 'Court Rental Open'}
                </span>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white mt-2">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="h-7 w-7 rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 text-xs flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
              {selectedEvent.location && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Location</span>
                  <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" /> {selectedEvent.location}
                  </span>
                </div>
              )}

              <div>
                <span className="text-zinc-500 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Time Interval</span>
                <span className="font-semibold text-orange-500 mt-0.5 flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5 text-orange-500" />
                  {new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
                </span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  {new Date(selectedEvent.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })} - {new Date(selectedEvent.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Status</span>
                <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                  selectedEvent.status === 'available' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                }`}>
                  {selectedEvent.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 dark:text-white dark:hover:bg-zinc-800"
              >
                Close
              </button>
              {selectedEvent.status === 'available' && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-500 transition"
                >
                  Delete Block
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
