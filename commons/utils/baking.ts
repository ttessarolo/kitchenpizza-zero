import type { OvenConfig } from '@commons/types/recipe'
import { BAKING_PROFILES, type BakingProfile } from '../../local_data/baking-profiles'

/**
 * Look up the best matching baking profile for a recipe type/subtype.
 * First tries exact subtype match, then falls back to type-level default (subtype: null).
 */
export function getBakingProfile(
  recipeType: string,
  recipeSubtype: string | null,
): BakingProfile | null {
  const exact = BAKING_PROFILES.find(
    (p) => p.type === recipeType && p.subtype === recipeSubtype,
  )
  if (exact) return exact
  return (
    BAKING_PROFILES.find((p) => p.type === recipeType && p.subtype === null) ??
    null
  )
}

/**
 * Calculate baking duration in minutes based on the baking profile, oven config, and dough thickness.
 */
export function calcBakeDuration(
  profile: BakingProfile,
  ovenCfg: OvenConfig,
  thickness: number,
): number {
  const [tMin, tMax] = profile.timeRange
  const baseTime = (tMin + tMax) / 2

  // Temperature adjustment: inversely proportional to oven temp
  const tempRatio = profile.refTemp / Math.max(ovenCfg.temp, 100)

  // Material thermal factor
  const matFactor = profile.materialFactors[ovenCfg.panType] ?? 1.0

  // Ventilated mode reduces baking time ~15%
  const modeFactor = ovenCfg.ovenMode === 'fan' ? 0.85 : 1.0

  // Thickness adjustment (only for tray-based products with baseThickness > 0)
  let thickFactor = 1.0
  if (profile.baseThickness > 0 && thickness > 0) {
    const delta = (thickness - profile.baseThickness) / 0.1
    thickFactor = 1 + delta * profile.thicknessFactor
  }

  return Math.max(1, Math.round(baseTime * tempRatio * matFactor * modeFactor * thickFactor))
}

// ── Advisory warnings ────────────────────────────────────────

export interface BakingWarning {
  type:
    | 'temp_low'
    | 'temp_high'
    | 'time_mismatch'
    | 'cielo_unusual'
    | 'mode_warning'
    | 'double_bake_hint'
  severity: 'info' | 'warning'
  message: string
}

export function getBakingWarnings(
  ovenCfg: OvenConfig,
  recipeType: string,
  recipeSubtype: string | null,
  calculatedDur: number,
  baseDur: number,
): BakingWarning[] {
  const profile = getBakingProfile(recipeType, recipeSubtype)
  if (!profile) return []

  const warnings: BakingWarning[] = []
  const [tempMin, tempMax] = profile.tempRange
  const [cieloMin, cieloMax] = profile.cieloPctRange

  // Temperature too low
  if (ovenCfg.temp < tempMin) {
    warnings.push({
      type: 'temp_low',
      severity: 'warning',
      message: `Temperatura bassa per questo prodotto. Consigliata: ${tempMin}–${tempMax}°C. Un forno troppo freddo allunga la cottura e può rendere il prodotto secco.`,
    })
  }

  // Temperature too high
  if (ovenCfg.temp > tempMax) {
    warnings.push({
      type: 'temp_high',
      severity: 'warning',
      message: `Temperatura alta per questo prodotto. Consigliata: ${tempMin}–${tempMax}°C. Rischio di bruciatura esterna con interno crudo.`,
    })
  }

  // Cielo/platea balance unusual
  if (ovenCfg.cieloPct < cieloMin) {
    const plateaPct = 100 - ovenCfg.cieloPct
    warnings.push({
      type: 'cielo_unusual',
      severity: 'info',
      message: `Calore concentrato sulla platea (${plateaPct}%). Per questo prodotto è consigliato cielo ${cieloMin}–${cieloMax}%. Attenzione alla base che potrebbe bruciare.`,
    })
  } else if (ovenCfg.cieloPct > cieloMax) {
    warnings.push({
      type: 'cielo_unusual',
      severity: 'info',
      message: `Calore concentrato sul cielo (${ovenCfg.cieloPct}%). Per questo prodotto è consigliato cielo ${cieloMin}–${cieloMax}%. La parte superiore potrebbe colorire troppo.`,
    })
  }

  // Mode warning
  if (
    profile.recommendedModes.length > 0 &&
    !profile.recommendedModes.includes(ovenCfg.ovenMode)
  ) {
    const modesIt: Record<string, string> = {
      static: 'statico',
      fan: 'ventilato',
      steam: 'vapore',
    }
    const rec = profile.recommendedModes.map((m) => modesIt[m] ?? m).join(' o ')
    warnings.push({
      type: 'mode_warning',
      severity: 'info',
      message: `Per questo prodotto è consigliata la modalità ${rec}. La ventilazione può asciugare troppo l'impasto.`,
    })
  }

  // Time mismatch (baseDur vs calculated)
  if (baseDur > 0 && calculatedDur > 0) {
    const ratio = baseDur / calculatedDur
    if (ratio > 1.4) {
      warnings.push({
        type: 'time_mismatch',
        severity: 'warning',
        message: `Il tempo impostato (${baseDur} min) è molto più lungo del tempo calcolato (${calculatedDur} min). Verifica temperatura e parametri.`,
      })
    } else if (ratio < 0.6) {
      warnings.push({
        type: 'time_mismatch',
        severity: 'warning',
        message: `Il tempo impostato (${baseDur} min) è molto più corto del tempo calcolato (${calculatedDur} min). Il prodotto potrebbe risultare crudo all'interno.`,
      })
    }
  }

  // Double bake hint for teglia/pala/pinsa
  if (profile.isPrecottura) {
    warnings.push({
      type: 'double_bake_hint',
      severity: 'info',
      message: `Questo prodotto prevede tipicamente una precottura seguita da una seconda cottura con ingredienti. Considera di aggiungere uno step di precottura separato.`,
    })
  }

  return warnings
}
