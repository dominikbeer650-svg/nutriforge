'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Trophy, Dumbbell, Apple, ChevronRight, Sparkles } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface DashboardData {
  streak: number
  level: number
  workoutsThisWeek: number
  caloriesToday: number
  displayName: string
}

export default function StartPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData>({
    streak: 0,
    level: 1,
    workoutsThisWeek: 0,
    caloriesToday: 0,
    displayName: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days, level, display_name')
        .eq('id', user.id)
        .single()

      setData({
        streak: profile?.streak_days ?? 0,
        level: profile?.level ?? 1,
        workoutsThisWeek: 0,       // Phase 2 will fill this
        caloriesToday: 0,          // Phase 3 will fill this
        displayName: profile?.display_name ?? user.email?.split('@')[0] ?? '',
      })
      setLoading(false)
    }
    load()
  }, [user])

  const STATS = [
    {
      icon: <Flame size={18} color="var(--orange)" />,
      label: 'Streak',
      value: data.streak,
      unit: 'Tage',
      color: 'var(--orange)',
    },
    {
      icon: <Trophy size={18} color="var(--gold)" />,
      label: 'Level',
      value: data.level,
      unit: '',
      color: 'var(--gold)',
    },
    {
      icon: <Dumbbell size={18} color="var(--green)" />,
      label: 'Workouts diese Woche',
      value: data.workoutsThisWeek,
      unit: '',
      color: 'var(--green)',
    },
    {
      icon: <Apple size={18} color="var(--green)" />,
      label: 'Kalorien heute',
      value: data.caloriesToday,
      unit: 'kcal',
      color: 'var(--text-2)',
    },
  ] as const

  return (
    <>
      <PageHeader
        title={loading ? 'Willkommen zurück' : data.displayName ? `Hey, ${data.displayName}` : 'Willkommen zurück'}
        subtitle="Hier ist deine heutige Übersicht."
      />

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Stat cards */}
        {STATS.map(({ icon, label, value, unit, color }, i) => (
          <div
            key={label}
            className={`stat-card fade-up delay-${i + 1}`}
          >
            <div className="stat-label">
              {icon}
              <span>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="stat-value">{loading ? '–' : value}</span>
              {unit && <span className="stat-unit">{unit}</span>}
            </div>
          </div>
        ))}

        {/* CTA card */}
        <div className="stat-card fade-up delay-5" style={{ background: 'var(--green-light)', borderColor: 'var(--green-mid)' }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>
            Los geht's
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Starte ein Workout, logge deine Mahlzeit oder erkunde Statistiken über die Navigation.
          </p>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          <button
            onClick={() => router.push('/workout')}
            className="btn-primary"
            style={{ borderRadius: 'var(--radius-md)', padding: '13px 16px' }}
          >
            <Dumbbell size={18} />
            Workout
          </button>
          <button
            onClick={() => router.push('/essen')}
            className="btn-secondary"
            style={{ borderRadius: 'var(--radius-md)', padding: '13px 16px' }}
          >
            <Apple size={18} color="var(--green)" />
            Essen loggen
          </button>
        </div>
      </div>
    </>
  )
}
