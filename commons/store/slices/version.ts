import type { StateCreator } from 'zustand'
import type { AppState } from '../types'

export interface VersionSlice {
  appVersion: string
  setAppVersion: (version: string) => void
}

export const createVersionSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  VersionSlice
> = (set) => ({
  appVersion: '0.0.0',
  setAppVersion: (version) =>
    set((state) => {
      state.appVersion = version
    }),
})
