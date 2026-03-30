'use client'

import { useEffect, useState } from 'react'
import { supabase, Restaurant } from '@/lib/supabase'
import RestaurantCard from './RestaurantCard'

type Props = {
  selectedTagIds: string[]
  refreshKey: number
}

export default function RestaurantList({ selectedTagIds, refreshKey }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetchAll = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select(`
          *,
          photos(*),
          restaurant_tags(tag_id, tags(id, name))
        `)
        .order('created_at', { ascending: false })

      if (data) {
        const mapped: Restaurant[] = data.map((r) => ({
          ...r,
          tags: r.restaurant_tags?.map((rt: { tags: { id: string; name: string } }) => rt.tags) ?? [],
        }))
        setRestaurants(mapped)
      }
      setLoading(false)
    }
    fetchAll()
  }, [refreshKey])

  const filtered =
    selectedTagIds.length === 0
      ? restaurants
      : restaurants.filter((r) =>
          r.tags?.some((t) => selectedTagIds.includes(t.id))
        )

  if (loading) {
    return <p className="text-center text-gray-400 py-12">Loading restaurants...</p>
  }

  if (restaurants.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">
        No restaurants yet. Add the first one above!
      </p>
    )
  }

  if (filtered.length === 0) {
    return (
      <p className="text-center text-gray-400 py-12">
        No restaurants match the selected tags.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {filtered.map((r) => (
        <RestaurantCard key={r.id} restaurant={r} />
      ))}
    </div>
  )
}
