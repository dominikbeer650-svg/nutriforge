'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Dumbbell, Target, Zap, BookOpen, Plus } from 'lucide-react'
import { EXERCISES } from '@/data/exercises'
import { useWorkoutStore } from '@/store/workout'

const MUSCLE_COLOR: Record<string, string> = {
  Brust: '#EF4444', Rücken: '#3B82F6', Schultern: '#8B5CF6',
  Bizeps: '#F59E0B', Trizeps: '#10B981', Beine: '#EC4899',
  Gesäß: '#F97316', Core: '#06B6D4', Waden: '#84CC16',
  Ganzkörper: '#6366F1', Cardio: '#14B8A6', Unterarme: '#A78BFA',
}
const DIFF_COLOR: Record<string, string> = {
  Anfänger: '#22C55E', Fortgeschritten: '#F59E0B', Profi: '#EF4444',
}

export default function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session, addExercise } = useWorkoutStore()

  const ex = EXERCISES.find(e => e.id === id)

  if (!ex) return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-3)' }}>Übung nicht gefunden</p>
      <button onClick={() => router.back()} className="btn-secondary" style={{ marginTop: 16, width: 'auto', display: 'inline-flex' }}>← Zurück</button>
    </div>
  )

  const safeEx = ex
  const color = MUSCLE_COLOR[safeEx.muscle] ?? '#5B6EF5'

  function addToWorkout() {
    addExercise({ id: crypto.randomUUID(), exerciseId: safeEx.id, exerciseName: safeEx.name, muscle: safeEx.muscle })
    router.push('/workout/active')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          <ArrowLeft size={16} /> Zurück
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>{safeEx.name}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>
            💪 {safeEx.muscle}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            🏋️ {safeEx.equipment}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: `${DIFF_COLOR[safeEx.difficulty]}18`, color: DIFF_COLOR[safeEx.difficulty], border: `1px solid ${DIFF_COLOR[safeEx.difficulty]}30` }}>
            {safeEx.difficulty}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Secondary muscles */}
        {safeEx.secondary && safeEx.secondary.length > 0 && (
          <div className="card" style={{ padding: '16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Target size={16} color="var(--text-3)" />
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-2)' }}>Unterstützende Muskeln</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {safeEx.secondary.map(m => (
                <span key={m} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${MUSCLE_COLOR[m] ?? '#6B7280'}12`, color: MUSCLE_COLOR[m] ?? '#6B7280' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card" style={{ padding: '18px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookOpen size={16} color="var(--green)" />
            <p style={{ fontWeight: 700, fontSize: 15 }}>Ausführung</p>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.7 }}>{safeEx.instructions}</p>
        </div>

        {/* Tips */}
        {safeEx.tips && (
          <div className="card" style={{ padding: '18px', marginBottom: 14, background: 'var(--green-light)', borderColor: 'var(--green-mid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={16} color="var(--green)" />
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Tipp</p>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6 }}>{safeEx.tips}</p>
          </div>
        )}

        {/* Recommended sets/reps */}
        {(safeEx.sets_recommended || safeEx.reps_recommended) && (
          <div className="card" style={{ padding: '18px', marginBottom: 20 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Empfehlung</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {safeEx.sets_recommended && (
                <div style={{ padding: '12px', borderRadius: 10, background: 'var(--surface-3)', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{safeEx.sets_recommended}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Sätze</p>
                </div>
              )}
              {safeEx.reps_recommended && (
                <div style={{ padding: '12px', borderRadius: 10, background: 'var(--surface-3)', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{safeEx.reps_recommended}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Wiederholungen</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add to workout */}
        <button className="btn-primary" onClick={addToWorkout}>
          <Plus size={18} />
          {session ? 'Zum laufenden Training hinzufügen' : 'Training starten mit dieser Übung'}
        </button>
      </div>
    </div>
  )
}
