/**
 * Default dough composition values per recipe type/subtype.
 * Based on "La Pizza è un Arte" (Casucci, 2020) — Cap. 44, 53, 54.
 */

export interface DoughCompositionDefaults {
  type: string
  subtype: string | null
  defaultDoughHours: number     // default desired dough duration (hours)
  saltPctDefault: number        // % salt on flour
  saltPctRange: [number, number]
  fatPctDefault: number         // % fat (EVO) on flour
  fatPctRange: [number, number]
}

export const DOUGH_COMPOSITION_DEFAULTS: DoughCompositionDefaults[] = [
  // ── Pizza ──
  { type: 'pizza', subtype: 'napoletana',     defaultDoughHours: 18, saltPctDefault: 2.3, saltPctRange: [1.8, 3.0], fatPctDefault: 0,  fatPctRange: [0, 3] },
  { type: 'pizza', subtype: 'romana_tonda',   defaultDoughHours: 24, saltPctDefault: 2.5, saltPctRange: [1.8, 3.0], fatPctDefault: 3,  fatPctRange: [0, 5] },
  { type: 'pizza', subtype: 'teglia_romana',  defaultDoughHours: 24, saltPctDefault: 2.5, saltPctRange: [1.8, 2.8], fatPctDefault: 5,  fatPctRange: [3, 7] },
  { type: 'pizza', subtype: 'pala',           defaultDoughHours: 24, saltPctDefault: 2.5, saltPctRange: [1.8, 3.0], fatPctDefault: 3,  fatPctRange: [0, 5] },
  { type: 'pizza', subtype: 'pinza',          defaultDoughHours: 48, saltPctDefault: 2.5, saltPctRange: [1.8, 3.0], fatPctDefault: 5,  fatPctRange: [3, 7] },
  { type: 'pizza', subtype: 'padellino',      defaultDoughHours: 18, saltPctDefault: 2.3, saltPctRange: [1.8, 3.0], fatPctDefault: 3,  fatPctRange: [0, 5] },
  { type: 'pizza', subtype: null,             defaultDoughHours: 18, saltPctDefault: 2.3, saltPctRange: [1.8, 3.0], fatPctDefault: 3,  fatPctRange: [0, 5] },
  // ── Focaccia ──
  { type: 'focaccia', subtype: 'genovese',    defaultDoughHours: 12, saltPctDefault: 2.5, saltPctRange: [2.0, 3.5], fatPctDefault: 8,  fatPctRange: [5, 12] },
  { type: 'focaccia', subtype: null,          defaultDoughHours: 12, saltPctDefault: 2.5, saltPctRange: [2.0, 3.5], fatPctDefault: 5,  fatPctRange: [3, 10] },
  // ── Pane ──
  { type: 'pane', subtype: 'shokupan',        defaultDoughHours: 4,  saltPctDefault: 2.0, saltPctRange: [1.8, 2.5], fatPctDefault: 5,  fatPctRange: [3, 8] },
  { type: 'pane', subtype: 'pane_comune',     defaultDoughHours: 8,  saltPctDefault: 2.0, saltPctRange: [1.8, 2.8], fatPctDefault: 1,  fatPctRange: [0, 5] },
  { type: 'pane', subtype: 'ciabatta',        defaultDoughHours: 18, saltPctDefault: 2.0, saltPctRange: [1.8, 2.5], fatPctDefault: 2,  fatPctRange: [0, 5] },
  { type: 'pane', subtype: 'baguette',        defaultDoughHours: 12, saltPctDefault: 2.0, saltPctRange: [1.8, 2.5], fatPctDefault: 0,  fatPctRange: [0, 2] },
  { type: 'pane', subtype: 'panino',          defaultDoughHours: 4,  saltPctDefault: 2.0, saltPctRange: [1.8, 2.5], fatPctDefault: 2,  fatPctRange: [0, 5] },
  { type: 'pane', subtype: 'pane_int',        defaultDoughHours: 12, saltPctDefault: 2.0, saltPctRange: [1.8, 2.5], fatPctDefault: 2,  fatPctRange: [0, 5] },
  { type: 'pane', subtype: null,              defaultDoughHours: 8,  saltPctDefault: 2.0, saltPctRange: [1.8, 2.8], fatPctDefault: 1,  fatPctRange: [0, 5] },
  // ── Dolce ──
  { type: 'dolce', subtype: 'brioche',        defaultDoughHours: 4,  saltPctDefault: 0.8, saltPctRange: [0.3, 1.5], fatPctDefault: 18, fatPctRange: [10, 25] },
  { type: 'dolce', subtype: 'panettone',      defaultDoughHours: 12, saltPctDefault: 0.5, saltPctRange: [0.3, 1.0], fatPctDefault: 15, fatPctRange: [10, 20] },
  { type: 'dolce', subtype: 'colomba',        defaultDoughHours: 12, saltPctDefault: 0.5, saltPctRange: [0.3, 1.0], fatPctDefault: 15, fatPctRange: [10, 20] },
  { type: 'dolce', subtype: null,             defaultDoughHours: 6,  saltPctDefault: 0.8, saltPctRange: [0.3, 1.5], fatPctDefault: 10, fatPctRange: [5, 20] },
  // ── Altro ──
  { type: 'altro', subtype: null,             defaultDoughHours: 8,  saltPctDefault: 2.0, saltPctRange: [1.0, 3.0], fatPctDefault: 3,  fatPctRange: [0, 10] },
]

export function getDoughDefaults(type: string, subtype: string | null): DoughCompositionDefaults {
  const exact = DOUGH_COMPOSITION_DEFAULTS.find((d) => d.type === type && d.subtype === subtype)
  if (exact) return exact
  return DOUGH_COMPOSITION_DEFAULTS.find((d) => d.type === type && d.subtype === null)
    ?? DOUGH_COMPOSITION_DEFAULTS[DOUGH_COMPOSITION_DEFAULTS.length - 1]
}
