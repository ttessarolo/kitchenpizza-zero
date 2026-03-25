/**
 * All advisory rules — declarative, data-driven.
 *
 * Each rule defines conditions to appear, conditions to NOT appear (excludeIf),
 * and rules that suppress it (suppressedBy).
 *
 * Scientific basis: Casucci "La Pizza è un Arte" (2020), PizzaBlab, King Arthur, ScienceDirect.
 */

import type { AdvisoryRule, AdvisoryContext } from './advisory-manager'

export const ADVISORY_RULES: AdvisoryRule[] = [

  // ═══════════════════════════════════════════════════════════════
  // BAKING — Temperature
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'temp_low',
    category: 'temp',
    severity: 'warning',
    message: (ctx) => `Temperatura bassa per questo prodotto. Consigliata: ${ctx._tempMin}–${ctx._tempMax}°C.`,
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.temp', op: 'lt', value: '_tempMin' },
    ],
    actions: (ctx) => [{
      label: `Imposta ${ctx._suggestedTemp}°C`,
      mutations: [{ type: 'updateNode', target: { ref: 'self' }, patch: { ovenCfg: { ...(ctx.ovenCfg || {}), temp: ctx._suggestedTemp } } }],
    }],
  },
  {
    id: 'temp_high',
    category: 'temp',
    severity: 'warning',
    message: (ctx) => `Temperatura alta per questo prodotto. Consigliata: ${ctx._tempMin}–${ctx._tempMax}°C.`,
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.temp', op: 'gt', value: '_tempMax' },
    ],
    actions: (ctx) => [{
      label: `Imposta ${ctx._suggestedTemp}°C`,
      mutations: [{ type: 'updateNode', target: { ref: 'self' }, patch: { ovenCfg: { ...(ctx.ovenCfg || {}), temp: ctx._suggestedTemp } } }],
    }],
  },

  // ═══════════════════════════════════════════════════════════════
  // BAKING — Cielo/Platea
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'cielo_too_low',
    category: 'baking',
    severity: 'info',
    message: (ctx) => `Calore concentrato sulla platea (${100 - (ctx.ovenCfg?.cieloPct ?? 50)}%). Consigliato cielo ${ctx._cieloMin}–${ctx._cieloMax}%.`,
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.cieloPct', op: 'lt', value: '_cieloMin' },
    ],
  },
  {
    id: 'cielo_too_high',
    category: 'baking',
    severity: 'info',
    message: (ctx) => `Calore concentrato sul cielo (${ctx.ovenCfg?.cieloPct}%). Consigliato cielo ${ctx._cieloMin}–${ctx._cieloMax}%.`,
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.cieloPct', op: 'gt', value: '_cieloMax' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // BAKING — Mode
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'mode_not_recommended',
    category: 'baking',
    severity: 'info',
    message: 'La ventilazione può asciugare troppo l\'impasto. Considera la modalità statico o vapore.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.ovenMode', op: 'eq', value: 'fan' },
    ],
    excludeIf: [
      { field: 'recipeType', op: 'eq', value: 'dolce' },  // fan OK for dolce
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // BAKING — Precottura hint
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'double_bake_hint',
    category: 'baking',
    severity: 'info',
    message: 'Questo prodotto prevede tipicamente una precottura seguita da una seconda cottura con ingredienti.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_isPrecottura', op: 'eq', value: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // STEAM
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'steam_with_pizza',
    category: 'steam',
    severity: 'warning',
    message: 'Il vapore non è consigliato per la pizza. Compromette la croccantezza della base.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.ovenMode', op: 'eq', value: 'steam' },
      { field: 'recipeType', op: 'eq', value: 'pizza' },
    ],
  },
  {
    id: 'steam_too_long',
    category: 'steam',
    severity: 'info',
    message: (ctx) => `Vapore al ${ctx.ovenCfg?.steamPct ?? 100}% per ${ctx.baseDur} min. Oltre 30 min il vapore può rendere la crosta gommosa.`,
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.ovenMode', op: 'eq', value: 'steam' },
      { field: 'baseDur', op: 'gt', value: 30 },
    ],
    actions: (ctx) => [{
      label: 'Aggiungi fase asciutta',
      mutations: [
        { type: 'updateNode', target: { ref: 'self' }, patch: { baseDur: 25 } },
        { type: 'addNodeAfter', target: { ref: 'self' }, nodeType: 'bake', subtype: 'forno', data: {
          title: 'Doratura (senza vapore)', baseDur: 12, restDur: 0, restTemp: null,
          flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
          ovenCfg: { ...(ctx.ovenCfg || {} as any), ovenMode: 'static', steamPct: undefined },
        }},
      ],
    }],
  },
  {
    id: 'pentola_two_phase',
    category: 'steam',
    severity: 'info',
    message: 'Cottura in pentola: ~25 min coperto (oven-spring) + ~15 min scoperto (doratura).',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: 'ovenCfg.panType', op: 'eq', value: 'ci_lid' },
      { field: 'baseDur', op: 'gt', value: 30 },  // only if single long bake (not already split)
    ],
    excludeIf: [
      { field: 'recipeType', op: 'eq', value: 'pizza' },
      { field: 'ovenCfg.ovenMode', op: 'neq', value: 'steam' },  // only relevant with steam
    ],
    suppressedBy: ['steam_too_long'],
  },

  // ═══════════════════════════════════════════════════════════════
  // DOUGH COMPOSITION — Yeast
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'yeast_too_low',
    category: 'yeast',
    severity: 'error',
    message: (ctx) => `Lievito troppo basso (${ctx.yeastPct}%). Rischio di non lievitazione. Min consigliato: 0.03%.`,
    conditions: [
      { field: 'yeastPct', op: 'gt', value: 0 },
      { field: 'yeastPct', op: 'lt', value: 0.03 },
    ],
  },
  {
    id: 'yeast_too_high',
    category: 'yeast',
    severity: 'warning',
    message: (ctx) => `Lievito molto alto (${ctx.yeastPct}%). Rischio sapore sgradevole e over-proofing. Max consigliato: 3.5%.`,
    conditions: [
      { field: 'yeastPct', op: 'gt', value: 3.5 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DOUGH COMPOSITION — Salt
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'salt_too_low',
    category: 'salt',
    severity: 'warning',
    message: 'Sale basso. Impasto potrebbe risultare debole. Min consigliato: 1.5%.',
    conditions: [
      { field: 'saltPct', op: 'lt', value: 1.5 },
      { field: 'saltPct', op: 'gt', value: 0 },
    ],
  },
  {
    id: 'salt_too_high',
    category: 'salt',
    severity: 'warning',
    message: 'Sale alto. Inibisce il lievito e risultato troppo salato. Max consigliato: 3%.',
    conditions: [
      { field: 'saltPct', op: 'gt', value: 3.0 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DOUGH COMPOSITION — Fat
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'fat_too_high',
    category: 'fat',
    severity: 'warning',
    message: 'Grassi alti. Oltre il 12% rallentano fortemente il lievito. Richiede tecnica speciale.',
    conditions: [
      { field: 'fatPct', op: 'gt', value: 12 },
    ],
    excludeIf: [
      { field: 'recipeType', op: 'eq', value: 'dolce' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DOUGH COMPOSITION — Hydration
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'hydration_extreme',
    category: 'hydration',
    severity: 'warning',
    message: 'Idratazione molto alta (>90%). Richiede farine molto forti (W > 350) e tecnica avanzata.',
    conditions: [
      { field: 'hydration', op: 'gt', value: 90 },
    ],
  },
  {
    id: 'hydration_low',
    category: 'hydration',
    severity: 'info',
    message: 'Idratazione bassa (<45%). L\'impasto sarà molto rigido.',
    conditions: [
      { field: 'hydration', op: 'lt', value: 45 },
      { field: 'hydration', op: 'gt', value: 0 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // FLOUR STRENGTH
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'flour_w_too_weak',
    category: 'flour',
    severity: 'warning',
    message: (ctx) => `Farina W${Math.round(ctx.flourW)} potrebbe essere troppo debole per lievitazioni lunghe. Considera una farina più forte.`,
    conditions: [
      { field: 'flourW', op: 'lt', value: 220 },
      { field: 'flourW', op: 'gt', value: 0 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // GENERAL
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'dough_hours_extreme',
    category: 'general',
    severity: 'info',
    message: 'Durata impasto molto lunga (>72h). Necessita tecnica del freddo e farine forti.',
    conditions: [
      { field: 'baseDur', op: 'gt', value: 4320 },  // 72h in minutes
    ],
    excludeIf: [
      { field: 'nodeType', op: 'neq', value: 'rise' },
    ],
  },
]
