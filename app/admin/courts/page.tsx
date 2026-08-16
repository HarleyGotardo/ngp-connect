'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { showSuccess, showError } from '@/lib/swal'

interface Court {
  id: string
  name: string
  location: string
  rental_price: number
  description?: string
  notes?: string
  is_active: boolean
}

export default function CourtsManager() {
  const supabase = createClient()

  // STATE
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)

  // FORM INPUTS
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [rentalPrice, setRentalPrice] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  const fetchCourts = async () => {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCourts((data || []) as Court[])
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenCreate = () => {
    setEditingCourt(null)
    setName('')
    setLocation('')
    setRentalPrice('')
    setDescription('')
    setNotes('')
    setIsActive(true)
    setShowFormModal(true)
  }

  const handleOpenEdit = (court: Court) => {
    setEditingCourt(court)
    setName(court.name)
    setLocation(court.location)
    setRentalPrice(court.rental_price)
    setDescription(court.description || '')
    setNotes(court.notes || '')
    setIsActive(court.is_active)
    setShowFormModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !location || rentalPrice === '') return

    const courtPayload = {
      name,
      location,
      rental_price: Number(rentalPrice),
      description: description || null,
      notes: notes || null,
      is_active: isActive,
    }

    try {
      if (editingCourt) {
        const { error } = await supabase
          .from('courts')
          .update(courtPayload)
          .eq('id', editingCourt.id)
        if (error) throw error
        showSuccess('Updated!', 'Court details updated!')
      } else {
        const { error } = await supabase.from('courts').insert(courtPayload)
        if (error) throw error
        showSuccess('Added!', 'Court venue added successfully!')
      }

      setShowFormModal(false)
      fetchCourts()
    } catch (err: any) {
      showError('Error', err.message || 'Failed to save court details.')
    }
  }

  const handleToggleActive = async (court: Court) => {
    try {
      const { error } = await supabase
        .from('courts')
        .update({ is_active: !court.is_active })
        .eq('id', court.id)

      if (error) throw error
      showSuccess('Updated!', `Court marked ${!court.is_active ? 'Active' : 'Inactive'}!`)
      fetchCourts()
    } catch (err: any) {
      showError('Error', err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading Courts...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Courts Venues</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage basketball training courts where NGP operates.</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 shadow-lg shadow-orange-500/10 transition"
        >
          Add Court Venue
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courts.map((court) => (
          <div key={court.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-800 transition shadow-sm dark:shadow-none">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{court.name}</h2>
                  <span className="text-xs text-zinc-500">📍 {court.location}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  court.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                }`}>
                  {court.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {court.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{court.description}</p>
              )}

              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Rental Price:</span>
                  <span className="font-bold text-zinc-900 dark:text-white ml-1">₱{Number(court.rental_price).toLocaleString()} / session</span>
                </div>
              </div>

              {court.notes && (
                <div className="rounded bg-zinc-50 dark:bg-zinc-950 p-2.5 text-[11px] text-zinc-500 border border-zinc-200 dark:border-zinc-900">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-0.5">Notes:</span>
                  {court.notes}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-900 flex justify-end gap-2 text-xs">
              <button
                onClick={() => handleToggleActive(court)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition duration-200 ${
                  court.is_active
                    ? 'border border-zinc-200 bg-zinc-50 text-zinc-650 hover:text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {court.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleOpenEdit(court)}
                className="rounded bg-orange-500 px-3.5 py-1.5 font-bold uppercase text-black hover:bg-orange-400"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <h3 className="text-lg font-bold mb-4">{editingCourt ? 'Edit Court Details' : 'Add Court Venue'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Court Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CSC wooden court"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mandaue City"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Rental Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={rentalPrice}
                    onChange={(e) => setRentalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Active</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Premium wooden court..."
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Internal Notes / Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Key is with admin office..."
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-855 dark:bg-zinc-850 dark:text-white dark:hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
                >
                  Save Court
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
