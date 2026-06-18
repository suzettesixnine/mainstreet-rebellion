import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars — check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type CrewMember = {
  id: string
  name: string
  role: string
  type: 'family' | 'production' | 'management'
  email: string | null
  avatar_initials: string
  avatar_color: string
  current_location: string | null
  status: 'available' | 'traveling' | 'offline'
  created_at: string
  updated_at: string
}

export type Trip = {
  id: string
  crew_member_id: string | null
  destination: string
  country: string | null
  purpose: string
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  depart_date: string
  return_date: string | null
  hotel: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  crew_members?: CrewMember
}

export type Project = {
  id: string
  name: string
  description: string | null
  category: 'tv_film' | 'business' | 'real_estate' | 'content' | 'other'
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  progress: number
  created_by: string | null
  created_at: string
  updated_at: string
  project_tasks?: ProjectTask[]
}

export type ProjectTask = {
  id: string
  project_id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  assigned_to: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export type CheckIn = {
  id: string
  crew_member_id: string | null
  author_name: string
  location: string
  message: string | null
  created_at: string
  crew_members?: CrewMember
}

export type Message = {
  id: string
  from_name: string
  body: string
  pinned: boolean
  created_at: string
}
