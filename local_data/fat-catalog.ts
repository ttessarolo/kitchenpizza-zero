export interface FatType {
  key: string
  label: string
  fermentEffect: number
  waterContent: number
  isLiquid: boolean
}

export const FAT_TYPES: FatType[] = [
  { key: 'olio_evo', label: 'Olio Extra Vergine', fermentEffect: 1.05, waterContent: 0, isLiquid: true },
  { key: 'olio_semi', label: 'Olio di Semi', fermentEffect: 1.05, waterContent: 0, isLiquid: true },
  { key: 'burro', label: 'Burro', fermentEffect: 1.08, waterContent: 15, isLiquid: false },
  { key: 'strutto', label: 'Strutto', fermentEffect: 1.06, waterContent: 0, isLiquid: false },
  { key: 'margarina', label: 'Margarina', fermentEffect: 1.07, waterContent: 16, isLiquid: false },
  { key: 'lecitina', label: 'Lecitina di Girasole', fermentEffect: 1.0, waterContent: 0, isLiquid: false },
]
