'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, Apple, BarChart3, Users, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const NAV = [
  { href: '/start', icon: Home, label: 'Start' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/essen', icon: Apple, label: 'Essen' },
  { href: '/stats', icon: BarChart3, label: 'Stats' },
  { href: '/community', icon: Users, label: 'Community' },
]

export default function BottomNav() {
  const path = usePathname()
  const { isDark, toggle } = useTheme()

  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = path.startsWith(href)
        return (
          <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
      {/* Dark/Light toggle as last item */}
      <button
        onClick={toggle}
        className="nav-item"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {isDark
          ? <Sun size={22} strokeWidth={1.8} />
          : <Moon size={22} strokeWidth={1.8} />}
        <span>{isDark ? 'Hell' : 'Dunkel'}</span>
      </button>
    </nav>
  )
}
