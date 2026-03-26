export interface FatType {
  key: string
  label: string
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
  { key: 'olio_evo', label: 'Olio Extra Vergine', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: false, smokePoint: 190 },
  { key: 'olio_semi', label: 'Olio di Semi (generico)', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },

  // ── Oli per frittura ───────────────────────────────────────────
  { key: 'olio_arachidi', label: 'Olio di Arachidi', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },
  { key: 'olio_girasole', label: 'Olio di Girasole', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },
  { key: 'olio_mais', label: 'Olio di Mais', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 230 },
  { key: 'olio_canola', label: 'Olio di Canola', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 205 },
  { key: 'olio_cartamo', label: 'Olio di Cartamo', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 265 },
  { key: 'olio_cotone', label: 'Olio di Semi di Cotone', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 215 },
  { key: 'olio_avocado', label: 'Olio di Avocado', fermentEffect: 1.05, waterContent: 0, isLiquid: true, fryable: true, smokePoint: 270 },

  // ── Grassi solidi ──────────────────────────────────────────────
  { key: 'burro', label: 'Burro', fermentEffect: 1.08, waterContent: 15, isLiquid: false, fryable: false, smokePoint: 150 },
  { key: 'burro_chiarificato', label: 'Burro Chiarificato (Ghee)', fermentEffect: 1.06, waterContent: 0, isLiquid: false, fryable: true, smokePoint: 250 },
  { key: 'strutto', label: 'Strutto', fermentEffect: 1.06, waterContent: 0, isLiquid: false, fryable: true, smokePoint: 190 },
  { key: 'margarina', label: 'Margarina', fermentEffect: 1.07, waterContent: 16, isLiquid: false, fryable: false, smokePoint: 150 },
  { key: 'lecitina', label: 'Lecitina di Girasole', fermentEffect: 1.0, waterContent: 0, isLiquid: false, fryable: false },
]
