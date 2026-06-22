'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx {
    theme: Theme
    toggle: () => void
    isDark: boolean
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => { }, isDark: true })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark')

    useEffect(() => {
        const saved = localStorage.getItem('liftoff-theme') as Theme | null
        if (saved) setTheme(saved)
    }, [])

    useEffect(() => {
        localStorage.setItem('liftoff-theme', theme)
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    function toggle() {
        setTheme(t => t === 'dark' ? 'light' : 'dark')
    }

    return (
        <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
