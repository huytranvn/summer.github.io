'use client'

import { useState } from 'react'
import AddRestaurantForm from '@/components/AddRestaurantForm'
import TagFilter from '@/components/TagFilter'
import RestaurantList from '@/components/RestaurantList'

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const handleAdded = () => setRefreshKey((k) => k + 1)

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-400 shadow-lg mb-4 text-3xl">
          🍜
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Summer Vacation <span className="text-orange-500">2026</span>
        </h1>
        <p className="mt-2 text-gray-500 text-base">Keep track of every delicious spot</p>
      </div>

      <AddRestaurantForm onAdded={handleAdded} />

      <TagFilter
        selectedTags={selectedTagIds}
        onChange={setSelectedTagIds}
        refreshKey={refreshKey}
      />

      <RestaurantList selectedTagIds={selectedTagIds} refreshKey={refreshKey} onDeleted={handleAdded} />
    </main>
  )
}
