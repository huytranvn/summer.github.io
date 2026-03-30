'use client'

import { useEffect, useState } from 'react'
import { getSupabase, Comment } from '@/lib/supabase'

export default function CommentSection({ restaurantId }: { restaurantId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = async () => {
    const { data } = await getSupabase()
      .from('comments')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
    setLoading(false)
  }

  useEffect(() => { fetchComments() }, [restaurantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    await getSupabase().from('comments').insert({
      restaurant_id: restaurantId,
      author_name: author.trim() || null,
      content: content.trim(),
    })
    setContent('')
    setAuthor('')
    setSubmitting(false)
    fetchComments()
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
              required
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              Post
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
