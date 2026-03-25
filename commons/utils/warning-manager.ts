/**
 * Centralized recipe warning manager.
 * Evaluates dough composition, baking parameters, and flour properties
 * against known good ranges from baking literature.
 */

import { getDoughDefaults } from '../../local_data/dough-defaults'

export interface RecipeWarning {
  id: string
  category: 'yeast' | 'salt' | 'fat' | 'hydration' | 'temp' | 'baking' | 'flour' | 'general'
  severity: 'info' | 'warning' | 'error'
  message: string
}

interface DoughProfileInput {
  doughHours: number
  yeastPct: number
  saltPct: number
  fatPct: number
  hydration: number
  recipeType: string
  recipeSubtype: string | null
}

/**
 * Get all warnings for the current dough composition profile.
 */
export function getDoughWarnings(profile: DoughProfileInput): RecipeWarning[] {
  const warnings: RecipeWarning[] = []
  const defaults = getDoughDefaults(profile.recipeType, profile.recipeSubtype)

  // ── Yeast warnings ──
  if (profile.yeastPct > 0) {
    if (profile.yeastPct < 0.03) {
      warnings.push({
        id: 'yeast_too_low',
        category: 'yeast',
        severity: 'error',
        message: `Lievito troppo basso (${profile.yeastPct}%). Rischio di non lievitazione. Min consigliato: 0.03%.`,
      })
    } else if (profile.yeastPct > 3.5) {
      warnings.push({
        id: 'yeast_too_high',
        category: 'yeast',
        severity: 'warning',
        message: `Lievito molto alto (${profile.yeastPct}%). Rischio di sapore sgradevole e over-proofing rapido. Max consigliato: 3.5%.`,
      })
    }
  }

  // ── Salt warnings ──
  if (profile.saltPct < defaults.saltPctRange[0]) {
    warnings.push({
      id: 'salt_low',
      category: 'salt',
      severity: 'warning',
      message: `Sale basso (${profile.saltPct}%) per ${defaults.type}. Range consigliato: ${defaults.saltPctRange[0]}–${defaults.saltPctRange[1]}%. Impasto potrebbe risultare debole.`,
    })
  } else if (profile.saltPct > defaults.saltPctRange[1]) {
    warnings.push({
      id: 'salt_high',
      category: 'salt',
      severity: 'warning',
      message: `Sale alto (${profile.saltPct}%) per ${defaults.type}. Range consigliato: ${defaults.saltPctRange[0]}–${defaults.saltPctRange[1]}%. Inibisce il lievito e risultato troppo salato.`,
    })
  }
  if (profile.saltPct > 3.0) {
    warnings.push({
      id: 'salt_extreme',
      category: 'salt',
      severity: 'error',
      message: `Sale molto alto (${profile.saltPct}%). Oltre il 3% il lievito viene fortemente inibito.`,
    })
  }

  // ── Fat warnings ──
  if (profile.fatPct > defaults.fatPctRange[1]) {
    warnings.push({
      id: 'fat_high',
      category: 'fat',
      severity: 'warning',
      message: `Grassi alti (${profile.fatPct}%) per ${defaults.type}. Range consigliato: ${defaults.fatPctRange[0]}–${defaults.fatPctRange[1]}%.`,
    })
  }
  if (profile.fatPct > 12 && defaults.type !== 'dolce') {
    warnings.push({
      id: 'fat_extreme',
      category: 'fat',
      severity: 'warning',
      message: `Grassi oltre il 12% rallentano fortemente il lievito. Richiede tecnica speciale (aggiunta in più fasi).`,
    })
  }

  // ── Hydration warnings ──
  if (profile.hydration > 90) {
    warnings.push({
      id: 'hyd_extreme',
      category: 'hydration',
      severity: 'warning',
      message: `Idratazione molto alta (${profile.hydration}%). Richiede farine molto forti (W > 350) e tecnica avanzata.`,
    })
  } else if (profile.hydration < 45) {
    warnings.push({
      id: 'hyd_low',
      category: 'hydration',
      severity: 'info',
      message: `Idratazione bassa (${profile.hydration}%). L'impasto sarà molto rigido.`,
    })
  }

  // ── Duration warnings ──
  if (profile.doughHours > 72) {
    warnings.push({
      id: 'hours_extreme',
      category: 'general',
      severity: 'info',
      message: `Durata impasto molto lunga (${profile.doughHours}h). Necessita tecnica del freddo e farine forti.`,
    })
  }

  return warnings
}
