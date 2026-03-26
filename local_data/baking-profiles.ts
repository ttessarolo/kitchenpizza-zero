/**
 * Baking profiles per recipe type/subtype.
 *
 * Reference data sourced from:
 * - "La Pizza è un Arte" (Casucci, 2020) — Cap. 55, 56, 63
 * - Standard home-oven baking references
 *
 * timeRange: [min, max] minutes at refTemp (°C)
 * tempRange: recommended oven temperature range (°C)
 * cieloPctRange: recommended ceiling-heat percentage range
 * materialFactors: thermal multiplier per tray material key (1.0 = neutral)
 * thicknessFactor: time multiplier per +0.1 thickness above baseThickness
 * baseThickness: reference thickness for timeRange (tray products)
 */

export interface BakingProfile {
  type: string
  subtype: string | null
  timeRange: [number, number]
  refTemp: number
  tempRange: [number, number]
  cieloPctRange: [number, number]
  materialFactors: Record<string, number>
  thicknessFactor: number
  baseThickness: number
  isPrecottura: boolean
  recommendedModes: string[]
}

// Shared material factor maps
const PIZZA_MAT: Record<string, number> = {
  stone: 0.85,
  steel: 0.90,
  alu: 1.0,
  ci_no: 1.05,
  ci_lid: 1.15,
  copper: 0.95,
  glass: 1.10,
}
const BREAD_MAT: Record<string, number> = {
  ci_lid: 1.0,
  ci_no: 0.95,
  alu: 1.0,
  glass: 1.08,
  steel: 0.95,
  copper: 0.92,
  stone: 0.85,
}

export const BAKING_PROFILES: BakingProfile[] = [
  // ── Pizza ──────────────────────────────────────────────────
  {
    type: "pizza",
    subtype: "napoletana",
    timeRange: [2, 4],
    refTemp: 300,
    tempRange: [280, 350],
    cieloPctRange: [40, 60],
    materialFactors: { stone: 0.85, steel: 0.90, alu: 1.05 },
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static"],
  },
  {
    type: "pizza",
    subtype: "romana_tonda",
    timeRange: [3, 5],
    refTemp: 300,
    tempRange: [280, 320],
    cieloPctRange: [40, 60],
    materialFactors: { stone: 0.85, steel: 0.90, alu: 1.0 },
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static"],
  },
  {
    type: "pizza",
    subtype: "teglia_romana",
    timeRange: [9, 12],
    refTemp: 250,
    tempRange: [240, 300],
    cieloPctRange: [25, 45],
    materialFactors: PIZZA_MAT,
    thicknessFactor: 0.06,
    baseThickness: 0.5,
    isPrecottura: true,
    recommendedModes: ["static"],
  },
  {
    type: "pizza",
    subtype: "pala",
    timeRange: [8, 10],
    refTemp: 280,
    tempRange: [270, 310],
    cieloPctRange: [40, 55],
    materialFactors: { stone: 0.85, steel: 0.90 },
    thicknessFactor: 0.05,
    baseThickness: 0.5,
    isPrecottura: true,
    recommendedModes: ["static"],
  },
  {
    type: "pizza",
    subtype: "pinza",
    timeRange: [8, 11],
    refTemp: 280,
    tempRange: [270, 310],
    cieloPctRange: [40, 55],
    materialFactors: { stone: 0.85, steel: 0.90 },
    thicknessFactor: 0.06,
    baseThickness: 0.7,
    isPrecottura: true,
    recommendedModes: ["static"],
  },
  {
    type: "pizza",
    subtype: "padellino",
    timeRange: [8, 10],
    refTemp: 290,
    tempRange: [270, 310],
    cieloPctRange: [45, 55],
    materialFactors: PIZZA_MAT,
    thicknessFactor: 0.05,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static"],
  },
  // Fallback pizza (any subtype not listed)
  {
    type: "pizza",
    subtype: null,
    timeRange: [6, 10],
    refTemp: 280,
    tempRange: [250, 320],
    cieloPctRange: [35, 60],
    materialFactors: PIZZA_MAT,
    thicknessFactor: 0.05,
    baseThickness: 0.5,
    isPrecottura: false,
    recommendedModes: ["static"],
  },

  // ── Focaccia ───────────────────────────────────────────────
  {
    type: "focaccia",
    subtype: "genovese",
    timeRange: [8, 10],
    refTemp: 250,
    tempRange: [230, 270],
    cieloPctRange: [35, 50],
    materialFactors: PIZZA_MAT,
    thicknessFactor: 0.06,
    baseThickness: 0.5,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },
  // Fallback focaccia
  {
    type: "focaccia",
    subtype: null,
    timeRange: [8, 12],
    refTemp: 250,
    tempRange: [220, 270],
    cieloPctRange: [35, 55],
    materialFactors: PIZZA_MAT,
    thicknessFactor: 0.06,
    baseThickness: 0.5,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },

  // ── Pane ───────────────────────────────────────────────────
  {
    type: "pane",
    subtype: "shokupan",
    timeRange: [35, 45],
    refTemp: 175,
    tempRange: [160, 190],
    cieloPctRange: [40, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0.08,
    baseThickness: 0.6,
    isPrecottura: false,
    recommendedModes: ["static", "fan"],
  },
  {
    type: "pane",
    subtype: "pane_comune",
    timeRange: [30, 45],
    refTemp: 210,
    tempRange: [190, 230],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0.07,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },
  {
    type: "pane",
    subtype: "pentola",
    timeRange: [35, 45],     // fase 1 coperto (~25min) + fase 2 scoperto (~15min)
    refTemp: 240,
    tempRange: [220, 250],
    cieloPctRange: [45, 55],
    materialFactors: { ci_lid: 1.0, ci_no: 0.95 },
    thicknessFactor: 0.07,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["steam"],
  },
  {
    type: "pane",
    subtype: "ciabatta",
    timeRange: [20, 30],
    refTemp: 230,
    tempRange: [220, 250],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0.06,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },
  {
    type: "pane",
    subtype: "baguette",
    timeRange: [20, 25],
    refTemp: 240,
    tempRange: [230, 260],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },
  {
    type: "pane",
    subtype: "panino",
    timeRange: [15, 20],
    refTemp: 210,
    tempRange: [190, 230],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "fan"],
  },
  {
    type: "pane",
    subtype: "pane_int",
    timeRange: [35, 50],
    refTemp: 200,
    tempRange: [180, 220],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0.07,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },
  // Fallback pane
  {
    type: "pane",
    subtype: null,
    timeRange: [30, 45],
    refTemp: 210,
    tempRange: [180, 250],
    cieloPctRange: [40, 60],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0.07,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "steam"],
  },

  // ── Dolce lievitato ────────────────────────────────────────
  {
    type: "dolce",
    subtype: "brioche",
    timeRange: [15, 20],
    refTemp: 180,
    tempRange: [170, 200],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "fan"],
  },
  {
    type: "dolce",
    subtype: "panettone",
    timeRange: [45, 55],
    refTemp: 170,
    tempRange: [155, 180],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static"],
  },
  {
    type: "dolce",
    subtype: "colomba",
    timeRange: [40, 50],
    refTemp: 170,
    tempRange: [155, 180],
    cieloPctRange: [45, 55],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static"],
  },
  // Fallback dolce
  {
    type: "dolce",
    subtype: null,
    timeRange: [20, 35],
    refTemp: 180,
    tempRange: [160, 200],
    cieloPctRange: [40, 60],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["static", "fan"],
  },

  // ── Frittura ─────────────────────────────────────────────────
  // [M] Cap. 11, p.187 — pizza fritta, montanara, calzoni fritti
  {
    type: "pizza",
    subtype: "fritta",
    timeRange: [3, 6],
    refTemp: 180,
    tempRange: [170, 195],
    cieloPctRange: [0, 0],     // non applicabile
    materialFactors: {},
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["deep", "shallow"],
  },
  // Generic fry fallback
  {
    type: "frittura",
    subtype: null,
    timeRange: [3, 8],
    refTemp: 180,
    tempRange: [170, 195],
    cieloPctRange: [0, 0],
    materialFactors: {},
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["deep", "shallow"],
  },

  // ── Griglia / BBQ ──────────────────────────────────────────
  // [M] Cap. 11, p.186 — griglia a carbone e gas
  {
    type: "griglia",
    subtype: null,
    timeRange: [4, 12],
    refTemp: 400,
    tempRange: [370, 480],
    cieloPctRange: [0, 0],
    materialFactors: {},
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["charcoal", "gas"],
  },

  // ── Padella / Fornello ─────────────────────────────────────
  // [M] Cap. 11, p.185 — ghisa + pistola termica
  {
    type: "padella",
    subtype: null,
    timeRange: [5, 12],
    refTemp: 220,
    tempRange: [180, 250],
    cieloPctRange: [0, 0],
    materialFactors: { cast_iron: 0.90, nonstick: 1.0, steel: 0.95 },
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["cast_iron", "nonstick", "steel"],
  },

  // ── Friggitrice ad Aria ────────────────────────────────────
  {
    type: "aria",
    subtype: null,
    timeRange: [5, 18],
    refTemp: 180,
    tempRange: [150, 220],
    cieloPctRange: [0, 0],
    materialFactors: {},
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["drawer", "oven_style"],
  },

  // ── Vapore (Vaporiera) ─────────────────────────────────────
  {
    type: "vapore",
    subtype: null,
    timeRange: [8, 25],
    refTemp: 100,
    tempRange: [95, 105],
    cieloPctRange: [0, 0],
    materialFactors: {},
    thicknessFactor: 0,
    baseThickness: 0,
    isPrecottura: false,
    recommendedModes: ["bamboo", "electric", "pot_basket"],
  },

  // ── Altro (generic fallback) ───────────────────────────────
  {
    type: "altro",
    subtype: null,
    timeRange: [15, 30],
    refTemp: 200,
    tempRange: [170, 280],
    cieloPctRange: [35, 60],
    materialFactors: BREAD_MAT,
    thicknessFactor: 0.05,
    baseThickness: 0.5,
    isPrecottura: false,
    recommendedModes: ["static", "fan"],
  },
]
