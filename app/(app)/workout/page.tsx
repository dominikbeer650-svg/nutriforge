'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, ChevronRight, Dumbbell, Search, Play, Trash2, Calendar, Filter } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useWorkoutStore } from '@/store/workout'
import { filterExercises, ALL_MUSCLES } from '@/data/exercises'
import type { MuscleGroup } from '@/data/exercises'

type Tab = 'plans' | 'exercises'

interface PlanExercise {
  exercise_name: string
  sets: number
  reps_range: string
  rest_seconds: number
  notes?: string
  sort_order: number
}
interface PlanDay {
  id: string
  day_number: number
  name: string
  focus: string
  workout_plan_exercises: PlanExercise[]
}
interface Plan {
  id: string
  name: string
  description: string
  days_per_week: number
  difficulty: string
  goal?: string
  is_ai_generated?: boolean
  workout_plan_days?: PlanDay[]
}

const DIFF_COLOR: Record<string, string> = {
  Anfänger: '#22C55E', Fortgeschritten: '#F59E0B', Profi: '#EF4444',
}
const MUSCLE_COLOR: Record<string, string> = {
  Brust: '#EF4444', Rücken: '#3B82F6', Schultern: '#8B5CF6',
  Bizeps: '#F59E0B', Trizeps: '#10B981', Beine: '#EC4899',
  Gesäß: '#F97316', Core: '#06B6D4', Waden: '#84CC16',
  Ganzkörper: '#6366F1', Cardio: '#14B8A6', Unterarme: '#A78BFA',
}

export default function WorkoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { session, startSession } = useWorkoutStore()

  const [tab, setTab] = useState<Tab>('plans')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'Alle'>('Alle')
  const [difficulty, setDifficulty] = useState('Alle')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = filterExercises({
    search,
    muscle: muscle === 'Alle' ? undefined : muscle,
    difficulty: difficulty === 'Alle' ? undefined : difficulty,
  })

  useEffect(() => { loadPlans() }, [user])

  async function loadPlans() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('workout_plans')
      .select(`id, name, description, days_per_week, difficulty, goal, is_ai_generated,
        workout_plan_days ( id, day_number, name, focus,
          workout_plan_exercises ( exercise_name, sets, reps_range, rest_seconds, notes, sort_order )
        )`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPlans(data ?? [])
    setLoading(false)
  }

  async function deletePlan(id: string) {
    await supabase.from('workout_plans').delete().eq('id', id)
    setPlans(p => p.filter(pl => pl.id !== id))
    if (selectedPlan?.id === id) setSelectedPlan(null)
  }

  function startWorkout(name = 'Freies Training') {
    startSession(name)
    router.push('/workout/active')
  }

  // ── Plan Detail ─────────────────────────────────────────────────────────
  if (selectedPlan) {
    const days = (selectedPlan.workout_plan_days ?? [])
      .sort((a, b) => a.day_number - b.day_number)
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', paddingBottom: 100 }}>
        <div style={{ padding: '52px 16px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 30 }}>
          <button onClick={() => setSelectedPlan(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            ← Zurück
          </button>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {selectedPlan.is_ai_generated && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-mid)' }}>✨ KI-erstellt</span>}
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${DIFF_COLOR[selectedPlan.difficulty] ?? '#6B7280'}18`, color: DIFF_COLOR[selectedPlan.difficulty] ?? '#6B7280' }}>{selectedPlan.difficulty}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{selectedPlan.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>{selectedPlan.description}</p>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {selectedPlan.days_per_week}x/Woche</span>
            {selectedPlan.goal && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>🎯 {selectedPlan.goal}</span>}
          </div>
          <button className="btn-primary" onClick={() => startWorkout(selectedPlan.name)}>
            <Play size={18} /> Training starten
          </button>
        </div>
        <div style={{ padding: '16px' }}>
          {days.map(day => (
            <div key={day.id} className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>Tag {day.day_number}: {day.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{day.focus} · {day.workout_plan_exercises?.length ?? 0} Übungen</p>
              </div>
              {[...(day.workout_plan_exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((ex, i, arr) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Dumbbell size={16} color="var(--green)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{ex.exercise_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{ex.sets} Sätze · {ex.reps_range} Wdh · {ex.rest_seconds}s Pause</p>
                    {ex.notes && <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontStyle: 'italic' }}>{ex.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Workout"
        subtitle="Trainingspläne, Übungen & Satz-Tracker"
        right={
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: 14 }} onClick={() => startWorkout()}>
            <Play size={15} /> Start
          </button>
        }
      />
      <div style={{ padding: '16px' }}>

        {/* Active session */}
        {session && (
          <button onClick={() => router.push('/workout/active')} style={{ width: '100%', marginBottom: 14, padding: '13px 16px', borderRadius: 'var(--radius-lg)', background: '#F0FDF4', border: '1.5px solid #86EFAC', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.3)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#15803D' }}>Training läuft – {session.name}</p>
              <p style={{ fontSize: 12, color: '#166534', marginTop: 1 }}>Tippe zum Fortfahren</p>
            </div>
            <ChevronRight size={18} color="#16A34A" />
          </button>
        )}

        {/* KI Coach */}
        <button onClick={() => router.push('/workout/ki-coach')} className="banner" style={{ width: '100%', marginBottom: 14, border: 'none', cursor: 'pointer' }}>
          <div className="banner-icon"><Sparkles size={22} color="white" /></div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>KI-Coach</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 1 }}>Perfekten Trainingsplan erstellen lassen</p>
          </div>
          <ChevronRight size={18} color="var(--text-3)" />
        </button>

        {/* Tabs */}
        <div className="tab-switch" style={{ marginBottom: 14 }}>
          <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Trainingspläne</button>
          <button className={tab === 'exercises' ? 'active' : ''} onClick={() => setTab('exercises')}>Übungsbibliothek</button>
        </div>

        {/* PLANS */}
        {tab === 'plans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => startWorkout()} style={{ width: '100%', padding: '15px 18px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border-mid)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-2)', fontSize: 15, fontWeight: 500 }}>
              <Plus size={18} color="var(--green)" /> Neuer Plan
            </button>

            {loading && <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>Laden...</p>}

            {!loading && plans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <Sparkles size={44} style={{ color: 'var(--green)', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Noch keine Pläne</p>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>Lass dir vom KI-Coach deinen perfekten Plan erstellen!</p>
                <button className="btn-primary" onClick={() => router.push('/workout/ki-coach')} style={{ width: 'auto', margin: '0 auto', display: 'inline-flex', gap: 8 }}>
                  <Sparkles size={16} /> KI-Coach starten
                </button>
              </div>
            )}

            {plans.map(plan => (
              <div key={plan.id} className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => setSelectedPlan(plan)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                      <p style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</p>
                      {plan.is_ai_generated && <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-mid)' }}>✨ KI</span>}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 10 }}>{plan.description}</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {plan.days_per_week}x/Woche</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${DIFF_COLOR[plan.difficulty] ?? '#6B7280'}15`, color: DIFF_COLOR[plan.difficulty] ?? '#6B7280' }}>{plan.difficulty}</span>
                      {plan.goal && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>🎯 {plan.goal}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); startWorkout(plan.name) }} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={16} color="white" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Plan löschen?')) deletePlan(plan.id) }} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={15} color="var(--text-3)" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EXERCISES */}
        {tab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input className="input" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} style={{ width: 46, borderRadius: 'var(--radius-sm)', border: `1.5px solid ${showFilters ? 'var(--green)' : 'var(--border)'}`, background: showFilters ? 'var(--green-light)' : 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Filter size={16} color={showFilters ? 'var(--green)' : 'var(--text-3)'} />
              </button>
            </div>

            {showFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
                  {(['Alle', ...ALL_MUSCLES] as (MuscleGroup | 'Alle')[]).map(m => (
                    <button key={m} onClick={() => setMuscle(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${muscle === m ? 'var(--green)' : 'var(--border)'}`, background: muscle === m ? 'var(--green)' : 'transparent', color: muscle === m ? 'white' : 'var(--text-2)', cursor: 'pointer' }}>{m}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Alle', 'Anfänger', 'Fortgeschritten', 'Profi'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{ flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${difficulty === d ? 'var(--green)' : 'var(--border)'}`, background: difficulty === d ? 'var(--green-light)' : 'transparent', color: difficulty === d ? 'var(--green)' : 'var(--text-2)', cursor: 'pointer' }}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} Übungen</p>

            {filtered.map(ex => {
              const color = MUSCLE_COLOR[ex.muscle] ?? '#5B6EF5'
              return (
                <div key={ex.id} className="card" style={{ padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => router.push(`/workout/exercise/${ex.id}`)}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Dumbbell size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{ex.name}</p>
                    <div style={{ display: 'flex', gap: 7, marginTop: 2, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{ex.muscle}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{ex.equipment}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: `${DIFF_COLOR[ex.difficulty] ?? '#6B7280'}15`, color: DIFF_COLOR[ex.difficulty] ?? '#6B7280' }}>{ex.difficulty}</span>
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--text-3)" />
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                <Dumbbell size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                <p>Keine Übungen gefunden</p>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </>
  )
}
