import type { StateCreator } from 'zustand'
import type { AppState } from '../types'

export type SupportedLocale = 'en' | 'it'

export interface LocaleSlice {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

export const createLocaleSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  LocaleSlice
> = (set) => ({
  locale: 'it',
  setLocale: (locale) =>
    set((state) => {
      state.locale = locale
    }),
})
