import type { UiSlice } from './slices/ui'
import type { VersionSlice } from './slices/version'

// Note: locale has its own dedicated Zustand store (app/hooks/useTranslation.ts)
// separate from AppState to avoid persist+immer+SSR hydration issues.
export interface AppState extends UiSlice, VersionSlice {}
