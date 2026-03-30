'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Restaurant } from '@/lib/supabase'
import CommentSection from './CommentSection'
import DeleteRestaurantModal from './DeleteRestaurantModal'
import AddRestaurantForm from './AddRestaurantForm'

function formatTime(time: string | null): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

type Props = {
  restaurant: Restaurant
  onDeleted: () => void
}

export default function RestaurantCard({ restaurant, onDeleted }: Props) {
  const [showComments, setShowComments] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo strip */}
      {restaurant.photos && restaurant.photos.length > 0 && (
        <div className="flex gap-1 overflow-x-auto bg-gray-50 dark:bg-gray-700">
          {restaurant.photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo.url)}
              className="relative shrink-0 h-48 w-72 first:w-full first:h-56 overflow-hidden hover:opacity-95 transition-opacity"
              style={restaurant.photos!.length === 1 ? { width: '100%', height: '14rem' } : {}}
            >
              <Image src={photo.url} alt="Food photo" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{restaurant.name}</h3>
            {restaurant.location && (
              <a
                href={
                  restaurant.place_id
                    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.location)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1 hover:text-orange-500 transition-colors w-fit"
              >
                <span>📍</span>
                <span className="underline underline-offset-2">{restaurant.location}</span>
              </a>
            )}
            {(restaurant.is_all_day || restaurant.open_time || restaurant.close_time) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <span>🕐</span>
                {restaurant.is_all_day
                  ? 'All day'
                  : `${formatTime(restaurant.open_time)} – ${formatTime(restaurant.close_time)}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2.5 py-1 rounded-full">
              {new Date(restaurant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              onClick={() => setShowEditForm(true)}
              className="text-gray-300 dark:text-gray-500 hover:text-orange-400 transition-colors p-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30"
              title="Edit restaurant"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-gray-300 dark:text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
              title="Delete restaurant"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tags */}
        {restaurant.tags && restaurant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {restaurant.tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-orange-100 dark:border-orange-800"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {restaurant.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{restaurant.description}</p>
        )}

        {/* Comments toggle */}
        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors"
          >
            <span className="text-base">💬</span>
            {showComments ? 'Hide comments' : 'Comments'}
            <span className={`ml-auto text-xs transition-transform ${showComments ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showComments && <CommentSection restaurantId={restaurant.id} />}
        </div>
      </div>

      {/* Edit form modal */}
      {showEditForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <AddRestaurantForm
              restaurant={restaurant}
              onAdded={onDeleted}
              onClose={() => setShowEditForm(false)}
            />
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <DeleteRestaurantModal
          restaurant={restaurant}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={onDeleted}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-5 text-white/70 hover:text-white text-4xl leading-none"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <div className="relative w-full max-w-3xl max-h-[90vh] aspect-video">
            <Image src={lightbox} alt="Full photo" fill className="object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
