'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase, Tag } from '@/lib/supabase'

export default function AddRestaurantForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data }) => {
      if (data) setAllTags(data)
    })
  }, [])

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim().toLowerCase()
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setSelectedTags(selectedTags.filter((t) => t !== tag))

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setPhotos(arr)
    setPreviews(arr.map((f) => URL.createObjectURL(f)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .insert({ name: name.trim(), location: location.trim() || null, description: description.trim() || null })
        .select()
        .single()
      if (restError) throw restError

      for (const file of photos) {
        const ext = file.name.split('.').pop()
        const path = `${restaurant.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('restaurant-photos').upload(path, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(path)
        await supabase.from('photos').insert({ restaurant_id: restaurant.id, url: urlData.publicUrl })
      }

      for (const tagName of selectedTags) {
        const { data: tag } = await supabase
          .from('tags')
          .upsert({ name: tagName }, { onConflict: 'name' })
          .select()
          .single()
        if (tag) {
          await supabase.from('restaurant_tags').insert({ restaurant_id: restaurant.id, tag_id: tag.id })
        }
      }

      setName(''); setLocation(''); setDescription('')
      setSelectedTags([]); setTagInput('')
      setPhotos([]); setPreviews([])
      if (fileRef.current) fileRef.current.value = ''
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setOpen(false) }, 1500)
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const suggestions = allTags.filter(
    (t) => tagInput && t.name.includes(tagInput.toLowerCase()) && !selectedTags.includes(t.name)
  )

  return (
    <div className="mb-8">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-500 font-semibold py-4 rounded-2xl transition-all group"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">+</span>
          Add a new spot
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden"
        >
          {/* Form header */}
          <div className="bg-gradient-to-r from-orange-500 to-rose-400 px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">New Restaurant</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Name + Location */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Name <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ichiran Ramen"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you order? How was the experience?"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tags
              </label>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full"
                    >
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-orange-900 text-base leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
                    if (e.key === ',') { e.preventDefault(); addTag(tagInput) }
                  }}
                  placeholder="Type a tag, press Enter — e.g. ramen, vegan, hidden-gem"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                    {suggestions.map((t) => (
                      <li
                        key={t.id}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 cursor-pointer"
                        onMouseDown={(e) => { e.preventDefault(); addTag(t.name) }}
                      >
                        {t.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Photos
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border border-dashed border-gray-300 hover:border-orange-300 hover:bg-orange-50 rounded-xl px-4 py-3 transition-colors group">
                <span className="text-2xl">📷</span>
                <span className="text-sm text-gray-500 group-hover:text-orange-500">
                  {photos.length > 0 ? `${photos.length} photo(s) selected` : 'Click to upload photos'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
              </label>
              {previews.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt="preview"
                      className="shrink-0 w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>✓</span> Restaurant added!
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-400 hover:from-orange-600 hover:to-rose-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm tracking-wide shadow-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save Restaurant'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
