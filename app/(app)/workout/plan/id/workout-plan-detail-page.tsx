'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, Sparkles, Dumbbell, ChevronDown, ChevronUp, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useWorkoutStore, type ActiveExercise } from '@/store/workout'
import { EXERCISES } from '@/data/exercises'
import { useTheme } from '@/contexts/ThemeContext'

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
    duration_weeks?: number
    is_ai_generated?: boolean
    workout_plan_days: PlanDay[]
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
const DAY_COLORS = ['#F97316', '#3B82F6', '#F97316', '#3B82F6', '#22C55E', '#8B5CF6', '#EAB308']

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { user } = useAuthStore()
    const { startSession } = useWorkoutStore()
    const { isDark } = useTheme()

    const [plan, setPlan] = useState<Plan | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [showDeleteSheet, setShowDeleteSheet] = useState(false)

    const bg = isDark ? '#0F0F0F' : '#F7F8FA'
    const surface = isDark ? '#1A1A1A' : '#FFFFFF'
    const surface2 = isDark ? '#242424' : '#F1F3F6'
    const border = isDark ? '#2E2E2E' : '#E8EAED'
    const text1 = isDark ? '#F5F5F5' : '#111827'
    const text2 = isDark ? '#A3A3A3' : '#4B5563'
    const text3 = isDark ? '#6B6B6B' : '#9CA3AF'

    useEffect(() => {
        loadPlan()
    }, [id, user])

    async function loadPlan() {
        if (!user) return
        setLoading(true)
        const { data, error } = await supabase
            .from('workout_plans')
            .select(`
        id, name, description, days_per_week, difficulty, goal, duration_weeks, is_ai_generated,
        workout_plan_days (
          id, day_number, name, focus,
          workout_plan_exercises (
            id, exercise_name, exercise_id, sets, reps_range, rest_seconds, notes, sort_order
          )
        )
      `)
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (error || !data) { router.back(); return }
        setPlan(data)
        // Expand first day by default
        const firstDay = data.workout_plan_days?.[0]
        if (firstDay) setExpandedDay(firstDay.id)
        setLoading(false)
    }

    function startFromDay(day: PlanDay) {
        if (!plan) return
        const exercises: ActiveExercise[] = [...(day.workout_plan_exercises ?? [])]
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

    async function deletePlan() {
        if (!plan) return
        setDeleting(true)
        setDeleteError(null)
        try {
            const { error } = await supabase.from('workout_plans').delete().eq('id', plan.id)
            if (error) throw error
            router.replace('/workout')
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Fehler beim Löschen')
            setDeleting(false)
        }
    }

    if (loading) return (
        <div style={{ minHeight: '100dvh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: text3 }}>Wird geladen...</p>
        </div>
    )

    if (!plan) return null

    const days = [...plan.workout_plan_days].sort((a, b) => a.day_number - b.day_number)
    const totalExercises = days.reduce((sum, d) => sum + (d.workout_plan_exercises?.length ?? 0), 0)

    return (
        <div style={{ minHeight: '100dvh', background: bg, paddingBottom: 100 }}>

            {/* Header */}
            <div style={{ padding: '52px 16px 16px', background: surface, borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#2DC96E', fontSize: 14, fontWeight: 600 }}>
                        <ArrowLeft size={16} /> Zurück
                    </button>
                    <button onClick={() => setShowDeleteSheet(true)} style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? '#2A0A0A' : '#FEF2F2', border: `1px solid ${isDark ? '#5A1A1A' : '#FECACA'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={15} color="#EF4444" />
                    </button>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
                    {plan.is_ai_generated && (
                        <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: isDark ? 'rgba(45,201,110,0.15)' : '#F0FDF4', color: '#2DC96E', border: `1px solid ${isDark ? 'rgba(45,201,110,0.3)' : '#BBF7D0'}` }}>
                            ✨ KI-erstellt
                        </span>
                    )}
                    <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: `${DIFF_COLOR[plan.difficulty] ?? '#6B7280'}18`, color: DIFF_COLOR[plan.difficulty] ?? '#6B7280' }}>
                        {plan.difficulty}
                    </span>
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: text1, marginBottom: 6 }}>{plan.name}</h1>
                <p style={{ fontSize: 14, color: text2, lineHeight: 1.55, marginBottom: 12 }}>{plan.description}</p>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    {[
                        { label: 'Tage/Woche', value: `${plan.days_per_week}×` },
                        { label: 'Wochen', value: `${plan.duration_weeks ?? 8}` },
                        { label: 'Übungen', value: `${totalExercises}` },
                        ...(plan.goal ? [{ label: 'Ziel', value: plan.goal }] : []),
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p style={{ fontSize: 16, fontWeight: 800, color: text1 }}>{value}</p>
                            <p style={{ fontSize: 11, color: text3 }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Edit with KI */}
                {plan.is_ai_generated && (
                    <button
                        onClick={() => router.push(`/workout/ki-coach?editPlanId=${plan.id}&planName=${encodeURIComponent(plan.name)}`)}
                        style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1.5px solid ${isDark ? 'rgba(45,201,110,0.35)' : '#BBF7D0'}`, background: isDark ? 'rgba(45,201,110,0.1)' : '#F0FDF4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#2DC96E', fontWeight: 600, fontSize: 14 }}
                    >
                        <Sparkles size={16} /> Mit KI bearbeiten
                    </button>
                )}
            </div>

            {/* Days */}
            <div style={{ padding: '16px' }}>
                {days.map((day, di) => {
                    const isExpanded = expandedDay === day.id
                    const color = DAY_COLORS[di % DAY_COLORS.length]
                    const exs = [...(day.workout_plan_exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order)

                    return (
                        <div key={day.id} style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, marginBottom: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            {/* Day header */}
                            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* Number badge */}
                                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, color }}>{day.day_number}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: 17, color: text1 }}>{day.name}</p>
                                    <p style={{ fontSize: 12, color: text3, marginTop: 2 }}>{day.focus} · {exs.length} Übungen</p>
                                </div>
                                {/* Play button */}
                                <button
                                    onClick={() => startFromDay(day)}
                                    style={{ width: 40, height: 40, borderRadius: 12, background: '#2DC96E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(45,201,110,0.35)' }}
                                >
                                    <Play size={18} color="white" fill="white" />
                                </button>
                                {/* Expand toggle */}
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                                    style={{ width: 36, height: 36, borderRadius: 10, background: surface2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                    {isExpanded ? <ChevronUp size={16} color={text3} /> : <ChevronDown size={16} color={text3} />}
                                </button>
                            </div>

                            {/* Exercises (expanded) */}
                            {isExpanded && (
                                <div style={{ borderTop: `1px solid ${border}` }}>
                                    {exs.map((ex, i) => {
                                        const muscle = EXERCISES.find(e => e.id === ex.exercise_id)?.muscle
                                        const c = MUSCLE_COLOR[muscle ?? ''] ?? color

                                        return (
                                            <div
                                                key={ex.id}
                                                style={{
                                                    padding: '13px 16px',
                                                    borderBottom: i < exs.length - 1 ? `1px solid ${border}` : 'none',
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                }}
                                            >
                                                {/* Color bar */}
                                                <div style={{ width: 4, height: 36, borderRadius: 2, background: c, flexShrink: 0 }} />

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontWeight: 600, fontSize: 14, color: text1 }}>{ex.exercise_name}</p>
                                                    {ex.notes && (
                                                        <p style={{ fontSize: 11, color: text3, marginTop: 2, fontStyle: 'italic' }}>{ex.notes}</p>
                                                    )}
                                                </div>

                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 800, color: text1 }}>
                                                        {ex.sets}×{ex.reps_range}
                                                    </span>
                                                    <p style={{ fontSize: 11, color: text3, marginTop: 1 }}>{ex.rest_seconds}s Pause</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Delete sheet */}
            {showDeleteSheet && (
                <div onClick={e => e.target === e.currentTarget && setShowDeleteSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', background: surface, borderRadius: '20px 20px 0 0', padding: '20px 20px calc(28px + env(safe-area-inset-bottom,0px))' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: border, margin: '0 auto 20px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? '#2A0A0A' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={20} color="#EF4444" />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 16, color: text1 }}>Plan löschen?</p>
                                <p style={{ fontSize: 13, color: text3 }}>{plan.name}</p>
                            </div>
                        </div>
                        <p style={{ fontSize: 14, color: text2, marginBottom: 16, lineHeight: 1.5 }}>
                            Dieser Plan und alle Trainingstage werden <strong>dauerhaft gelöscht</strong>.
                        </p>
                        {deleteError && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: isDark ? '#2A0A0A' : '#FEF2F2', border: `1px solid ${isDark ? '#5A1A1A' : '#FECACA'}`, marginBottom: 14, display: 'flex', gap: 8 }}>
                                <AlertCircle size={15} color="#EF4444" />
                                <p style={{ fontSize: 13, color: '#EF4444' }}>{deleteError}</p>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-secondary" onClick={() => setShowDeleteSheet(false)} style={{ flex: 1 }}>Abbrechen</button>
                            <button onClick={deletePlan} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 12, background: deleting ? '#FCA5A5' : '#EF4444', border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: deleting ? 'default' : 'pointer' }}>
                                {deleting ? 'Löschen...' : 'Löschen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
