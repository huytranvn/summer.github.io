'use client'

import { useEffect, useState } from 'react'
import { supabase, Tag } from '@/lib/supabase'

type Props = {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  refreshKey: number
}

export default function TagFilter({ selectedTags, onChange, refreshKey }: Props) {
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data }) => {
      if (data) setTags(data)
    })
  }, [refreshKey])

  if (tags.length === 0) return null

  const toggle = (tagId: string) => {
    onChange(
      selectedTags.includes(tagId)
        ? selectedTags.filter((t) => t !== tagId)
        : [...selectedTags, tagId]
    )
  }

  return (
    <div className="mb-6 bg-white/70 backdrop-blur-sm border border-white rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by tag</p>
        {selectedTags.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-orange-400 hover:text-orange-600 font-medium"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selectedTags.includes(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-orange-500 to-rose-400 text-white shadow-sm scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
              }`}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
