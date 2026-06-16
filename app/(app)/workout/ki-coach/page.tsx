'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, Bot, User, CheckCircle, Loader, RefreshCw, AlertCircle, ChevronRight, Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Message {
  role: 'user' | 'assistant'
  content: string
  chips?: string[]  // Antwort-Vorschläge nach dieser Nachricht
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

// Kontextbasierte Antwort-Chips
function extractChips(text: string): string[] {
  const lower = text.toLowerCase()

  if (lower.includes('hauptziel') || lower.includes('was ist dein ziel') || lower.includes('was möchtest du')) {
    return ['💪 Muskelaufbau', '🔥 Abnehmen', '⚡ Kraft steigern', '🏃 Ausdauer verbessern']
  }
  if (lower.includes('erfahrung') || lower.includes('wie lange') || lower.includes('anfänger')) {
    return ['🆕 Anfänger (< 1 Jahr)', '📈 Mittelstufe (1–3 Jahre)', '🏆 Fortgeschritten (3+ Jahre)']
  }
  if (lower.includes('wie oft') || lower.includes('tage') || lower.includes('training pro woche') || lower.includes('wochentage')) {
    return ['2x pro Woche', '3x pro Woche', '4x pro Woche', '5x pro Woche', '6x pro Woche']
  }
  if (lower.includes('equipment') || lower.includes('ausrüstung') || lower.includes('fitnessstudio') || lower.includes('gym') || lower.includes('geräte')) {
    return ['🏋️ Fitnessstudio (alles)', '🏠 Zuhause (Kurzhanteln)', '🏠 Zuhause (ohne Equipment)', '🏋️ Gym + Zuhause']
  }
  if (lower.includes('wie viel zeit') || lower.includes('wie lange dauert') || lower.includes('minuten') || lower.includes('zeit pro')) {
    return ['30–45 Minuten', '45–60 Minuten', '60–90 Minuten', '90+ Minuten']
  }
  if (lower.includes('verletzung') || lower.includes('schmerzen') || lower.includes('körperstelle')) {
    return ['Keine Verletzungen', '⚠️ Knieprobleme', '⚠️ Rückenprobleme', '⚠️ Schulterprobleme']
  }
  if (lower.includes('körpergewicht') || lower.includes('wie viel wiegst') || lower.includes('kg')) {
    return ['Unter 70 kg', '70–80 kg', '80–90 kg', '90–100 kg', 'Über 100 kg']
  }
  if (lower.includes('fokus') || lower.includes('muskelgruppe') || lower.includes('welche bereiche')) {
    return ['Ganzkörper', '💪 Oberkörper', '🦵 Unterkörper', '🎯 Brust & Rücken', '👃 Core & Bauch']
  }
  if (lower.includes('ja') || lower.includes('nein') || lower.includes('möchtest du')) {
    return ['✅ Ja, klingt gut!', '🔄 Etwas anpassen', '❌ Nein, anders']
  }
  if (lower.includes('plan') && (lower.includes('erstell') || lower.includes('generi') || lower.includes('hier ist'))) {
    return ['✅ Perfekt, Plan speichern!', '🔄 Plan anpassen', '➕ Mehr Übungen', '🗓️ Weniger Tage']
  }
  return []
}

export default function KICoachPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hallo! Ich bin dein persönlicher KI-Trainer 💪\n\nIch erstelle dir einen **perfekten, individualisierten Trainingsplan** – kostenlos und wissenschaftlich fundiert.\n\nUm den besten Plan für dich zu erstellen, brauche ich ein paar Infos. Was ist dein **Hauptziel**?',
    chips: ['💪 Muskelaufbau', '🔥 Abnehmen', '⚡ Kraft steigern', '🏃 Ausdauer verbessern'],
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showPlanDetail, setShowPlanDetail] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
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
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏳ Kurze Pause nötig! Die KI hat gerade viele Anfragen. Bitte warte **30 Sekunden** und versuche es dann nochmal.',
          chips: ['🔄 Erneut versuchen'],
        }])
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler')

      const chips = extractChips(data.text)
      setMessages(prev => [...prev, { role: 'assistant', content: data.text, chips }])
      if (data.plan) {
        setGeneratedPlan(data.plan)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Fehler: ${err instanceof Error ? err.message : 'Verbindungsproblem'}. Bitte versuche es nochmal.`,
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
      // 1. Plan speichern
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

      if (planError) {
        console.error('Plan insert error:', planError)
        throw new Error(`Plan konnte nicht gespeichert werden: ${planError.message}`)
      }

      if (!plan?.id) throw new Error('Keine Plan-ID zurückgegeben')

      // 2. Tage speichern
      for (const day of generatedPlan.days) {
        const { data: planDay, error: dayError } = await supabase
          .from('workout_plan_days')
          .insert({
            plan_id: plan.id,
            day_number: day.day_number,
            name: day.name,
            focus: day.focus ?? '',
          })
          .select('id')
          .single()

        if (dayError) {
          console.error('Day insert error:', dayError)
          throw new Error(`Tag ${day.day_number} konnte nicht gespeichert werden: ${dayError.message}`)
        }

        if (!planDay?.id) continue

        // 3. Übungen speichern
        const exerciseInserts = day.exercises.map((ex, i) => ({
          day_id: planDay.id,
          exercise_id: ex.exercise_id ?? null,
          exercise_name: ex.exercise_name,
          sets: ex.sets ?? 3,
          reps_range: ex.reps ?? '8-12',
          rest_seconds: ex.rest_seconds ?? 90,
          notes: ex.notes ?? '',
          sort_order: i,
        }))

        if (exerciseInserts.length > 0) {
          const { error: exError } = await supabase
            .from('workout_plan_exercises')
            .insert(exerciseInserts)

          if (exError) {
            console.error('Exercise insert error:', exError)
            throw new Error(`Übungen konnten nicht gespeichert werden: ${exError.message}`)
          }
        }
      }

      setSaved(true)
      setTimeout(() => router.push('/workout'), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setSaveError(msg)
      console.error('savePlan error:', err)
    } finally {
      setSaving(false)
    }
  }

  function formatText(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
  }

  const lastMsg = messages[messages.length - 1]
  const showChips = !loading && lastMsg?.role === 'assistant' && (lastMsg.chips ?? []).length > 0 && !saved

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
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="var(--text-1)" />
        </button>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(45,201,110,0.35)' }}>
          <Sparkles size={19} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>KI-Coach</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Powered by Gemini · Kostenlos</p>
        </div>
        <button
          onClick={() => { setMessages([messages[0]]); setGeneratedPlan(null); setSaved(false); setSaveError(null) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)' }}
          title="Neu starten"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{
              display: 'flex', gap: 10, marginBottom: 4,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
            }}>
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: msg.role === 'assistant' ? 'var(--green)' : 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--border)',
                marginBottom: 2,
              }}>
                {msg.role === 'assistant'
                  ? <Bot size={14} color="white" />
                  : <User size={14} color="var(--text-2)" />}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '78%',
                padding: '11px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'var(--green)' : 'var(--surface)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: 14, lineHeight: 1.65,
                color: msg.role === 'user' ? 'white' : 'var(--text-1)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}>
                <span dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
              </div>
            </div>

            {/* Chips — only under LAST assistant message */}
            {i === messages.length - 1 && msg.role === 'assistant' && msg.chips && msg.chips.length > 0 && !loading && !saved && (
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap',
                marginLeft: 40, marginBottom: 12, marginTop: 4,
              }}>
                {msg.chips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: '1.5px solid var(--green)',
                      background: 'var(--green-light)',
                      color: '#166534',
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Generated Plan Card */}
        {generatedPlan && !saved && (
          <div style={{
            margin: '8px 0 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            border: '1.5px solid var(--green)',
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(45,201,110,0.15)',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 18px 14px', background: 'var(--green-light)', borderBottom: '1px solid var(--green-mid)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CheckCircle size={18} color="var(--green)" />
                <p style={{ fontWeight: 700, fontSize: 13, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>Dein Plan ist fertig!</p>
              </div>
              <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{generatedPlan.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.4 }}>{generatedPlan.description}</p>
            </div>

            {/* Tags */}
            <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
              {[
                `🎯 ${generatedPlan.goal}`,
                `📅 ${generatedPlan.days_per_week}x/Woche`,
                `⏱ ${generatedPlan.duration_weeks} Wochen`,
                `💪 ${generatedPlan.difficulty}`,
              ].map(tag => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 20, background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Days preview — collapsible */}
            <div style={{ padding: '0 0 4px' }}>
              {generatedPlan.days.map((day, i) => (
                <div key={i} style={{ padding: '11px 18px', borderBottom: i < generatedPlan.days.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)' }}>{day.day_number}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{day.exercises.length} Übungen · {day.focus}</p>
                  </div>
                  <Dumbbell size={14} color="var(--text-3)" />
                </div>
              ))}
            </div>

            {/* Save error */}
            {saveError && (
              <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 2 }}>Speichern fehlgeschlagen</p>
                  <p style={{ fontSize: 12, color: '#EF4444', lineHeight: 1.4 }}>{saveError}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Bitte prüfe ob das SQL-Schema (supabase-phase2.sql) ausgeführt wurde.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => sendMessage('Kannst du den Plan anpassen?')}
                style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              >
                🔄 Anpassen
              </button>
              <button
                className="btn-primary"
                onClick={savePlan}
                disabled={saving}
                style={{ flex: 2, borderRadius: 12, padding: '11px', fontSize: 14 }}
              >
                {saving
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Speichern...</>
                  : '✅ Plan speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div style={{ margin: '8px 0 16px', padding: '20px', borderRadius: 'var(--radius-lg)', background: 'var(--green-light)', border: '1px solid var(--green-mid)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)', marginBottom: 4 }}>Plan gespeichert!</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Du wirst zu deinen Trainingsplänen weitergeleitet...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Oder schreib selbst..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading || saved}
            style={{ flex: 1, fontSize: 15 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || saved}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !saved ? 'var(--green)' : 'var(--surface-3)',
              border: 'none', cursor: input.trim() && !saved ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <Send size={17} color={input.trim() && !saved ? 'white' : 'var(--text-3)'} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
