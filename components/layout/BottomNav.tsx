'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, Apple, BarChart3, Users } from 'lucide-react'

const NAV = [
  { href: '/start',     Icon: Home,     label: 'Start' },
  { href: '/workout',   Icon: Dumbbell,  label: 'Workout' },
  { href: '/essen',     Icon: Apple,     label: 'Essen' },
  { href: '/stats',     Icon: BarChart3, label: 'Stats' },
  { href: '/community', Icon: Users,     label: 'Community' },
]

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, Icon, label }) => {
        const active = path.startsWith(href)
        return (
          <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
