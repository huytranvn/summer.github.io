import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Restaurant = {
  id: string
  name: string
  description: string | null
  location: string | null
  created_at: string
  photos?: Photo[]
  tags?: Tag[]
}

export type Photo = {
  id: string
  restaurant_id: string
  url: string
}

export type Tag = {
  id: string
  name: string
}

export type Comment = {
  id: string
  restaurant_id: string
  author_name: string | null
  content: string
  created_at: string
}
