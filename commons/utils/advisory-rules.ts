/**
 * All advisory rules — declarative, data-driven.
 *
 * Each rule defines conditions to appear, conditions to NOT appear (excludeIf),
 * and rules that suppress it (suppressedBy).
 *
 * Scientific basis: Casucci "La Pizza è un Arte" (2020), PizzaBlab, King Arthur, ScienceDirect.
 */

import type { AdvisoryRule } from './advisory-manager'

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
    actions: (ctx) => {
      const isPentola = ctx._cookingMethod === 'pentola'
      return [{
        label: isPentola ? 'Aggiungi fase scoperta' : 'Aggiungi fase asciutta',
        mutations: [
          { type: 'updateNode', target: { ref: 'self' }, patch: { baseDur: 25 } },
          isPentola
            ? {
                type: 'addNodeAfter' as const, target: { ref: 'self' as const },
                nodeType: 'bake', subtype: 'pentola',
                data: {
                  title: 'Doratura (senza coperchio)', baseDur: 15, restDur: 0, restTemp: null,
                  flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
                  ovenCfg: { ...(ctx.ovenCfg || {} as any), ovenMode: 'static', lidOn: false },
                  cookingCfg: { method: 'pentola', cfg: { ...(ctx.ovenCfg || {} as any), ovenMode: 'static', lidOn: false } },
                },
              }
            : {
                type: 'addNodeAfter' as const, target: { ref: 'self' as const },
                nodeType: 'bake', subtype: 'forno',
                data: {
                  title: 'Doratura (senza vapore)', baseDur: 12, restDur: 0, restTemp: null,
                  flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
                  ovenCfg: { ...(ctx.ovenCfg || {} as any), ovenMode: 'static', steamPct: undefined },
                },
              },
        ],
      }]
    },
  },
  {
    id: 'pentola_no_lid',
    category: 'steam',
    severity: 'warning',
    message: 'Cottura in pentola senza coperchio: l\'oven-spring sarà ridotto (30-50%). Il pane sviluppa volume e crosta migliore partendo con il coperchio chiuso nei primi 20-25 minuti.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'pentola' },
      { field: 'ovenCfg.lidOn', op: 'eq', value: false },
    ],
    excludeIf: [
      { field: 'recipeType', op: 'eq', value: 'pizza' },
    ],
  },
  {
    id: 'pentola_two_phase',
    category: 'steam',
    severity: 'info',
    message: 'Cottura in pentola: ~25 min coperto (oven-spring) + ~15 min scoperto (doratura). Togli il coperchio quando il pane ha smesso di crescere.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'pentola' },
      { field: 'ovenCfg.lidOn', op: 'eq', value: true },
      { field: 'baseDur', op: 'gt', value: 30 },
    ],
    excludeIf: [
      { field: 'recipeType', op: 'eq', value: 'pizza' },
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

  // ═══════════════════════════════════════════════════════════════
  // FRYING — [M] Cap. 11, p.187
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'fry_oil_temp_low',
    category: 'frying',
    severity: 'warning',
    message: 'Olio sotto 170°C: l\'impasto assorbe troppo olio e risulta unto.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'frittura' },
      { field: '_oilTemp', op: 'lt', value: 170 },
    ],
  },
  {
    id: 'fry_oil_temp_high',
    category: 'frying',
    severity: 'warning',
    message: 'Olio sopra 195°C: rischio di bruciatura esterna con interno crudo.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'frittura' },
      { field: '_oilTemp', op: 'gt', value: 195 },
    ],
  },
  {
    id: 'fry_dough_too_heavy',
    category: 'frying',
    severity: 'info',
    message: (ctx) => `Peso impasto elevato (max consigliato: ${ctx._maxDoughWeight}g). Rischio di cottura non uniforme.`,
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'frittura' },
      { field: '_maxDoughWeight', op: 'exists', value: true },
    ],
  },
  {
    id: 'fry_finish_suggest',
    category: 'frying',
    severity: 'info',
    message: 'Pizza fritta: per sciogliere il formaggio, aggiungi una fase in forno.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'frittura' },
      { field: 'recipeType', op: 'eq', value: 'pizza' },
    ],
    actions: () => [{
      label: 'Aggiungi finitura in forno (285°C, 2 min)',
      mutations: [
        {
          type: 'addNodeAfter', target: { ref: 'self' },
          nodeType: 'bake', subtype: 'forno',
          data: {
            title: 'Finitura forno', desc: '', group: '', baseDur: 2, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 285, cieloPct: 50, shelfPosition: 2 },
            cookingCfg: { method: 'forno', cfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'static', temp: 285, cieloPct: 50, shelfPosition: 2 } },
          },
        },
      ],
    }],
  },

  // ═══════════════════════════════════════════════════════════════
  // GRILLING — [M] Cap. 11, p.186
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'grill_flareup',
    category: 'grilling',
    severity: 'info',
    message: 'Evitare grassi che gocciolano sulla fiamma diretta. Non grigliare accanto a carne.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'griglia' },
    ],
  },
  {
    id: 'grill_dock_hint',
    category: 'grilling',
    severity: 'info',
    message: 'Per pizza thin-crust alla griglia, considera di forare (dock) l\'impasto prima di grigliare.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'griglia' },
    ],
    excludeIf: [
      { field: 'recipeType', op: 'neq', value: 'pizza' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // AIR FRYER
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'airfry_large_pizza',
    category: 'baking',
    severity: 'info',
    message: 'La friggitrice ad aria non è adatta per pizze grandi (max ~22cm). Usa pezzi piccoli o pizzette.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'aria' },
      { field: 'recipeType', op: 'eq', value: 'pizza' },
    ],
  },
  {
    id: 'airfry_flip_reminder',
    category: 'baking',
    severity: 'info',
    message: 'Ricorda di capovolgere a metà cottura per una crosta uniforme.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'aria' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // VAPORE (Vaporiera)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'steamer_water_low',
    category: 'steam',
    severity: 'info',
    message: 'Cottura a vapore > 15 min: controllare il livello acqua nella vaporiera.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'vapore' },
      { field: 'baseDur', op: 'gt', value: 15 },
    ],
  },
  {
    id: 'steamer_lid_condensation',
    category: 'steam',
    severity: 'info',
    message: 'A fine cottura, aprire il coperchio gradualmente per evitare gocciolamento di condensa sul prodotto.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'vapore' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PADELLA — [M] Cap. 11, p.185
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'pan_cast_iron_preheat',
    category: 'baking',
    severity: 'info',
    message: 'Padella in ghisa: preriscaldare bene (almeno 5 minuti) per cottura uniforme.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'padella' },
    ],
  },
  {
    id: 'pan_finish_suggest',
    category: 'baking',
    severity: 'info',
    message: 'Pizza in padella: per dorare la parte superiore, aggiungi una fase grill.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'bake' },
      { field: '_cookingMethod', op: 'eq', value: 'padella' },
      { field: 'recipeType', op: 'eq', value: 'pizza' },
    ],
    actions: () => [{
      label: 'Aggiungi finitura grill (250°C, 3 min)',
      mutations: [
        {
          type: 'addNodeAfter', target: { ref: 'self' },
          nodeType: 'bake', subtype: 'forno',
          data: {
            title: 'Finitura grill', desc: '', group: '', baseDur: 3, restDur: 0, restTemp: null,
            flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
            ovenCfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'fan', temp: 250, cieloPct: 70, shelfPosition: 1 },
            cookingCfg: { method: 'forno', cfg: { panType: 'stone', ovenType: 'electric', ovenMode: 'fan', temp: 250, cieloPct: 70, shelfPosition: 1 } },
          },
        },
      ],
    }],
  },

  // ═══════════════════════════════════════════════════════════════
  // PRE-BAKE — Bollitura
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'boil_lye_safety',
    category: 'pre_bake',
    severity: 'warning',
    message: 'Soluzione di lisciva (lye): usare guanti protettivi e lavorare in ambiente ventilato.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'boil' },
    ],
  },
  {
    id: 'boil_overcook',
    category: 'pre_bake',
    severity: 'info',
    message: 'Bollitura oltre 3 minuti può rendere il prodotto troppo gommoso.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'boil' },
      { field: 'baseDur', op: 'gt', value: 3 },
    ],
  },
  {
    id: 'boil_must_bake_after',
    category: 'pre_bake',
    severity: 'warning',
    message: 'La bollitura DEVE essere seguita da cottura in forno per completare il prodotto.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'boil' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PRE-BAKE — Docking
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'dock_not_for_neapolitan',
    category: 'pre_bake',
    severity: 'info',
    message: 'La foratura non è adatta per la napoletana: serve alveolatura nel cornicione.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'dock' },
      { field: 'recipeSubtype', op: 'eq', value: 'napoletana' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PRE-BAKE — Infarinatura [C] Cap. 57
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'flour_tipo00_burns',
    category: 'pre_bake',
    severity: 'warning',
    message: 'Farina tipo 00 troppo fine: brucia facilmente e altera il sapore. Preferire farina di riso o semola.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'flour_dust' },
    ],
  },
  {
    id: 'flour_excess_remove',
    category: 'pre_bake',
    severity: 'info',
    message: 'Rimuovere l\'eccesso di farina prima di infornare per evitare bruciature.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'flour_dust' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PRE-BAKE — Oliatura [M] Cap. 11
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'oil_evoo_high_heat',
    category: 'pre_bake',
    severity: 'info',
    message: 'Olio EVO con cottura ad alta temperatura (>220°C): considera un olio con punto di fumo più alto.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'oil_coat' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PRE-BAKE — Vaporizzazione [C] Cap. 57
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'steam_home_oven_only',
    category: 'pre_bake',
    severity: 'info',
    message: 'Pentolino d\'acqua / cubetti di ghiaccio: tecnica per forni domestici senza vapore nativo.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'steam_inject' },
    ],
  },
  {
    id: 'steam_remove_for_crust',
    category: 'pre_bake',
    severity: 'info',
    message: 'Rimuovere la fonte di vapore nell\'ultima fase di cottura per ottenere una crosta croccante.',
    conditions: [
      { field: 'nodeType', op: 'eq', value: 'pre_bake' },
      { field: 'nodeSubtype', op: 'eq', value: 'steam_inject' },
    ],
  },
]
