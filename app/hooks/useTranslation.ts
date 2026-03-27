/**
 * i18n hooks — reactive translation via Zustand locale slice.
 *
 * useLocale() — returns current locale ('en' | 'it')
 * useT() — returns t(key, vars?) function that resolves to localized text
 *
 * All translations are statically imported (zero runtime fetch).
 * Changing locale in Zustand triggers re-render of all consumers.
 */

import { useAppStore } from '~/store'
import type { SupportedLocale } from '@commons/store/slices/locale'

// Static imports — all namespaces merged per locale
import commonEn from '@commons/i18n/en/common.json'
import commonIt from '@commons/i18n/it/common.json'
import recipeEn from '@commons/i18n/en/recipe.json'
import recipeIt from '@commons/i18n/it/recipe.json'
import scienceEn from '@commons/i18n/en/science.json'
import scienceIt from '@commons/i18n/it/science.json'

type Dict = Record<string, string>

const messages: Record<SupportedLocale, Dict> = {
  en: { ...commonEn, ...recipeEn, ...scienceEn } as Dict,
  it: { ...commonIt, ...recipeIt, ...scienceIt } as Dict,
}

/** Get the current locale from Zustand store. */
export function useLocale(): SupportedLocale {
  return useAppStore((s) => s.locale)
}

/** Get the setLocale function from Zustand store. */
export function useSetLocale() {
  return useAppStore((s) => s.setLocale)
}

/**
 * Returns a translation function t(key, vars?).
 * Reactive — re-renders when locale changes in the store.
 *
 * @example
 * const t = useT()
 * t('nav_home') // → "Home" or "Home" depending on locale
 * t('warning.yeast_too_low', { yeastPct: 0.01 }) // → interpolated
 */
export function useT() {
  const locale = useAppStore((s) => s.locale)
  const dict = messages[locale] ?? messages.it

  return (key: string, vars?: Record<string, unknown>): string => {
    const template = dict[key] ?? messages.en[key] ?? key
    if (!vars) return template
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = vars[k]
      return v !== undefined && v !== null ? String(v) : ''
    })
  }
}

/**
 * Get all messages for a locale (for non-React contexts like Science provider).
 */
export function getMessages(locale: SupportedLocale): Dict {
  return messages[locale] ?? messages.it
}
