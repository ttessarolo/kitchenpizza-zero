import type { StepTypeEntry, ColorMapEntry } from '@commons/types/recipe'

export const STEP_TYPES: StepTypeEntry[] = [
  {
    key: "pre_dough",
    label: "Pre-Impasto",
    icon: "🧪",
    subtypes: [
      { key: "tangzhong", label: "Tangzhong", defaults: { baseDur: 5, liquidTemp: 95, flourPctOfLiquid: 1.5, flourPctOfLiquidMax: 2 } },
      { key: "autolisi", label: "Autolisi", defaults: { baseDur: 30, hydrationPct: 55, useMainDoughFlour: true } },
    ],
  },
  {
    key: "pre_ferment",
    label: "Pre-Fermento",
    icon: "🫧",
    subtypes: [
      { key: "biga", label: "Biga", defaults: { phases: 2, preFermentPct: 45, preFermentPctRange: [30, 100], hydrationPct: 44, hydrationPctRange: [43, 50], yeastType: "fresh", yeastPct: 1, yeastPctRange: [0.8, 1.5], fermentTemp: 18, fermentTempRange: [16, 20], fermentDur: 1080, fermentDurRange: [960, 1440], phaseDescriptions: ["Mescola farina, acqua fredda e lievito sbriciolato fino a ottenere una massa asciutta e sbriciolata. Copri e lascia fermentare a 18 °C per 16-24 ore.", "Spezza la biga in pezzi piccoli e aggiungila gradualmente nell'impasto principale."] } },
      { key: "poolish", label: "Poolish", defaults: { phases: 2, preFermentPct: 40, preFermentPctRange: [20, 60], hydrationPct: 100, hydrationLocked: true, hydrationPctRange: [100, 100], yeastType: "fresh", yeastPct: 0.1, yeastPctRange: [0.05, 1.5], fermentTemp: 20, fermentTempRange: [18, 24], fermentDur: 720, fermentDurRange: [120, 960], phaseDescriptions: ["Sciogli il lievito nell'acqua, aggiungi la farina e mescola fino a ottenere una pastella omogenea. Copri e lascia fermentare a 20 °C.", "Versa tutto il poolish nella ciotola dell'impasto principale e mescola con i liquidi rimanenti."] } },
      { key: "sponge", label: "Sponge", defaults: { phases: 2, preFermentPct: 60, preFermentPctRange: [40, 75], hydrationPct: 60, hydrationPctRange: [55, 70], yeastType: "fresh", yeastPct: 1.5, yeastPctRange: [1, 3], fermentTemp: 25, fermentTempRange: [22, 28], fermentDur: 120, fermentDurRange: [60, 240], phaseDescriptions: ["Sciogli il lievito nell'acqua tiepida, aggiungi la farina e impasta brevemente. Copri e lascia fermentare a 25 °C per 2-4 ore.", "Aggiungi lo sponge all'impasto principale insieme ai restanti ingredienti."] } },
      { key: "idrobiga", label: "Idrobiga", defaults: { phases: 2, preFermentPct: 45, preFermentPctRange: [30, 100], hydrationPct: 75, hydrationPctRange: [70, 80], yeastType: "fresh", yeastPct: 1, yeastPctRange: [0.8, 1.2], roomTempDur: 120, roomTempRange: [90, 180], roomTemp: 20, fermentTemp: 4, fermentTempRange: [2, 6], fermentDur: 1320, fermentDurRange: [1200, 1440], phaseDescriptions: ["Mescola farina di forza con acqua e lievito. Lascia a temperatura ambiente fino al raddoppio (~2h), poi in frigo a 4 °C per 20-24 ore.", "Estrai l'idrobiga dal frigo, spezzala in pezzi e incorporala nell'impasto principale."] } },
      { key: "sourdough", label: "Lievito Madre", defaults: { phases: 1, preFermentPct: 25, preFermentPctRange: [15, 100], hydrationPct: 50, hydrationPctRange: [45, 130], yeastType: null, yeastPct: null, starterForms: ["solid", "licoli"], phaseDescriptions: ["Usa lievito madre rinfrescato e al massimo vigore. Per la pasta madre solida, spezzala e scioglila nei liquidi; per il Li.Co.Li., versalo direttamente."] } },
      { key: "old_dough", label: "Pasta di Riporto", defaults: { phases: 1, preFermentPct: 20, preFermentPctRange: [10, 100], hydrationPct: 60, hydrationPctRange: [50, 75], yeastType: null, yeastPct: null, maxAgeDays: 3, phaseDescriptions: ["Spezza la pasta di riporto in piccoli pezzi e aggiungila ai liquidi dell'impasto principale."] } },
    ],
  },
  {
    key: "dough",
    label: "Impasto",
    icon: "🖐️",
    subtypes: [
      { key: "hand", label: "A mano", defaults: { kneadMethod: "hand" } },
      { key: "stand", label: "Planetaria", defaults: { kneadMethod: "stand" } },
      { key: "spiral", label: "Spirale", defaults: { kneadMethod: "spiral" } },
    ],
  },
  { key: "rest", label: "Riposo", icon: "❄️" },
  {
    key: "rise",
    label: "Lievitazione",
    icon: "⏳",
    subtypes: [
      { key: "room", label: "Ambiente", defaults: { riseMethod: "room" } },
      { key: "fridge", label: "Frigo", defaults: { riseMethod: "fridge" } },
      { key: "ctrl18", label: "Controllata 18°C", defaults: { riseMethod: "ctrl18" } },
      { key: "ctrl12", label: "Controllata 12°C", defaults: { riseMethod: "ctrl12" } },
    ],
  },
  { key: "shape", label: "Formatura", icon: "🔄" },
  {
    key: "pre_bake",
    label: "Pre-Cottura",
    icon: "✨",
    subtypes: [
      { key: "brush", label: "Spennellatura", defaults: { baseDur: 5 } },
      { key: "topping", label: "Topping / Farcitura", defaults: { baseDur: 5 } },
      { key: "scoring", label: "Tagli / Incisioni", defaults: { baseDur: 3 } },
      { key: "generic", label: "Generico", defaults: {} },
    ],
  },
  {
    key: "bake",
    label: "Cottura",
    icon: "🔥",
    subtypes: [
      { key: "forno", label: "In forno", defaults: { baseDur: 30 } },
      { key: "pentola", label: "In pentola (Dutch oven)", defaults: { baseDur: 40 } },
    ],
  },
  {
    key: "post_bake",
    label: "Post-Cottura",
    icon: "🍽️",
    subtypes: [
      { key: "garnish", label: "Guarnizione", defaults: { baseDur: 5 } },
      { key: "fill", label: "Farcitura", defaults: { baseDur: 10 } },
      { key: "glaze", label: "Glassatura", defaults: { baseDur: 5 } },
      { key: "dress", label: "Condimento", defaults: { baseDur: 3 } },
      { key: "dust", label: "Spolverata", defaults: { baseDur: 2 } },
      { key: "plate", label: "Impiattamento", defaults: { baseDur: 5 } },
      { key: "generic", label: "Generico", defaults: {} },
    ],
  },
  { key: "done", label: "Pronto!", icon: "🎉" },
  {
    key: "prep",
    label: "Preparazione",
    icon: "🔪",
    subtypes: [
      { key: "cut", label: "Taglio", defaults: { baseDur: 10 } },
      { key: "cook", label: "Cottura", defaults: { baseDur: 15 } },
      { key: "mix", label: "Miscelazione", defaults: { baseDur: 5 } },
      { key: "marinate", label: "Marinatura", defaults: { baseDur: 120 } },
      { key: "ferment", label: "Fermentazione", defaults: { baseDur: 4320 } },
      { key: "cool", label: "Raffreddamento", defaults: { baseDur: 30 } },
      { key: "assemble", label: "Assemblaggio", defaults: { baseDur: 10 } },
    ],
  },
  { key: "split", label: "Divisione", icon: "✂️" },
  {
    key: "join",
    label: "Mix",
    icon: "🔗",
    subtypes: [
      { key: "braid", label: "Intreccio", defaults: { baseDur: 10 } },
      { key: "layer", label: "Sovrapposizione", defaults: { baseDur: 5 } },
      { key: "fold", label: "Piega", defaults: { baseDur: 5 } },
      { key: "enclose", label: "Avvolgimento", defaults: { baseDur: 10 } },
      { key: "mix", label: "Rimescolamento", defaults: { baseDur: 5 } },
      { key: "side_by_side", label: "Affiancamento", defaults: { baseDur: 3 } },
      { key: "generic", label: "Generico", defaults: {} },
    ],
  },
]

export const COLOR_MAP: Record<string, ColorMapEntry> = {
  pre_dough: { bg: "#f5eef8", tx: "#7050a0", lb: "Pre-Imp." },
  pre_ferment: { bg: "#fef8eb", tx: "#7a6020", lb: "Preferm." },
  dough: { bg: "#eef0f5", tx: "#5a6070", lb: "Impasto" },
  rest: { bg: "#f5f0ea", tx: "#7a6a55", lb: "Riposo" },
  rise: { bg: "#fef6ed", tx: "#8a6e40", lb: "Lievitaz." },
  shape: { bg: "#f0eef5", tx: "#6050a0", lb: "Formatura" },
  pre_bake: { bg: "#fef5ee", tx: "#9a7040", lb: "Pre-Cott." },
  bake: { bg: "#fdeee8", tx: "#8a4a30", lb: "Cottura" },
  done: { bg: "#eaf5ea", tx: "#3a7a3a", lb: "Pronto!" },
  post_bake: { bg: "#f5eef0", tx: "#8a4060", lb: "Post-Cott." },
  prep: { bg: "#edf7ed", tx: "#2e6e2e", lb: "Prepar." },
  split: { bg: "#f0e8f5", tx: "#7040a0", lb: "Divis." },
  join: { bg: "#f0e8f5", tx: "#7040a0", lb: "Mix" },
}
