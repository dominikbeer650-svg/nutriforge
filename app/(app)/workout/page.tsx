'use client'
import { useState } from 'react'
import { Plus, Sparkles, ChevronRight, Dumbbell, Search } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

type WorkoutTab = 'plans' | 'exercises'

const SAMPLE_PLANS = [
  {
    id: '1',
    name: 'Arnold Split (Brust/Rücken & Schulter/Arme)',
    description:
      'Ein klassischer Arnold-Split-Ansatz für den Oberkörper, aufgeteilt in zwei spezialisierte Einheiten für maximalen Muskelaufbau bei 4 Trainingstagen pro Woche.',
    days: 4,
  },
  {
    id: '2',
    name: 'Schultern und Arme',
    description: 'Fokussiertes Training für Schultern, Bizeps und Trizeps.',
    days: 2,
  },
]

const SAMPLE_EXERCISES = [
  { id: '1', name: 'Bankdrücken', muscle: 'Brust', equipment: 'Langhantel' },
  { id: '2', name: 'Klimmzüge', muscle: 'Rücken', equipment: 'Stange' },
  { id: '3', name: 'Kniebeuge', muscle: 'Beine', equipment: 'Langhantel' },
  { id: '4', name: 'Schulterdrücken', muscle: 'Schultern', equipment: 'Kurzhantel' },
  { id: '5', name: 'Bizepscurl', muscle: 'Bizeps', equipment: 'Kurzhantel' },
  { id: '6', name: 'Trizeps-Pushdown', muscle: 'Trizeps', equipment: 'Kabelzug' },
]

export default function WorkoutPage() {
  const [tab, setTab] = useState<WorkoutTab>('plans')
  const [search, setSearch] = useState('')

  const filteredExercises = SAMPLE_EXERCISES.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeader
        title="Workout"
        subtitle="Trainingspläne, Übungen und Satz-Tracker."
        right={
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px', fontSize: 14 }}>
            <span style={{ fontSize: 16 }}>▷</span>
            Schnellstart
          </button>
        }
      />

      <div style={{ padding: '16px' }}>

        {/* KI-Coach banner */}
        <div className="banner fade-up" style={{ marginBottom: 16, cursor: 'pointer' }}>
          <div className="banner-icon">
            <Sparkles size={22} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>KI-Coach</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 1 }}>
              Lass dir einen Plan automatisch erstellen.
            </p>
          </div>
          <ChevronRight size={18} color="var(--text-3)" />
        </div>

        {/* Tab switcher */}
        <div className="tab-switch fade-up delay-1" style={{ marginBottom: 16 }}>
          <button
            className={tab === 'plans' ? 'active' : ''}
            onClick={() => setTab('plans')}
          >
            Trainingspläne
          </button>
          <button
            className={tab === 'exercises' ? 'active' : ''}
            onClick={() => setTab('exercises')}
          >
            Übungsbibliothek
          </button>
        </div>

        {/* Plans tab */}
        {tab === 'plans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* New plan button */}
            <button
              className="card fade-up delay-2"
              style={{
                width: '100%',
                padding: '18px',
                border: '1.5px dashed var(--border-mid)',
                background: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--text-2)',
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <Plus size={18} />
              Neuer Plan
            </button>

            {SAMPLE_PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className={`card fade-up delay-${i + 3}`}
                style={{ padding: '18px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', lineHeight: 1.35, marginBottom: 6 }}>
                      {plan.name}
                    </p>
                    {plan.description && (
                      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exercises tab */}
        {tab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Search */}
            <div className="fade-up" style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-3)', pointerEvents: 'none',
                }}
              />
              <input
                className="input"
                placeholder="Übung suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 40 }}
              />
            </div>

            {/* Add custom exercise */}
            <button
              className="card fade-up delay-1"
              style={{
                width: '100%', padding: '14px 18px',
                border: '1.5px dashed var(--border-mid)',
                background: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                color: 'var(--text-2)', fontSize: 14, fontWeight: 500,
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <Plus size={16} color="var(--green)" />
              Eigene Übung erstellen
            </button>

            {/* Exercise list */}
            {filteredExercises.map((ex, i) => (
              <div
                key={ex.id}
                className={`card fade-up delay-${Math.min(i + 2, 5)}`}
                style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 11,
                    background: 'var(--green-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Dumbbell size={18} color="var(--green)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>{ex.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {ex.muscle} · {ex.equipment}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--text-3)" />
              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                <Dumbbell size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 15 }}>Keine Übungen gefunden</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
