'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { showSuccess, showError } from '@/lib/swal'

export default function SettingsManager() {
  const supabase = createClient()

  // STATE
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  // INPUTS
  const [businessName, setBusinessName] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [coachName, setCoachName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [cancellationHours, setCancellationHours] = useState(24)
  const [gcashName, setGcashName] = useState('')
  const [gcashNumber, setGcashNumber] = useState('')
  const [mayaName, setMayaName] = useState('')
  const [mayaNumber, setMayaNumber] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_config')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setConfigId(data.id)
        setBusinessName(data.business_name || '')
        setBusinessDescription(data.business_description || '')
        setCoachName(data.coach_name || '')
        setContactPhone(data.contact_phone || '')
        setContactEmail(data.contact_email || '')
        setCancellationHours(data.cancellation_hours || 24)
        setGcashName(data.gcash_account_name || '')
        setGcashNumber(data.gcash_account_number || '')
        setMayaName(data.maya_account_name || '')
        setMayaNumber(data.maya_account_number || '')
        setPaymentInstructions(data.payment_instructions || '')
        setInstagramUrl(data.instagram_url || '')
        setFacebookUrl(data.facebook_url || '')
      }
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      business_name: businessName,
      business_description: businessDescription || null,
      coach_name: coachName,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      cancellation_hours: cancellationHours,
      gcash_account_name: gcashName || null,
      gcash_account_number: gcashNumber || null,
      maya_account_name: mayaName || null,
      maya_account_number: mayaNumber || null,
      payment_instructions: paymentInstructions || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
    }

    try {
      if (configId) {
        const { error } = await supabase
          .from('business_config')
          .update(payload)
          .eq('id', configId)
        if (error) throw error
        showSuccess('Saved!', 'Configuration saved successfully!')
      } else {
        const { error } = await supabase.from('business_config').insert(payload)
        if (error) throw error
        showSuccess('Initialised!', 'Configuration initialised successfully!')
      }
      fetchSettings()
    } catch (err: any) {
      showError('Error', err.message || 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-555 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-white transition-colors duration-200">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Business Settings</h1>
        <p className="mt-1 text-sm text-zinc-505 dark:text-zinc-400">Manage business coordinates, manual payment options, and cancellation rules.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* =========================================
            GENERAL SETTINGS CARD
            ========================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 space-y-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-900 pb-2 text-zinc-950 dark:text-white">General Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Business Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Coach Name</label>
              <input
                type="text"
                required
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Description</label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Contact Number</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* =========================================
            PAYMENT SETTINGS CARD
            ========================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 space-y-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-900 pb-2 text-zinc-950 dark:text-white">Manual Payment Channels</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* GCash */}
            <div className="space-y-4 rounded-lg bg-zinc-50 dark:bg-zinc-955 p-4 border border-zinc-200 dark:border-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500">GCash Option</h3>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Name</label>
                <input
                  type="text"
                  value={gcashName}
                  onChange={(e) => setGcashName(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Number</label>
                <input
                  type="text"
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Maya */}
            <div className="space-y-4 rounded-lg bg-zinc-50 dark:bg-zinc-955 p-4 border border-zinc-200 dark:border-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">Maya Option</h3>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Name</label>
                <input
                  type="text"
                  value={mayaName}
                  onChange={(e) => setMayaName(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Number</label>
                <input
                  type="text"
                  value={mayaNumber}
                  onChange={(e) => setMayaNumber(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Manual Payment Instructions</label>
              <textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                rows={3}
                placeholder="Instruct the client how to pay and upload validation screenshots..."
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* =========================================
            POLICIES AND SOCIALS
            ========================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 space-y-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-900 pb-2 text-zinc-955 dark:text-white">Policies & Social Links</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Cancellation Deadline (Hours)</label>
              <input
                type="number"
                required
                value={cancellationHours}
                onChange={(e) => setCancellationHours(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Instagram Profile Link</label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Facebook Page Link</label>
              <input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-955 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500"
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
