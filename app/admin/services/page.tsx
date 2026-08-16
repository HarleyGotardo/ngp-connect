'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { showSuccess, showError, confirmDanger, confirmAction } from '@/lib/swal'

interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number
  description?: string
  is_active: boolean
}

export default function ServicesManager() {
  const supabase = createClient()

  // STATE
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  // FORM INPUTS
  const [name, setName] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('')
  const [price, setPrice] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setServices((data || []) as Service[])
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenCreate = () => {
    setEditingService(null)
    setName('')
    setDurationMinutes('')
    setPrice('')
    setDescription('')
    setIsActive(true)
    setShowFormModal(true)
  }

  const handleOpenEdit = (service: Service) => {
    setEditingService(service)
    setName(service.name)
    setDurationMinutes(service.duration_minutes)
    setPrice(service.price)
    setDescription(service.description || '')
    setIsActive(service.is_active)
    setShowFormModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || durationMinutes === '' || price === '') return

    const servicePayload = {
      name,
      duration_minutes: Number(durationMinutes),
      price: Number(price),
      description: description || null,
      is_active: isActive,
    }

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(servicePayload)
          .eq('id', editingService.id)
        if (error) throw error
        showSuccess('Updated!', 'Training program details updated!')
      } else {
        const { error } = await supabase.from('services').insert(servicePayload)
        if (error) throw error
        showSuccess('Added!', 'Training program added successfully!')
      }

      setShowFormModal(false)
      fetchServices()
    } catch (err: any) {
      showError('Error', err.message || 'Failed to save training program.')
    }
  }

  const handleToggleActive = async (service: Service) => {
    const isDeactivating = service.is_active
    const confirmed = isDeactivating
      ? await confirmDanger(
          'Deactivate Program',
          `Are you sure you want to deactivate "${service.name}"? It will no longer be visible or bookable by clients.`,
          'Yes, deactivate'
        )
      : await confirmAction(
          'Activate Program',
          `Are you sure you want to activate "${service.name}"? It will become visible and bookable by clients.`,
          'Yes, activate'
        )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error
      showSuccess('Updated!', `Program marked ${!service.is_active ? 'Active' : 'Inactive'}!`)
      fetchServices()
    } catch (err: any) {
      showError('Error', err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading Programs...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Coaching Programs</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Define basketball coaching structures, session durations, and pricing.</p>
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
          <div key={service.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-800 transition shadow-sm dark:shadow-none">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">{service.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                  service.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                }`}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {service.description && (
                <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">{service.description}</p>
              )}

              <div className="flex gap-4 text-xs bg-zinc-50 dark:bg-zinc-955 p-3 rounded-lg border border-zinc-200 dark:border-zinc-900">
                <div>
                  <span className="text-zinc-500">Duration:</span>
                  <span className="font-bold text-zinc-900 dark:text-white ml-1">{service.duration_minutes} Mins</span>
                </div>
                <div className="border-l border-zinc-200 dark:border-zinc-900 pl-4">
                  <span className="text-zinc-500">Session Price:</span>
                  <span className="font-extrabold text-orange-500 ml-1">₱{Number(service.price).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-900 flex justify-end gap-2 text-xs">
              <button
                onClick={() => handleToggleActive(service)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition duration-200 ${
                  service.is_active
                    ? 'border border-zinc-200 bg-zinc-50 text-zinc-655 hover:text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                    : 'bg-green-600 text-white hover:bg-green-500'
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <h3 className="text-lg font-bold mb-4">{editingService ? 'Edit Program Details' : 'Add Program'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Program Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Individual Skill Session"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 60"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 800"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-650 dark:text-zinc-400">Active / Bookable</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the program covers (shooting, handles, conditioning)..."
                  rows={3}
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
