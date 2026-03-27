import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AppState } from '@commons'
import { createUiSlice, createVersionSlice } from '@commons'
import { createLocaleSlice } from '@commons/store/slices/locale'

export const useAppStore = create<AppState>()(
  persist(
    immer((...a) => ({
      ...createUiSlice(...a),
      ...createVersionSlice(...a),
      ...createLocaleSlice(...a),
    })),
    {
      name: 'kitchenpizza-store',
      skipHydration: true,
      partialize: (state) => ({
        collapsedSections: state.collapsedSections,
        locale: state.locale,
      }),
    },
  ),
)
