import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (v: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      setUser:    (user)    => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      clear: () => set({ user: null, session: null }),
    }),
    { name: 'liftoff-auth', partialize: (s) => ({ user: s.user }) }
  )
)

// ── Profile type ──────────────────────────────────────
export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  level: number
  xp: number
  streak_days: number
  last_workout_date?: string
  created_at: string
}
