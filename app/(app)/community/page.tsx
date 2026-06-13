'use client'
import PageHeader from '@/components/layout/PageHeader'

export default function Page() {
  const meta: Record<string, { title: string; subtitle: string; emoji: string; phase: string }> = {
    essen:     { title: 'Ernährung',    subtitle: 'Kalorien & Makros tracken.',       emoji: '🍎', phase: 'Phase 3' },
    stats:     { title: 'Statistiken', subtitle: 'Dein Fortschritt auf einen Blick.', emoji: '📊', phase: 'Phase 5' },
    community: { title: 'Community',   subtitle: 'Freunde, Bestenlisten & Profile.',  emoji: '👥', phase: 'Phase 5' },
  }
  const { title, subtitle, emoji, phase } = meta['community']
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Kommt in {phase}.</p>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Wir bauen Phase für Phase – sauber und strukturiert.</p>
      </div>
    </>
  )
}
