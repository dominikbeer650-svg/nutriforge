'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, Bot, User, CheckCircle, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Message {
  role: 'user' | 'assistant'
  content: string
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

const STARTER_QUESTIONS = [
  '🎯 Ich möchte Muskeln aufbauen',
  '🔥 Ich möchte abnehmen',
  '💪 Ich bin Anfänger und brauche einen Plan',
  '🏋️ Ich trainiere 3x die Woche',
]

export default function KICoachPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hallo! Ich bin dein persönlicher KI-Trainer 💪\n\nIch erstelle dir einen **perfekten, individualisierten Trainingsplan** – kostenlos und wissenschaftlich fundiert.\n\nUm den besten Plan für dich zu erstellen, brauche ich ein paar Infos. Was ist dein **Hauptziel**?',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const content = text ?? input.trim()
    if (!content || loading) return

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ki-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏳ Kurze Pause nötig! Die KI hat gerade viele Anfragen. Bitte warte **30 Sekunden** und schreibe dann nochmal.',
        }])
        return
      }

      if (!res.ok) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
      if (data.plan) setGeneratedPlan(data.plan)
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Verbindungsfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.',
      }])
    } finally {
      setLoading(false)
    }
  }

  async function savePlan() {
    if (!generatedPlan || !user) return
    setSaving(true)
    try {
      const { data: plan, error } = await supabase
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
        .select()
        .single()

      if (error) throw error

      for (const day of generatedPlan.days) {
        const { data: planDay } = await supabase
          .from('workout_plan_days')
          .insert({
            plan_id: plan.id,
            day_number: day.day_number,
            name: day.name,
            focus: day.focus,
          })
          .select()
          .single()

        if (planDay) {
          for (let i = 0; i < day.exercises.length; i++) {
            const ex = day.exercises[i]
            await supabase.from('workout_plan_exercises').insert({
              day_id: planDay.id,
              exercise_id: ex.exercise_id,
              exercise_name: ex.exercise_name,
              sets: ex.sets,
              reps_range: ex.reps,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
              sort_order: i,
            })
          }
        }
      }

      setSaved(true)
      setTimeout(() => router.push('/workout'), 1500)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function formatText(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
      {/* Header */}
      <div style={{
        padding: '52px 16px 14px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: 4 }}>
          <ArrowLeft size={22} color="var(--text-1)" />
        </button>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Sparkles size={18} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>KI-Coach</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Powered by Gemini</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Starter questions */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  textAlign: 'left',
                  fontSize: 14,
                  color: 'var(--text-1)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 16,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: msg.role === 'assistant' ? 'var(--green)' : 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)',
            }}>
              {msg.role === 'assistant'
                ? <Bot size={16} color="white" />
                : <User size={16} color="var(--text-2)" />}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '80%',
              padding: '12px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? 'var(--green)' : 'var(--surface)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              fontSize: 14,
              lineHeight: 1.6,
              color: msg.role === 'user' ? 'white' : 'var(--text-1)',
            }}>
              <span dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={16} color="white" />
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--text-3)',
                  animation: 'bounce 1s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Generated Plan Card */}
        {generatedPlan && !saved && (
          <div style={{
            padding: '20px', borderRadius: 'var(--radius-lg)',
            background: 'var(--green-light)', border: '1.5px solid var(--green-mid)',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CheckCircle size={22} color="var(--green)" />
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
                Dein Plan ist fertig!
              </p>
            </div>
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{generatedPlan.name}</p>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 12 }}>{generatedPlan.description}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                `🎯 ${generatedPlan.goal}`,
                `📅 ${generatedPlan.days_per_week}x/Woche`,
                `⏱ ${generatedPlan.duration_weeks} Wochen`,
                `💪 ${generatedPlan.difficulty}`,
              ].map(tag => (
                <span key={tag} style={{
                  padding: '4px 10px', borderRadius: 20,
                  background: 'var(--surface)', border: '1px solid var(--green-mid)',
                  fontSize: 12, fontWeight: 600, color: 'var(--text-1)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              {generatedPlan.days.map(day => (
                <div key={day.day_number} style={{
                  padding: '10px 12px', marginBottom: 6,
                  background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Tag {day.day_number}: {day.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {day.exercises.length} Übungen · {day.exercises.map(e => e.exercise_name).slice(0, 3).join(', ')}{day.exercises.length > 3 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={savePlan}
              disabled={saving}
            >
              {saving ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Speichern...</> : '✅ Plan speichern & starten'}
            </button>
          </div>
        )}

        {saved && (
          <div style={{
            padding: '16px', borderRadius: 'var(--radius-lg)',
            background: 'var(--green-light)', border: '1px solid var(--green-mid)',
            textAlign: 'center', marginBottom: 16,
          }}>
            <CheckCircle size={28} color="var(--green)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 700, color: 'var(--text-1)' }}>Plan gespeichert! 🎉</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Weiterleitung zu deinen Plänen...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          className="input"
          placeholder="Schreib dem KI-Coach..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: input.trim() ? 'var(--green)' : 'var(--surface-3)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          <Send size={18} color={input.trim() ? 'white' : 'var(--text-3)'} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
