'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { showSuccess, showError, confirmDanger, confirmAction } from '@/lib/swal'
import { Ticket, CreditCard, Check, X, ShieldAlert, Award } from 'lucide-react'

interface Package {
  id: string
  name: string
  description?: string
  number_of_sessions: number
  price: number
  original_price?: number
  is_active: boolean
}

interface ClientPackage {
  id: string
  package_id: string
  client_id: string
  package_code: string
  total_sessions: number
  remaining_sessions: number
  status: string
  payment_method: string
  payment_reference?: string
  proof_storage_path?: string
  created_at: string
  packages?: {
    name: string
    price: number
  }
  clients?: {
    full_name: string
    email: string
    phone: string
  }
}

export default function PackagesManager() {
  const supabase = createClient()

  // TAB STATE
  const [activeTab, setActiveTab] = useState<'PACKAGES' | 'PURCHASES'>('PACKAGES')

  // DATA STATE
  const [packages, setPackages] = useState<Package[]>([])
  const [purchases, setPurchases] = useState<ClientPackage[]>([])
  const [loading, setLoading] = useState(true)

  // PACKAGE FORM STATE
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [numberOfSessions, setNumberOfSessions] = useState<number | ''>('')
  const [price, setPrice] = useState<number | ''>('')
  const [originalPrice, setOriginalPrice] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)

  // PURCHASE REVIEW MODAL STATE
  const [selectedPurchase, setSelectedPurchase] = useState<ClientPackage | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setPackages((data || []) as Package[])
    } catch (err: any) {
      console.error('Error fetching packages:', err.message)
    }
  }

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('client_packages')
        .select('*, packages(name, price), clients(full_name, email, phone)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPurchases((data || []) as unknown as ClientPackage[])
    } catch (err: any) {
      console.error('Error fetching client packages:', err.message)
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([fetchPackages(), fetchPurchases()])
    setLoading(false)
  }

  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PACKAGE CRUD ACTION HANDLERS
  const handleOpenCreatePackage = () => {
    setEditingPackage(null)
    setName('')
    setDescription('')
    setNumberOfSessions('')
    setPrice('')
    setOriginalPrice('')
    setIsActive(true)
    setShowPackageModal(true)
  }

  const handleOpenEditPackage = (pkg: Package) => {
    setEditingPackage(pkg)
    setName(pkg.name)
    setDescription(pkg.description || '')
    setNumberOfSessions(pkg.number_of_sessions)
    setPrice(pkg.price)
    setOriginalPrice(pkg.original_price || '')
    setIsActive(pkg.is_active)
    setShowPackageModal(true)
  }

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || numberOfSessions === '' || price === '') return

    const payload = {
      name,
      description: description || null,
      number_of_sessions: Number(numberOfSessions),
      price: Number(price),
      original_price: originalPrice !== '' ? Number(originalPrice) : null,
      is_active: isActive,
    }

    try {
      if (editingPackage) {
        const { error } = await supabase
          .from('packages')
          .update(payload)
          .eq('id', editingPackage.id)
        if (error) throw error
        showSuccess('Updated!', 'Training package updated successfully!')
      } else {
        const { error } = await supabase.from('packages').insert(payload)
        if (error) throw error
        showSuccess('Created!', 'Training package created successfully!')
      }
      setShowPackageModal(false)
      fetchPackages()
    } catch (err: any) {
      showError('Error', err.message || 'Failed to save package.')
    }
  }

  const handleTogglePackageActive = async (pkg: Package) => {
    const isDeactivating = pkg.is_active
    const confirmed = isDeactivating
      ? await confirmDanger(
          'Deactivate Package',
          `Deactivate "${pkg.name}"? It will no longer be visible or purchasable by clients.`,
          'Yes, deactivate'
        )
      : await confirmAction(
          'Activate Package',
          `Activate "${pkg.name}"? It will become visible and purchasable by clients.`,
          'Yes, activate'
        )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('packages')
        .update({ is_active: !pkg.is_active })
        .eq('id', pkg.id)

      if (error) throw error
      showSuccess('Updated!', `Package marked ${!pkg.is_active ? 'Active' : 'Inactive'}!`)
      fetchPackages()
    } catch (err: any) {
      showError('Error', err.message)
    }
  }

  // PURCHASE VERIFY / REJECT ACTION HANDLERS
  const handleVerifyPurchase = async (purchase: ClientPackage) => {
    const confirmed = await confirmAction(
      'Verify Purchase',
      `Confirm payment of ₱${Number(purchase.packages?.price ?? 0).toLocaleString()} for ${purchase.clients?.full_name}'s package? This will activate their redemption code.`,
      'Confirm Payment'
    )
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('client_packages')
        .update({
          status: 'ACTIVE',
          remaining_sessions: purchase.total_sessions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchase.id)

      if (error) throw error
      showSuccess('Verified!', 'Package purchase payment confirmed! Redemption code is active.')
      fetchPurchases()
    } catch (err: any) {
      showError('Error', err.message || 'Failed to verify package purchase.')
    }
  }

  const handleOpenRejectPurchase = (purchase: ClientPackage) => {
    setSelectedPurchase(purchase)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleRejectPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPurchase || !rejectReason.trim()) return

    try {
      const { error } = await supabase
        .from('client_packages')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPurchase.id)

      if (error) throw error
      showSuccess('Rejected', 'Package purchase request was declined.')
      setShowRejectModal(false)
      setSelectedPurchase(null)
      fetchPurchases()
    } catch (err: any) {
      showError('Error', err.message || 'Failed to decline request.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading package data...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-white transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Bulk Packages</h1>
          <p className="mt-1 text-sm text-zinc-550 dark:text-zinc-400">
            Define multi-session packages, set discounted prices, and manage client package credits.
          </p>
        </div>
        {activeTab === 'PACKAGES' && (
          <button
            onClick={handleOpenCreatePackage}
            className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
          >
            Add Package
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-900">
        <button
          onClick={() => setActiveTab('PACKAGES')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'PACKAGES'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Manage Packages
        </button>
        <button
          onClick={() => setActiveTab('PURCHASES')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'PURCHASES'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Package Purchases
          {purchases.filter((p) => p.status === 'PENDING_PAYMENT' || p.status === 'PAYMENT_REVIEW').length > 0 && (
            <span className="ml-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-black">
              {purchases.filter((p) => p.status === 'PENDING_PAYMENT' || p.status === 'PAYMENT_REVIEW').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: MANAGE PACKAGES */}
      {activeTab === 'PACKAGES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-800 transition shadow-sm dark:shadow-none">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">{pkg.name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    pkg.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-150 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                  }`}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {pkg.description && (
                  <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">{pkg.description}</p>
                )}

                <div className="flex flex-col gap-2 text-xs bg-zinc-50 dark:bg-zinc-955 p-3 rounded-lg border border-zinc-200 dark:border-zinc-900">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Credits Included:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{pkg.number_of_sessions} Sessions</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-zinc-200 dark:border-zinc-900 pt-2 mt-1">
                    <span className="text-zinc-500">Deal Price:</span>
                    <div className="text-right">
                      {pkg.original_price && (
                        <span className="text-[11px] text-zinc-400 line-through mr-1.5">
                          ₱{Number(pkg.original_price).toLocaleString()}
                        </span>
                      )}
                      <span className="font-extrabold text-orange-500 text-sm">₱{Number(pkg.price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-900 flex justify-end gap-2 text-xs">
                <button
                  onClick={() => handleTogglePackageActive(pkg)}
                  className={`rounded px-3 py-1.5 font-bold uppercase transition duration-200 ${
                    pkg.is_active
                      ? 'border border-zinc-200 bg-zinc-50 text-zinc-655 hover:text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                      : 'bg-green-600 text-white hover:bg-green-500'
                  }`}
                >
                  {pkg.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleOpenEditPackage(pkg)}
                  className="rounded bg-orange-500 px-3.5 py-1.5 font-bold uppercase text-black hover:bg-orange-400"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: PACKAGE PURCHASES */}
      {activeTab === 'PURCHASES' && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/10 shadow-sm dark:shadow-none">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-955 text-zinc-550 dark:text-zinc-400 font-bold uppercase tracking-wider">
                <th className="p-4">Client Details</th>
                <th className="p-4">Package Name</th>
                <th className="p-4">Redemption Code</th>
                <th className="p-4">Sessions Left</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No client packages purchased yet.
                  </td>
                </tr>
              ) : (
                purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-white">{pur.clients?.full_name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{pur.clients?.email}</div>
                      <div className="text-[10px] text-zinc-500">{pur.clients?.phone}</div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {pur.packages?.name}
                    </td>
                    <td className="p-4">
                      {pur.status === 'ACTIVE' ? (
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-950 text-orange-500 font-bold px-2 py-1 rounded border border-zinc-200 dark:border-zinc-900 text-[10px]">
                          {pur.package_code}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Inactive</span>
                      )}
                    </td>
                    <td className="p-4 font-bold">
                      {pur.remaining_sessions} / {pur.total_sessions}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-zinc-800 dark:text-zinc-300">{pur.payment_method}</div>
                      {pur.payment_reference && (
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Ref: {pur.payment_reference}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                        pur.status === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : pur.status === 'PENDING_PAYMENT' || pur.status === 'PAYMENT_REVIEW'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}>
                        {pur.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(pur.status === 'PENDING_PAYMENT' || pur.status === 'PAYMENT_REVIEW') && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRejectPurchase(pur)}
                            className="rounded p-1 text-red-500 hover:bg-red-500/10 transition"
                            title="Decline Request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleVerifyPurchase(pur)}
                            className="rounded bg-green-600 px-2.5 py-1 font-bold uppercase text-[9px] text-white hover:bg-green-500 transition"
                          >
                            Confirm Payment
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT PACKAGE MODAL */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <h3 className="text-lg font-bold mb-4">{editingPackage ? 'Edit Package Details' : 'Add Package'}</h3>
            
            <form onSubmit={handlePackageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Package Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Starter Training Package (8 Sessions)"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Summarize package inclusions..."
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Sessions</label>
                  <input
                    type="number"
                    required
                    value={numberOfSessions}
                    onChange={(e) => setNumberOfSessions(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 8"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Deal Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 10000"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Sale Price (₱)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Original price"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="package-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-200 dark:border-zinc-800 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="package-active" className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Visible to clients (Active)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-955 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
                >
                  {editingPackage ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-955 p-6 shadow-2xl text-zinc-900 dark:text-white">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Decline Request
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Explain why this package payment request was declined.
            </p>

            <form onSubmit={handleRejectPurchaseSubmit} className="space-y-4">
              <textarea
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason..."
                rows={3}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs outline-none focus:border-orange-500 resize-none"
              />

              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedPurchase(null)
                  }}
                  className="rounded px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-zinc-400 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-500 font-bold uppercase"
                >
                  Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
