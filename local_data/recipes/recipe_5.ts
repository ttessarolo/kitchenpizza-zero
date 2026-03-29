import type { Recipe } from '@commons/types/recipe'

/**
 * Pizza Margherita Napoletana — impasto diretto, lievitazione lunga in frigo.
 *
 * Impasto: farina 00 forte (W290), 65% idratazione, 250g × 4 panetti
 * Lievitazione: 2h ambiente → 24h frigo → 2h acclimatazione
 * Cottura: forno a pietra 450°C, 60-90 secondi
 */
export const RECIPE_5: Recipe = {
  meta: {
    name: "Pizza Margherita Napoletana",
    author: "KitchenPizza",
    type: "pizza",
    subtype: "napoletana",
    locale: "it",
  },
  portioning: {
    mode: "ball",
    tray: { preset: "teglia_40x30", l: 40, w: 30, h: 2, material: "alu", griglia: false, count: 1 },
    ball: { weight: 250, count: 4 },
    thickness: 0.5,
    targetHyd: 65, doughHours: 28, yeastPct: 0.1, saltPct: 2.5, fatPct: 0, preImpasto: null, preFermento: null, flourMix: ['gt_00_for'],
  },
  ingredientGroups: ["Impasto"],
  steps: [
    // Impasto
    {
      id: "dough", title: "Impasto", type: "dough", subtype: "hand", group: "Impasto",
      baseDur: 15, restDur: 0, restTemp: null, deps: [], kneadMethod: "hand",
      desc: "Impasta farina, acqua, sale e lievito.",
      flours: [{ id: 0, type: "gt_00_for", g: 606, temp: null }],
      liquids: [{ id: 0, type: "Acqua", g: 394, temp: 18 }],
      extras: [], yeasts: [{ id: 0, type: "fresh", g: 0.6 }],
      salts: [{ id: 0, type: "sale_fino", g: 15 }], sugars: [],
      fats: [],
      riseMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    // Puntata (1ª lievitazione ambiente)
    {
      id: "rise_1", title: "Puntata", type: "rise", subtype: "room", group: "Impasto",
      baseDur: 120, restDur: 0, restTemp: null, deps: [{ id: "dough", wait: 1, grams: 1 }], riseMethod: "room",
      desc: "Lievitazione a temperatura ambiente.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      kneadMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    // Lievitazione in frigo
    {
      id: "rise_2", title: "Maturazione in frigo", type: "rise", subtype: "fridge", group: "Impasto",
      baseDur: 1440, restDur: 0, restTemp: null, deps: [{ id: "rise_1", wait: 1, grams: 1 }], riseMethod: "fridge",
      desc: "Maturazione lenta in frigorifero a 4°C.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      kneadMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    // Staglio e formatura
    {
      id: "shape", title: "Staglio e formatura panetti", type: "shape", subtype: null, group: "Impasto",
      baseDur: 10, restDur: 0, restTemp: null, deps: [{ id: "rise_2", wait: 1, grams: 1 }], shapeCount: 4,
      desc: "Dividi in 4 panetti da 250g e forma a sfera.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      kneadMethod: null, riseMethod: null, ovenCfg: null, sourcePrep: null, preFermentCfg: null,
    },
    // Acclimatazione (appretto)
    {
      id: "rise_3", title: "Acclimatazione", type: "rise", subtype: "room", group: "Impasto",
      baseDur: 120, restDur: 0, restTemp: null, deps: [{ id: "shape", wait: 1, grams: 1 }], riseMethod: "room",
      desc: "Riporta i panetti a temperatura ambiente prima di stendere.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      kneadMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    // Cottura
    {
      id: "bake", title: "Cottura", type: "bake", subtype: "forno", group: "Impasto",
      baseDur: 2, restDur: 0, restTemp: null, deps: [{ id: "rise_3", wait: 1, grams: 1 }],
      desc: "Cuoci in forno a pietra a 450°C per 60-90 secondi.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      kneadMethod: null, riseMethod: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
      ovenCfg: null,
      cookingCfg: {
        method: "forno",
        cfg: {
          panType: "stone",
          ovenType: "pizza",
          ovenMode: "statico",
          temp: 450,
          cieloPct: 50,
          shelfPosition: 2,
        },
      },
    },
    // Fine
    {
      id: "done", title: "Fine", type: "done", subtype: null, group: "Impasto",
      baseDur: 0, restDur: 0, restTemp: null, deps: [{ id: "bake", wait: 1, grams: 1 }],
      desc: "",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      kneadMethod: null, riseMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
  ],
}
