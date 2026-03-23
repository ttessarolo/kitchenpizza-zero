export interface SaltType {
  key: string
  label: string
}

export interface SugarType {
  key: string
  label: string
  sweetnessFactor: number
  fermentEffect: number
}

export const SALT_TYPES: SaltType[] = [
  { key: 'sale_fino', label: 'Sale Fino' },
  { key: 'sale_marino', label: 'Sale Marino Grosso' },
  { key: 'sale_maldon', label: 'Sale Maldon' },
  { key: 'sale_himalaya', label: 'Sale Rosa Himalaya' },
]

export const SUGAR_TYPES: SugarType[] = [
  { key: 'zucchero', label: 'Zucchero Semolato', sweetnessFactor: 1.0, fermentEffect: 1.0 },
  { key: 'zucchero_canna', label: 'Zucchero di Canna', sweetnessFactor: 0.95, fermentEffect: 1.0 },
  { key: 'miele', label: 'Miele', sweetnessFactor: 1.3, fermentEffect: 1.1 },
  { key: 'malto_d', label: 'Malto Diastatico', sweetnessFactor: 0.3, fermentEffect: 1.15 },
  { key: 'malto_nd', label: 'Malto Non-Diastatico', sweetnessFactor: 0.5, fermentEffect: 1.0 },
  { key: 'sciroppo_malto', label: 'Sciroppo di Malto', sweetnessFactor: 0.6, fermentEffect: 1.05 },
]
