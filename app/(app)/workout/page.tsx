'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Sparkles, ChevronRight, Dumbbell, Search,
  Play, Trash2, Calendar, Filter, X, AlertCircle,
  Zap, Clock, Check, Flame, Award
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useWorkoutStore, type Routine, type ActiveExercise } from '@/store/workout'
import { filterExercises, ALL_MUSCLES, EXERCISES } from '@/data/exercises'
import type { MuscleGroup } from '@/data/exercises'
import { useTheme } from '@/contexts/ThemeContext'

type Tab = 'routines' | 'plans' | 'exercises'

interface PlanExercise {
  id: string; exercise_name: string; exercise_id: string | null
  sets: number; reps_range: string; rest_seconds: number; notes?: string; sort_order: number
}
interface PlanDay {
  id: string; day_number: number; name: string; focus: string
  workout_plan_exercises: PlanExercise[]
}
interface Plan {
  id: string; name: string; description: string; days_per_week: number
  difficulty: string; goal?: string; is_ai_generated?: boolean
  workout_plan_days?: PlanDay[]
}
interface UserStats {
  streak: number; thisWeek: number; total: number
}

const DAY_COLORS = ['#F97316', '#3B82F6', '#F97316', '#3B82F6', '#22C55E', '#8B5CF6', '#EAB308']

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
  const { isDark } = useTheme()
  const { session, startSession, routines, deleteRoutine, incrementRoutineUse, saveRoutine } = useWorkoutStore()

  const [tab, setTab] = useState<Tab>('routines')
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserStats>({ streak: 0, thisWeek: 0, total: 0 })
  const [deleteRtn, setDeleteRtn] = useState<Routine | null>(null)
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    search, muscle: muscle === 'Alle' ? undefined : muscle,
    difficulty: difficulty === 'Alle' ? undefined : difficulty,
  })
  const filteredPicker = EXERCISES.filter(e => {
    const ms = !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase())
    return ms && (exMuscle === 'Alle' || e.muscle === exMuscle)
  })
  const muscles = ['Alle', ...new Set(EXERCISES.map(e => e.muscle))]

  const bg = isDark ? '#0F0F0F' : '#F7F8FA'
  const surface = isDark ? '#1A1A1A' : '#FFFFFF'
  const surface2 = isDark ? '#242424' : '#F1F3F6'
  const surface3 = isDark ? '#2E2E2E' : '#E8EAED'
  const border = isDark ? '#2A2A2A' : '#E8EAED'
  const text1 = isDark ? '#F5F5F5' : '#111827'
  const text2 = isDark ? '#A3A3A3' : '#4B5563'
  const text3 = isDark ? '#6B6B6B' : '#9CA3AF'

  useEffect(() => { loadPlans(); loadStats() }, [user])

  async function loadStats() {
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('streak_days').eq('id', user.id).single()
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
    const { count: thisWeek } = await supabase.from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('started_at', weekStart.toISOString())
    const { count: total } = await supabase.from('workout_sessions')
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    setUserStats({ streak: profile?.streak_days ?? 0, thisWeek: thisWeek ?? 0, total: total ?? 0 })
  }

  async function loadPlans() {
    if (!user) return
    setPlansLoading(true)
    const { data } = await supabase
      .from('workout_plans')
      .select(`id, name, description, days_per_week, difficulty, goal, is_ai_generated,
        workout_plan_days ( id, day_number, name, focus,
          workout_plan_exercises ( id, exercise_name, exercise_id, sets, reps_range, rest_seconds, notes, sort_order )
        )`)
      .eq('user_id', user.id).order('created_at', { ascending: false })
    setPlans(data ?? [])
    setPlansLoading(false)
  }

  async function confirmDeletePlan(id: string) {
    setDeleting(true)
    try {
      await supabase.from('workout_plans').delete().eq('id', id)
      setPlans(p => p.filter(pl => pl.id !== id))
      setDeletePlanId(null)
    } finally { setDeleting(false) }
  }

  // Start from plan day — loads all exercises with correct sets/reps
  function startFromPlanDay(plan: Plan, day: PlanDay) {
    const exercises: ActiveExercise[] = [...(day.workout_plan_exercises ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(ex => ({
        id: crypto.randomUUID(),
        exerciseId: ex.exercise_id ?? ex.exercise_name,
        exerciseName: ex.exercise_name,
        muscle: EXERCISES.find(e => e.id === ex.exercise_id)?.muscle ?? 'Ganzkörper',
        equipment: EXERCISES.find(e => e.id === ex.exercise_id)?.equipment,
        notes: ex.notes,
        sets: Array.from({ length: Math.max(ex.sets, 1) }, () => ({
          id: crypto.randomUUID(),
          weight: '',
          reps: ex.reps_range?.split('-')[0] ?? '8',
          done: false,
        })),
      }))
    startSession(`${plan.name} – ${day.name}`, undefined, exercises)
    router.push('/workout/active')
  }

  // Start routine — loads all exercises from local store
  function startRoutine(routine: Routine) {
    incrementRoutineUse(routine.id)
    const exercises: ActiveExercise[] = [...routine.exercises]
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
    if (!iso) return null
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return 'Zuletzt: Heute'
    if (diff === 1) return 'Zuletzt: Gestern'
    if (diff < 7) return `Zuletzt: vor ${diff} Tagen`
    return `Zuletzt: ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`
  }

  return (
    <div style={{ minHeight: '100dvh', background: bg, paddingBottom: 80 }}>

      {/* ── HEADER (Reppd style) ── */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '52px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#2DC96E', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              LIFTOFF TRAINING
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: text1, lineHeight: 1.1 }}>
              Workout
            </h1>
          </div>
          <button
            className="btn-primary"
            onClick={startFreeWorkout}
            style={{ width: 'auto', padding: '10px 18px', fontSize: 14, borderRadius: 12 }}
          >
            <Play size={15} /> Start
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { icon: <Flame size={18} color="#F97316" />, value: userStats.streak, label: 'TAGE STREAK' },
            { icon: <Calendar size={18} color={isDark ? '#60A5FA' : '#3B82F6'} />, value: userStats.thisWeek, label: 'DIESE WOCHE' },
            { icon: <Award size={18} color={isDark ? '#FBBF24' : '#EAB308'} />, value: userStats.total, label: 'WORKOUTS TOTAL' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{ background: surface2, borderRadius: 14, padding: '14px 12px', textAlign: 'center', border: `1px solid ${border}` }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{icon}</div>
              <p style={{ fontSize: 28, fontWeight: 900, color: text1, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: text3, letterSpacing: 0.5, marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Active session banner */}
        {session && (
          <button onClick={() => router.push('/workout/active')} style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            background: 'rgba(45,201,110,0.12)', border: '1.5px solid rgba(45,201,110,0.4)',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 4,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2DC96E', boxShadow: '0 0 0 3px rgba(45,201,110,0.25)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <p style={{ fontWeight: 700, fontSize: 14, color: '#2DC96E', flex: 1, textAlign: 'left' }}>{session.name} läuft — Tippe um fortzufahren</p>
            <ChevronRight size={16} color="#2DC96E" />
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>

        {/* KI Coach */}
        <button onClick={() => router.push('/workout/ki-coach')} style={{
          width: '100%', marginBottom: 14, padding: '14px 16px', borderRadius: 14,
          background: isDark ? 'rgba(45,201,110,0.1)' : '#F0FDF4',
          border: `1px solid ${isDark ? 'rgba(45,201,110,0.25)' : '#BBF7D0'}`,
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: '#2DC96E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} color="white" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: text1 }}>KI-Coach</p>
            <p style={{ fontSize: 13, color: text2, marginTop: 1 }}>Perfekten Trainingsplan erstellen lassen</p>
          </div>
          <ChevronRight size={18} color={text3} />
        </button>

        {/* Tabs */}
        <div style={{ display: 'flex', background: surface2, borderRadius: 12, padding: 4, gap: 2, marginBottom: 16, border: `1px solid ${border}` }}>
          {(['routines', 'plans', 'exercises'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = { routines: 'Routinen', plans: 'KI-Pläne', exercises: 'Übungen' }
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: tab === t ? 700 : 500, transition: 'all 0.2s',
                background: tab === t ? surface : 'transparent',
                color: tab === t ? text1 : text3,
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              }}>{labels[t]}</button>
            )
          })}
        </div>

        {/* ── ROUTINEN TAB ── */}
        {tab === 'routines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Quick start cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={startFreeWorkout} style={{ padding: '18px 16px', borderRadius: 14, background: '#2DC96E', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={20} color="white" />
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'white' }}>Freies Training</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Ohne Vorlage</p>
              </button>
              <button onClick={() => setShowRoutineBuilder(true)} style={{ padding: '18px 16px', borderRadius: 14, background: surface, border: `1.5px dashed ${border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: isDark ? 'rgba(45,201,110,0.15)' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} color="#2DC96E" />
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: text1 }}>Neue Routine</p>
                <p style={{ fontSize: 11, color: text3 }}>Vorlage erstellen</p>
              </button>
            </div>

            {routines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: surface, borderRadius: 16, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>💪</div>
                <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, color: text1 }}>Noch keine Routinen</p>
                <p style={{ fontSize: 14, color: text2, marginBottom: 20 }}>Erstelle deine erste Vorlage oder nutze den KI-Coach.</p>
                <button className="btn-primary" onClick={() => setShowRoutineBuilder(true)} style={{ width: 'auto', display: 'inline-flex', margin: '0 auto', gap: 8 }}>
                  <Plus size={16} /> Routine erstellen
                </button>
              </div>
            ) : (
              routines.map((routine, ri) => {
                const muscleSet = [...new Set(routine.exercises.map(e => e.muscle))].slice(0, 5)
                const lastUsedStr = formatLastUsed(routine.lastUsed)
                const color1 = DAY_COLORS[ri % DAY_COLORS.length]

                return (
                  <div key={routine.id} style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {/* Color stripe */}
                    <div style={{ height: 3, background: `linear-gradient(90deg, ${color1}, ${color1}90)` }} />
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 800, fontSize: 17, color: text1, marginBottom: 6, letterSpacing: '-0.02em' }}>{routine.name}</p>
                          {/* Muscle tags */}
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                            {muscleSet.map(m => {
                              const c = MUSCLE_COLOR[m] ?? '#6B7280'
                              return <span key={m} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${c}18`, color: c }}>{m}</span>
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 12, color: text3, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Dumbbell size={12} /> {routine.exercises.length} Übungen
                            </span>
                            {lastUsedStr && (
                              <span style={{ fontSize: 12, color: text3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={12} /> {lastUsedStr}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setDeleteRtn(routine)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: text3, flexShrink: 0 }}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Exercise list preview */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                        {routine.exercises.slice(0, 4).map((ex, i) => {
                          const c = MUSCLE_COLOR[ex.muscle] ?? '#6B7280'
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: text2, flex: 1 }}>{ex.exerciseName}</span>
                              <span style={{ fontSize: 11, color: text3, fontWeight: 600 }}>{ex.defaultSets}×{ex.defaultReps}</span>
                            </div>
                          )
                        })}
                        {routine.exercises.length > 4 && (
                          <p style={{ fontSize: 12, color: text3, marginLeft: 13 }}>+{routine.exercises.length - 4} weitere</p>
                        )}
                      </div>

                      {/* Start button */}
                      <button
                        onClick={() => startRoutine(routine)}
                        style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#2DC96E', border: 'none', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 8px rgba(45,201,110,0.3)' }}
                      >
                        <Play size={16} fill="white" color="white" /> Training starten
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── KI PLÄNE TAB ── */}
        {tab === 'plans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {plansLoading && <p style={{ textAlign: 'center', color: text3, padding: '32px 0' }}>Laden...</p>}

            {!plansLoading && plans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: surface, borderRadius: 16, border: `1px solid ${border}` }}>
                <Sparkles size={44} style={{ color: '#2DC96E', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, color: text1 }}>Noch keine KI-Pläne</p>
                <p style={{ fontSize: 14, color: text2, marginBottom: 20 }}>Lass dir deinen perfekten Plan erstellen!</p>
                <button className="btn-primary" onClick={() => router.push('/workout/ki-coach')} style={{ width: 'auto', margin: '0 auto', display: 'inline-flex', gap: 8 }}>
                  <Sparkles size={16} /> KI-Coach starten
                </button>
              </div>
            )}

            {plans.map((plan, pi) => {
              const days = (plan.workout_plan_days ?? []).sort((a, b) => a.day_number - b.day_number)
              return (
                <div key={plan.id} style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                  {/* Plan header — tap to go to detail */}
                  <button
                    onClick={() => router.push(`/workout/plan/${plan.id}`)}
                    style={{ width: '100%', padding: '18px 18px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                          <p style={{ fontWeight: 800, fontSize: 17, color: text1, letterSpacing: '-0.02em' }}>{plan.name}</p>
                          {plan.is_ai_generated && <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: isDark ? 'rgba(45,201,110,0.15)' : '#F0FDF4', color: '#2DC96E', border: `1px solid ${isDark ? 'rgba(45,201,110,0.3)' : '#BBF7D0'}` }}>✨ KI</span>}
                        </div>
                        <p style={{ fontSize: 13, color: text2, lineHeight: 1.5, marginBottom: 10 }}>{plan.description}</p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: text3, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {plan.days_per_week}×/Woche</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${DIFF_COLOR[plan.difficulty] ?? '#6B7280'}18`, color: DIFF_COLOR[plan.difficulty] ?? '#6B7280' }}>{plan.difficulty}</span>
                          {plan.goal && <span style={{ fontSize: 12, color: text3 }}>🎯 {plan.goal}</span>}
                        </div>
                      </div>
                      <ChevronRight size={18} color={text3} style={{ flexShrink: 0, marginTop: 2 }} />
                    </div>
                  </button>

                  {/* Day rows — Reppd style */}
                  <div style={{ borderTop: `1px solid ${border}` }}>
                    {days.map((day, di) => {
                      const color = DAY_COLORS[di % DAY_COLORS.length]
                      const exNames = (day.workout_plan_exercises ?? [])
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .slice(0, 3).map(e => e.exercise_name).join(' · ')
                      return (
                        <div key={day.id} style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: di < days.length - 1 ? `1px solid ${border}` : 'none' }}>
                          {/* Left color bar */}
                          <div style={{ width: 3, alignSelf: 'stretch', background: color, flexShrink: 0 }} />
                          {/* Number badge */}
                          <div style={{ width: 38, height: 38, margin: '10px 12px', borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color }}>{day.day_number}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            <p style={{ fontWeight: 700, fontSize: 15, color: text1 }}>{day.name}</p>
                            <p style={{ fontSize: 12, color: text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {exNames}{day.workout_plan_exercises?.length > 3 ? ' ...' : ''}
                            </p>
                          </div>
                          {/* Play button */}
                          <button
                            onClick={() => startFromPlanDay(plan, day)}
                            style={{ width: 34, height: 34, borderRadius: 10, background: '#2DC96E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 12px 0 0' }}
                          >
                            <Play size={14} color="white" fill="white" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Delete button */}
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setDeletePlanId(plan.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: text3, fontSize: 13, padding: '4px 8px' }}>
                      <Trash2 size={14} /> Plan löschen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ÜBUNGEN TAB ── */}
        {tab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: text3, pointerEvents: 'none' }} />
                <input className="input" placeholder="Übung suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} style={{ width: 46, borderRadius: 10, border: `1.5px solid ${showFilters ? '#2DC96E' : border}`, background: showFilters ? (isDark ? 'rgba(45,201,110,0.1)' : '#F0FDF4') : surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Filter size={16} color={showFilters ? '#2DC96E' : text3} />
              </button>
            </div>
            {showFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
                  {(['Alle', ...ALL_MUSCLES] as (MuscleGroup | 'Alle')[]).map(m => (
                    <button key={m} onClick={() => setMuscle(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${muscle === m ? '#2DC96E' : border}`, background: muscle === m ? '#2DC96E' : 'transparent', color: muscle === m ? 'white' : text2, cursor: 'pointer' }}>{m}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Alle', 'Anfänger', 'Fortgeschritten', 'Profi'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{ flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${difficulty === d ? '#2DC96E' : border}`, background: difficulty === d ? (isDark ? 'rgba(45,201,110,0.15)' : '#F0FDF4') : 'transparent', color: difficulty === d ? '#2DC96E' : text2, cursor: 'pointer' }}>{d}</button>
                  ))}
                </div>
              </div>
            )}
            <p style={{ fontSize: 12, color: text3 }}>{filtered.length} Übungen</p>
            {filtered.map(ex => {
              const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
              return (
                <div key={ex.id} style={{ background: surface, borderRadius: 12, border: `1px solid ${border}`, padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => router.push(`/workout/exercise/${ex.id}`)}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Dumbbell size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: text1 }}>{ex.name}</p>
                    <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{ex.muscle}</span>
                      <span style={{ fontSize: 11, color: text3 }}>{ex.equipment}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: `${DIFF_COLOR[ex.difficulty] ?? '#6B7280'}15`, color: DIFF_COLOR[ex.difficulty] ?? '#6B7280' }}>{ex.difficulty}</span>
                    </div>
                  </div>
                  <ChevronRight size={15} color={text3} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ROUTINE BUILDER ── */}
      {showRoutineBuilder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: bg, overflowY: 'auto', paddingBottom: 40 }}>
          <div style={{ padding: '52px 16px 16px', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, background: surface, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: text1 }}>Neue Routine</h2>
              <button onClick={() => setShowRoutineBuilder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color={text2} /></button>
            </div>
            <input className="input" placeholder="Name z.B. Push Day" value={routineName} onChange={e => setRoutineName(e.target.value)} />
          </div>
          <div style={{ padding: '16px' }}>
            {routineExs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: surface2, borderRadius: 14, marginBottom: 16, border: `1px solid ${border}` }}>
                <Dumbbell size={36} style={{ color: text3, margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <p style={{ color: text3, fontSize: 14 }}>Noch keine Übungen</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {routineExs.map((ex, i) => {
                  const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
                  return (
                    <div key={i} style={{ background: surface, borderRadius: 12, border: `1px solid ${border}`, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Dumbbell size={15} color={color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: text1 }}>{ex.exerciseName}</p>
                          <p style={{ fontSize: 11, color: text3 }}>{ex.muscle}</p>
                        </div>
                        <button onClick={() => setRoutineExs(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: text3 }}><X size={16} /></button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Sätze', field: 'sets' as const, type: 'number', val: String(ex.sets) },
                          { label: 'Wdh', field: 'reps' as const, type: 'text', val: ex.reps },
                          { label: 'Pause(s)', field: 'rest' as const, type: 'number', val: String(ex.rest) },
                        ].map(({ label, field, type, val }) => (
                          <div key={field}>
                            <p style={{ fontSize: 10, color: text3, marginBottom: 4, fontWeight: 600 }}>{label}</p>
                            <input type={type} value={val}
                              onChange={e => setRoutineExs(p => p.map((ex2, idx) => idx !== i ? ex2 : { ...ex2, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                              style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${border}`, background: surface2, color: text1, textAlign: 'center', fontSize: 14, fontWeight: 700, outline: 'none' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={() => setShowExPicker(true)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: `1.5px dashed ${border}`, background: 'transparent', color: text2, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              <Plus size={17} color="#2DC96E" /> Übung hinzufügen
            </button>
            <button className="btn-primary" onClick={saveNewRoutine} disabled={!routineName.trim() || routineExs.length === 0} style={{ opacity: !routineName.trim() || routineExs.length === 0 ? 0.4 : 1 }}>
              <Zap size={16} /> Routine speichern
            </button>
          </div>
        </div>
      )}

      {/* ── EXERCISE PICKER ── */}
      {showExPicker && (
        <div onClick={e => e.target === e.currentTarget && setShowExPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: surface, borderRadius: '20px 20px 0 0', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: border, margin: '0 auto 14px' }} />
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: text3, pointerEvents: 'none' }} />
                <input className="input" placeholder="Übung suchen..." value={exSearch} onChange={e => setExSearch(e.target.value)} style={{ paddingLeft: 38 }} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="no-scrollbar">
                {muscles.map(m => (
                  <button key={m} onClick={() => setExMuscle(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${exMuscle === m ? '#2DC96E' : border}`, background: exMuscle === m ? '#2DC96E' : 'transparent', color: exMuscle === m ? 'white' : text2, cursor: 'pointer' }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
              {filteredPicker.map(ex => {
                const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
                const already = routineExs.some(r => r.exerciseId === ex.id)
                return (
                  <button key={ex.id}
                    onClick={() => { if (!already) setRoutineExs(p => [...p, { exerciseId: ex.id, exerciseName: ex.name, muscle: ex.muscle, equipment: ex.equipment, sets: 3, reps: '8-12', rest: 90 }]); setShowExPicker(false); setExSearch('') }}
                    style={{ width: '100%', padding: '12px 14px', marginBottom: 6, borderRadius: 12, border: `1px solid ${already ? (isDark ? 'rgba(45,201,110,0.4)' : '#BBF7D0') : border}`, background: already ? (isDark ? 'rgba(45,201,110,0.1)' : '#F0FDF4') : surface, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Dumbbell size={15} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: text1 }}>{ex.name}</p>
                      <p style={{ fontSize: 11, color: text3, marginTop: 1 }}>{ex.muscle} · {ex.equipment}</p>
                    </div>
                    {already ? <Check size={16} color="#2DC96E" /> : <Plus size={16} color="#2DC96E" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ROUTINE SHEET ── */}
      {deleteRtn && (
        <div onClick={e => e.target === e.currentTarget && setDeleteRtn(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: surface, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(28px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: border, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#EF4444" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: text1 }}>Routine löschen?</p>
                <p style={{ fontSize: 13, color: text3 }}>{deleteRtn.name}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteRtn(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, background: surface2, border: `1px solid ${border}`, color: text2, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => { deleteRoutine(deleteRtn.id); setDeleteRtn(null) }} style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#EF4444', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PLAN SHEET ── */}
      {deletePlanId && (
        <div onClick={e => e.target === e.currentTarget && setDeletePlanId(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: surface, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(28px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: border, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#EF4444" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: text1 }}>Plan löschen?</p>
                <p style={{ fontSize: 13, color: text3 }}>Alle Trainingstage werden gelöscht.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeletePlanId(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, background: surface2, border: `1px solid ${border}`, color: text2, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => confirmDeletePlan(deletePlanId)} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 12, background: deleting ? '#FCA5A5' : '#EF4444', border: 'none', color: 'white', fontWeight: 700, cursor: deleting ? 'default' : 'pointer' }}>
                {deleting ? 'Löschen...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
