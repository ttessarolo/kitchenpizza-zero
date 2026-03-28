import type { StateCreator } from 'zustand'

export type SupportedLocale = 'en' | 'it'

export interface LocaleSlice {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

export const createLocaleSlice: StateCreator<
  LocaleSlice,
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
