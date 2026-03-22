import type { UiSlice } from './slices/ui'
import type { VersionSlice } from './slices/version'

export interface AppState extends UiSlice, VersionSlice {}
