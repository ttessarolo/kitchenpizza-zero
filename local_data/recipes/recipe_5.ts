import type { Recipe } from '@commons/types/recipe'

/**
 * Treccia Integrale-Bianca — due impasti diversi che si uniscono.
 *
 * Impasto A: farina 00 forte (300g), acqua (180g), sale (6g), olio (10g), lievito (1g) — hyd 60%
 * Impasto B: farina integrale (200g), acqua (140g), sale (4g), lievito (1g) — hyd 70%
 *
 * Ogni impasto ha la propria lievitazione e formatura.
 * I due filoni si uniscono in un intreccio (join:braid).
 */
export const RECIPE_5: Recipe = {
  meta: {
    name: "Treccia Integrale-Bianca",
    author: "KitchenPizza",
    type: "pane",
    subtype: "pane_comune",
    locale: "it",
  },
  portioning: {
    mode: "ball",
    tray: { preset: "teglia_40x30", l: 40, w: 30, h: 2, material: "alu", griglia: false, count: 1 },
    ball: { weight: 471, count: 2 },
    thickness: 0.5,
    targetHyd: 64, doughHours: 8, yeastPct: 0.36, saltPct: 2.0, fatPct: 2, preImpasto: null, preFermento: null,
  },
  ingredientGroups: ["Impasto"],
  steps: [
    // ── Impasto A: Bianco ──
    {
      id: "dough_a", title: "Impasto Bianco", type: "dough", subtype: "hand", group: "Impasto",
      baseDur: 15, restDur: 0, restTemp: null, deps: [], kneadMethod: "hand",
      desc: "Impasta farina 00, acqua, sale, olio e lievito.",
      flours: [{ id: 0, type: "gt_00_for", g: 300, temp: null }],
      liquids: [{ id: 0, type: "Acqua", g: 180, temp: null }],
      extras: [], yeasts: [{ id: 0, type: "fresh", g: 1 }],
      salts: [{ id: 0, type: "sale_fino", g: 6 }], sugars: [],
      fats: [{ id: 0, type: "olio_evo", g: 10 }],
      riseMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    {
      id: "rise_a", title: "Lievitazione Bianco", type: "rise", subtype: "room", group: "Impasto",
      baseDur: 120, restDur: 0, restTemp: null, deps: [{ id: "dough_a", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Copri e lascia lievitare 2h a TA.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: "room", ovenCfg: null, sourcePrep: "dough_a", shapeCount: null, preFermentCfg: null,
    },
    {
      id: "shape_a", title: "Forma filone bianco", type: "shape", subtype: null, group: "Impasto",
      baseDur: 5, restDur: 0, restTemp: null, deps: [{ id: "rise_a", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Forma un filone lungo e uniforme.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: null, ovenCfg: null, sourcePrep: "dough_a", shapeCount: 1, preFermentCfg: null,
    },
    // ── Impasto B: Integrale ──
    {
      id: "dough_b", title: "Impasto Integrale", type: "dough", subtype: "hand", group: "Impasto",
      baseDur: 15, restDur: 0, restTemp: null, deps: [], kneadMethod: "hand",
      desc: "Impasta farina integrale, acqua, sale e lievito.",
      flours: [{ id: 0, type: "gt_int", g: 200, temp: null }],
      liquids: [{ id: 0, type: "Acqua", g: 140, temp: null }],
      extras: [], yeasts: [{ id: 0, type: "fresh", g: 1 }],
      salts: [{ id: 0, type: "sale_fino", g: 4 }], sugars: [], fats: [],
      riseMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    {
      id: "rise_b", title: "Lievitazione Integrale", type: "rise", subtype: "room", group: "Impasto",
      baseDur: 120, restDur: 0, restTemp: null, deps: [{ id: "dough_b", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Copri e lascia lievitare 2h a TA.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: "room", ovenCfg: null, sourcePrep: "dough_b", shapeCount: null, preFermentCfg: null,
    },
    {
      id: "shape_b", title: "Forma filone integrale", type: "shape", subtype: null, group: "Impasto",
      baseDur: 5, restDur: 0, restTemp: null, deps: [{ id: "rise_b", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Forma un filone lungo e uniforme.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: null, ovenCfg: null, sourcePrep: "dough_b", shapeCount: 1, preFermentCfg: null,
    },
    // ── Join: Intreccio ──
    {
      id: "braid", title: "Intreccia i filoni", type: "join", subtype: "braid", group: "Impasto",
      baseDur: 10, restDur: 0, restTemp: null,
      deps: [{ id: "shape_a", wait: 1, grams: 1 }, { id: "shape_b", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Intreccia i due filoni dal centro verso le estremità.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    // ── 2ª Lievitazione ──
    {
      id: "rise2", title: "2ª Lievitazione", type: "rise", subtype: "room", group: "Impasto",
      baseDur: 45, restDur: 0, restTemp: null, deps: [{ id: "braid", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Copri e lascia lievitare 45 min.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: "room", ovenCfg: null, sourcePrep: "dough_a", shapeCount: null, preFermentCfg: null,
    },
    // ── Cottura ──
    {
      id: "bake", title: "Cottura", type: "bake", subtype: null, group: "Impasto",
      baseDur: 35, restDur: 0, restTemp: null, deps: [{ id: "rise2", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "Forno 200°C statico, 30-35 minuti.",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: null,
      ovenCfg: { panType: "stone", ovenType: "electric", ovenMode: "static", temp: 200, cieloPct: 50, shelfPosition: 2 },
      sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
    // ── Fine ──
    {
      id: "done", title: "Buon Appetito!", type: "done", subtype: null, group: "Impasto",
      baseDur: 0, restDur: 0, restTemp: null, deps: [{ id: "bake", wait: 1, grams: 1 }],
      kneadMethod: null, desc: "",
      flours: [], liquids: [], extras: [], yeasts: [], salts: [], sugars: [], fats: [],
      riseMethod: null, ovenCfg: null, sourcePrep: null, shapeCount: null, preFermentCfg: null,
    },
  ],
}
