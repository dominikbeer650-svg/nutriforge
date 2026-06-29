'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Send, Sparkles, Bot, User, CheckCircle,
  Loader, RefreshCw, AlertCircle, Dumbbell,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Message {
  role: 'user' | 'assistant'
  content: string
  chips?: string[]   // Chips kommen direkt von der KI
}

interface GeneratedPlan {
  name: string
  description: string
  days_per_week: number
  goal: string
  difficulty: string
  duration_weeks: number
  days: Array<{
    day_number: number
    name: string
    focus: string
    exercises: Array<{
      exercise_name: string
      exercise_id: string
      sets: number
      reps: string
      rest_seconds: number
      notes: string
    }>
  }>
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hey! Ich bin dein persönlicher KI-Trainer 💪\n\nIch stelle dir ein paar Fragen um deinen **perfekten** Trainingsplan zu erstellen. Fangen wir an:\n\n**Was ist dein Hauptziel?**',
  chips: ['💪 Muskelaufbau', '🔥 Gewicht verlieren', '⚡ Kraft steigern', '🏃 Ausdauer verbessern', '🎯 Fit & gesund bleiben'],
}

export default function KICoachPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-3)' }}>Laden...</p></div>}>
      <KICoachInner />
    </Suspense>
  )
}

function KICoachInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editPlanId = searchParams.get('editPlanId')
  const editPlanName = searchParams.get('planName')
  const { user } = useAuthStore()
  const isEditMode = !!editPlanId
  const editInitialMessage: Message = {
    role: 'assistant',
    content: `Ich sehe deinen Plan **${editPlanName ?? 'Training'}** — was soll ich daran ändern? Ich kann Übungen austauschen, Tage anpassen, Sätze/Wiederholungen optimieren oder den ganzen Plan neu strukturieren.`,
    chips: ['💪 Mehr Volumen', '📅 Trainingstage anpassen', '🔄 Übungen tauschen', '⚡ Intensität erhöhen', '😌 Weniger Umfang'],
  }

  const [messages, setMessages] = useState<Message[]>([isEditMode ? editInitialMessage : INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [messages, loading, generatedPlan])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ki-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Only send role + content to the API, not chips
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏳ Kurz Pause nötig — bitte warte **30 Sekunden** und schreib dann nochmal.',
          chips: ['🔄 Nochmal versuchen'],
        }])
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error(data.error ?? 'Fehler')

      // Chips kommen direkt von der KI — kein Pattern-Matching mehr
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.text,
        chips: Array.isArray(data.chips) ? data.chips : [],
      }
      setMessages(prev => [...prev, assistantMsg])

      if (data.plan) setGeneratedPlan(data.plan)

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err instanceof Error ? err.message : 'Verbindungsfehler'} — bitte nochmal versuchen.`,
        chips: ['🔄 Erneut versuchen'],
      }])
    } finally {
      setLoading(false)
    }
  }

  async function savePlan() {
    if (!generatedPlan || !user) return
    setSaving(true)
    setSaveError(null)
    try {
      let planId: string

      if (isEditMode && editPlanId) {
        // Update existing plan — delete old days first (cascade deletes exercises)
        const { error: delErr } = await supabase
          .from('workout_plan_days')
          .delete()
          .eq('plan_id', editPlanId)
        if (delErr) throw new Error(delErr.message)

        // Update plan metadata
        const { error: upErr } = await supabase
          .from('workout_plans')
          .update({
            name: generatedPlan.name,
            description: generatedPlan.description,
            days_per_week: generatedPlan.days_per_week,
            difficulty: generatedPlan.difficulty,
            goal: generatedPlan.goal,
            duration_weeks: generatedPlan.duration_weeks,
          })
          .eq('id', editPlanId)
        if (upErr) throw new Error(upErr.message)
        planId = editPlanId
      } else {
        // Create new plan
        const { data: plan, error: planError } = await supabase
          .from('workout_plans')
          .insert({
            user_id: user.id,
            name: generatedPlan.name,
            description: generatedPlan.description,
            days_per_week: generatedPlan.days_per_week,
            difficulty: generatedPlan.difficulty,
            goal: generatedPlan.goal,
            duration_weeks: generatedPlan.duration_weeks,
            is_ai_generated: true,
          })
          .select('id')
          .single()
        if (planError) throw new Error(planError.message)
        if (!plan?.id) throw new Error('Keine Plan-ID')
        planId = plan.id
      }

      for (const day of generatedPlan.days) {
        const { data: planDay, error: dayError } = await supabase
          .from('workout_plan_days')
          .insert({
            plan_id: planId,
            day_number: day.day_number,
            name: day.name,
            focus: day.focus ?? '',
          })
          .select('id')
          .single()

        if (dayError) throw new Error(dayError.message)
        if (!planDay?.id) continue

        const inserts = day.exercises.map((ex, i) => ({
          day_id: planDay.id,
          exercise_id: ex.exercise_id ?? null,
          exercise_name: ex.exercise_name,
          sets: ex.sets ?? 3,
          reps_range: ex.reps ?? '8-12',
          rest_seconds: ex.rest_seconds ?? 90,
          notes: ex.notes ?? '',
          sort_order: i,
        }))

        if (inserts.length > 0) {
          const { error: exError } = await supabase
            .from('workout_plan_exercises')
            .insert(inserts)
          if (exError) throw new Error(exError.message)
        }
      }

      setSaved(true)
      setTimeout(() => router.push(isEditMode && editPlanId ? `/workout/plan/${editPlanId}` : '/workout'), 1800)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  const lastMsg = messages[messages.length - 1]

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F7F8FA' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '52px 16px 14px',
        background: 'white',
        borderBottom: '1px solid #E8EAED',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ArrowLeft size={22} color="#111827" />
        </button>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: '#2DC96E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(45,201,110,0.35)',
        }}>
          <Sparkles size={20} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>
            {isEditMode ? 'Plan bearbeiten' : 'KI-Coach'}
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>
            {isEditMode ? `✏️ ${editPlanName ?? 'Trainingsplan'}` : 'Powered by Gemini · Kostenlos'}
          </p>
        </div>
        <button
          onClick={() => {
            setMessages([isEditMode ? editInitialMessage : INITIAL_MESSAGE])
            setGeneratedPlan(null)
            setSaved(false)
            setSaveError(null)
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#9CA3AF' }}
          title="Neu starten"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const showChips = isLast && msg.role === 'assistant' && !loading && !saved && (msg.chips ?? []).length > 0

          return (
            <div key={i} style={{ marginBottom: 4 }}>
              {/* Bubble */}
              <div style={{
                display: 'flex', gap: 10,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                marginBottom: showChips ? 8 : 14,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: msg.role === 'assistant' ? '#2DC96E' : '#F1F3F6',
                  border: `1px solid ${msg.role === 'assistant' ? '#22A85A' : '#E8EAED'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 2,
                }}>
                  {msg.role === 'assistant'
                    ? <Bot size={15} color="white" />
                    : <User size={15} color="#6B7280" />}
                </div>

                {/* Text */}
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 15px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? '#2DC96E' : 'white',
                  border: msg.role === 'assistant' ? '1px solid #E8EAED' : 'none',
                  fontSize: 15, lineHeight: 1.6,
                  color: msg.role === 'user' ? 'white' : '#111827',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <span dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                </div>
              </div>

              {/* ── Chips — directly from KI, no pattern matching ── */}
              {showChips && (
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  marginLeft: 42, marginBottom: 14,
                }}>
                  {msg.chips!.map(chip => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 22,
                        border: '1.5px solid #2DC96E',
                        background: 'white',
                        color: '#15803D',
                        fontSize: 14, fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget
                        el.style.background = '#2DC96E'
                        el.style.color = 'white'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget
                        el.style.background = 'white'
                        el.style.color = '#15803D'
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: '#2DC96E', border: '1px solid #22A85A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={15} color="white" />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              background: 'white', border: '1px solid #E8EAED',
              display: 'flex', gap: 5, alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#2DC96E',
                  animation: 'bounce 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Generated Plan Card ── */}
        {generatedPlan && !saved && (
          <div style={{
            margin: '4px 0 16px',
            borderRadius: 18,
            background: 'white',
            border: '1.5px solid #2DC96E',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(45,201,110,0.15)',
          }}>
            {/* Plan header */}
            <div style={{
              padding: '18px 18px 14px',
              background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
              borderBottom: '1px solid #BBF7D0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle size={18} color="#2DC96E" />
                <p style={{ fontWeight: 700, fontSize: 12, color: '#15803D', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Dein Plan ist fertig 🎉
                </p>
              </div>
              <p style={{ fontWeight: 800, fontSize: 19, color: '#111827', letterSpacing: '-0.03em', marginBottom: 6 }}>
                {generatedPlan.name}
              </p>
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.55 }}>
                {generatedPlan.description}
              </p>
            </div>

            {/* Tags */}
            <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #F1F3F6' }}>
              {[
                `🎯 ${generatedPlan.goal}`,
                `📅 ${generatedPlan.days_per_week}×/Woche`,
                `⏱ ${generatedPlan.duration_weeks} Wochen`,
                `💪 ${generatedPlan.difficulty}`,
              ].map(tag => (
                <span key={tag} style={{
                  padding: '5px 11px', borderRadius: 20,
                  background: '#F7F8FA', border: '1px solid #E8EAED',
                  fontSize: 12, fontWeight: 600, color: '#374151',
                }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Days preview */}
            <div>
              {generatedPlan.days.map((day, i) => (
                <div key={i} style={{
                  padding: '13px 18px',
                  borderBottom: i < generatedPlan.days.length - 1 ? '1px solid #F1F3F6' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#2DC96E' }}>{day.day_number}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {day.name}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      {day.exercises.length} Übungen · {day.exercises.slice(0, 2).map(e => e.exercise_name).join(', ')}{day.exercises.length > 2 ? ' ...' : ''}
                    </p>
                  </div>
                  <Dumbbell size={14} color="#D1D5DB" />
                </div>
              ))}
            </div>

            {/* Save error */}
            {saveError && (
              <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', gap: 8 }}>
                <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Speichern fehlgeschlagen</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{saveError}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Stelle sicher dass supabase-phase2.sql ausgeführt wurde.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '14px 16px 18px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => sendMessage('Bitte pass den Plan etwas an')}
                style={{
                  flex: 1, padding: '13px', borderRadius: 13,
                  border: '1.5px solid #E8EAED', background: 'white',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6B7280',
                }}
              >
                🔄 Anpassen
              </button>
              <button
                className="btn-primary"
                onClick={savePlan}
                disabled={saving}
                style={{ flex: 2, borderRadius: 13, padding: '13px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {saving
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Speichern...</>
                  : isEditMode ? '✅ Plan aktualisieren' : '✅ Plan speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div style={{ margin: '4px 0 16px', padding: '28px 24px', borderRadius: 18, background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1px solid #BBF7D0', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 800, fontSize: 19, color: '#111827', marginBottom: 6 }}>{isEditMode ? 'Plan aktualisiert! 🎉' : 'Plan gespeichert! 🎉'}</p>
            <p style={{ fontSize: 14, color: '#4B5563' }}>Du wirst weitergeleitet...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      {!saved && (
        <div style={{
          padding: '10px 16px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          background: 'white',
          borderTop: '1px solid #E8EAED',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Oder eigene Antwort eingeben..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              style={{ flex: 1, fontSize: 15 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                background: input.trim() && !loading ? '#2DC96E' : '#F1F3F6',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <Send size={18} color={input.trim() && !loading ? 'white' : '#9CA3AF'} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
