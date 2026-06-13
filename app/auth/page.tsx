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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: username } },
        })
        if (error) throw error
        if (data.user && !data.session) {
          setSuccess('Bestätigungs-E-Mail gesendet – bitte prüfe dein Postfach.')
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

  async function handleGoogle() {
    clearMessages()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) setError(translateError(error.message))
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
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

        {/* Error / Success */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              color: 'var(--danger)',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--green-light)',
              border: '1px solid var(--green-mid)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              color: '#166534',
            }}
          >
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Username – only on register */}
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
                  display: 'flex', alignItems: 'center',
                  padding: 4,
                }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 2 }}>
            {loading
              ? (tab === 'login' ? 'Anmelden...' : 'Registrieren...')
              : (tab === 'login' ? 'Anmelden' : 'Registrieren')}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">oder</div>

        {/* Google */}
        <button className="btn-secondary" onClick={handleGoogle} type="button">
          <GoogleIcon />
          Mit Google anmelden
        </button>
      </div>

      {/* Footer */}
      <p className="fade-up delay-2" style={{ marginTop: 28, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
        Kein Abo. Keine Werbung. Kostenlos für immer.
      </p>
    </div>
  )
}

/* ── Helpers ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login')) return 'E-Mail oder Passwort falsch.'
  if (msg.includes('already registered')) return 'Diese E-Mail ist bereits registriert.'
  if (msg.includes('Password should be')) return 'Passwort muss mindestens 6 Zeichen haben.'
  if (msg.includes('Unable to validate')) return 'Ungültige E-Mail-Adresse.'
  return msg
}
