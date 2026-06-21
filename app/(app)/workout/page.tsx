'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Sparkles, ChevronRight, Dumbbell, Search,
  Play, Trash2, Calendar, Filter, X, AlertCircle,
  Zap, Clock, Check, ChevronDown, ChevronUp
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useWorkoutStore, type Routine, type ActiveExercise } from '@/store/workout'
import { filterExercises, ALL_MUSCLES, EXERCISES } from '@/data/exercises'
import type { MuscleGroup } from '@/data/exercises'

type Tab = 'routines' | 'plans' | 'exercises'

interface PlanExercise {
  id: string
  exercise_name: string
  exercise_id: string | null
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
  const { session, startSession, routines, deleteRoutine, incrementRoutineUse, saveRoutine } = useWorkoutStore()

  const [tab, setTab] = useState<Tab>('routines')
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null)
  const [deleteRtn, setDeleteRtn] = useState<Routine | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Routine builder
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const [routineExs, setRoutineExs] = useState<{
    exerciseId: string; exerciseName: string; muscle: string
    equipment: string; sets: number; reps: string; rest: number
  }[]>([])
  const [showExPicker, setShowExPicker] = useState(false)
  const [exSearch, setExSearch] = useState('')
  const [exMuscle, setExMuscle] = useState('Alle')

  // Exercise library
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'Alle'>('Alle')
  const [difficulty, setDifficulty] = useState('Alle')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = filterExercises({
    search,
    muscle: muscle === 'Alle' ? undefined : muscle,
    difficulty: difficulty === 'Alle' ? undefined : difficulty,
  })
  const filteredPicker = EXERCISES.filter(e => {
    const ms = !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase())
    const mm = exMuscle === 'Alle' || e.muscle === exMuscle
    return ms && mm
  })
  const muscles = ['Alle', ...new Set(EXERCISES.map(e => e.muscle))]

  useEffect(() => { loadPlans() }, [user])

  async function loadPlans() {
    if (!user) return
    setPlansLoading(true)
    const { data, error } = await supabase
      .from('workout_plans')
      .select(`
        id, name, description, days_per_week, difficulty, goal, is_ai_generated,
        workout_plan_days (
          id, day_number, name, focus,
          workout_plan_exercises (
            id, exercise_name, exercise_id, sets, reps_range, rest_seconds, notes, sort_order
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) console.error('loadPlans error:', error)
    setPlans(data ?? [])
    setPlansLoading(false)
  }

  async function confirmDeletePlan() {
    if (!deletePlan) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.from('workout_plans').delete().eq('id', deletePlan.id)
      if (error) throw error
      setPlans(p => p.filter(pl => pl.id !== deletePlan.id))
      setDeletePlan(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    } finally {
      setDeleting(false)
    }
  }

  // Start workout from a specific plan day
  function startFromPlanDay(plan: Plan, day: PlanDay) {
    const exercises: ActiveExercise[] = (day.workout_plan_exercises ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(ex => ({
        id: crypto.randomUUID(),
        exerciseId: ex.exercise_id ?? ex.exercise_name,
        exerciseName: ex.exercise_name,
        muscle: EXERCISES.find(e => e.id === ex.exercise_id)?.muscle ?? 'Ganzkörper',
        equipment: EXERCISES.find(e => e.id === ex.exercise_id)?.equipment,
        notes: ex.notes,
        sets: Array.from({ length: ex.sets }, () => ({
          id: crypto.randomUUID(),
          weight: '',
          reps: ex.reps_range?.split('-')[0] ?? '8',
          done: false,
        })),
      }))
    startSession(`${plan.name} – ${day.name}`, undefined, exercises)
    router.push('/workout/active')
  }

  // Start full plan (first day)
  function startFromPlan(plan: Plan) {
    const days = (plan.workout_plan_days ?? []).sort((a, b) => a.day_number - b.day_number)
    if (days.length > 0) {
      startFromPlanDay(plan, days[0])
    } else {
      startSession(plan.name)
      router.push('/workout/active')
    }
  }

  function startRoutine(routine: Routine) {
    incrementRoutineUse(routine.id)
    const exercises: ActiveExercise[] = routine.exercises
      .sort((a, b) => a.order - b.order)
      .map(ex => ({
        id: crypto.randomUUID(),
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        muscle: ex.muscle,
        equipment: ex.equipment,
        notes: ex.notes,
        sets: Array.from({ length: ex.defaultSets }, () => ({
          id: crypto.randomUUID(),
          weight: ex.defaultWeight ?? '',
          reps: ex.defaultReps,
          done: false,
        })),
      }))
    startSession(routine.name, routine.id, exercises)
    router.push('/workout/active')
  }

  function startFreeWorkout() {
    startSession('Freies Training')
    router.push('/workout/active')
  }

  function saveNewRoutine() {
    if (!routineName.trim() || routineExs.length === 0) return
    saveRoutine({
      name: routineName.trim(),
      exercises: routineExs.map((e, i) => ({
        exerciseId: e.exerciseId, exerciseName: e.exerciseName,
        muscle: e.muscle, equipment: e.equipment,
        defaultSets: e.sets, defaultReps: e.reps,
        restSeconds: e.rest, order: i,
      })),
    })
    setShowRoutineBuilder(false)
    setRoutineName('')
    setRoutineExs([])
  }

  function formatLastUsed(iso?: string) {
    if (!iso) return 'Noch nie gestartet'
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return 'Heute'
    if (diff === 1) return 'Gestern'
    if (diff < 7) return `vor ${diff} Tagen`
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      <PageHeader
        title="Workout"
        subtitle="Routinen · Pläne · Übungen"
        right={
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: 14 }} onClick={startFreeWorkout}>
            <Play size={15} /> Start
          </button>
        }
      />

      <div style={{ padding: '16px' }}>

        {/* Active session banner */}
        {session && (
          <button onClick={() => router.push('/workout/active')} style={{
            width: '100%', marginBottom: 14, padding: '14px 16px',
            borderRadius: 14, background: '#F0FDF4', border: '1.5px solid #86EFAC',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.25)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#15803D' }}>{session.name} läuft</p>
              <p style={{ fontSize: 12, color: '#166534', marginTop: 1 }}>Tippe um fortzufahren</p>
            </div>
            <ChevronRight size={18} color="#16A34A" />
          </button>
        )}

        {/* KI Coach */}
        <button onClick={() => router.push('/workout/ki-coach')} className="banner" style={{ width: '100%', marginBottom: 14, border: 'none', cursor: 'pointer' }}>
          <div className="banner-icon"><Sparkles size={22} color="white" /></div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>KI-Coach</p>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 1 }}>Perfekten Trainingsplan erstellen lassen</p>
          </div>
          <ChevronRight size={18} color="#9CA3AF" />
        </button>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#F1F3F6', borderRadius: 12, padding: 4, gap: 2, marginBottom: 16 }}>
          {(['routines', 'plans', 'exercises'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = { routines: 'Routinen', plans: 'KI-Pläne', exercises: 'Übungen' }
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? '#111827' : '#9CA3AF',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>{labels[t]}</button>
            )
          })}
        </div>

        {/* ── ROUTINEN ── */}
        {tab === 'routines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={startFreeWorkout} style={{ padding: '16px', borderRadius: 14, background: '#2DC96E', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} color="white" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>Freies Training</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Ohne Vorlage starten</p>
              </button>
              <button onClick={() => setShowRoutineBuilder(true)} style={{ padding: '16px', borderRadius: 14, background: 'white', border: '1.5px dashed #D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#2DC96E" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Neue Routine</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>Vorlage erstellen</p>
              </button>
            </div>

            {routines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 16, border: '1px solid #E8EAED' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💪</div>
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Noch keine Routinen</p>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Erstelle eine Vorlage oder nutze den KI-Coach.</p>
                <button className="btn-primary" onClick={() => setShowRoutineBuilder(true)} style={{ width: 'auto', display: 'inline-flex', margin: '0 auto' }}>
                  <Plus size={16} /> Routine erstellen
                </button>
              </div>
            ) : (
              routines.map(routine => {
                const muscleSet = [...new Set(routine.exercises.map(e => e.muscle))].slice(0, 4)
                return (
                  <div key={routine.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #E8EAED', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{routine.name}</p>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                            {muscleSet.map(m => {
                              const c = MUSCLE_COLOR[m] ?? '#6B7280'
                              return <span key={m} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${c}12`, color: c }}>{m}</span>
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Dumbbell size={12} /> {routine.exercises.length} Übungen
                            </span>
                            <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={12} /> {formatLastUsed(routine.lastUsed)}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => setDeleteRtn(routine)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#D1D5DB' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                        {routine.exercises.slice(0, 4).map((ex, i) => {
                          const c = MUSCLE_COLOR[ex.muscle] ?? '#6B7280'
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: '#4B5563', flex: 1 }}>{ex.exerciseName}</span>
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{ex.defaultSets}×{ex.defaultReps}</span>
                            </div>
                          )
                        })}
                        {routine.exercises.length > 4 && (
                          <p style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 14 }}>+{routine.exercises.length - 4} weitere</p>
                        )}
                      </div>
                      <button onClick={() => startRoutine(routine)} className="btn-primary">
                        <Play size={16} /> Training starten
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── KI PLÄNE ── */}
        {tab === 'plans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {plansLoading && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px 0' }}>Laden...</p>}

            {!plansLoading && plans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1px solid #E8EAED' }}>
                <Sparkles size={44} style={{ color: '#2DC96E', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Noch keine KI-Pläne</p>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Lass dir deinen perfekten Plan erstellen!</p>
                <button className="btn-primary" onClick={() => router.push('/workout/ki-coach')} style={{ width: 'auto', margin: '0 auto', display: 'inline-flex', gap: 8 }}>
                  <Sparkles size={16} /> KI-Coach starten
                </button>
              </div>
            )}

            {plans.map(plan => {
              const days = (plan.workout_plan_days ?? []).sort((a, b) => a.day_number - b.day_number)
              const isExpanded = expandedPlan === plan.id
              const totalEx = days.reduce((sum, d) => sum + (d.workout_plan_exercises?.length ?? 0), 0)

              return (
                <div key={plan.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #E8EAED', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {/* Plan header */}
                  <div style={{ padding: '18px 18px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                          <p style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</p>
                          {plan.is_ai_generated && <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>✨ KI</span>}
                        </div>
                        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 10 }}>{plan.description}</p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {plan.days_per_week}×/Woche</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${DIFF_COLOR[plan.difficulty] ?? '#6B7280'}15`, color: DIFF_COLOR[plan.difficulty] ?? '#6B7280' }}>{plan.difficulty}</span>
                          {plan.goal && <span style={{ fontSize: 12, color: '#9CA3AF' }}>🎯 {plan.goal}</span>}
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>💪 {totalEx} Übungen</span>
                        </div>
                      </div>
                      <button onClick={() => setDeletePlan(plan)} style={{ width: 34, height: 34, borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={14} color="#EF4444" />
                      </button>
                    </div>
                  </div>

                  {/* Days — expandable */}
                  <button
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                    style={{ width: '100%', padding: '10px 18px', background: '#F7F8FA', border: 'none', borderTop: '1px solid #E8EAED', borderBottom: isExpanded ? '1px solid #E8EAED' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4B5563' }}>
                      {days.length} Trainingstage {isExpanded ? 'ausblenden' : 'anzeigen'}
                    </span>
                    {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                  </button>

                  {isExpanded && (
                    <div>
                      {days.map((day, di) => (
                        <div key={day.id} style={{ borderBottom: di < days.length - 1 ? '1px solid #F1F3F6' : 'none' }}>
                          {/* Day header */}
                          <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Tag {day.day_number}: {day.name}</p>
                              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{day.focus} · {day.workout_plan_exercises?.length ?? 0} Übungen</p>
                            </div>
                            <button
                              onClick={() => startFromPlanDay(plan, day)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#2DC96E', border: 'none', cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                            >
                              <Play size={12} color="white" /> Starten
                            </button>
                          </div>

                          {/* Exercises */}
                          {[...(day.workout_plan_exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((ex, i) => {
                            const color = MUSCLE_COLOR[EXERCISES.find(e => e.id === ex.exercise_id)?.muscle ?? ''] ?? '#2DC96E'
                            return (
                              <div key={ex.id} style={{ padding: '8px 18px 8px 18px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #F7F8FA' }}>
                                <div style={{ width: 4, height: 28, borderRadius: 2, background: color, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{ex.exercise_name}</p>
                                  {ex.notes && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, fontStyle: 'italic' }}>{ex.notes}</p>}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {ex.sets}×{ex.reps_range}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Start buttons */}
                  <div style={{ padding: '14px 16px', display: 'flex', gap: 8 }}>
                    <button onClick={() => startFromPlan(plan)} className="btn-primary" style={{ flex: 1 }}>
                      <Play size={16} /> Tag 1 starten
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ÜBUNGEN ── */}
        {tab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                <input className="input" placeholder="Übung suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} style={{ width: 46, borderRadius: 10, border: `1.5px solid ${showFilters ? '#2DC96E' : '#E8EAED'}`, background: showFilters ? '#F0FDF4' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Filter size={16} color={showFilters ? '#2DC96E' : '#9CA3AF'} />
              </button>
            </div>

            {showFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
                  {(['Alle', ...ALL_MUSCLES] as (MuscleGroup | 'Alle')[]).map(m => (
                    <button key={m} onClick={() => setMuscle(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${muscle === m ? '#2DC96E' : '#E8EAED'}`, background: muscle === m ? '#2DC96E' : 'transparent', color: muscle === m ? 'white' : '#6B7280', cursor: 'pointer' }}>{m}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Alle', 'Anfänger', 'Fortgeschritten', 'Profi'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{ flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${difficulty === d ? '#2DC96E' : '#E8EAED'}`, background: difficulty === d ? '#F0FDF4' : 'transparent', color: difficulty === d ? '#15803D' : '#6B7280', cursor: 'pointer' }}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{filtered.length} Übungen</p>

            {filtered.map(ex => {
              const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
              return (
                <div key={ex.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #E8EAED', padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => router.push(`/workout/exercise/${ex.id}`)}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Dumbbell size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{ex.name}</p>
                    <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{ex.muscle}</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{ex.equipment}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: `${DIFF_COLOR[ex.difficulty] ?? '#6B7280'}12`, color: DIFF_COLOR[ex.difficulty] ?? '#6B7280' }}>{ex.difficulty}</span>
                    </div>
                  </div>
                  <ChevronRight size={15} color="#D1D5DB" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ROUTINE BUILDER ── */}
      {showRoutineBuilder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'white', overflowY: 'auto', paddingBottom: 40 }}>
          <div style={{ padding: '52px 16px 16px', borderBottom: '1px solid #E8EAED', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Neue Routine</h2>
              <button onClick={() => setShowRoutineBuilder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} color="#6B7280" />
              </button>
            </div>
            <input className="input" placeholder="Name z.B. Push Day" value={routineName} onChange={e => setRoutineName(e.target.value)} />
          </div>

          <div style={{ padding: '16px' }}>
            {routineExs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F7F8FA', borderRadius: 14, marginBottom: 16 }}>
                <Dumbbell size={36} style={{ color: '#D1D5DB', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ color: '#9CA3AF', fontSize: 14 }}>Noch keine Übungen</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {routineExs.map((ex, i) => {
                  const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #E8EAED', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Dumbbell size={15} color={color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{ex.exerciseName}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{ex.muscle}</p>
                        </div>
                        <button onClick={() => setRoutineExs(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
                          <X size={16} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Sätze', field: 'sets' as const, type: 'number', val: String(ex.sets) },
                          { label: 'Wdh', field: 'reps' as const, type: 'text', val: ex.reps },
                          { label: 'Pause (s)', field: 'rest' as const, type: 'number', val: String(ex.rest) },
                        ].map(({ label, field, type, val }) => (
                          <div key={field}>
                            <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, fontWeight: 600 }}>{label}</p>
                            <input type={type} value={val}
                              onChange={e => setRoutineExs(p => p.map((ex2, idx) => idx !== i ? ex2 : { ...ex2, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                              style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #E8EAED', textAlign: 'center', fontSize: 14, fontWeight: 700, outline: 'none' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={() => setShowExPicker(true)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px dashed #D1D5DB', background: 'white', cursor: 'pointer', color: '#6B7280', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              <Plus size={18} color="#2DC96E" /> Übung hinzufügen
            </button>

            <button className="btn-primary" onClick={saveNewRoutine} disabled={!routineName.trim() || routineExs.length === 0} style={{ opacity: !routineName.trim() || routineExs.length === 0 ? 0.5 : 1 }}>
              <Zap size={16} /> Routine speichern
            </button>
          </div>
        </div>
      )}

      {/* ── EXERCISE PICKER ── */}
      {showExPicker && (
        <div onClick={e => e.target === e.currentTarget && setShowExPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #E8EAED', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8EAED', margin: '0 auto 14px' }} />
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                <input className="input" placeholder="Übung suchen..." value={exSearch} onChange={e => setExSearch(e.target.value)} style={{ paddingLeft: 38 }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="no-scrollbar">
                {muscles.map(m => (
                  <button key={m} onClick={() => setExMuscle(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${exMuscle === m ? '#2DC96E' : '#E8EAED'}`, background: exMuscle === m ? '#2DC96E' : 'white', color: exMuscle === m ? 'white' : '#6B7280', cursor: 'pointer' }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
              {filteredPicker.map(ex => {
                const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
                const already = routineExs.some(r => r.exerciseId === ex.id)
                return (
                  <button key={ex.id} onClick={() => { if (!already) setRoutineExs(p => [...p, { exerciseId: ex.id, exerciseName: ex.name, muscle: ex.muscle, equipment: ex.equipment, sets: 3, reps: '8-12', rest: 90 }]); setShowExPicker(false); setExSearch('') }}
                    style={{ width: '100%', padding: '12px 14px', marginBottom: 6, borderRadius: 12, border: `1px solid ${already ? '#BBF7D0' : '#E8EAED'}`, background: already ? '#F0FDF4' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Dumbbell size={15} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{ex.name}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{ex.muscle} · {ex.equipment}</p>
                    </div>
                    {already ? <Check size={16} color="#15803D" /> : <Plus size={16} color="#2DC96E" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ROUTINE SHEET ── */}
      {deleteRtn && (
        <div onClick={e => e.target === e.currentTarget && setDeleteRtn(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px calc(28px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8EAED', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#EF4444" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>Routine löschen?</p>
                <p style={{ fontSize: 13, color: '#6B7280' }}>{deleteRtn.name}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setDeleteRtn(null)} style={{ flex: 1 }}>Abbrechen</button>
              <button onClick={() => { deleteRoutine(deleteRtn.id); setDeleteRtn(null) }} style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#EF4444', border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PLAN SHEET ── */}
      {deletePlan && (
        <div onClick={e => e.target === e.currentTarget && setDeletePlan(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px calc(28px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8EAED', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#EF4444" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>Plan löschen?</p>
                <p style={{ fontSize: 13, color: '#6B7280' }}>{deletePlan.name}</p>
              </div>
            </div>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Dieser Plan und alle Trainingstage werden dauerhaft gelöscht.</p>
            {deleteError && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 14, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} color="#EF4444" /><p style={{ fontSize: 13, color: '#DC2626' }}>{deleteError}</p>
            </div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => { setDeletePlan(null); setDeleteError(null) }} style={{ flex: 1 }}>Abbrechen</button>
              <button onClick={confirmDeletePlan} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 12, background: deleting ? '#FCA5A5' : '#EF4444', border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: deleting ? 'default' : 'pointer' }}>
                {deleting ? 'Löschen...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </>
  )
}
