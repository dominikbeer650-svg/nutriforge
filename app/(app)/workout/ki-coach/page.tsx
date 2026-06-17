'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, Bot, User, CheckCircle, Loader, RefreshCw, AlertCircle, Dumbbell, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

interface Message {
  role: 'user' | 'assistant'
  content: string
  chips?: string[]
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

// ── Smart chip detection based on KI question content ─────────────────────
function detectChips(text: string): string[] {
  const t = text.toLowerCase()

  // Ziel
  if (t.includes('ziel') || t.includes('was möchtest du erreichen') || t.includes('hauptziel')) {
    return ['💪 Muskelaufbau', '🔥 Gewicht verlieren', '⚡ Kraft steigern', '🏃 Ausdauer', '🎯 Allgemeine Fitness']
  }
  // Alter
  if (t.includes('alter') || t.includes('wie alt') || t.includes('jahre alt')) {
    return ['Unter 18', '18–24 Jahre', '25–34 Jahre', '35–44 Jahre', '45–54 Jahre', '55+ Jahre']
  }
  // Gewicht
  if ((t.includes('gewicht') || t.includes('kg') || t.includes('wiegst')) && !t.includes('trainingsgewicht')) {
    return ['Unter 60 kg', '60–70 kg', '70–80 kg', '80–90 kg', '90–100 kg', 'Über 100 kg']
  }
  // Größe
  if (t.includes('größe') || t.includes('cm') || t.includes('groß bist') || t.includes('körpergröße')) {
    return ['Unter 160 cm', '160–170 cm', '170–180 cm', '180–190 cm', '190–200 cm', 'Über 200 cm']
  }
  // Erfahrung
  if (t.includes('erfahrung') || t.includes('wie lange') || t.includes('trainierst du') || t.includes('anfänger')) {
    return ['🆕 Anfänger (< 6 Monate)', '📈 1 Jahr', '💪 2–3 Jahre', '🏆 3–5 Jahre', '⭐ 5+ Jahre']
  }
  // Trainingstage
  if (t.includes('tage') || t.includes('wie oft') || t.includes('pro woche') || t.includes('wochentage') || t.includes('trainingstage')) {
    return ['2x pro Woche', '3x pro Woche', '4x pro Woche', '5x pro Woche', '6x pro Woche']
  }
  // Zeit pro Einheit
  if (t.includes('zeit') || t.includes('minuten') || t.includes('wie lange dauert') || t.includes('pro einheit') || t.includes('dauer')) {
    return ['30 Min', '45 Min', '60 Min', '75 Min', '90+ Min']
  }
  // Equipment
  if (t.includes('equipment') || t.includes('ausrüstung') || t.includes('gym') || t.includes('fitnessstudio') || t.includes('geräte') || t.includes('trainierst du in')) {
    return ['🏋️ Fitnessstudio (alles vorhanden)', '🏠 Zuhause mit Kurzhanteln', '🏠 Zuhause ohne Geräte', '🏋️ Gym + manchmal Zuhause']
  }
  // Verletzungen
  if (t.includes('verletzung') || t.includes('einschränkung') || t.includes('beschwerden') || t.includes('knie') || t.includes('rücken') || t.includes('schulter')) {
    return ['✅ Keine Verletzungen', '⚠️ Knieprobleme', '⚠️ Rückenschmerzen', '⚠️ Schulterprobleme', '⚠️ Mehrere Einschränkungen']
  }
  // Körpertyp
  if (t.includes('körpertyp') || t.includes('ektomorph') || t.includes('endomorph') || t.includes('mesomorph') || t.includes('stoffwechsel') || t.includes('schwer zunehmen') || t.includes('fett ansetzen')) {
    return ['🦴 Ektomorph (schwer zuzunehmen)', '⚖️ Mesomorph (dazwischen)', '🔵 Endomorph (schnell Fett)']
  }
  // Plan anpassen
  if (t.includes('plan') && (t.includes('erstellt') || t.includes('hier ist') || t.includes('dein plan') || t.includes('folgende plan'))) {
    return ['✅ Perfekt, speichern!', '📅 Mehr Trainingstage', '📅 Weniger Trainingstage', '💪 Mehr Volumen', '⏱️ Kürzere Einheiten']
  }
  // Ja/Nein Fragen
  if (t.includes('möchtest du') || t.includes('hast du') || t.includes('trainierst du') || t.includes('bist du') || t.includes('gibt es')) {
    return ['✅ Ja', '❌ Nein', '🤔 Manchmal / Teilweise']
  }
  return []
}

// ── Progress tracker ──────────────────────────────────────────────────────
const STEPS = ['Ziel', 'Alter', 'Gewicht', 'Größe', 'Erfahrung', 'Tage', 'Zeit', 'Equipment', 'Verletzungen', 'Körpertyp']

function getProgress(messages: Message[]): number {
  const userMsgs = messages.filter(m => m.role === 'user').length
  return Math.min(userMsgs, STEPS.length)
}

export default function KICoachPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hey! Ich bin dein KI-Trainer 💪 Ich stelle dir jetzt ein paar kurze Fragen, um dir den perfekten Trainingsplan zu erstellen.\n\nFangen wir an: **Was ist dein Hauptziel?**',
    chips: ['💪 Muskelaufbau', '🔥 Gewicht verlieren', '⚡ Kraft steigern', '🏃 Ausdauer', '🎯 Allgemeine Fitness'],
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏳ Kurze Pause — bitte warte **30 Sekunden** und schreibe dann nochmal.',
          chips: ['🔄 Nochmal versuchen'],
        }])
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error(data.error ?? 'Fehler')

      const chips = detectChips(data.text)
      setMessages(prev => [...prev, { role: 'assistant', content: data.text, chips }])
      if (data.plan) setGeneratedPlan(data.plan)

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err instanceof Error ? err.message : 'Verbindungsfehler'} – bitte nochmal versuchen.`,
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

      for (const day of generatedPlan.days) {
        const { data: planDay, error: dayError } = await supabase
          .from('workout_plan_days')
          .insert({ plan_id: plan.id, day_number: day.day_number, name: day.name, focus: day.focus ?? '' })
          .select('id').single()
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
          const { error: exError } = await supabase.from('workout_plan_exercises').insert(inserts)
          if (exError) throw new Error(exError.message)
        }
      }
      setSaved(true)
      setTimeout(() => router.push('/workout'), 1800)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unbekannter Fehler')
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

  const progress = getProgress(messages)
  const lastMsg = messages[messages.length - 1]

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F7F8FA' }}>

      {/* Header */}
      <div style={{
        padding: '52px 16px 14px',
        background: 'white', borderBottom: '1px solid #E8EAED',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft size={22} color="#111827" />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: '#2DC96E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(45,201,110,0.3)' }}>
            <Sparkles size={19} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>KI-Coach</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Powered by Gemini · Kostenlos</p>
          </div>
          <button onClick={() => { setMessages([messages[0]]); setGeneratedPlan(null); setSaved(false); setSaveError(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF' }} title="Neu starten">
            <RefreshCw size={17} />
          </button>
        </div>

        {/* Progress bar */}
        {!generatedPlan && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Fortschritt
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2DC96E' }}>
                {progress}/{STEPS.length}
              </span>
            </div>
            <div style={{ height: 5, background: '#F1F3F6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #2DC96E, #22A85A)',
                width: `${(progress / STEPS.length) * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ display: 'flex', gap: 0, marginTop: 6, overflowX: 'auto' }} className="no-scrollbar">
              {STEPS.map((step, i) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i < progress ? '#2DC96E' : '#E8EAED',
                    transition: 'background 0.3s',
                  }} />
                  <span style={{ fontSize: 9, color: i < progress ? '#2DC96E' : '#D1D5DB', marginTop: 3, whiteSpace: 'nowrap', fontWeight: i < progress ? 700 : 400 }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          return (
            <div key={i}>
              {/* Message bubble */}
              <div style={{
                display: 'flex', gap: 10,
                marginBottom: 4,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginBottom: 2,
                  background: msg.role === 'assistant' ? '#2DC96E' : '#F1F3F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid ' + (msg.role === 'assistant' ? '#22A85A' : '#E8EAED'),
                }}>
                  {msg.role === 'assistant'
                    ? <Bot size={14} color="white" />
                    : <User size={14} color="#6B7280" />}
                </div>
                <div style={{
                  maxWidth: '78%',
                  padding: '11px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#2DC96E' : 'white',
                  border: msg.role === 'assistant' ? '1px solid #E8EAED' : 'none',
                  fontSize: 14, lineHeight: 1.65,
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

              {/* Chips — only under last assistant message, when not loading */}
              {isLast && msg.role === 'assistant' && (msg.chips ?? []).length > 0 && !loading && !saved && (
                <div style={{
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  marginLeft: 40, marginTop: 6, marginBottom: 10,
                }}>
                  {msg.chips!.map(chip => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 20,
                        border: '1.5px solid #2DC96E',
                        background: '#F0FDF4',
                        color: '#15803D',
                        fontSize: 13, fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#2DC96E'; (e.target as HTMLButtonElement).style.color = 'white' }}
                      onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#F0FDF4'; (e.target as HTMLButtonElement).style.color = '#15803D' }}
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
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: '#2DC96E', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #22A85A' }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'white', border: '1px solid #E8EAED', display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DC96E', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Generated Plan */}
        {generatedPlan && !saved && (
          <div style={{ margin: '8px 0 16px', borderRadius: 16, background: 'white', border: '1.5px solid #2DC96E', overflow: 'hidden', boxShadow: '0 4px 16px rgba(45,201,110,0.15)' }}>
            {/* Header */}
            <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderBottom: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle size={18} color="#2DC96E" />
                <p style={{ fontWeight: 700, fontSize: 12, color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.8 }}>Dein Plan ist fertig! 🎉</p>
              </div>
              <p style={{ fontWeight: 800, fontSize: 18, color: '#111827', letterSpacing: '-0.02em', marginBottom: 4 }}>{generatedPlan.name}</p>
              <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{generatedPlan.description}</p>
            </div>

            {/* Tags */}
            <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #F1F3F6' }}>
              {[
                `🎯 ${generatedPlan.goal}`,
                `📅 ${generatedPlan.days_per_week}x/Woche`,
                `⏱ ${generatedPlan.duration_weeks} Wochen`,
                `💪 ${generatedPlan.difficulty}`,
              ].map(tag => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 20, background: '#F7F8FA', border: '1px solid #E8EAED', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Days */}
            <div>
              {generatedPlan.days.map((day, i) => (
                <div key={i} style={{ padding: '12px 18px', borderBottom: i < generatedPlan.days.length - 1 ? '1px solid #F1F3F6' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#2DC96E' }}>{day.day_number}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {day.exercises.length} Übungen · {day.exercises.slice(0, 2).map(e => e.exercise_name).join(', ')}{day.exercises.length > 2 ? '...' : ''}
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
                  <p style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>{saveError}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Stelle sicher dass supabase-phase2.sql ausgeführt wurde.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '14px 16px 18px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => sendMessage('Bitte pass den Plan etwas an')}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8EAED', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6B7280' }}
              >
                🔄 Anpassen
              </button>
              <button
                className="btn-primary"
                onClick={savePlan}
                disabled={saving}
                style={{ flex: 2, borderRadius: 12, padding: '12px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {saving
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Speichern...</>
                  : '✅ Plan speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Saved */}
        {saved && (
          <div style={{ margin: '8px 0 16px', padding: '24px', borderRadius: 16, background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1px solid #BBF7D0', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <p style={{ fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 4 }}>Plan gespeichert!</p>
            <p style={{ fontSize: 14, color: '#4B5563' }}>Du wirst weitergeleitet...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        background: 'white', borderTop: '1px solid #E8EAED',
        flexShrink: 0,
      }}>
        {!saved && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
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
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading ? '#2DC96E' : '#F1F3F6',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <Send size={17} color={input.trim() && !loading ? 'white' : '#9CA3AF'} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
