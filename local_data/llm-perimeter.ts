export interface LlmPerimeter {
  canDowngrade: boolean
  maxDowngradeSteps: number        // 0=none, 1=one level (error→warning OK), 2=two levels
  canUpgrade: boolean
  maxUpgradeSteps: number
  canDismiss: boolean
  dismissMaxSeverity: 'info' | 'warning' | 'error'
  autoActionMinConfidence: number  // 0-1
  canGenerateInsights: boolean
  logScienceConflicts: boolean
}

export const PERIMETER_PRESETS: Record<string, LlmPerimeter> = {
  openai_mini: {
    canDowngrade: true,
    maxDowngradeSteps: 2,
    canUpgrade: true,
    maxUpgradeSteps: 1,
    canDismiss: true,
    dismissMaxSeverity: 'warning',
    autoActionMinConfidence: 0.65,
    canGenerateInsights: true,
    logScienceConflicts: true,
  },
  large_model: {
    canDowngrade: true,
    maxDowngradeSteps: 2,
    canUpgrade: true,
    maxUpgradeSteps: 2,
    canDismiss: true,
    dismissMaxSeverity: 'error',
    autoActionMinConfidence: 0.6,
    canGenerateInsights: true,
    logScienceConflicts: true,
  },
}

// Active perimeter — mutable, changed via admin UI
let activePresetKey = 'openai_mini'
let activePerimeter: LlmPerimeter = { ...PERIMETER_PRESETS.openai_mini }

export function getActivePerimeter(): LlmPerimeter {
  return activePerimeter
}

export function getActivePresetKey(): string {
  return activePresetKey
}

export function setActivePreset(key: string): void {
  const preset = PERIMETER_PRESETS[key]
  if (preset) {
    activePresetKey = key
    activePerimeter = { ...preset }
  }
}

export function updateActivePerimeter(patch: Partial<LlmPerimeter>): void {
  activePerimeter = { ...activePerimeter, ...patch }
  activePresetKey = 'custom'
}
