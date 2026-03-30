'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Restaurant } from '@/lib/supabase'
import CommentSection from './CommentSection'

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const [showComments, setShowComments] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo strip */}
      {restaurant.photos && restaurant.photos.length > 0 && (
        <div className="flex gap-1 overflow-x-auto bg-gray-50">
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
            <h3 className="text-lg font-bold text-gray-900 truncate">{restaurant.name}</h3>
            {restaurant.location && (
              <a
                href={
                  restaurant.place_id
                    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.location)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 mt-0.5 flex items-center gap-1 hover:text-orange-500 transition-colors w-fit"
              >
                <span>📍</span>
                <span className="underline underline-offset-2">{restaurant.location}</span>
              </a>
            )}
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full shrink-0 mt-0.5">
            {new Date(restaurant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Tags */}
        {restaurant.tags && restaurant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {restaurant.tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-orange-50 text-orange-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-orange-100"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {restaurant.description && (
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{restaurant.description}</p>
        )}

        {/* Comments toggle */}
        <div className="mt-4 pt-4 border-t border-gray-50">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-500 transition-colors"
          >
            <span className="text-base">💬</span>
            {showComments ? 'Hide comments' : 'Comments'}
            <span className={`ml-auto text-xs transition-transform ${showComments ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showComments && <CommentSection restaurantId={restaurant.id} />}
        </div>
      </div>

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
