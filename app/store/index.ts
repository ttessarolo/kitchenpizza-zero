import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AppState } from '@commons'
import { createUiSlice, createVersionSlice } from '@commons'

// Note: locale has its own dedicated store in app/hooks/useTranslation.ts
// (separate from persist+immer to avoid SSR hydration issues)

export const useAppStore = create<AppState>()(
  persist(
    immer((...a) => ({
      ...createUiSlice(...a),
      ...createVersionSlice(...a),
    })),
    {
      name: 'kitchenpizza-store',
      skipHydration: true,
      partialize: (state) => ({
        collapsedSections: state.collapsedSections,
      }),
    },
  ),
)
