'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

interface Client {
  id: string
  full_name: string
  email: string
  phone: string
  age: number
  guardian_name?: string
  guardian_phone?: string
  basketball_position?: string
  experience_level?: string
  training_goals?: string
  notes?: string
  created_at: string
}

interface Booking {
  id: string
  client_id: string
  start_at: string
  status: string
  total_amount: number
}

export default function ClientsManager() {
  const supabase = createClient()

  // STATE
  const [clients, setClients] = useState<Client[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: clts, error: err1 } = await supabase
        .from('clients')
        .select('*')
        .order('full_name', { ascending: true })
      if (err1) throw err1
      setClients((clts || []) as Client[])

      // Fetch bookings (for stats computation)
      const { data: bks, error: err2 } = await supabase
        .from('bookings')
        .select('id, client_id, start_at, status, total_amount')
      if (err2) throw err2
      setBookings((bks || []) as Booking[])
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SEARCH FILTER
  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // CALCULATE STATS
  const getBookingCount = (client: Client) => {
    return bookings.filter((b) => b.client_id === client.id && b.status === 'CONFIRMED').length
  }

  const getTotalSpending = (client: Client) => {
    return bookings
      .filter((b) => b.client_id === client.id && (b.status === 'CONFIRMED' || b.status === 'COMPLETED'))
      .reduce((sum, b) => sum + Number(b.total_amount), 0)
  }

  const getLastBooking = (client: Client) => {
    const clientBks = bookings
      .filter((b) => b.client_id === client.id && b.status === 'CONFIRMED')
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())

    if (clientBks.length === 0) return 'None Booked'
    return new Date(clientBks[0].start_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila'
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-555 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading clients database...
      </div>
    )
  }

  return (
    <div className="space-y-6 relative text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Clients Database</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Monitor registered athlete histories, training logs, and statistics.</p>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search client name or email..."
          className="w-full sm:w-64 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-955 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
        />
      </div>

      {/* DATA VIEWS */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-900 rounded-xl text-zinc-500 text-sm bg-white dark:bg-zinc-900/10">
          No clients found matching query.
        </div>
      ) : (
        <>
          {/* Mobile Card List (hidden on desktop) */}
          <div className="md:hidden space-y-4">
            {filteredClients.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-4 space-y-3 shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">{c.full_name}</h3>
                    <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-0.5">{c.email}</p>
                  </div>
                  <span className="font-bold text-orange-500 text-sm">
                    ₱{getTotalSpending(c).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-zinc-100 dark:border-zinc-900/40 pt-2 text-zinc-650 dark:text-zinc-400">
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-550 block text-[10px] uppercase font-semibold">Phone</span>
                    <span>{c.phone}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 dark:text-zinc-550 block text-[10px] uppercase font-semibold">Sessions</span>
                    <span className="font-bold">{getBookingCount(c)}</span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedClient(c)}
                    className="w-full text-center rounded border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 transition"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Data Table (hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 shadow-sm dark:shadow-none transition-colors duration-200">
            <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
              <thead className="text-xs uppercase font-bold text-zinc-500 tracking-wider border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/20">
                <tr>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Age</th>
                  <th className="p-4 text-center">Sessions Booked</th>
                  <th className="p-4">Total Spending</th>
                  <th className="p-4">Last Session</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/40">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/25 transition-colors">
                    <td className="p-4 font-bold text-zinc-900 dark:text-white">
                      {c.full_name}
                    </td>
                    <td className="p-4 text-xs space-y-0.5">
                      <span className="text-zinc-750 dark:text-zinc-300 block">{c.email}</span>
                      <span className="text-zinc-450 dark:text-zinc-500 block">{c.phone}</span>
                    </td>
                    <td className="p-4 text-xs text-zinc-700 dark:text-zinc-300">
                      {c.age} years old
                    </td>
                    <td className="p-4 text-center font-bold text-zinc-900 dark:text-white">
                      {getBookingCount(c)}
                    </td>
                    <td className="p-4 font-bold text-orange-500">
                      ₱{getTotalSpending(c).toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {getLastBooking(c)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedClient(c)}
                        className="rounded border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CLIENT DETAIL DIALOG MODAL */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] text-zinc-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-3 mb-6">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Athlete Profile</h2>
              <button
                onClick={() => setSelectedClient(null)}
                className="h-8 w-8 rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-sm flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 text-xs sm:text-sm">
              {/* Bio block */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500">Bio & Contact Details</h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-955 p-4">
                  <div>
                    <span className="text-zinc-550 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Full Name</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.full_name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-550 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Age</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.age}yo</span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Phone</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.phone}</span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Email</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.email}</span>
                  </div>
                  {selectedClient.guardian_name && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-900/60 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Guardian Name</span>
                        <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.guardian_name}</span>
                      </div>
                      <div>
                        <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Guardian Phone</span>
                        <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.guardian_phone}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Training specifics */}
              {(selectedClient.basketball_position || selectedClient.experience_level || selectedClient.training_goals || selectedClient.notes) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Basketball Profile</h3>
                  <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-955 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedClient.basketball_position && (
                        <div>
                          <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Position</span>
                          <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.basketball_position}</span>
                        </div>
                      )}
                      {selectedClient.experience_level && (
                        <div>
                          <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Experience</span>
                          <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">{selectedClient.experience_level}</span>
                        </div>
                      )}
                    </div>
                    {selectedClient.training_goals && (
                      <div>
                        <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Goals</span>
                        <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">{selectedClient.training_goals}</p>
                      </div>
                    )}
                    {selectedClient.notes && (
                      <div>
                        <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Coach Bio Notes</span>
                        <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">{selectedClient.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial/session totals */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-555 dark:text-zinc-500">Booking Summary</h3>
                <div className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-955 p-4 text-center">
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Sessions</span>
                    <span className="font-black text-zinc-900 dark:text-white text-lg mt-0.5 block">{getBookingCount(selectedClient)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Spending</span>
                    <span className="font-black text-orange-500 text-lg mt-0.5 block">₱{getTotalSpending(selectedClient).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-555 dark:text-zinc-500 block text-[10px] uppercase font-semibold">Last Session</span>
                    <span className="font-semibold text-zinc-900 dark:text-white text-xs mt-2 block">{getLastBooking(selectedClient)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t border-zinc-200 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="rounded-lg bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
