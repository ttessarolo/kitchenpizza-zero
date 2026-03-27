export interface FatType {
  key: string
  labelKey: string
  fermentEffect: number
  waterContent: number
  isLiquid: boolean
  /** Whether this fat is suitable for frying (high smoke point). */
  fryable: boolean
  /** Smoke point in °C (informative). */
  smokePoint?: number
}

export const FAT_TYPES: FatType[] = [
  // ── Oli da impasto ─────────────────────────────────────────────
  { key: 'olio_evo', labelKey: 'fat_olio_evo', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: false, smokePoint: 190 },
  { key: 'olio_semi', labelKey: 'fat_olio_semi', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },

  // ── Oli per frittura ───────────────────────────────────────────
  { key: 'olio_arachidi', labelKey: 'fat_olio_arachidi', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },
  { key: 'olio_girasole', labelKey: 'fat_olio_girasole', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },
  { key: 'olio_mais', labelKey: 'fat_olio_mais', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },
  { key: 'olio_canola', labelKey: 'fat_olio_canola', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 205 },
  { key: 'olio_cartamo', labelKey: 'fat_olio_cartamo', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 265 },
  { key: 'olio_cotone', labelKey: 'fat_olio_cotone', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 215 },
  { key: 'olio_avocado', labelKey: 'fat_olio_avocado', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 270 },

  // ── Grassi solidi ──────────────────────────────────────────────
  { key: 'burro', labelKey: 'fat_burro', fermentEffect: 1.08, waterContent: 15, isLiquid: false, fryable: false, smokePoint: 150 },
  { key: 'burro_chiarificato', labelKey: 'fat_burro_chiarificato', fermentEffect: 1.06, waterContent: 0, isLiquid: false, fryable: true, smokePoint: 250 },
  { key: 'strutto', labelKey: 'fat_strutto', fermentEffect: 1.06, waterContent: 0, isLiquid: false, fryable: true, smokePoint: 190 },
  { key: 'margarina', labelKey: 'fat_margarina', fermentEffect: 1.07, waterContent: 16, isLiquid: false, fryable: false, smokePoint: 150 },
  { key: 'lecitina', labelKey: 'fat_lecitina', fermentEffect: 1.0, waterContent: 0, isLiquid: false, fryable: false },
]
