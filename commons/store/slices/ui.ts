import type { StateCreator } from 'zustand'
import type { AppState } from '../types'

export interface UiSlice {
  collapsedSections: Record<string, boolean>
  toggleSection: (id: string) => void
  setCollapsed: (id: string, collapsed: boolean) => void
}

export const createUiSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  UiSlice
> = (set) => ({
  collapsedSections: {},
  toggleSection: (id) =>
    set((state) => {
      state.collapsedSections[id] = !state.collapsedSections[id]
    }),
  setCollapsed: (id, collapsed) =>
    set((state) => {
      state.collapsedSections[id] = collapsed
    }),
})
