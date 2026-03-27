export interface SaltType {
  key: string
  labelKey: string
}

export interface SugarType {
  key: string
  labelKey: string
  sweetnessFactor: number
  fermentEffect: number
}

export const SALT_TYPES: SaltType[] = [
  { key: 'sale_fino', labelKey: 'salt_sale_fino' },
  { key: 'sale_marino', labelKey: 'salt_sale_marino' },
  { key: 'sale_maldon', labelKey: 'salt_sale_maldon' },
  { key: 'sale_himalaya', labelKey: 'salt_sale_himalaya' },
]

export const SUGAR_TYPES: SugarType[] = [
  { key: 'zucchero', labelKey: 'sugar_zucchero', sweetnessFactor: 1.0, fermentEffect: 1.0 },
  { key: 'zucchero_canna', labelKey: 'sugar_zucchero_canna', sweetnessFactor: 0.95, fermentEffect: 1.0 },
  { key: 'miele', labelKey: 'sugar_miele', sweetnessFactor: 1.3, fermentEffect: 1.1 },
  { key: 'malto_d', labelKey: 'sugar_malto_d', sweetnessFactor: 0.3, fermentEffect: 1.15 },
  { key: 'malto_nd', labelKey: 'sugar_malto_nd', sweetnessFactor: 0.5, fermentEffect: 1.0 },
  { key: 'sciroppo_malto', labelKey: 'sugar_sciroppo_malto', sweetnessFactor: 0.6, fermentEffect: 1.05 },
]
