'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Check, Trash2, X, Dumbbell, ChevronUp, ChevronDown,
  MoreHorizontal, Search, Timer, Zap
} from 'lucide-react'
import { useWorkoutStore, getElapsedSeconds, formatDuration, calcVolume } from '@/store/workout'
import { EXERCISES } from '@/data/exercises'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

const MUSCLE_COLOR: Record<string, string> = {
  Brust: '#EF4444', Rücken: '#3B82F6', Schultern: '#8B5CF6',
  Bizeps: '#F59E0B', Trizeps: '#10B981', Beine: '#EC4899',
  Gesäß: '#F97316', Core: '#06B6D4', Waden: '#84CC16',
  Ganzkörper: '#6366F1', Cardio: '#14B8A6', Unterarme: '#A78BFA',
}

// Rest timer — persists in localStorage
const REST_KEY = 'liftoff_rest_end'

function getRestRemaining(): number {
  const end = localStorage.getItem(REST_KEY)
  if (!end) return 0
  const rem = Math.ceil((parseInt(end) - Date.now()) / 1000)
  return rem > 0 ? rem : 0
}

function startRest(seconds: number) {
  localStorage.setItem(REST_KEY, String(Date.now() + seconds * 1000))
}

function clearRest() {
  localStorage.removeItem(REST_KEY)
}

export default function ActiveWorkoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const {
    session, startSession, addExercise, removeExercise,
    addSet, updateSet, toggleSet, removeSet,
    updateExerciseNotes, endSession, saveRoutine,
  } = useWorkoutStore()

  // Timer — computed from startedAt, updates every second
  const [elapsed, setElapsed] = useState(0)
  // Rest timer
  const [restRemaining, setRestRemaining] = useState(0)
  const [restTotal, setRestTotal] = useState(90)
  // UI state
  const [showExPicker, setShowExPicker] = useState(false)
  const [exSearch, setExSearch] = useState('')
  const [exMuscle, setExMuscle] = useState('Alle')
  const [showFinish, setShowFinish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSaveRoutine, setShowSaveRoutine] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const [notesExId, setNotesExId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [exMenuId, setExMenuId] = useState<string | null>(null)

  // Start session if none
  useEffect(() => {
    if (!session) startSession('Freies Training')
  }, [])

  // Real timer — reads from startedAt
  useEffect(() => {
    if (!session) return
    setElapsed(getElapsedSeconds(session.startedAt))
    const id = setInterval(() => {
      setElapsed(getElapsedSeconds(session!.startedAt))
    }, 1000)
    return () => clearInterval(id)
  }, [session?.startedAt])

  // Rest timer
  useEffect(() => {
    const id = setInterval(() => {
      const rem = getRestRemaining()
      setRestRemaining(rem)
    }, 500)
    return () => clearInterval(id)
  }, [])

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
      const durationMin = Math.floor(elapsed / 60)
      const totalSets = session.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)

      const { data: savedSession } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          name: session.name,
          started_at: session.startedAt,
          finished_at: new Date().toISOString(),
          duration_minutes: durationMin,
          total_volume: volume,
          exercises_count: session.exercises.length,
        })
        .select('id').single()

      if (savedSession) {
        for (const ex of session.exercises) {
          const { data: savedEx } = await supabase
            .from('workout_session_exercises')
            .insert({ session_id: savedSession.id, exercise_id: ex.exerciseId, exercise_name: ex.exerciseName })
            .select('id').single()

          if (savedEx) {
            const doneSets = ex.sets.filter(s => s.done)
            if (doneSets.length > 0) {
              await supabase.from('workout_sets').insert(
                doneSets.map((s, i) => ({
                  session_exercise_id: savedEx.id,
                  set_number: i + 1,
                  reps: parseInt(s.reps) || 0,
                  weight_kg: parseFloat(s.weight) || 0,
                  completed: true,
                }))
              )
            }
          }
        }
        // XP
        const xp = 50 + totalSets * 2
        await supabase.rpc('add_xp', { user_id: user.id, amount: xp })
      }

      endSession()
      router.replace('/workout')
    } catch (e) {
      console.error('finish error:', e)
    } finally {
      setSaving(false)
    }
  }

  function handleSaveRoutine() {
    if (!session || !routineName.trim()) return
    saveRoutine({
      name: routineName.trim(),
      exercises: session.exercises.map((e, i) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        muscle: e.muscle,
        equipment: e.equipment,
        defaultSets: e.sets.length,
        defaultReps: e.sets[0]?.reps || '8-12',
        defaultWeight: e.sets[0]?.weight || '',
        restSeconds: restTotal,
        notes: e.notes,
        order: i,
      })),
    })
    setShowSaveRoutine(false)
    setRoutineName('')
  }

  const filteredEx = EXERCISES.filter(e => {
    const mSearch = !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase())
    const mMuscle = exMuscle === 'Alle' || e.muscle === exMuscle
    return mSearch && mMuscle
  })

  const muscles = ['Alle', ...new Set(EXERCISES.map(e => e.muscle))]
  const totalDone = session?.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0) ?? 0
  const volume = session ? calcVolume(session.exercises) : 0
  const restPct = restTotal > 0 ? (restRemaining / restTotal) : 0

  if (!session) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'white',
        borderBottom: '1px solid #E8EAED',
        padding: '48px 16px 12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Session name */}
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#111827' }}>
              {session.name}
            </p>
            {/* Live timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(elapsed)}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{totalDone}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Sätze</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume}kg`}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Volumen</p>
            </div>
            <button
              onClick={() => setShowFinish(true)}
              style={{
                padding: '10px 18px', borderRadius: 12,
                background: '#2DC96E', border: 'none',
                color: 'white', fontWeight: 700, fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Fertig
            </button>
          </div>
        </div>

        {/* Rest timer bar */}
        {restRemaining > 0 && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Timer size={16} color="#16A34A" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                  Pause: {formatDuration(restRemaining)}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[60, 90, 120, 180].map(t => (
                    <button key={t} onClick={() => { startRest(t); setRestTotal(t) }}
                      style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid #BBF7D0', background: restTotal === t ? '#2DC96E' : 'white', color: restTotal === t ? 'white' : '#16A34A', cursor: 'pointer' }}>
                      {t}s
                    </button>
                  ))}
                  <button onClick={() => { clearRest(); setRestRemaining(0) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                    <X size={15} />
                  </button>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: '#DCFCE7', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: '#2DC96E',
                  width: `${restPct * 100}%`,
                  transition: 'width 0.5s linear',
                }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── EXERCISES ── */}
      <div style={{ flex: 1, padding: '12px 16px 100px', overflowY: 'auto' }}>

        {session.exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Dumbbell size={28} color="#2DC96E" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Noch keine Übungen</p>
            <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>Füge deine erste Übung hinzu</p>
            <button className="btn-primary" onClick={() => setShowExPicker(true)} style={{ width: 'auto', display: 'inline-flex', margin: '0 auto' }}>
              <Plus size={18} /> Übung hinzufügen
            </button>
          </div>
        )}

        {session.exercises.map((ex, exIdx) => {
          const color = MUSCLE_COLOR[ex.muscle] ?? '#2DC96E'
          const doneSets = ex.sets.filter(s => s.done).length
          return (
            <div key={ex.id} style={{ marginBottom: 16, background: 'white', borderRadius: 16, border: '1px solid #E8EAED', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

              {/* Exercise header */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={18} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{ex.exerciseName}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{ex.muscle}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{doneSets}/{ex.sets.length} Sätze</span>
                  </div>
                </div>
                {/* Menu */}
                <button
                  onClick={() => setExMenuId(exMenuId === ex.id ? null : ex.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF' }}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              {/* Exercise menu */}
              {exMenuId === ex.id && (
                <div style={{ margin: '0 16px 10px', background: '#F7F8FA', borderRadius: 10, border: '1px solid #E8EAED', overflow: 'hidden' }}>
                  {[
                    { label: '📝 Notiz hinzufügen', action: () => { setNotesExId(ex.id); setNotesDraft(ex.notes ?? ''); setExMenuId(null) } },
                    { label: '🔁 Übung ersetzen', action: () => { setShowExPicker(true); setExMenuId(null) } },
                    { label: '🗑️ Entfernen', action: () => { removeExercise(ex.id); setExMenuId(null) }, danger: true },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 500, color: item.danger ? '#EF4444' : '#111827', borderBottom: '1px solid #E8EAED' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Notes */}
              {ex.notes && (
                <div style={{ margin: '0 16px 10px', padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: '#92400E' }}>📝 {ex.notes}</p>
                </div>
              )}

              {/* Set headers */}
              <div style={{ padding: '0 16px 6px', display: 'grid', gridTemplateColumns: '32px 1fr 1fr 44px', gap: 8 }}>
                {['Satz', 'kg', 'Wdh', ''].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textAlign: 'center' }}>{h}</span>
                ))}
              </div>

              {/* Sets */}
              <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ex.sets.map((s, si) => (
                  <div key={s.id} style={{
                    display: 'grid', gridTemplateColumns: '32px 1fr 1fr 44px', gap: 8,
                    opacity: s.done ? 0.6 : 1, transition: 'opacity 0.2s',
                  }}>
                    <div style={{
                      height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10, background: s.done ? `${color}20` : '#F7F8FA',
                      fontSize: 13, fontWeight: 800, color: s.done ? color : '#6B7280',
                    }}>
                      {si + 1}
                    </div>
                    <input
                      type="number" inputMode="decimal" placeholder="—"
                      value={s.weight}
                      onChange={e => updateSet(ex.id, s.id, 'weight', e.target.value)}
                      disabled={s.done}
                      style={{
                        height: 44, borderRadius: 10, border: `1.5px solid ${s.done ? `${color}30` : '#E8EAED'}`,
                        background: s.done ? `${color}08` : 'white',
                        textAlign: 'center', fontSize: 16, fontWeight: 700, outline: 'none',
                        color: '#111827',
                      }}
                    />
                    <input
                      type="number" inputMode="numeric" placeholder="—"
                      value={s.reps}
                      onChange={e => updateSet(ex.id, s.id, 'reps', e.target.value)}
                      disabled={s.done}
                      style={{
                        height: 44, borderRadius: 10, border: `1.5px solid ${s.done ? `${color}30` : '#E8EAED'}`,
                        background: s.done ? `${color}08` : 'white',
                        textAlign: 'center', fontSize: 16, fontWeight: 700, outline: 'none',
                        color: '#111827',
                      }}
                    />
                    <button
                      onClick={() => handleToggleSet(ex.id, s.id, s.done)}
                      style={{
                        height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: s.done ? color : '#F7F8FA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: s.done ? `0 2px 8px ${color}40` : 'none',
                      }}
                    >
                      <Check size={18} color={s.done ? 'white' : '#D1D5DB'} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add set */}
              <button
                onClick={() => addSet(ex.id)}
                style={{
                  width: '100%', padding: '10px', margin: '0',
                  background: 'none', border: 'none', borderTop: '1px solid #F1F3F6',
                  cursor: 'pointer', color: '#2DC96E', fontWeight: 600, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Plus size={15} /> Satz hinzufügen
              </button>
            </div>
          )
        })}

        {/* Add exercise button */}
        {session.exercises.length > 0 && (
          <button
            onClick={() => setShowExPicker(true)}
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              border: '1.5px dashed #D1D5DB', background: 'white',
              cursor: 'pointer', color: '#6B7280', fontWeight: 600, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Plus size={18} color="#2DC96E" /> Übung hinzufügen
          </button>
        )}
      </div>

      {/* ── EXERCISE PICKER ── */}
      {showExPicker && (
        <div onClick={e => e.target === e.currentTarget && setShowExPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #E8EAED', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8EAED', margin: '0 auto 14px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 18 }}>Übung wählen</p>
                <button onClick={() => setShowExPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={22} color="#6B7280" />
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                <input
                  className="input" placeholder="Suchen..." value={exSearch}
                  onChange={e => setExSearch(e.target.value)}
                  style={{ paddingLeft: 38 }} autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                {muscles.map(m => (
                  <button key={m} onClick={() => setExMuscle(m)} style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${exMuscle === m ? '#2DC96E' : '#E8EAED'}`,
                    background: exMuscle === m ? '#2DC96E' : 'white',
                    color: exMuscle === m ? 'white' : '#6B7280', cursor: 'pointer',
                  }}>{m}</button>
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
                      setShowExPicker(false); setExSearch('')
                    }}
                    style={{
                      width: '100%', padding: '12px 14px', marginBottom: 6,
                      borderRadius: 12, border: '1px solid #E8EAED',
                      background: 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Dumbbell size={16} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{ex.name}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{ex.muscle} · {ex.equipment} · {ex.difficulty}</p>
                    </div>
                    <Plus size={16} color="#2DC96E" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES MODAL ── */}
      {notesExId && (
        <div onClick={e => e.target === e.currentTarget && setNotesExId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 16px 40px' }}>
            <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 14 }}>📝 Notiz</p>
            <textarea
              className="input"
              placeholder="z.B. Fokus auf Kontrolle, neue PR Versuch..."
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              rows={3}
              style={{ resize: 'none', marginBottom: 14 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setNotesExId(null)} style={{ flex: 1 }}>Abbrechen</button>
              <button className="btn-primary" onClick={() => { updateExerciseNotes(notesExId, notesDraft); setNotesExId(null) }} style={{ flex: 2 }}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FINISH DIALOG ── */}
      {showFinish && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 360, background: 'white', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #2DC96E, #22A85A)', padding: '24px 24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              <p style={{ fontWeight: 800, fontSize: 20, color: 'white' }}>Gut gemacht!</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{session.name}</p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Zeit', value: formatDuration(elapsed) },
                  { label: 'Sätze', value: String(totalDone) },
                  { label: 'Volumen', value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume}kg` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '10px 6px', background: '#F7F8FA', borderRadius: 10 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{value}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Save as routine */}
              {!showSaveRoutine ? (
                <button
                  onClick={() => { setShowSaveRoutine(true); setRoutineName(session.name) }}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 12, marginBottom: 10,
                    border: '1.5px solid #E8EAED', background: 'white',
                    color: '#4B5563', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Zap size={16} color="#2DC96E" /> Als Routine speichern
                </button>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <input
                    className="input" placeholder="Routinenname..."
                    value={routineName} onChange={e => setRoutineName(e.target.value)}
                    style={{ marginBottom: 8 }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" onClick={() => setShowSaveRoutine(false)} style={{ flex: 1 }}>✕</button>
                    <button className="btn-primary" onClick={handleSaveRoutine} style={{ flex: 2 }}>
                      <Zap size={15} /> Routine speichern
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowFinish(false)}
                  style={{ flex: 1 }}
                >
                  Weiter
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  style={{
                    flex: 2, padding: '13px', borderRadius: 12, background: '#2DC96E',
                    border: 'none', color: 'white', fontWeight: 700, fontSize: 15,
                    cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {saving ? 'Speichern...' : '✅ Abschließen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 0 2px rgba(34,197,94,0.3)} 50%{opacity:0.7;box-shadow:0 0 0 4px rgba(34,197,94,0.15)} }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  )
}
