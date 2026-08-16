'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

export default function SettingsManager() {
  const supabase = createClient()

  // DATA STATE
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // SETTINGS FORM INPUTS
  const [businessName, setBusinessName] = useState('')
  const [coachName, setCoachName] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [gcashName, setGcashName] = useState('')
  const [gcashNumber, setGcashNumber] = useState('')
  const [mayaName, setMayaName] = useState('')
  const [mayaNumber, setMayaNumber] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [cancellationHours, setCancellationHours] = useState<number>(24)
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')

  // FETCH SETTINGS
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error // PGRST116 is empty row code
      
      if (data) {
        setBusinessName(data.business_name || '')
        setCoachName(data.coach_name || '')
        setBusinessDescription(data.business_description || '')
        setContactPhone(data.contact_phone || '')
        setContactEmail(data.contact_email || '')
        setGcashName(data.gcash_name || '')
        setGcashNumber(data.gcash_number || '')
        setMayaName(data.maya_name || '')
        setMayaNumber(data.maya_number || '')
        setPaymentInstructions(data.payment_instructions || '')
        setCancellationHours(data.cancellation_hours ?? 24)
        setInstagramUrl(data.instagram_url || '')
        setFacebookUrl(data.facebook_url || '')
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SAVE SETTINGS
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const updatedData = {
      id: 1,
      business_name: businessName,
      coach_name: coachName,
      business_description: businessDescription,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      gcash_name: gcashName,
      gcash_number: gcashNumber,
      maya_name: mayaName,
      maya_number: mayaNumber,
      payment_instructions: paymentInstructions,
      cancellation_hours: Number(cancellationHours),
      instagram_url: instagramUrl,
      facebook_url: facebookUrl,
      updated_at: new Date().toISOString(),
    }

    try {
      const { error } = await supabase
        .from('settings')
        .upsert(updatedData)
      if (error) throw error
      alert('Settings updated successfully!')
      fetchSettings()
    } catch (err: any) {
      alert(err?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading configuration...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Business Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage business coordinates, manual payment options, and cancellation rules.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* =========================================
            GENERAL SETTINGS CARD
            ========================================= */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-6">
          <h2 className="text-lg font-bold border-b border-zinc-900 pb-2">General Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Business Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Coach Name</label>
              <input
                type="text"
                required
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Contact Number</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* =========================================
            PAYMENT SETTINGS CARD
            ========================================= */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-6">
          <h2 className="text-lg font-bold border-b border-zinc-900 pb-2">Manual Payment Channels</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* GCash */}
            <div className="space-y-4 rounded-lg bg-zinc-950 p-4 border border-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500">GCash Option</h3>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Name</label>
                <input
                  type="text"
                  value={gcashName}
                  onChange={(e) => setGcashName(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Number</label>
                <input
                  type="text"
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Maya */}
            <div className="space-y-4 rounded-lg bg-zinc-950 p-4 border border-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Maya Option</h3>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Name</label>
                <input
                  type="text"
                  value={mayaName}
                  onChange={(e) => setMayaName(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Number</label>
                <input
                  type="text"
                  value={mayaNumber}
                  onChange={(e) => setMayaNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Manual Payment Instructions</label>
              <textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                rows={3}
                placeholder="Instruct the client how to pay and input reference number..."
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* =========================================
            POLICIES AND SOCIALS
            ========================================= */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-6">
          <h2 className="text-lg font-bold border-b border-zinc-900 pb-2">Policies & Social Links</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Cancellation Deadline (Hours)</label>
              <input
                type="number"
                required
                value={cancellationHours}
                onChange={(e) => setCancellationHours(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Instagram Profile Link</label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Facebook Page Link</label>
              <input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-8 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/10 hover:bg-orange-400 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}
