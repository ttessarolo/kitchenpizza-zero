import type { Recipe } from '@commons/types/recipe'

/**
 * Ricetta vuota — per testare la creazione da zero.
 * Nessun nodo, nessun step. L'utente parte da un canvas completamente vuoto.
 */
export const RECIPE_0: Recipe = {
  meta: {
    name: "",
    author: "",
    type: "pizza",
    subtype: "teglia_romana",
  },
  portioning: {
    mode: "tray",
    tray: { preset: "teglia_40x30", l: 40, w: 30, h: 2, material: "alu", griglia: false, count: 1 },
    ball: { weight: 250, count: 4 },
    thickness: 0.5,
    targetHyd: 80, doughHours: 24, yeastPct: 0.16, saltPct: 2.5, fatPct: 5, preImpasto: null, preFermento: null,
  },
  ingredientGroups: ["Impasto"],
  steps: [],
}
