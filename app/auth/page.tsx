'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Tab = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function clearMessages() { setError(null); setSuccess(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    clearMessages()

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/start')
      } else {
        if (username.trim().length < 3) throw new Error('Benutzername muss mindestens 3 Zeichen haben')
        if (password.length < 6) throw new Error('Passwort muss mindestens 6 Zeichen haben')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: username } },
        })
        if (error) throw error
        if (data.user && !data.session) {
          setSuccess('Bestätigungs-E-Mail gesendet – bitte prüfe dein Postfach und klicke den Link.')
        } else {
          router.replace('/start')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? translateError(err.message) : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--surface-2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px 48px',
      }}
    >
      {/* Logo */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(45,201,110,0.35)',
          }}
        >
          <Dumbbell size={26} color="white" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
          LiftOff Free
        </span>
      </div>

      {/* Card */}
      <div
        className="fade-up delay-1 card"
        style={{ width: '100%', maxWidth: 420, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Tab switch */}
        <div className="tab-switch">
          <button
            className={tab === 'login' ? 'active' : ''}
            onClick={() => { setTab('login'); clearMessages() }}
          >
            Anmelden
          </button>
          <button
            className={tab === 'register' ? 'active' : ''}
            onClick={() => { setTab('register'); clearMessages() }}
          >
            Registrieren
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--danger)',
          }}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--green-light)', border: '1px solid var(--green-mid)',
            borderRadius: 'var(--radius-sm)', fontSize: 14, color: '#166534',
            lineHeight: 1.5,
          }}>
            ✅ {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'register' && (
            <div>
              <label className="field-label">Benutzername</label>
              <input
                className="input"
                type="text"
                placeholder="ironlifter99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className="field-label">E-Mail</label>
            <input
              className="input"
              type="email"
              placeholder="du@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="field-label">Passwort</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder={tab === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 4,
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading
              ? (tab === 'login' ? 'Anmelden...' : 'Registrieren...')
              : (tab === 'login' ? 'Anmelden' : 'Registrieren')}
          </button>
        </form>

        {/* Passwort vergessen */}
        {tab === 'login' && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
            Passwort vergessen?{' '}
            <button
              className="btn-ghost"
              style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}
              onClick={async () => {
                if (!email) { setError('Bitte zuerst E-Mail eintragen.'); return }
                await supabase.auth.resetPasswordForEmail(email)
                setSuccess('Reset-Link wurde an deine E-Mail gesendet.')
              }}
            >
              Reset-Link senden
            </button>
          </p>
        )}
      </div>

      <p className="fade-up delay-2" style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
        Kein Abo · Keine Werbung · Kostenlos für immer
      </p>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) return 'E-Mail oder Passwort falsch.'
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Diese E-Mail ist bereits registriert. Bitte anmelden.'
  if (msg.includes('Password should be')) return 'Passwort muss mindestens 6 Zeichen haben.'
  if (msg.includes('Unable to validate')) return 'Ungültige E-Mail-Adresse.'
  if (msg.includes('Email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail.'
  if (msg.includes('User already registered')) return 'Diese E-Mail ist bereits registriert.'
  return msg
}
