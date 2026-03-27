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
import { useCallback, useEffect } from 'react'

// Static imports — all namespaces merged per locale
import commonEn from '@commons/i18n/en/common.json'
import commonIt from '@commons/i18n/it/common.json'
import recipeEn from '@commons/i18n/en/recipe.json'
import recipeIt from '@commons/i18n/it/recipe.json'
import scienceEn from '@commons/i18n/en/science.json'
import scienceIt from '@commons/i18n/it/science.json'
import catalogEn from '@commons/i18n/en/catalog.json'
import catalogIt from '@commons/i18n/it/catalog.json'

export type SupportedLocale = 'en' | 'it'

type Dict = Record<string, string>

const messages: Record<SupportedLocale, Dict> = {
  en: { ...commonEn, ...recipeEn, ...scienceEn, ...catalogEn } as Dict,
  it: { ...commonIt, ...recipeIt, ...scienceIt, ...catalogIt } as Dict,
}

// ── Dedicated locale store (no persist/immer middleware, no SSR issues) ──

interface LocaleStore {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

// Always start with 'it' to match SSR output (avoids hydration mismatch).
// Cookie sync happens in useEffect after hydration (see useSyncLocaleFromCookie).
export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: 'it',
  setLocale: (locale) => {
    set({ locale })
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

/**
 * Sync locale from cookie AFTER hydration.
 * Call once in the root component to restore the user's language preference
 * without causing SSR hydration mismatches.
 */
export function useSyncLocaleFromCookie() {
  useEffect(() => {
    const match = document.cookie.match(/PARAGLIDE_LOCALE=(\w+)/)
    const cookieLocale = match?.[1]
    if (cookieLocale === 'en' || cookieLocale === 'it') {
      const current = useLocaleStore.getState().locale
      if (cookieLocale !== current) {
        useLocaleStore.getState().setLocale(cookieLocale)
      }
    }
  }, [])
}
