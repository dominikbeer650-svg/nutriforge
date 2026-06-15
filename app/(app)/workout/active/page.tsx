'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Check, Trash2, Timer, ChevronDown, Dumbbell, X } from 'lucide-react'
import { useWorkoutStore } from '@/store/workout'
import { EXERCISES } from '@/data/exercises'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const MUSCLE_COLORS: Record<string, string> = {
  Brust: '#EF4444', Rücken: '#3B82F6', Schultern: '#8B5CF6',
  Bizeps: '#F59E0B', Trizeps: '#10B981', Beine: '#EC4899',
  Gesäß: '#F97316', Core: '#06B6D4', Waden: '#84CC16',
  Ganzkörper: '#6366F1', Cardio: '#14B8A6', Unterarme: '#A78BFA',
}

export default function ActiveWorkoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { session, startSession, addExercise, removeExercise, addSet, updateSet, toggleSet, removeSet, tick, endSession } = useWorkoutStore()

  const [showExPicker, setShowExPicker] = useState(false)
  const [exSearch, setExSearch] = useState('')
  const [exMuscle, setExMuscle] = useState('Alle')
  const [restTimer, setRestTimer] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [saving, setSaving] = useState(false)

  // Start session if none
  useEffect(() => {
    if (!session) startSession('Freies Training')
  }, [session, startSession])

  // Main timer
  useEffect(() => {
    const id = setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [tick])

  // Rest timer countdown
  useEffect(() => {
    if (!restActive || restTimer <= 0) { if (restTimer <= 0) setRestActive(false); return }
    const id = setInterval(() => setRestTimer(t => { if (t <= 1) { setRestActive(false); return 0 } return t - 1 }), 1000)
    return () => clearInterval(id)
  }, [restActive, restTimer])

  function handleToggleSet(exId: string, setId: string, wasDone: boolean) {
    toggleSet(exId, setId)
    if (!wasDone) {
      setRestTimer(90)
      setRestActive(true)
    }
  }

  async function handleFinish() {
    if (!session || !user) return
    setSaving(true)
    try {
      const totalVolume = session.exercises.reduce((acc, ex) =>
        acc + ex.sets.filter(s => s.done).reduce((a, s) =>
          a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0)

      const { data: savedSession } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          name: session.name,
          started_at: session.startedAt,
          finished_at: new Date().toISOString(),
          duration_minutes: Math.floor(session.elapsedSeconds / 60),
          total_volume: totalVolume,
          exercises_count: session.exercises.length,
        })
        .select().single()

      if (savedSession) {
        for (const ex of session.exercises) {
          const { data: savedEx } = await supabase
            .from('workout_session_exercises')
            .insert({ session_id: savedSession.id, exercise_id: ex.exerciseId, exercise_name: ex.exerciseName })
            .select().single()

          if (savedEx) {
            for (const set of ex.sets.filter(s => s.done)) {
              await supabase.from('workout_sets').insert({
                session_exercise_id: savedEx.id,
                reps: parseInt(set.reps) || 0,
                weight_kg: parseFloat(set.weight) || 0,
                completed: true,
              })
            }
          }
        }
      }

      // XP vergeben
      const xpEarned = 50 + (session.exercises.length * 10)
      await supabase.rpc('add_xp', { user_id: user.id, amount: xpEarned })
    } catch (e) { console.error(e) } finally {
      endSession()
      setSaving(false)
      router.replace('/workout')
    }
  }

  const filteredEx = EXERCISES.filter(e => {
    const matchSearch = !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase()) || e.muscle.toLowerCase().includes(exSearch.toLowerCase())
    const matchMuscle = exMuscle === 'Alle' || e.muscle === exMuscle
    return matchSearch && matchMuscle
  })

  const muscles = ['Alle', ...new Set(EXERCISES.map(e => e.muscle))]
  const totalDone = session?.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0) ?? 0

  if (!session) return null

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
      {/* Header */}
      <div style={{
        padding: '52px 16px 12px', flexShrink: 0,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={() => router.back()} className="btn-ghost" style={{ padding: 4 }}>
            <ArrowLeft size={22} color="var(--text-1)" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</p>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--green)' }}>
              {formatTime(session.elapsedSeconds)}
            </p>
          </div>
          <button
            onClick={() => setShowFinish(true)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px', fontSize: 14 }}
          >
            Fertig
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {[
            { label: 'Übungen', value: session.exercises.length },
            { label: 'Sätze ✓', value: totalDone },
            { label: 'Volumen', value: `${session.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).reduce((x, s) => x + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0).toFixed(0)} kg` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Rest timer */}
        {restActive && (
          <div style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 10,
            background: '#FFF7ED', border: '1px solid #FED7AA',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Timer size={15} color="#F97316" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F97316', flex: 1 }}>
              Pause: {formatTime(restTimer)}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[60, 90, 120].map(t => (
                <button key={t} onClick={() => { setRestTimer(t); setRestActive(true) }}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #FED7AA', background: 'white', cursor: 'pointer', color: '#F97316', fontWeight: 600 }}>
                  {t}s
                </button>
              ))}
              <button onClick={() => { setRestTimer(0); setRestActive(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97316' }}>
                <X size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {session.exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Dumbbell size={48} style={{ color: 'var(--text-3)', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Noch keine Übungen</p>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>Füge deine erste Übung hinzu</p>
            <button className="btn-primary" onClick={() => setShowExPicker(true)} style={{ width: 'auto', margin: '0 auto', display: 'inline-flex' }}>
              <Plus size={18} /> Übung hinzufügen
            </button>
          </div>
        )}

        {session.exercises.map((ex) => {
          const color = MUSCLE_COLORS[ex.muscle] ?? 'var(--green)'
          return (
            <div key={ex.id} className="card" style={{ marginBottom: 14, padding: 16 }}>
              {/* Exercise header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>{ex.exerciseName}</p>
                  <span style={{
                    display: 'inline-block', marginTop: 3, padding: '2px 8px',
                    borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: `${color}18`, color, border: `1px solid ${color}30`,
                  }}>{ex.muscle}</span>
                </div>
                <button onClick={() => removeExercise(ex.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={16} color="var(--text-3)" />
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 42px', gap: 6, marginBottom: 6 }}>
                {['#', 'kg', 'Wdh', ''].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textAlign: 'center' }}>{h}</span>
                ))}
              </div>

              {/* Sets */}
              {ex.sets.map((set, si) => (
                <div key={set.id} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 1fr 42px',
                  gap: 6, marginBottom: 6, opacity: set.done ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                }}>
                  <div style={{
                    height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, background: 'var(--surface-3)',
                    fontSize: 13, fontWeight: 700, color: 'var(--text-2)',
                  }}>{si + 1}</div>
                  <input
                    className="input"
                    type="number" inputMode="decimal" placeholder="0"
                    value={set.weight}
                    onChange={e => updateSet(ex.id, set.id, 'weight', e.target.value)}
                    disabled={set.done}
                    style={{ textAlign: 'center', padding: '8px', height: 42, fontSize: 15, fontWeight: 600 }}
                  />
                  <input
                    className="input"
                    type="number" inputMode="numeric" placeholder="0"
                    value={set.reps}
                    onChange={e => updateSet(ex.id, set.id, 'reps', e.target.value)}
                    disabled={set.done}
                    style={{ textAlign: 'center', padding: '8px', height: 42, fontSize: 15, fontWeight: 600 }}
                  />
                  <button
                    onClick={() => handleToggleSet(ex.id, set.id, set.done)}
                    style={{
                      height: 42, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: set.done ? 'var(--green)' : 'var(--surface-3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Check size={18} color={set.done ? 'white' : 'var(--text-3)'} />
                  </button>
                </div>
              ))}

              {/* Add set */}
              <button
                onClick={() => addSet(ex.id)}
                style={{
                  width: '100%', padding: '9px', marginTop: 4,
                  background: 'none', border: '1.5px dashed var(--border-mid)',
                  borderRadius: 8, color: 'var(--text-3)', cursor: 'pointer',
                  fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Plus size={14} /> Satz hinzufügen
              </button>
            </div>
          )
        })}

        {session.exercises.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setShowExPicker(true)}
            style={{ marginBottom: 16 }}
          >
            <Plus size={18} color="var(--green)" /> Übung hinzufügen
          </button>
        )}
      </div>

      {/* Exercise Picker */}
      {showExPicker && (
        <div
          onClick={e => e.target === e.currentTarget && setShowExPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div style={{ width: '100%', background: 'var(--surface)', borderRadius: '20px 20px 0 0', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 18 }}>Übung wählen</p>
                <button onClick={() => setShowExPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={22} color="var(--text-2)" />
                </button>
              </div>
              <input className="input" placeholder="Suchen..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 10, paddingBottom: 4 }} className="no-scrollbar">
                {muscles.map(m => (
                  <button key={m} onClick={() => setExMuscle(m)} style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                    border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: exMuscle === m ? 'var(--green)' : 'transparent',
                    borderColor: exMuscle === m ? 'var(--green)' : 'var(--border)',
                    color: exMuscle === m ? 'white' : 'var(--text-2)',
                  }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
              {filteredEx.map(ex => (
                <button key={ex.id} onClick={() => {
                  addExercise({ id: crypto.randomUUID(), exerciseId: ex.id, exerciseName: ex.name, muscle: ex.muscle })
                  setShowExPicker(false); setExSearch('')
                }}
                  style={{
                    width: '100%', padding: '13px 14px', marginBottom: 8,
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    background: 'var(--surface)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `${MUSCLE_COLORS[ex.muscle] ?? '#5B6EF5'}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Dumbbell size={16} color={MUSCLE_COLORS[ex.muscle] ?? '#5B6EF5'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>{ex.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{ex.muscle} · {ex.equipment} · {ex.difficulty}</p>
                  </div>
                  <Plus size={16} color="var(--green)" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Finish Dialog */}
      {showFinish && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 360, padding: 24 }}>
            <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Training beenden? 💪</p>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
              {formatTime(session.elapsedSeconds)} · {totalDone} Sätze · {session.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).reduce((x, s) => x + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0).toFixed(0)} kg Volumen
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowFinish(false)} style={{ flex: 1 }}>Weiter</button>
              <button className="btn-primary" onClick={handleFinish} disabled={saving} style={{ flex: 2 }}>
                {saving ? 'Speichern...' : '✅ Abschließen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
