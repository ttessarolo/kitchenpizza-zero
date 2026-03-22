import type { RecipeTypeEntry, RecipeSubtypeEntry } from '@commons/types/recipe'

export const RECIPE_TYPES = [
  { key: "pane", label: "Pane", icon: "🍞" },
  { key: "pizza", label: "Pizza", icon: "🍕" },
  { key: "focaccia", label: "Focaccia", icon: "🫓" },
  { key: "dolce", label: "Dolce lievitato", icon: "🧁" },
  { key: "altro", label: "Altro", icon: "🥖" },
] as const satisfies ReadonlyArray<RecipeTypeEntry>

export const RECIPE_SUBTYPES: Record<string, RecipeSubtypeEntry[]> = {
  pane: [
    {
      key: "shokupan",
      label: "Shokupan / Pane in cassetta",
      defaults: { mode: "tray", hyd: 81, thickness: 0.6, ballG: 0 },
    },
    {
      key: "pane_comune",
      label: "Pane comune",
      defaults: { mode: "ball", hyd: 60, thickness: 0, ballG: 250 },
    },
    {
      key: "ciabatta",
      label: "Ciabatta",
      defaults: { mode: "ball", hyd: 80, thickness: 0, ballG: 300 },
    },
    {
      key: "baguette",
      label: "Baguette",
      defaults: { mode: "ball", hyd: 68, thickness: 0, ballG: 350 },
    },
    {
      key: "panino",
      label: "Panino / Rosetta",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 80 },
    },
    {
      key: "pane_int",
      label: "Pane integrale",
      defaults: { mode: "ball", hyd: 70, thickness: 0, ballG: 400 },
    },
  ],
  pizza: [
    {
      key: "napoletana",
      label: "Napoletana",
      defaults: { mode: "ball", hyd: 64, thickness: 0, ballG: 250 },
    },
    {
      key: "romana_tonda",
      label: "Romana tonda",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 200 },
    },
    {
      key: "teglia_romana",
      label: "Teglia romana",
      defaults: { mode: "tray", hyd: 80, thickness: 0.5, ballG: 0 },
    },
    {
      key: "pala",
      label: "Pala",
      defaults: { mode: "tray", hyd: 75, thickness: 0.5, ballG: 0 },
    },
    {
      key: "pinza",
      label: "Pinza",
      defaults: { mode: "tray", hyd: 80, thickness: 0.7, ballG: 0 },
    },
    {
      key: "padellino",
      label: "Padellino",
      defaults: { mode: "ball", hyd: 70, thickness: 0, ballG: 220 },
    },
  ],
  focaccia: [
    {
      key: "genovese",
      label: "Genovese",
      defaults: { mode: "tray", hyd: 75, thickness: 0.5, ballG: 0 },
    },
    {
      key: "pugliese",
      label: "Pugliese (di Bari)",
      defaults: { mode: "tray", hyd: 70, thickness: 0.6, ballG: 0 },
    },
    {
      key: "messinese",
      label: "Messinese",
      defaults: { mode: "tray", hyd: 65, thickness: 0.7, ballG: 0 },
    },
    {
      key: "focaccia_gen",
      label: "Focaccia generica",
      defaults: { mode: "tray", hyd: 70, thickness: 0.5, ballG: 0 },
    },
  ],
  dolce: [
    {
      key: "brioche",
      label: "Brioche",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 80 },
    },
    {
      key: "panettone",
      label: "Panettone",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 1000 },
    },
    {
      key: "colomba",
      label: "Colomba",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 750 },
    },
  ],
  altro: [
    {
      key: "generico",
      label: "Generico",
      defaults: { mode: "tray", hyd: 65, thickness: 0.5, ballG: 0 },
    },
  ],
}
