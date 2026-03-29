/**
 * Layer subtypes — canonical registry of subtypes and variants for each layer type.
 *
 * Two-level hierarchy for ALL layer types (same pattern as impasto):
 *   layer.subtype  = first level  (tipologia)    — e.g. "sugo"
 *   layer.variant  = second level (sotto-tipologia) — e.g. "arrabbiata"
 */

import type { LayerType } from '../types/recipe-layers'

// ── Subtype entry ────────────────────────────────────────────────

export interface LayerSubtypeEntry {
  key: string
  labelKey: string
  descriptionKey?: string
}

/** Variant entry — second level within a subtype. */
export interface LayerVariantEntry {
  key: string
  labelKey: string
}

// ── First level: subtypes per layer type ─────────────────────────

export const LAYER_SUBTYPES: Record<LayerType, readonly LayerSubtypeEntry[]> = {
  impasto: [
    { key: 'pane', labelKey: 'layer_subtype_impasto_pane' },
    { key: 'pizza', labelKey: 'layer_subtype_impasto_pizza' },
    { key: 'focaccia', labelKey: 'layer_subtype_impasto_focaccia' },
    { key: 'dolce', labelKey: 'layer_subtype_impasto_dolce' },
    { key: 'altro', labelKey: 'layer_subtype_impasto_altro' },
  ],
  sauce: [
    { key: 'sugo', labelKey: 'layer_subtype_sauce_sugo' },
    { key: 'emulsione', labelKey: 'layer_subtype_sauce_emulsione' },
    { key: 'pesto', labelKey: 'layer_subtype_sauce_pesto' },
    { key: 'crema', labelKey: 'layer_subtype_sauce_crema' },
    { key: 'ragu', labelKey: 'layer_subtype_sauce_ragu' },
    { key: 'besciamella', labelKey: 'layer_subtype_sauce_besciamella' },
  ],
  prep: [
    { key: 'topping', labelKey: 'layer_subtype_prep_topping' },
    { key: 'filling', labelKey: 'layer_subtype_prep_filling' },
    { key: 'garnish', labelKey: 'layer_subtype_prep_garnish' },
    { key: 'base', labelKey: 'layer_subtype_prep_base' },
    { key: 'marinade', labelKey: 'layer_subtype_prep_marinade' },
    { key: 'generic', labelKey: 'layer_subtype_prep_generic' },
  ],
  ferment: [
    { key: 'lattofermentazione', labelKey: 'layer_subtype_ferment_lattofermentazione' },
    { key: 'salamoia', labelKey: 'layer_subtype_ferment_salamoia' },
    { key: 'kombucha', labelKey: 'layer_subtype_ferment_kombucha' },
    { key: 'kefir', labelKey: 'layer_subtype_ferment_kefir' },
    { key: 'miso', labelKey: 'layer_subtype_ferment_miso' },
    { key: 'kimchi', labelKey: 'layer_subtype_ferment_kimchi' },
  ],
  pastry: [
    { key: 'cioccolato', labelKey: 'layer_subtype_pastry_cioccolato' },
    { key: 'crema', labelKey: 'layer_subtype_pastry_crema' },
    { key: 'meringa', labelKey: 'layer_subtype_pastry_meringa' },
    { key: 'mousse', labelKey: 'layer_subtype_pastry_mousse' },
    { key: 'glassa', labelKey: 'layer_subtype_pastry_glassa' },
    { key: 'generic', labelKey: 'layer_subtype_pastry_generic' },
  ],
}

// ── Second level: variants per subtype ───────────────────────────
// Key format: "{layerType}:{subtype}" → variant entries
// For impasto, these mirror RECIPE_SUBTYPES from local_data/recipe-types.ts

export const LAYER_SUBTYPE_VARIANTS: Record<string, readonly LayerVariantEntry[]> = {
  // ── Impasto variants (from RECIPE_SUBTYPES) ──
  'impasto:pane': [
    { key: 'pane_comune', labelKey: 'recipe_subtype_pane_comune' },
    { key: 'ciabatta', labelKey: 'recipe_subtype_ciabatta' },
    { key: 'baguette', labelKey: 'recipe_subtype_baguette' },
    { key: 'shokupan', labelKey: 'recipe_subtype_shokupan' },
    { key: 'panino', labelKey: 'recipe_subtype_panino' },
    { key: 'pane_int', labelKey: 'recipe_subtype_pane_int' },
  ],
  'impasto:pizza': [
    { key: 'napoletana', labelKey: 'recipe_subtype_napoletana' },
    { key: 'romana_tonda', labelKey: 'recipe_subtype_romana_tonda' },
    { key: 'teglia_romana', labelKey: 'recipe_subtype_teglia_romana' },
    { key: 'pala', labelKey: 'recipe_subtype_pala' },
    { key: 'pinza', labelKey: 'recipe_subtype_pinza' },
    { key: 'padellino', labelKey: 'recipe_subtype_padellino' },
  ],
  'impasto:focaccia': [
    { key: 'genovese', labelKey: 'recipe_subtype_genovese' },
    { key: 'pugliese', labelKey: 'recipe_subtype_pugliese' },
    { key: 'messinese', labelKey: 'recipe_subtype_messinese' },
    { key: 'focaccia_gen', labelKey: 'recipe_subtype_focaccia_gen' },
  ],
  'impasto:dolce': [
    { key: 'brioche', labelKey: 'recipe_subtype_brioche' },
    { key: 'panettone', labelKey: 'recipe_subtype_panettone' },
    { key: 'colomba', labelKey: 'recipe_subtype_colomba' },
  ],
  'impasto:altro': [
    { key: 'generico', labelKey: 'recipe_subtype_generico' },
  ],

  // ── Sauce variants ──
  'sauce:sugo': [
    { key: 'pomodoro_fresco', labelKey: 'variant_sauce_pomodoro_fresco' },
    { key: 'arrabbiata', labelKey: 'variant_sauce_arrabbiata' },
    { key: 'marinara', labelKey: 'variant_sauce_marinara' },
    { key: 'puttanesca', labelKey: 'variant_sauce_puttanesca' },
    { key: 'sugo_generic', labelKey: 'variant_sauce_sugo_generic' },
  ],
  'sauce:emulsione': [
    { key: 'vinaigrette', labelKey: 'variant_sauce_vinaigrette' },
    { key: 'maionese', labelKey: 'variant_sauce_maionese' },
    { key: 'aioli', labelKey: 'variant_sauce_aioli' },
    { key: 'emulsione_generic', labelKey: 'variant_sauce_emulsione_generic' },
  ],
  'sauce:pesto': [
    { key: 'genovese', labelKey: 'variant_sauce_pesto_genovese' },
    { key: 'siciliano', labelKey: 'variant_sauce_pesto_siciliano' },
    { key: 'rosso', labelKey: 'variant_sauce_pesto_rosso' },
    { key: 'pesto_generic', labelKey: 'variant_sauce_pesto_generic' },
  ],
  'sauce:crema': [
    { key: 'funghi', labelKey: 'variant_sauce_crema_funghi' },
    { key: 'tartufo', labelKey: 'variant_sauce_crema_tartufo' },
    { key: 'zafferano', labelKey: 'variant_sauce_crema_zafferano' },
    { key: 'crema_generic', labelKey: 'variant_sauce_crema_generic' },
  ],
  'sauce:ragu': [
    { key: 'bolognese', labelKey: 'variant_sauce_ragu_bolognese' },
    { key: 'napoletano', labelKey: 'variant_sauce_ragu_napoletano' },
    { key: 'bianco', labelKey: 'variant_sauce_ragu_bianco' },
    { key: 'ragu_generic', labelKey: 'variant_sauce_ragu_generic' },
  ],
  'sauce:besciamella': [
    { key: 'classica', labelKey: 'variant_sauce_besciamella_classica' },
    { key: 'mornay', labelKey: 'variant_sauce_besciamella_mornay' },
    { key: 'soubise', labelKey: 'variant_sauce_besciamella_soubise' },
  ],

  // ── Prep variants ──
  'prep:topping': [
    { key: 'verdure', labelKey: 'variant_prep_topping_verdure' },
    { key: 'formaggi', labelKey: 'variant_prep_topping_formaggi' },
    { key: 'salumi', labelKey: 'variant_prep_topping_salumi' },
    { key: 'frutta', labelKey: 'variant_prep_topping_frutta' },
    { key: 'topping_generic', labelKey: 'variant_prep_topping_generic' },
  ],
  'prep:filling': [
    { key: 'crema', labelKey: 'variant_prep_filling_crema' },
    { key: 'carne', labelKey: 'variant_prep_filling_carne' },
    { key: 'verdure', labelKey: 'variant_prep_filling_verdure' },
    { key: 'formaggio', labelKey: 'variant_prep_filling_formaggio' },
    { key: 'filling_generic', labelKey: 'variant_prep_filling_generic' },
  ],
  'prep:garnish': [
    { key: 'erbe', labelKey: 'variant_prep_garnish_erbe' },
    { key: 'spezie', labelKey: 'variant_prep_garnish_spezie' },
    { key: 'croccante', labelKey: 'variant_prep_garnish_croccante' },
    { key: 'garnish_generic', labelKey: 'variant_prep_garnish_generic' },
  ],
  'prep:base': [
    { key: 'assemblaggio', labelKey: 'variant_prep_base_assemblaggio' },
    { key: 'impiattamento', labelKey: 'variant_prep_base_impiattamento' },
    { key: 'base_generic', labelKey: 'variant_prep_base_generic' },
  ],
  'prep:marinade': [
    { key: 'secca', labelKey: 'variant_prep_marinade_secca' },
    { key: 'umida', labelKey: 'variant_prep_marinade_umida' },
    { key: 'acida', labelKey: 'variant_prep_marinade_acida' },
    { key: 'marinade_generic', labelKey: 'variant_prep_marinade_generic' },
  ],
  'prep:generic': [
    { key: 'prep_generic', labelKey: 'variant_prep_generic' },
  ],

  // ── Ferment variants ──
  'ferment:lattofermentazione': [
    { key: 'crauti', labelKey: 'variant_ferment_crauti' },
    { key: 'cetrioli', labelKey: 'variant_ferment_cetrioli' },
    { key: 'verdure_miste', labelKey: 'variant_ferment_verdure_miste' },
    { key: 'latto_generic', labelKey: 'variant_ferment_latto_generic' },
  ],
  'ferment:salamoia': [
    { key: 'olive', labelKey: 'variant_ferment_olive' },
    { key: 'capperi', labelKey: 'variant_ferment_capperi' },
    { key: 'salamoia_verdure', labelKey: 'variant_ferment_salamoia_verdure' },
    { key: 'salamoia_generic', labelKey: 'variant_ferment_salamoia_generic' },
  ],
  'ferment:kombucha': [
    { key: 'te_nero', labelKey: 'variant_ferment_te_nero' },
    { key: 'te_verde', labelKey: 'variant_ferment_te_verde' },
    { key: 'infuso', labelKey: 'variant_ferment_infuso' },
  ],
  'ferment:kefir': [
    { key: 'latte', labelKey: 'variant_ferment_kefir_latte' },
    { key: 'acqua', labelKey: 'variant_ferment_kefir_acqua' },
  ],
  'ferment:miso': [
    { key: 'shiro', labelKey: 'variant_ferment_miso_shiro' },
    { key: 'aka', labelKey: 'variant_ferment_miso_aka' },
    { key: 'genmai', labelKey: 'variant_ferment_miso_genmai' },
  ],
  'ferment:kimchi': [
    { key: 'baechu', labelKey: 'variant_ferment_kimchi_baechu' },
    { key: 'kkakdugi', labelKey: 'variant_ferment_kimchi_kkakdugi' },
    { key: 'nabak', labelKey: 'variant_ferment_kimchi_nabak' },
  ],

  // ── Pastry variants (from science catalogs) ──
  'pastry:cioccolato': [
    { key: 'fondente', labelKey: 'variant_pastry_cioccolato_fondente' },
    { key: 'latte', labelKey: 'variant_pastry_cioccolato_latte' },
    { key: 'bianco', labelKey: 'variant_pastry_cioccolato_bianco' },
  ],
  'pastry:crema': [
    { key: 'pasticcera', labelKey: 'variant_pastry_crema_pasticcera' },
    { key: 'diplomatica', labelKey: 'variant_pastry_crema_diplomatica' },
    { key: 'inglese', labelKey: 'variant_pastry_crema_inglese' },
    { key: 'crema_generic', labelKey: 'variant_pastry_crema_generic' },
  ],
  'pastry:meringa': [
    { key: 'francese', labelKey: 'variant_pastry_meringa_francese' },
    { key: 'italiana', labelKey: 'variant_pastry_meringa_italiana' },
    { key: 'svizzera', labelKey: 'variant_pastry_meringa_svizzera' },
  ],
  'pastry:mousse': [
    { key: 'cioccolato', labelKey: 'variant_pastry_mousse_cioccolato' },
    { key: 'frutta', labelKey: 'variant_pastry_mousse_frutta' },
    { key: 'vaniglia', labelKey: 'variant_pastry_mousse_vaniglia' },
    { key: 'mousse_generic', labelKey: 'variant_pastry_mousse_generic' },
  ],
  'pastry:glassa': [
    { key: 'specchio', labelKey: 'variant_pastry_glassa_specchio' },
    { key: 'reale', labelKey: 'variant_pastry_glassa_reale' },
    { key: 'fondente', labelKey: 'variant_pastry_glassa_fondente' },
  ],
  'pastry:generic': [
    { key: 'pastry_generic', labelKey: 'variant_pastry_generic' },
  ],
}

// ── Utility functions ────────────────────────────────────────────

/** Get the default (first) subtype for a layer type. */
export function getDefaultSubtype(layerType: LayerType): string {
  return LAYER_SUBTYPES[layerType][0].key
}

/** Get the i18n label key for a specific subtype. */
export function getSubtypeLabelKey(layerType: LayerType, subtype: string): string {
  const entry = LAYER_SUBTYPES[layerType].find((e) => e.key === subtype)
  return entry?.labelKey ?? subtype
}

/** Get all variants for a type+subtype combo. */
export function getVariants(layerType: LayerType, subtype: string): readonly LayerVariantEntry[] {
  return LAYER_SUBTYPE_VARIANTS[`${layerType}:${subtype}`] ?? []
}

/** Get the default (first) variant for a type+subtype combo. */
export function getDefaultVariant(layerType: LayerType, subtype: string): string {
  const variants = getVariants(layerType, subtype)
  return variants[0]?.key ?? ''
}

/** Get the i18n label key for a specific variant. */
export function getVariantLabelKey(layerType: LayerType, subtype: string, variant: string): string {
  const variants = getVariants(layerType, subtype)
  const entry = variants.find((e) => e.key === variant)
  return entry?.labelKey ?? variant
}
