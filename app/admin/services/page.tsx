'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

interface Service {
  id: string
  name: string
  description?: string
  duration_minutes: number
  price: number
  is_active: boolean
}

export default function ServicesManager() {
  const supabase = createClient()

  // DATA STATE
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // FORM INPUTS
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('')
  const [price, setPrice] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)

  // MODAL TOGGLE
  const [showFormModal, setShowFormModal] = useState(false)

  // FETCH SERVICES
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setServices(data as Service[])
    } catch (err) {
      console.error('Failed to load services:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // HANDLERS
  const handleOpenCreate = () => {
    setEditingService(null)
    setName('')
    setDescription('')
    setDurationMinutes('')
    setPrice('')
    setIsActive(true)
    setShowFormModal(true)
  }

  const handleOpenEdit = (service: Service) => {
    setEditingService(service)
    setName(service.name)
    setDescription(service.description || '')
    setDurationMinutes(service.duration_minutes)
    setPrice(service.price)
    setIsActive(service.is_active)
    setShowFormModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || durationMinutes === '' || price === '') return

    const serviceData = {
      name: name.trim(),
      description: description.trim() || null,
      duration_minutes: Number(durationMinutes),
      price: Number(price),
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editingService) {
        // Update
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
        if (error) throw error
        alert('Service program updated successfully!')
      } else {
        // Insert
        const { error } = await supabase
          .from('services')
          .insert({ ...serviceData, created_at: new Date().toISOString() })
        if (error) throw error
        alert('Service program added successfully!')
      }

      setShowFormModal(false)
      fetchServices()
    } catch (err: any) {
      alert(err?.message || 'Failed to save service details.')
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active, updated_at: new Date().toISOString() })
        .eq('id', service.id)
      if (error) throw error
      fetchServices()
    } catch (err: any) {
      alert(err?.message || 'Failed to update active state.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading training programs...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Services Manager</h1>
          <p className="mt-1 text-sm text-zinc-400">Define basketball coaching structures, session durations, and pricing.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
        >
          Add Program
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-800 transition">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-white leading-snug">{service.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                  service.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {service.description && (
                <p className="text-xs text-zinc-400 leading-relaxed">{service.description}</p>
              )}

              <div className="flex gap-4 text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                <div>
                  <span className="text-zinc-500">Duration:</span>
                  <span className="font-bold text-white ml-1">{service.duration_minutes} Mins</span>
                </div>
                <div className="border-l border-zinc-900 pl-4">
                  <span className="text-zinc-500">Session Price:</span>
                  <span className="font-extrabold text-orange-500 ml-1">₱{Number(service.price).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-end gap-2 text-xs">
              <button
                onClick={() => handleToggleActive(service)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition ${
                  service.is_active ? 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {service.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleOpenEdit(service)}
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">{editingService ? 'Edit Program Details' : 'Add Program'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Program Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Individual Skill Session"
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 60"
                    className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 800"
                    className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active / Bookable</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the program covers (shooting, handles, conditioning)..."
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-lg border border-zinc-855 bg-zinc-850 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
                >
                  Save Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
