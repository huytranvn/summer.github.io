'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase, Comment } from '@/lib/supabase'
import { optimizeImages } from '@/lib/imageUtils'

const MAX_PHOTOS = 4

export default function CommentSection({ restaurantId }: { restaurantId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchComments = async () => {
    const { data } = await getSupabase()
      .from('comments')
      .select('*, comment_photos(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
    setLoading(false)
  }

  useEffect(() => { fetchComments() }, [restaurantId])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, MAX_PHOTOS)
    setPhotos(arr)
    setPreviews(arr.map((f) => URL.createObjectURL(f)))
  }

  const uploadCommentPhotos = async (commentId: string) => {
    const optimized = await optimizeImages(photos)
    for (const file of optimized) {
      const ext = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop()
      const path = `comments/${restaurantId}/${commentId}/${Date.now()}.${ext}`
      const { error: uploadError } = await getSupabase()
        .storage.from('restaurant-photos').upload(path, file)
      if (uploadError) throw uploadError
      const { data: urlData } = getSupabase()
        .storage.from('restaurant-photos').getPublicUrl(path)
      await getSupabase().from('comment_photos')
        .insert({ comment_id: commentId, url: urlData.publicUrl })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && photos.length === 0) return
    setSubmitting(true)

    try {
      const { data: newComment } = await getSupabase().from('comments').insert({
        restaurant_id: restaurantId,
        author_name: author.trim() || null,
        content: content.trim(),
      }).select('id').single()

      if (newComment && photos.length > 0) {
        await uploadCommentPhotos(newComment.id)
      }

      setContent('')
      setAuthor('')
      setPhotos([])
      setPreviews([])
      if (fileRef.current) fileRef.current.value = ''
      fetchComments()
    } finally {
      setSubmitting(false)
    }
  }

  const initials = (name: string | null) =>
    name ? name.charAt(0).toUpperCase() : '?'

  return (
    <div className="mt-4 space-y-4">
      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No comments yet — be the first!</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              {/* Avatar */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-300 flex items-center justify-center text-white text-xs font-bold">
                {initials(c.author_name)}
              </div>
              {/* Bubble */}
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-2.5 flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{c.author_name || 'Anonymous'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{c.content}</p>
                {c.comment_photos && c.comment_photos.length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {c.comment_photos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setLightbox(photo.url)}
                        className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="Comment photo" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-3 pt-2">
        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold">
          +
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent transition"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent transition"
            />
            <label
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 hover:bg-orange-50 hover:border-orange-200 cursor-pointer transition-colors"
              title="Attach photos"
            >
              <span className="text-lg">📷</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && photos.length === 0)}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              Post
            </button>
          </div>
          {previews.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos(photos.filter((_, idx) => idx !== i))
                      setPreviews(previews.filter((_, idx) => idx !== i))
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
