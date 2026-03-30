/**
 * Theme hook — dark/light mode via dedicated Zustand store.
 *
 * Uses a SEPARATE Zustand store (same pattern as useTranslation)
 * to avoid issues with persist middleware + skipHydration + SSR.
 *
 * useTheme()       — returns current theme ('dark' | 'light')
 * useToggleTheme() — returns toggle function
 */

import { create } from 'zustand'
import { useEffect } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}))

export function useTheme(): Theme {
  return useThemeStore((s) => s.theme)
}

export function useToggleTheme(): () => void {
  const setTheme = useThemeStore((s) => s.setTheme)
  const theme = useThemeStore((s) => s.theme)
  return () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark')
      localStorage.setItem('theme', next)
    }
  }
}

/**
 * Call once in root layout to sync theme from localStorage on mount.
 * The inline <script> in <head> handles FOUC prevention (sets class before paint).
 * This hook syncs the Zustand store to match.
 */
export function useSyncThemeFromStorage() {
  const setTheme = useThemeStore((s) => s.setTheme)
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const resolved = stored === 'light' ? 'light' : 'dark'
    setTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [setTheme])
}
