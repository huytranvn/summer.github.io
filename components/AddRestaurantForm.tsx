'use client'

import { useState, useRef, useEffect } from 'react'
import { getSupabase, Restaurant, Tag, Photo } from '@/lib/supabase'
import { optimizeImages } from '@/lib/imageUtils'

type Props = {
  onAdded: () => void
  restaurant?: Restaurant
  onClose?: () => void
}

export default function AddRestaurantForm({ onAdded, restaurant: editRestaurant, onClose }: Props) {
  const isEdit = !!editRestaurant
  const [open, setOpen] = useState(isEdit)
  const [name, setName] = useState(editRestaurant?.name ?? '')
  const [location, setLocation] = useState(editRestaurant?.location ?? '')
  const [placeId, setPlaceId] = useState<string | null>(editRestaurant?.place_id ?? null)
  const [description, setDescription] = useState(editRestaurant?.description ?? '')
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(editRestaurant?.tags?.map((t) => t.name) ?? [])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [openTime, setOpenTime] = useState(editRestaurant?.open_time?.slice(0, 5) ?? '')
  const [closeTime, setCloseTime] = useState(editRestaurant?.close_time?.slice(0, 5) ?? '')
  const [isAllDay, setIsAllDay] = useState(editRestaurant?.is_all_day ?? false)
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>(editRestaurant?.photos ?? [])
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSupabase().from('tags').select('*').order('name').then(({ data }) => {
      if (data) setAllTags(data)
    })
  }, [])

  // Attach Google Places Autocomplete once the form is open and the input is mounted
  useEffect(() => {
    if (!open || !locationRef.current) return
    if (typeof google === 'undefined' || !google.maps?.places) return

    const autocomplete = new google.maps.places.Autocomplete(locationRef.current, {
      types: ['establishment', 'geocode'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      setLocation(place.formatted_address ?? place.name ?? '')
      setPlaceId(place.place_id ?? null)
    })
  }, [open])

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

  const removeExistingPhoto = (photo: Photo) => {
    setRemovedPhotoIds([...removedPhotoIds, photo.id])
    setExistingPhotos(existingPhotos.filter((p) => p.id !== photo.id))
  }

  const uploadPhotos = async (restaurantId: string) => {
    const optimized = await optimizeImages(photos)
    for (const file of optimized) {
      const ext = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
      const path = `${restaurantId}/${Date.now()}.${ext}`
      const { error: uploadError } = await getSupabase().storage.from('restaurant-photos').upload(path, file)
      if (uploadError) throw uploadError
      const { data: urlData } = getSupabase().storage.from('restaurant-photos').getPublicUrl(path)
      await getSupabase().from('photos').insert({ restaurant_id: restaurantId, url: urlData.publicUrl })
    }
  }

  const syncTags = async (restaurantId: string) => {
    // Remove old tags and re-insert
    if (isEdit) {
      await getSupabase().from('restaurant_tags').delete().eq('restaurant_id', restaurantId)
    }
    for (const tagName of selectedTags) {
      const { data: tag } = await getSupabase()
        .from('tags')
        .upsert({ name: tagName }, { onConflict: 'name' })
        .select()
        .single()
      if (tag) {
        await getSupabase().from('restaurant_tags').insert({ restaurant_id: restaurantId, tag_id: tag.id })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const payload = {
      name: name.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
      place_id: placeId,
      open_time: isAllDay ? null : openTime || null,
      close_time: isAllDay ? null : closeTime || null,
      is_all_day: isAllDay,
    }

    try {
      let restaurantId: string

      if (isEdit) {
        const { error: updateError } = await getSupabase()
          .from('restaurants')
          .update(payload)
          .eq('id', editRestaurant.id)
        if (updateError) throw updateError
        restaurantId = editRestaurant.id

        // Remove deleted photos
        for (const photoId of removedPhotoIds) {
          const photo = editRestaurant.photos?.find((p) => p.id === photoId)
          if (photo) {
            const parts = photo.url.split('/restaurant-photos/')
            if (parts.length > 1) {
              await getSupabase().storage.from('restaurant-photos').remove([parts[1]])
            }
          }
          await getSupabase().from('photos').delete().eq('id', photoId)
        }
      } else {
        const { data: restaurant, error: restError } = await getSupabase()
          .from('restaurants')
          .insert(payload)
          .select()
          .single()
        if (restError) throw restError
        restaurantId = restaurant.id
      }

      await uploadPhotos(restaurantId)
      await syncTags(restaurantId)

      if (!isEdit) {
        setName(''); setLocation(''); setDescription('')
        setPlaceId(null); setSelectedTags([]); setTagInput('')
        setOpenTime(''); setCloseTime(''); setIsAllDay(false)
        setPhotos([]); setPreviews([])
        if (fileRef.current) fileRef.current.value = ''
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        if (isEdit) {
          onClose?.()
        } else {
          setOpen(false)
        }
      }, 1500)
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

  const formContent = (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-orange-100 dark:border-gray-700 overflow-hidden"
    >
          {/* Form header */}
          <div className="bg-gradient-to-r from-orange-500 to-rose-400 px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">{isEdit ? 'Edit Restaurant' : 'New Restaurant'}</h2>
            <button
              type="button"
              onClick={() => isEdit ? onClose?.() : setOpen(false)}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Name + Location */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Name <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ichiran Ramen"
                  required
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-700 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Location
                </label>
                <input
                  ref={locationRef}
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setPlaceId(null) }}
                  placeholder="e.g. Ichiran Ramen Tokyo"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-700 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you order? How was the experience?"
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-700 focus:border-transparent transition resize-none"
              />
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Operating Hours
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-300 dark:focus:ring-orange-700"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">All day</span>
              </label>
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Open</label>
                    <input
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-700 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Close</label>
                    <input
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-700 focus:border-transparent transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Tags
              </label>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold px-2.5 py-1 rounded-full"
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
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-700 focus:border-transparent transition"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                    {suggestions.map((t) => (
                      <li
                        key={t.id}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer"
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
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Photos
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl px-4 py-3 transition-colors group">
                <span className="text-2xl">📷</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-orange-500">
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
              {existingPhotos.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="existing" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photo)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {previews.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt="preview"
                      className="shrink-0 w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span>✓</span> {isEdit ? 'Restaurant updated!' : 'Restaurant added!'}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-400 hover:from-orange-600 hover:to-rose-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm tracking-wide shadow-sm transition-all"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Restaurant' : 'Save Restaurant'}
            </button>
          </div>
    </form>
  )

  if (isEdit) return formContent

  return (
    <div className="mb-8">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-dashed border-orange-300 dark:border-orange-600 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500 font-semibold py-4 rounded-2xl transition-all group"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">+</span>
          Add a new spot
        </button>
      ) : (
        formContent
      )}
    </div>
  )
}
