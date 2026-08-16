'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

interface Review {
  id: string
  client_name: string
  rating: number
  review_text: string
  is_featured: boolean
  is_active: boolean
}

export default function ReviewsManager() {
  const supabase = createClient()

  // DATA STATE
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  // FORM INPUTS
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [clientName, setClientName] = useState('')
  const [rating, setRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)

  // MODAL TOGGLE
  const [showFormModal, setShowFormModal] = useState(false)

  // FETCH REVIEWS
  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setReviews(data as Review[])
    } catch (err) {
      console.error('Failed to load testimonials:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // HANDLERS
  const handleOpenCreate = () => {
    setEditingReview(null)
    setClientName('')
    setRating(5)
    setReviewText('')
    setIsFeatured(false)
    setIsActive(true)
    setShowFormModal(true)
  }

  const handleOpenEdit = (review: Review) => {
    setEditingReview(review)
    setClientName(review.client_name)
    setRating(review.rating)
    setReviewText(review.review_text)
    setIsFeatured(review.is_featured)
    setIsActive(review.is_active)
    setShowFormModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !reviewText.trim()) return

    const reviewData = {
      client_name: clientName.trim(),
      rating,
      review_text: reviewText.trim(),
      is_featured: isFeatured,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editingReview) {
        // Update
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', editingReview.id)
        if (error) throw error
        alert('Testimonial updated successfully!')
      } else {
        // Insert
        const { error } = await supabase
          .from('reviews')
          .insert({ ...reviewData, created_at: new Date().toISOString() })
        if (error) throw error
        alert('Testimonial added successfully!')
      }

      setShowFormModal(false)
      fetchReviews()
    } catch (err: any) {
      alert(err?.message || 'Failed to save testimonial details.')
    }
  }

  const handleToggleFeatured = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_featured: !review.is_featured, updated_at: new Date().toISOString() })
        .eq('id', review.id)
      if (error) throw error
      fetchReviews()
    } catch (err: any) {
      alert(err?.message || 'Failed to update featured state.')
    }
  }

  const handleToggleActive = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_active: !review.is_active, updated_at: new Date().toISOString() })
        .eq('id', review.id)
      if (error) throw error
      fetchReviews()
    } catch (err: any) {
      alert(err?.message || 'Failed to update active state.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading feedback database...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Testimonials Manager</h1>
          <p className="mt-1 text-sm text-zinc-400">Manage client reviews displayed publicly on the NGP landing page.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-orange-400 transition"
        >
          Add Testimonial
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-800 transition">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-white leading-snug">{review.client_name}</h2>
                  <div className="flex items-center gap-0.5 text-xs text-orange-500 mt-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span key={idx}>{idx < review.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    review.is_featured ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {review.is_featured ? 'Featured' : 'Standard'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    review.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {review.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-zinc-300 italic leading-relaxed">
                &ldquo;{review.review_text}&rdquo;
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-end gap-2 text-xs">
              <button
                onClick={() => handleToggleActive(review)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition ${
                  review.is_active ? 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {review.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleToggleFeatured(review)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition ${
                  review.is_featured ? 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                }`}
              >
                {review.is_featured ? 'Unfeature' : 'Feature'}
              </button>
              <button
                onClick={() => handleOpenEdit(review)}
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
            <h3 className="text-lg font-bold mb-4">{editingReview ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Client Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Rating (Stars)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>

                <div className="flex gap-4 items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Featured</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Review Feedback</label>
                <textarea
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Insert feedback copy here..."
                  rows={4}
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
                  Save Testimonial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
