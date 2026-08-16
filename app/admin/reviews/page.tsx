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

  // STATE
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  // FORM INPUTS
  const [clientName, setClientName] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews((data || []) as Review[])
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (!clientName || !reviewText) return

    const reviewPayload = {
      client_name: clientName,
      rating,
      review_text: reviewText,
      is_featured: isFeatured,
      is_active: isActive,
    }

    try {
      if (editingReview) {
        const { error } = await supabase
          .from('reviews')
          .update(reviewPayload)
          .eq('id', editingReview.id)
        if (error) throw error
        alert('Testimonial details updated!')
      } else {
        const { error } = await supabase.from('reviews').insert(reviewPayload)
        if (error) throw error
        alert('Testimonial added successfully!')
      }

      setShowFormModal(false)
      fetchReviews()
    } catch (err: any) {
      alert(err.message || 'Failed to save testimonial details.')
    }
  }

  const handleToggleActive = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_active: !review.is_active })
        .eq('id', review.id)

      if (error) throw error
      alert(`Testimonial marked ${!review.is_active ? 'Active' : 'Inactive'}!`)
      fetchReviews()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleToggleFeatured = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_featured: !review.is_featured })
        .eq('id', review.id)

      if (error) throw error
      alert(`Testimonial marked ${!review.is_featured ? 'Featured' : 'Standard'}!`)
      fetchReviews()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-555 dark:text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
        Loading Testimonials...
      </div>
    )
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-white transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Testimonials</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage client athlete reviews shown on the landing page.</p>
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
          <div key={review.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/10 p-6 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-800 transition shadow-sm dark:shadow-none">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">{review.client_name}</h2>
                  <div className="flex items-center gap-0.5 text-xs text-orange-500 mt-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span key={idx}>{idx < review.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    review.is_featured ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-zinc-100 text-zinc-550 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                  }`}>
                    {review.is_featured ? 'Featured' : 'Standard'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    review.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-100 text-zinc-550 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                  }`}>
                    {review.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-zinc-700 dark:text-zinc-300 italic leading-relaxed">
                &ldquo;{review.review_text}&rdquo;
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-900 flex justify-end gap-2 text-xs">
              <button
                onClick={() => handleToggleActive(review)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition duration-200 ${
                  review.is_active
                    ? 'border border-zinc-200 bg-zinc-50 text-zinc-655 hover:text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {review.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleToggleFeatured(review)}
                className={`rounded px-3 py-1.5 font-bold uppercase transition duration-200 ${
                  review.is_featured
                    ? 'border border-zinc-200 bg-zinc-50 text-zinc-655 hover:text-zinc-950 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                    : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-white">
            <h3 className="text-lg font-bold mb-4">{editingReview ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Client Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Rating (Stars)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-orange-500 animate-none"
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
                      className="rounded border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Featured</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Review Feedback</label>
                <textarea
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Insert feedback copy here..."
                  rows={4}
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
