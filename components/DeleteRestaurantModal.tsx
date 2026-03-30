'use client'

import { useState } from 'react'
import { getSupabase, Restaurant } from '@/lib/supabase'

type Props = {
  restaurant: Restaurant
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteRestaurantModal({ restaurant, onClose, onDeleted }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setError('')
    if (!code.trim()) {
      setError('Please enter the admin code.')
      return
    }

    setDeleting(true)
    const supabase = getSupabase()

    // Verify admin code
    const { data: adminCode, error: codeError } = await supabase
      .from('admin_codes')
      .select('id')
      .eq('code', code.trim())
      .maybeSingle()

    if (codeError || !adminCode) {
      setError('Invalid admin code.')
      setDeleting(false)
      return
    }

    // Delete in order to respect foreign keys
    await supabase.from('restaurant_tags').delete().eq('restaurant_id', restaurant.id)
    await supabase.from('comments').delete().eq('restaurant_id', restaurant.id)

    // Delete photos from storage and table
    if (restaurant.photos && restaurant.photos.length > 0) {
      const filePaths = restaurant.photos.map((p) => {
        // Extract path from public URL: after /restaurant-photos/
        const parts = p.url.split('/restaurant-photos/')
        return parts.length > 1 ? parts[1] : ''
      }).filter(Boolean)

      if (filePaths.length > 0) {
        await supabase.storage.from('restaurant-photos').remove(filePaths)
      }
    }
    await supabase.from('photos').delete().eq('restaurant_id', restaurant.id)

    await supabase.from('restaurants').delete().eq('id', restaurant.id)

    setDeleting(false)
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-400 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">Delete Restaurant</h3>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{restaurant.name}</strong>? This action cannot be undone.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Admin Code
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter admin code"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-300 focus:border-transparent outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDelete()
              }}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-400 rounded-xl hover:from-red-600 hover:to-rose-500 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
