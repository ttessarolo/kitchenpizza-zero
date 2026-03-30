/**
 * Layer defaults — metadata, default configs, and the canonical list of layer types.
 */

import type { LayerType, MasterConfig } from '../types/recipe-layers'

// ── Layer type metadata ──────────────────────────────────────────

export interface LayerTypeMeta {
  icon: string
  defaultColor: string
  labelKey: string
  descriptionKey: string
  disabled?: boolean
}

export const LAYER_TYPE_META: Record<LayerType, LayerTypeMeta> = {
  impasto: {
    icon: 'wheat',
    defaultColor: '#D97706',
    labelKey: 'layer_type_impasto',
    descriptionKey: 'layer_type_impasto_desc',
  },
  sauce: {
    icon: 'droplet',
    defaultColor: '#DC2626',
    labelKey: 'layer_type_sauce',
    descriptionKey: 'layer_type_sauce_desc',
  },
  prep: {
    icon: 'utensils',
    defaultColor: '#16A34A',
    labelKey: 'layer_type_prep',
    descriptionKey: 'layer_type_prep_desc',
  },
  ferment: {
    icon: 'flask-conical',
    defaultColor: '#7C3AED',
    labelKey: 'layer_type_ferment',
    descriptionKey: 'layer_type_ferment_desc',
    disabled: true,
  },
  pastry: {
    icon: 'cake-slice',
    defaultColor: '#EC4899',
    labelKey: 'layer_type_pastry',
    descriptionKey: 'layer_type_pastry_desc',
    disabled: true,
  },
}

// ── Canonical layer type list ────────────────────────────────────

export const LAYER_TYPES: readonly LayerType[] = [
  'impasto', 'sauce', 'prep', 'ferment', 'pastry',
] as const

// ── Default master config factory ────────────────────────────────

/**
 * Returns a deep-copied default MasterConfig for the given layer type.
 *
 * Impasto defaults match the canonical test portioning values
 * (see tests/synthetic_data/helpers.ts makeDefaultPortioning).
 */
export function getDefaultMasterConfig(layerType: LayerType, subtype?: string): MasterConfig {
  switch (layerType) {
    case 'impasto':
      return {
        type: 'impasto',
        config: {
          mode: 'ball',
          tray: { preset: 't', l: 40, w: 30, h: 2, material: 'alu', griglia: false, count: 1 },
          ball: { weight: 250, count: 4 },
          thickness: 0.5,
          targetHyd: 65,
          doughHours: 18,
          yeastPct: 0.22,
          saltPct: 2.3,
          fatPct: 3,
          preImpasto: null,
          preFermento: null,
          flourMix: [],
          autoCorrect: false,
          reasoningLevel: 'medium',
        },
      }
    case 'sauce':
      return {
        type: 'sauce',
        config: {
          sauceType: subtype ?? 'sugo',
          targetVolume: 500,
          targetConsistency: 'medium',
          serving: 4,
          shelfLife: 3,
        },
      }
    case 'prep':
      return {
        type: 'prep',
        config: {
          prepType: subtype ?? 'generic',
          servings: 4,
          yield: 500,
        },
      }
    case 'ferment':
      return {
        type: 'ferment',
        config: {
          fermentType: subtype ?? 'lattofermentazione',
          saltPercentage: 2.5,
          targetPH: 4.0,
          temperature: 22,
          duration: 72,
          vessel: 'jar',
        },
      }
    case 'pastry':
      return {
        type: 'pastry',
        config: {
          pastryType: subtype ?? 'crema',
          targetWeight: 500,
          servings: 6,
          temperatureNotes: '',
        },
      }
  }
}
