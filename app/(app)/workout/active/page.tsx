'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Plus, Search, Dumbbell, ChevronLeft, ChevronRight, Info, Trash2 } from 'lucide-react'
import { useWorkoutStore, getElapsedSeconds, formatDuration, calcVolume } from '@/store/workout'
import { EXERCISES } from '@/data/exercises'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

const DAY_COLORS = ['#F97316', '#3B82F6', '#F97316', '#3B82F6', '#22C55E', '#8B5CF6', '#EAB308']

const MUSCLE_COLOR: Record<string, string> = {
  Brust: '#EF4444', Rücken: '#3B82F6', Schultern: '#8B5CF6',
  Bizeps: '#F59E0B', Trizeps: '#10B981', Beine: '#EC4899',
  Gesäß: '#F97316', Core: '#06B6D4', Waden: '#84CC16',
  Ganzkörper: '#6366F1', Cardio: '#14B8A6', Unterarme: '#A78BFA',
}

const REST_KEY = 'liftoff_rest_end'
const REST_TOTAL_KEY = 'liftoff_rest_total'

function getRestRemaining() {
  try {
    const end = localStorage.getItem(REST_KEY)
    if (!end) return 0
    return Math.max(0, Math.ceil((parseInt(end) - Date.now()) / 1000))
  } catch { return 0 }
}
function startRest(secs: number) {
  try {
    localStorage.setItem(REST_KEY, String(Date.now() + secs * 1000))
    localStorage.setItem(REST_TOTAL_KEY, String(secs))
  } catch { }
}
function getRestTotal() {
  try { return parseInt(localStorage.getItem(REST_TOTAL_KEY) ?? '90') } catch { return 90 }
}
function clearRest() {
  try { localStorage.removeItem(REST_KEY); localStorage.removeItem(REST_TOTAL_KEY) } catch { }
}

export default function ActiveWorkoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { session, addExercise, removeExercise, addSet, updateSet, toggleSet, endSession, saveRoutine } = useWorkoutStore()

  const [hydrated, setHydrated] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activeExIdx, setActiveExIdx] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restTotal, setRestTotal] = useState(90)
  const [showExPicker, setShowExPicker] = useState(false)
  const [exSearch, setExSearch] = useState('')
  const [exMuscle, setExMuscle] = useState('Alle')
  const [showFinish, setShowFinish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSaveRoutine, setShowSaveRoutine] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const tabsRef = useRef<HTMLDivElement>(null)

  // Wait for Zustand hydration before doing anything
  useEffect(() => {
    setHydrated(true)
    setRestTotal(getRestTotal())
  }, [])

  // Main timer — recomputed from startedAt every second
  useEffect(() => {
    if (!hydrated || !session) return
    setElapsed(getElapsedSeconds(session.startedAt))
    const id = setInterval(() => setElapsed(getElapsedSeconds(session!.startedAt)), 1000)
    return () => clearInterval(id)
  }, [hydrated, session?.startedAt])

  // Rest timer
  useEffect(() => {
    const id = setInterval(() => setRestRemaining(getRestRemaining()), 500)
    return () => clearInterval(id)
  }, [])

  // Scroll active tab into view
  useEffect(() => {
    if (!tabsRef.current) return
    const el = tabsRef.current.children[activeExIdx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeExIdx])

  function handleToggleSet(exId: string, setId: string, wasDone: boolean) {
    toggleSet(exId, setId)
    if (!wasDone) {
      startRest(restTotal)
      setRestRemaining(restTotal)
    }
  }

  async function handleFinish() {
    if (!session || !user) return
    setSaving(true)
    clearRest()
    try {
      const volume = calcVolume(session.exercises)
      const totalDoneSets = session.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)
      const { data: savedSession } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id, name: session.name,
          started_at: session.startedAt, finished_at: new Date().toISOString(),
          duration_minutes: Math.floor(elapsed / 60), total_volume: volume,
          exercises_count: session.exercises.length,
        })
        .select('id').single()

      if (savedSession) {
        for (const ex of session.exercises) {
          const { data: savedEx } = await supabase.from('workout_session_exercises')
            .insert({ session_id: savedSession.id, exercise_id: ex.exerciseId, exercise_name: ex.exerciseName })
            .select('id').single()
          if (savedEx) {
            const done = ex.sets.filter(s => s.done)
            if (done.length > 0) {
              await supabase.from('workout_sets').insert(
                done.map((s, i) => ({ session_exercise_id: savedEx.id, set_number: i + 1, reps: parseInt(s.reps) || 0, weight_kg: parseFloat(s.weight) || 0, completed: true }))
              )
            }
          }
        }
        await supabase.rpc('add_xp', { user_id: user.id, amount: 50 + totalDoneSets * 2 })
      }
      endSession()
      router.replace('/workout')
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  function handleSaveRoutine() {
    if (!session || !routineName.trim()) return
    saveRoutine({
      name: routineName.trim(),
      exercises: session.exercises.map((e, i) => ({
        exerciseId: e.exerciseId, exerciseName: e.exerciseName,
        muscle: e.muscle, equipment: e.equipment,
        defaultSets: e.sets.length,
        defaultReps: e.sets[0]?.reps || '8-12',
        defaultWeight: e.sets[0]?.weight || '',
        restSeconds: restTotal, order: i,
      })),
    })
    setShowSaveRoutine(false)
    setRoutineName('')
  }

  const filteredEx = EXERCISES.filter(e => {
    const ms = !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase())
    const mm = exMuscle === 'Alle' || e.muscle === exMuscle
    return ms && mm
  })
  const muscles = ['Alle', ...new Set(EXERCISES.map(e => e.muscle))]

  // Loading state while Zustand hydrates
  if (!hydrated) return (
    <div style={{ minHeight: '100dvh', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6B6B', fontSize: 14 }}>Laden...</p>
    </div>
  )

  // No session — redirect
  if (!session) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0F0F0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ color: '#F5F5F5', fontSize: 18, fontWeight: 700 }}>Kein aktives Training</p>
        <button onClick={() => router.replace('/workout')} style={{ padding: '12px 24px', borderRadius: 12, background: '#2DC96E', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          Zurück zu Workout
        </button>
      </div>
    )
  }

  const totalDone = session.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0)
  const volume = calcVolume(session.exercises)
  const activeEx = session.exercises[activeExIdx]

  // Check if bodyweight exercise (no kg field)
  const isBodyweight = activeEx
    ? (EXERCISES.find(e => e.id === activeEx.exerciseId)?.equipment === 'Körpergewicht')
    : false

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0F0F0F' }}>

      {/* ── TOP BAR ── */}
      <div style={{ flexShrink: 0, background: '#141414', borderBottom: '1px solid #2A2A2A' }}>
        {/* Row 1: close / title / sets counter */}
        <div style={{ padding: '52px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setShowFinish(true)}
            style={{ width: 36, height: 36, borderRadius: 10, background: '#242424', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} color="#A3A3A3" />
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#F97316', letterSpacing: 2, textTransform: 'uppercase' }}>
              {session.name}
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#F5F5F5', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {formatDuration(elapsed)}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#A3A3A3' }}>
              {totalDone}/{totalSets} <span style={{ fontSize: 10, fontWeight: 500 }}>Sätze</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: '#2A2A2A', margin: '0 16px 0' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #F97316, #FB923C)',
            width: totalSets > 0 ? `${(totalDone / totalSets) * 100}%` : '0%',
            transition: 'width 0.4s ease',
            borderRadius: 1,
          }} />
        </div>

        {/* Exercise tabs */}
        <div
          ref={tabsRef}
          style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 12px' }}
          className="no-scrollbar"
        >
          {session.exercises.map((ex, i) => {
            const isActive = i === activeExIdx
            const color = DAY_COLORS[i % DAY_COLORS.length]
            const exDone = ex.sets.filter(s => s.done).length
            return (
              <button
                key={ex.id}
                onClick={() => setActiveExIdx(i)}
                style={{
                  flexShrink: 0, padding: '7px 16px', borderRadius: 20,
                  border: `1.5px solid ${isActive ? color : '#2A2A2A'}`,
                  background: isActive ? `${color}20` : 'transparent',
                  color: isActive ? color : '#6B6B6B',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                {ex.exerciseName}
                {exDone > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.8 }}>
                    {exDone}/{ex.sets.length}
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => setShowExPicker(true)}
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 20, border: '1.5px dashed #2A2A2A', background: 'transparent', color: '#6B6B6B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* ── EXERCISE CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 8px' }}>

        {session.exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Dumbbell size={52} style={{ color: '#2A2A2A', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#F5F5F5' }}>Noch keine Übungen</p>
            <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>Füge deine erste Übung hinzu</p>
            <button className="btn-primary" onClick={() => setShowExPicker(true)} style={{ width: 'auto', display: 'inline-flex', margin: '0 auto' }}>
              <Plus size={16} /> Übung hinzufügen
            </button>
          </div>
        )}

        {activeEx && (
          <>
            {/* Exercise name row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: '#F5F5F5', lineHeight: 1.1 }}>
                {activeEx.exerciseName}
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => router.push(`/workout/exercise/${activeEx.exerciseId}`)}
                  style={{ width: 36, height: 36, borderRadius: 10, background: '#242424', border: '1px solid #2A2A2A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={16} color="#6B6B6B" />
                </button>
                <button onClick={() => removeExercise(activeEx.id)}
                  style={{ width: 36, height: 36, borderRadius: 10, background: '#242424', border: '1px solid #2A2A2A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={15} color="#6B6B6B" />
                </button>
              </div>
            </div>

            {/* Ziel subtitle */}
            <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 20 }}>
              Ziel: {activeEx.sets[0]?.reps ?? '8-12'} Wiederholungen · {activeEx.sets.length} Sätze
            </p>

            {/* Sets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeEx.sets.map((set, si) => {
                const color = DAY_COLORS[activeExIdx % DAY_COLORS.length]
                const isDone = set.done
                return (
                  <div key={set.id} style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: isDone ? `${color}18` : '#1A1A1A',
                    border: `1px solid ${isDone ? color + '50' : '#2A2A2A'}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all 0.2s',
                  }}>
                    {/* Set number */}
                    <span style={{ fontSize: 16, fontWeight: 800, color: isDone ? color : '#4A4A4A', width: 22, textAlign: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {si + 1}
                    </span>

                    {/* KG field — only if not bodyweight */}
                    {!isBodyweight && (
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="number" inputMode="decimal" placeholder="0"
                          value={set.weight}
                          onChange={e => updateSet(activeEx.id, set.id, 'weight', e.target.value)}
                          disabled={isDone}
                          style={{
                            width: '100%', padding: '11px 36px 11px 14px',
                            borderRadius: 10, background: '#242424',
                            border: `1.5px solid ${isDone ? color + '30' : '#333'}`,
                            color: '#F5F5F5', fontSize: 20, fontWeight: 700,
                            outline: 'none', opacity: isDone ? 0.6 : 1,
                          }}
                        />
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6B6B6B', fontWeight: 600, pointerEvents: 'none' }}>kg</span>
                      </div>
                    )}

                    {/* Reps field */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="number" inputMode="numeric" placeholder="0"
                        value={set.reps}
                        onChange={e => updateSet(activeEx.id, set.id, 'reps', e.target.value)}
                        disabled={isDone}
                        style={{
                          width: '100%', padding: isBodyweight ? '11px 80px 11px 14px' : '11px 56px 11px 14px',
                          borderRadius: 10, background: '#242424',
                          border: `1.5px solid ${isDone ? color + '30' : '#333'}`,
                          color: '#F5F5F5', fontSize: 20, fontWeight: 700,
                          outline: 'none', opacity: isDone ? 0.6 : 1,
                        }}
                      />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6B6B6B', fontWeight: 600, pointerEvents: 'none' }}>
                        {isBodyweight ? 'Wdh.' : 'Wdh.'}
                      </span>
                    </div>

                    {/* Check button */}
                    <button
                      onClick={() => handleToggleSet(activeEx.id, set.id, isDone)}
                      style={{
                        width: 46, height: 46, borderRadius: 12,
                        border: `1.5px solid ${isDone ? color : '#333'}`,
                        cursor: 'pointer', flexShrink: 0,
                        background: isDone ? color : '#242424',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: isDone ? `0 2px 12px ${color}50` : 'none',
                      } as React.CSSProperties}
                    >
                      <Check size={20} color={isDone ? 'white' : '#4A4A4A'} strokeWidth={2.5} />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Add set */}
            <button
              onClick={() => addSet(activeEx.id)}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px dashed #2A2A2A', background: 'transparent', color: '#6B6B6B', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}
            >
              <Plus size={15} color="#2DC96E" /> Satz hinzufügen
            </button>
          </>
        )}
      </div>

      {/* ── REST TIMER ── */}
      {restRemaining > 0 && (
        <div style={{
          margin: '0 16px 10px',
          padding: '14px 18px',
          borderRadius: 16,
          background: '#1A0D00',
          border: '1px solid #F9731640',
          display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 20, color: '#F97316' }}>⏱</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#F97316', letterSpacing: 0.5 }}>PAUSE LÄUFT</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#F97316', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {formatDuration(restRemaining)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { const t = restTotal + 15; startRest(t); setRestTotal(t) }}
                  style={{ padding: '8px 14px', borderRadius: 10, background: '#2A1500', border: 'none', color: '#F97316', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  +15s
                </button>
                <button
                  onClick={() => { clearRest(); setRestRemaining(0) }}
                  style={{ padding: '8px 14px', borderRadius: 10, background: '#242424', border: 'none', color: '#A3A3A3', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Skip
                </button>
              </div>
            </div>
            <div style={{ height: 3, background: '#2A1500', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#F97316', width: `${(restRemaining / restTotal) * 100}%`, transition: 'width 0.5s linear', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom,0px))', background: '#141414', borderTop: '1px solid #2A2A2A', flexShrink: 0, display: 'flex', gap: 10 }}>
        <button
          onClick={() => setActiveExIdx(Math.max(0, activeExIdx - 1))}
          disabled={activeExIdx === 0}
          style={{ width: 50, height: 50, borderRadius: 13, background: '#1A1A1A', border: '1px solid #2A2A2A', cursor: activeExIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeExIdx === 0 ? 0.3 : 1, flexShrink: 0 }}
        >
          <ChevronLeft size={22} color="#A3A3A3" />
        </button>
        <button
          onClick={() => {
            if (activeExIdx < session.exercises.length - 1) setActiveExIdx(i => i + 1)
            else setShowFinish(true)
          }}
          style={{ flex: 1, padding: '13px', borderRadius: 13, background: '#2DC96E', border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {activeExIdx < session.exercises.length - 1
            ? <><span>Nächste</span><ChevronRight size={18} /></>
            : '✅ Fertig'}
        </button>
      </div>

      {/* ── EXERCISE PICKER ── */}
      {showExPicker && (
        <div
          onClick={e => e.target === e.currentTarget && setShowExPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div style={{ width: '100%', background: '#141414', borderRadius: '20px 20px 0 0', maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2A2A2A', margin: '0 auto 14px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 18, color: '#F5F5F5' }}>Übung wählen</p>
                <button onClick={() => setShowExPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B6B' }}><X size={22} /></button>
              </div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#6B6B6B', pointerEvents: 'none' }} />
                <input
                  className="input" placeholder="Suchen..." value={exSearch}
                  onChange={e => setExSearch(e.target.value)}
                  style={{ paddingLeft: 38, background: '#1A1A1A', borderColor: '#2A2A2A', color: '#F5F5F5' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="no-scrollbar">
                {muscles.map(m => (
                  <button key={m} onClick={() => setExMuscle(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${exMuscle === m ? '#2DC96E' : '#2A2A2A'}`, background: exMuscle === m ? '#2DC96E' : 'transparent', color: exMuscle === m ? 'white' : '#6B6B6B', cursor: 'pointer' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
              {filteredEx.map(ex => {
                const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
                return (
                  <button key={ex.id}
                    onClick={() => {
                      addExercise({ id: crypto.randomUUID(), exerciseId: ex.id, exerciseName: ex.name, muscle: ex.muscle, equipment: ex.equipment })
                      setActiveExIdx(session.exercises.length)
                      setShowExPicker(false)
                      setExSearch('')
                    }}
                    style={{ width: '100%', padding: '12px 14px', marginBottom: 6, borderRadius: 12, border: '1px solid #2A2A2A', background: '#1A1A1A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Dumbbell size={15} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#F5F5F5' }}>{ex.name}</p>
                      <p style={{ fontSize: 11, color: '#6B6B6B', marginTop: 1 }}>{ex.muscle} · {ex.equipment}</p>
                    </div>
                    <Plus size={16} color="#2DC96E" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FINISH DIALOG ── */}
      {showFinish && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 360, background: '#141414', borderRadius: 20, overflow: 'hidden', border: '1px solid #2A2A2A' }}>
            <div style={{ background: 'linear-gradient(135deg, #166534, #2DC96E)', padding: '28px 24px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🏆</div>
              <p style={{ fontWeight: 900, fontSize: 24, color: 'white', letterSpacing: '-0.03em' }}>Stark!</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{session.name}</p>
            </div>
            <div style={{ padding: '20px 20px 24px' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Zeit', value: formatDuration(elapsed) },
                  { label: 'Sätze', value: String(totalDone) },
                  { label: 'Volumen', value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume}kg` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '10px 6px', background: '#1A1A1A', borderRadius: 10 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#F5F5F5' }}>{value}</p>
                    <p style={{ fontSize: 11, color: '#6B6B6B', marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Save routine option */}
              {!showSaveRoutine ? (
                <button
                  onClick={() => { setShowSaveRoutine(true); setRoutineName(session.name) }}
                  style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid #2A2A2A', background: 'transparent', color: '#A3A3A3', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}
                >
                  ⚡ Als Routine speichern
                </button>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <input
                    className="input" placeholder="Routinenname..."
                    value={routineName} onChange={e => setRoutineName(e.target.value)}
                    style={{ marginBottom: 8, background: '#1A1A1A', borderColor: '#2A2A2A', color: '#F5F5F5' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowSaveRoutine(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#6B6B6B', fontWeight: 600, cursor: 'pointer' }}>✕</button>
                    <button onClick={handleSaveRoutine} className="btn-primary" style={{ flex: 2 }}>Speichern</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowFinish(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#A3A3A3', fontWeight: 600, cursor: 'pointer' }}>
                  Weiter
                </button>
                <button
                  onClick={handleFinish} disabled={saving}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, background: saving ? '#166534' : '#2DC96E', border: 'none', color: 'white', fontWeight: 700, fontSize: 15, cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? 'Speichern...' : '✅ Abschließen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
