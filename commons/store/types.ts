import type { UiSlice } from './slices/ui'
import type { VersionSlice } from './slices/version'
import type { LocaleSlice } from './slices/locale'

export interface AppState extends UiSlice, VersionSlice, LocaleSlice {}
