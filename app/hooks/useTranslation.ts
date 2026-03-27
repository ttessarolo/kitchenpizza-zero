/**
 * i18n hooks — reactive translation via dedicated Zustand store.
 *
 * Uses a SEPARATE Zustand store (not the main app store) to avoid
 * issues with persist middleware + skipHydration + SSR.
 *
 * useLocale() — returns current locale ('en' | 'it')
 * useSetLocale() — returns setter that updates store + cookie
 * useT() — returns t(key, vars?) reactive translation function
 */

import { create } from 'zustand'
import { useCallback } from 'react'

// Static imports — all namespaces merged per locale
import commonEn from '@commons/i18n/en/common.json'
import commonIt from '@commons/i18n/it/common.json'
import recipeEn from '@commons/i18n/en/recipe.json'
import recipeIt from '@commons/i18n/it/recipe.json'
import scienceEn from '@commons/i18n/en/science.json'
import scienceIt from '@commons/i18n/it/science.json'

export type SupportedLocale = 'en' | 'it'

type Dict = Record<string, string>

const messages: Record<SupportedLocale, Dict> = {
  en: { ...commonEn, ...recipeEn, ...scienceEn } as Dict,
  it: { ...commonIt, ...recipeIt, ...scienceIt } as Dict,
}

// ── Dedicated locale store (no persist/immer middleware, no SSR issues) ──

interface LocaleStore {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

function getInitialLocale(): SupportedLocale {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/PARAGLIDE_LOCALE=(\w+)/)
    if (match?.[1] === 'en' || match?.[1] === 'it') return match[1]
  }
  return 'it'
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    set({ locale })
    // Persist to cookie (side effect for SSR + page reloads)
    if (typeof document !== 'undefined') {
      document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
  },
}))

// ── Public hooks ───────────────────────────────────────────────

/** Get the current locale. Reactive — triggers re-render on change. */
export function useLocale(): SupportedLocale {
  return useLocaleStore((s) => s.locale)
}

/** Get the setLocale function. */
export function useSetLocale() {
  return useLocaleStore((s) => s.setLocale)
}

/**
 * Returns a translation function t(key, vars?).
 * Reactive — re-renders when locale changes.
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale)

  return useCallback(
    (key: string, vars?: Record<string, unknown>): string => {
      const dict = messages[locale] ?? messages.it
      const template = dict[key] ?? messages.en[key] ?? key
      if (!vars) return template
      return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
        const v = vars[k]
        return v !== undefined && v !== null ? String(v) : ''
      })
    },
    [locale],
  )
}

/**
 * Get all messages for a locale (for non-React contexts).
 */
export function getMessages(locale: SupportedLocale): Dict {
  return messages[locale] ?? messages.it
}
