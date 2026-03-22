import React, { useState, useMemo, useRef, useEffect } from "react";

/* ================================================================
   CATALOGS
   ================================================================ */
const RECIPE_TYPES = [
  { key: "pane", label: "Pane", icon: "🍞" },
  { key: "pizza", label: "Pizza", icon: "🍕" },
  { key: "focaccia", label: "Focaccia", icon: "🫓" },
  { key: "dolce", label: "Dolce lievitato", icon: "🧁" },
  { key: "altro", label: "Altro", icon: "🥖" },
];
const RECIPE_SUBTYPES = {
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
};
const TRAY_PRESETS = [
  {
    key: "terrina_29",
    label: "Terrina 29×8.5×9",
    l: 29,
    w: 8.5,
    h: 9,
    material: "ci_lid",
    griglia: false,
  },
  {
    key: "plumcake_25",
    label: "Plumcake 25×11×7",
    l: 25,
    w: 11,
    h: 7,
    material: "alu",
    griglia: false,
  },
  {
    key: "plumcake_30",
    label: "Plumcake 30×11×7",
    l: 30,
    w: 11,
    h: 7,
    material: "alu",
    griglia: false,
  },
  {
    key: "teglia_40x30",
    label: "Teglia 40×30×2",
    l: 40,
    w: 30,
    h: 2,
    material: "alu",
    griglia: false,
  },
  {
    key: "teglia_30x30",
    label: "Teglia 30×30×6",
    l: 30,
    w: 30,
    h: 6,
    material: "alu",
    griglia: false,
  },
  {
    key: "teglia_60x40",
    label: "Teglia 60×40×2",
    l: 60,
    w: 40,
    h: 2,
    material: "steel",
    griglia: false,
  },
  {
    key: "tonda_28",
    label: "Tonda Ø28×3",
    l: 28,
    w: 28,
    h: 3,
    material: "alu",
    griglia: false,
  },
  {
    key: "tonda_32",
    label: "Tonda Ø32×3",
    l: 32,
    w: 32,
    h: 3,
    material: "alu",
    griglia: false,
  },
  {
    key: "ferro_blue",
    label: "Ferro blu 40×30×2.5",
    l: 40,
    w: 30,
    h: 2.5,
    material: "steel",
    griglia: false,
  },
];
const TRAY_MATERIALS = [
  {
    key: "ci_lid",
    label: "Ghisa con coperchio",
    bMin: 35,
    bMax: 40,
    defTemp: 170,
  },
  { key: "ci_no", label: "Ghisa", bMin: 30, bMax: 35, defTemp: 170 },
  { key: "alu", label: "Alluminio", bMin: 30, bMax: 40, defTemp: 180 },
  { key: "glass", label: "Vetro / Pirex", bMin: 35, bMax: 45, defTemp: 175 },
  { key: "steel", label: "Acciaio", bMin: 30, bMax: 40, defTemp: 180 },
  { key: "copper", label: "Rame", bMin: 28, bMax: 35, defTemp: 175 },
  {
    key: "stone",
    label: "Pietra refrattaria",
    bMin: 25,
    bMax: 35,
    defTemp: 250,
  },
];
const FLOUR_CATALOG = [
  {
    key: "gt_00_deb",
    group: "Grano Tenero",
    label: "00 debole",
    sub: "W 90-170",
    protein: 9,
    W: 130,
    PL: 0.45,
    absorption: 52,
    ash: 0.5,
    fiber: 2,
    starchDamage: 6,
    fermentSpeed: 1.25,
  },
  {
    key: "gt_00_med",
    group: "Grano Tenero",
    label: "00 media",
    sub: "W 180-250",
    protein: 10.5,
    W: 215,
    PL: 0.55,
    absorption: 56,
    ash: 0.52,
    fiber: 2.2,
    starchDamage: 6.5,
    fermentSpeed: 1.1,
  },
  {
    key: "gt_00_for",
    group: "Grano Tenero",
    label: "00 forte",
    sub: "W 260-320",
    protein: 12,
    W: 290,
    PL: 0.55,
    absorption: 58,
    ash: 0.55,
    fiber: 2.2,
    starchDamage: 7,
    fermentSpeed: 1,
  },
  {
    key: "gt_0_deb",
    group: "Grano Tenero",
    label: "0 debole",
    sub: "W 150-200",
    protein: 11,
    W: 175,
    PL: 0.5,
    absorption: 57,
    ash: 0.6,
    fiber: 2.8,
    starchDamage: 7,
    fermentSpeed: 1.15,
  },
  {
    key: "gt_0_med",
    group: "Grano Tenero",
    label: "0 media",
    sub: "W 200-280",
    protein: 11.5,
    W: 240,
    PL: 0.55,
    absorption: 60,
    ash: 0.62,
    fiber: 2.9,
    starchDamage: 7.5,
    fermentSpeed: 1.05,
  },
  {
    key: "gt_0_for",
    group: "Grano Tenero",
    label: "0 forte",
    sub: "W 280-350",
    protein: 13,
    W: 315,
    PL: 0.55,
    absorption: 63,
    ash: 0.65,
    fiber: 3,
    starchDamage: 8,
    fermentSpeed: 1,
  },
  {
    key: "gt_1",
    group: "Grano Tenero",
    label: "Tipo 1",
    sub: "W 180-350",
    protein: 12,
    W: 260,
    PL: 0.6,
    absorption: 65,
    ash: 0.75,
    fiber: 4,
    starchDamage: 7.5,
    fermentSpeed: 1.05,
  },
  {
    key: "gt_2",
    group: "Grano Tenero",
    label: "Tipo 2",
    sub: "semi-int.",
    protein: 12,
    W: 260,
    PL: 0.65,
    absorption: 66,
    ash: 0.9,
    fiber: 6.5,
    starchDamage: 7,
    fermentSpeed: 1.08,
  },
  {
    key: "gt_int",
    group: "Grano Tenero",
    label: "Integrale",
    sub: "W 280-300",
    protein: 12,
    W: 290,
    PL: 0.7,
    absorption: 70,
    ash: 1.5,
    fiber: 9,
    starchDamage: 6.5,
    fermentSpeed: 1.1,
  },
  {
    key: "gt_manit",
    group: "Grano Tenero",
    label: "Manitoba",
    sub: "W 350-420",
    protein: 14,
    W: 380,
    PL: 0.55,
    absorption: 65,
    ash: 0.55,
    fiber: 2.5,
    starchDamage: 8,
    fermentSpeed: 0.9,
  },
  {
    key: "gd_sem",
    group: "Grano Duro",
    label: "Semola",
    sub: "granulare",
    protein: 12.5,
    W: 200,
    PL: 1.8,
    absorption: 62,
    ash: 0.85,
    fiber: 3.5,
    starchDamage: 9,
    fermentSpeed: 0.85,
  },
  {
    key: "gd_rim",
    group: "Grano Duro",
    label: "Semola rim.",
    sub: "fine",
    protein: 12,
    W: 190,
    PL: 1.6,
    absorption: 60,
    ash: 0.8,
    fiber: 3,
    starchDamage: 10,
    fermentSpeed: 0.88,
  },
  {
    key: "gd_int",
    group: "Grano Duro",
    label: "Semola int.",
    sub: "integrale",
    protein: 13,
    W: 220,
    PL: 2,
    absorption: 68,
    ash: 1.6,
    fiber: 10,
    starchDamage: 8,
    fermentSpeed: 0.82,
  },
  {
    key: "sp_farro_m",
    group: "Speciali",
    label: "Farro monoc.",
    sub: "antico",
    protein: 14,
    W: 100,
    PL: 0.4,
    absorption: 58,
    ash: 0.8,
    fiber: 5,
    starchDamage: 5,
    fermentSpeed: 1.2,
  },
  {
    key: "sp_farro_d",
    group: "Speciali",
    label: "Farro dicoc.",
    sub: "emmer",
    protein: 13,
    W: 150,
    PL: 0.5,
    absorption: 60,
    ash: 0.85,
    fiber: 6,
    starchDamage: 6,
    fermentSpeed: 1.15,
  },
  {
    key: "sp_farro_s",
    group: "Speciali",
    label: "Farro spelta",
    sub: "",
    protein: 12,
    W: 130,
    PL: 0.55,
    absorption: 58,
    ash: 0.9,
    fiber: 7,
    starchDamage: 6,
    fermentSpeed: 1.18,
  },
  {
    key: "sp_avena",
    group: "Speciali",
    label: "Avena",
    sub: "",
    protein: 13,
    W: 80,
    PL: 0.35,
    absorption: 65,
    ash: 1.8,
    fiber: 10,
    starchDamage: 5,
    fermentSpeed: 1,
  },
  {
    key: "sp_segale",
    group: "Speciali",
    label: "Segale",
    sub: "",
    protein: 9,
    W: 60,
    PL: 0.3,
    absorption: 68,
    ash: 1.5,
    fiber: 12,
    starchDamage: 5,
    fermentSpeed: 1.3,
  },
  {
    key: "sp_sarac",
    group: "Speciali",
    label: "Grano sarac.",
    sub: "senza glutine",
    protein: 12,
    W: 0,
    PL: 0,
    absorption: 60,
    ash: 2,
    fiber: 4,
    starchDamage: 4,
    fermentSpeed: 0,
  },
  {
    key: "sp_riso",
    group: "Speciali",
    label: "Riso",
    sub: "senza glutine",
    protein: 6,
    W: 0,
    PL: 0,
    absorption: 50,
    ash: 0.5,
    fiber: 1,
    starchDamage: 5,
    fermentSpeed: 0,
  },
  {
    key: "sp_kamut",
    group: "Speciali",
    label: "Kamut",
    sub: "antico",
    protein: 14,
    W: 200,
    PL: 0.6,
    absorption: 60,
    ash: 0.9,
    fiber: 5,
    starchDamage: 6,
    fermentSpeed: 1.05,
  },
  {
    key: "sp_teff",
    group: "Speciali",
    label: "Teff",
    sub: "senza glutine",
    protein: 11,
    W: 0,
    PL: 0,
    absorption: 65,
    ash: 2.5,
    fiber: 8,
    starchDamage: 4,
    fermentSpeed: 0,
  },
];
const FLOUR_GROUPS = ["Grano Tenero", "Grano Duro", "Speciali"];
const LIQUID_PRESETS = [
  "Latte freddo",
  "Acqua",
  "Latte intero",
  "Latte di cocco",
  "Latte di soia",
  "Panna",
  "Birra",
  "Altro...",
];
const EXTRA_PRESETS = [
  "Miele di acacia",
  "Burro morbido",
  "Zucchero",
  "Sale",
  "Olio EVO",
  "Uova intere",
  "Tuorlo d'uovo",
  "Malto",
  "Semi",
  "Cacao",
  "Inserisci nuovo...",
];
const RISE_METHODS = [
  { key: "room", label: "Ambiente (~22°C)", tf: 1 },
  { key: "fridge", label: "Frigo (~4°C)", tf: 3.6 },
  { key: "ctrl18", label: "Controllata 18°C", tf: 1.4 },
  { key: "ctrl12", label: "Controllata 12°C", tf: 2.2 },
];
const YEAST_TYPES = [
  { key: "fresh", label: "Birra fresco", toFresh: 1, speedF: 1, hasFW: false },
  { key: "dry", label: "Secco attivo", toFresh: 3, speedF: 1, hasFW: false },
  {
    key: "instant",
    label: "Istantaneo",
    toFresh: 2.5,
    speedF: 1.1,
    hasFW: false,
  },
  {
    key: "madre_s",
    label: "Madre solido",
    toFresh: 1 / 12,
    speedF: 0.3,
    hasFW: true,
  },
  {
    key: "madre_l",
    label: "Madre liquido",
    toFresh: 1 / 16,
    speedF: 0.25,
    hasFW: true,
  },
];
const OVEN_TYPES = [
  { key: "electric", label: "Elettrico" },
  { key: "gas", label: "Gas" },
  { key: "wood", label: "Legna" },
];
const OVEN_MODES = [
  { key: "static", label: "Statico" },
  { key: "fan", label: "Ventilato" },
  { key: "steam", label: "Vapore" },
];
const MODE_MAP = {
  electric: ["static", "fan", "steam"],
  gas: ["static", "fan"],
  wood: ["static"],
};
const KNEAD_METHODS = [
  { key: "hand", label: "A mano", ff: 3 },
  { key: "stand", label: "Planetaria", ff: 12 },
  { key: "spiral", label: "Spirale", ff: 8 },
];
const STEP_TYPES = [
  { key: "pre_dough", label: "Pre-Impasto", icon: "🧪" },
  { key: "dough", label: "Impasto", icon: "🖐️" },
  { key: "rest", label: "Riposo", icon: "❄️" },
  { key: "rise", label: "Lievitazione", icon: "⏳" },
  { key: "shape", label: "Formatura", icon: "🔄" },
  { key: "bake", label: "Cottura", icon: "🔥" },
  { key: "done", label: "Pronto!", icon: "🎉" },
];

/* HELPERS */
const Fn = "'DM Sans',sans-serif";
const rnd = (v) =>
  v >= 100
    ? Math.round(v)
    : v >= 10
      ? Math.round(v * 2) / 2
      : Math.round(v * 10) / 10;
const pad = (n) => String(n).padStart(2, "0");
const fmtT = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
const fmtD = (m) => {
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60),
    r = m % 60;
  return r ? h + "h " + r + "min" : h + "h";
};
const c2f = (c) => Math.round((c * 9) / 5 + 32);
const f2c = (f) => Math.round(((f - 32) * 5) / 9);
const nextId = (a) => (a.length ? Math.max(...a.map((x) => x.id)) + 1 : 0);
const getFlour = (k) =>
  FLOUR_CATALOG.find((f) => f.key === k) || FLOUR_CATALOG[5];

function blendFP(fl) {
  let t = 0,
    wP = 0,
    wW = 0,
    wA = 0,
    wSD = 0,
    wFS = 0;
  for (const f of fl) {
    const c = getFlour(f.type);
    t += f.g;
    wP += f.g * c.protein;
    wW += f.g * c.W;
    wA += f.g * c.absorption;
    wSD += f.g * c.starchDamage;
    wFS += f.g * c.fermentSpeed;
  }
  if (t <= 0)
    return {
      protein: 12,
      W: 280,
      absorption: 60,
      starchDamage: 7,
      fermentSpeed: 1,
    };
  return {
    protein: rnd(wP / t),
    W: Math.round(wW / t),
    absorption: Math.round(wA / t),
    starchDamage: rnd((wSD / t) * 10) / 10,
    fermentSpeed: rnd((wFS / t) * 100) / 100,
  };
}
function calcRD(base, method, bp, yPct, ySF, tf) {
  const rm = RISE_METHODS.find((m) => m.key === method) || RISE_METHODS[0];
  return Math.round(
    ((base *
      rm.tf *
      (2 / Math.max(yPct, 0.5)) *
      (280 / Math.max(bp.W || 280, 50)) *
      (1 - ((bp.starchDamage || 7) - 7) * 0.02)) /
      Math.max(ySF, 0.1)) *
      (tf || 1),
  );
}
function calcFDT(fl, lq, amb, ff) {
  let t = 0,
    s = 0;
  for (const f of fl) {
    t += f.g;
    s += f.g * (f.temp ?? amb);
  }
  for (const l of lq) {
    t += l.g;
    s += l.g * (l.temp ?? amb);
  }
  const aw = t * 0.15;
  t += aw;
  s += aw * amb;
  return t > 0 ? Math.round((s / t + ff) * 10) / 10 : amb;
}
function riseTF(fdt, rm) {
  return Math.pow(
    2,
    (-(fdt - 24) *
      ({ room: 1, ctrl18: 0.2, ctrl12: 0.1, fridge: 0.05 }[rm] ?? 1)) /
      10,
  );
}

const CM = {
  pre_dough: { bg: "#f5eef8", tx: "#7050a0", lb: "Pre-Imp." },
  dough: { bg: "#eef0f5", tx: "#5a6070", lb: "Impasto" },
  rest: { bg: "#f5f0ea", tx: "#7a6a55", lb: "Riposo" },
  rise: { bg: "#fef6ed", tx: "#8a6e40", lb: "Lievitaz." },
  shape: { bg: "#f0eef5", tx: "#6050a0", lb: "Formatura" },
  bake: { bg: "#fdeee8", tx: "#8a4a30", lb: "Cottura" },
  done: { bg: "#eaf5ea", tx: "#3a7a3a", lb: "Pronto!" },
};
const ddSvg = `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23b8a08a' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")`;
const selS = {
  fontFamily: Fn,
  fontSize: 12,
  fontWeight: 500,
  color: "#2c1810",
  background: "#faf6f1",
  border: "1.5px solid #e0d3c5",
  borderRadius: 8,
  padding: "6px 26px 6px 8px",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: ddSvg,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
  width: "100%",
};
const numS = {
  fontFamily: Fn,
  fontSize: 13,
  fontWeight: 600,
  color: "#2c1810",
  background: "#fff",
  border: "1px solid #e0d3c5",
  borderRadius: 6,
  padding: "5px 6px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

/* INITIAL RECIPE */
const INIT = {
  meta: {
    name: "Shokupan 食パン",
    author: "Cucchiaio d'Argento",
    type: "pane",
    subtype: "shokupan",
  },
  portioning: {
    mode: "tray",
    tray: {
      preset: "terrina_29",
      l: 29,
      w: 8.5,
      h: 9,
      material: "ci_lid",
      griglia: false,
      count: 1,
    },
    thickness: 0.6,
    ball: { weight: 250, count: 3 },
    targetHyd: 81,
  },
  ingredientGroups: ["Tangzhong", "Impasto", "Finitura"],
  steps: [
    {
      id: "roux",
      title: "Tangzhong (Roux)",
      type: "pre_dough",
      group: "Tangzhong",
      baseDur: 5,
      deps: [],
      kneadMethod: null,
      desc: "Mescola farina e acqua. Cuoci fino a gel denso.",
      flours: [{ id: 0, type: "gt_00_deb", g: 22.5, temp: null }],
      liquids: [{ id: 0, type: "Acqua", g: 112, temp: null }],
      extras: [],
      yeasts: [],
      riseMethod: null,
      ovenCfg: null,
      sourcePrep: null,
    },
    {
      id: "roux_cool",
      title: "Raffreddamento roux",
      type: "rest",
      group: "Tangzhong",
      baseDur: 30,
      deps: [{ id: "roux", wait: 1 }],
      kneadMethod: null,
      desc: "Lascia raffreddare completamente.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: null,
      ovenCfg: null,
      sourcePrep: null,
    },
    {
      id: "knead",
      title: "Impastare",
      type: "dough",
      group: "Impasto",
      baseDur: 20,
      deps: [{ id: "roux_cool", wait: 0.75 }],
      kneadMethod: "hand",
      desc: "Unisci roux, farina, zucchero, sale, miele, lievito, latte. Burro per ultimo.",
      flours: [{ id: 0, type: "gt_0_for", g: 315, temp: null }],
      liquids: [{ id: 0, type: "Latte freddo", g: 162, temp: 5 }],
      extras: [
        { id: 0, name: "Miele di acacia", g: 6.3 },
        { id: 1, name: "Burro morbido", g: 45 },
        { id: 2, name: "Zucchero", g: 36 },
        { id: 3, name: "Sale", g: 7.2 },
      ],
      yeasts: [{ id: 0, type: "fresh", g: 6.3 }],
      riseMethod: null,
      ovenCfg: null,
      sourcePrep: null,
    },
    {
      id: "r1a",
      title: "1ª lievitaz. — fase 1",
      type: "rise",
      group: "Impasto",
      baseDur: 120,
      deps: [{ id: "knead", wait: 1 }],
      kneadMethod: null,
      desc: "Copri e lascia raddoppiare.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: "room",
      ovenCfg: null,
      sourcePrep: "knead",
    },
    {
      id: "r1b",
      title: "1ª lievitaz. — fase 2",
      type: "rise",
      group: "Impasto",
      baseDur: 200,
      deps: [{ id: "r1a", wait: 1 }],
      kneadMethod: null,
      desc: "In frigo per aromi e lavorabilità.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: "fridge",
      ovenCfg: null,
      sourcePrep: "knead",
    },
    {
      id: "shape",
      title: "Formare e arrotolare",
      type: "shape",
      group: "Impasto",
      baseDur: 15,
      deps: [{ id: "r1b", wait: 1 }],
      kneadMethod: null,
      desc: "Dividi, stendi, arrotola in cilindri.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: null,
      ovenCfg: null,
      sourcePrep: null,
    },
    {
      id: "r2",
      title: "2ª lievitaz. in teglia",
      type: "rise",
      group: "Impasto",
      baseDur: 150,
      deps: [{ id: "shape", wait: 1 }],
      kneadMethod: null,
      desc: "In teglia imburrata fino al bordo.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: "room",
      ovenCfg: null,
      sourcePrep: "knead",
    },
    {
      id: "brush",
      title: "Spennellare",
      type: "pre_dough",
      group: "Finitura",
      baseDur: 5,
      deps: [{ id: "r2", wait: 1 }],
      kneadMethod: null,
      desc: "Tuorlo e latte.",
      flours: [],
      liquids: [],
      extras: [
        { id: 0, name: "Tuorlo d'uovo", g: 1, unit: "pz" },
        { id: 1, name: "Latte", g: 0, unit: "q.b." },
      ],
      yeasts: [],
      riseMethod: null,
      ovenCfg: null,
      sourcePrep: null,
    },
    {
      id: "bake",
      title: "Cottura",
      type: "bake",
      group: "Impasto",
      baseDur: 35,
      deps: [{ id: "brush", wait: 1 }],
      kneadMethod: null,
      desc: "Forno preriscaldato.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: null,
      ovenCfg: {
        panType: "ci_lid",
        ovenType: "electric",
        ovenMode: "static",
        temp: 170,
        cieloPct: 50,
      },
      sourcePrep: null,
    },
    {
      id: "done",
      title: "Buon Appetito!",
      type: "done",
      group: "Impasto",
      baseDur: 0,
      deps: [{ id: "bake", wait: 1 }],
      kneadMethod: null,
      desc: "Sforna e intiepidisci.",
      flours: [],
      liquids: [],
      extras: [],
      yeasts: [],
      riseMethod: null,
      ovenCfg: null,
      sourcePrep: null,
    },
  ],
};
const BASE_D = (() => {
  let t = 0;
  for (const s of INIT.steps) {
    for (const f of s.flours) t += f.g;
    for (const l of s.liquids) t += l.g;
    for (const e of s.extras) if (!e.unit) t += e.g;
    for (const y of s.yeasts) t += y.g;
  }
  return t;
})();

/* FLOUR PICKER */
function FlourPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const cur = getFlour(value);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filt = search.trim()
    ? FLOUR_CATALOG.filter((f) =>
        (f.label + " " + f.sub + " " + f.group)
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : FLOUR_CATALOG;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...selS,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cur.label}{" "}
          <span style={{ fontSize: 10, color: "#a08060" }}>{cur.sub}</span>
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1.5px solid #d4c4b0",
            borderRadius: 10,
            marginTop: 4,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            maxHeight: 280,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{ padding: "8px 10px", borderBottom: "1px solid #f0e8df" }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca farina..."
              autoFocus
              style={{
                fontFamily: Fn,
                fontSize: 12,
                border: "1px solid #e0d3c5",
                borderRadius: 6,
                padding: "5px 8px",
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {FLOUR_GROUPS.map((g) => {
              const items = filt.filter((f) => f.group === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <div
                    style={{
                      fontFamily: Fn,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#b8845a",
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      padding: "8px 12px 2px",
                      position: "sticky",
                      top: 0,
                      background: "#fff",
                    }}
                  >
                    {g}
                  </div>
                  {items.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        onChange(f.key);
                        setOpen(false);
                        setSearch("");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 12px",
                        border: "none",
                        cursor: "pointer",
                        background: f.key === value ? "#fef6ed" : "transparent",
                        fontFamily: Fn,
                        fontSize: 12,
                        color: "#2c1810",
                      }}
                    >
                      {f.label}{" "}
                      <span style={{ fontSize: 10, color: "#a08060" }}>
                        {f.sub}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
        {[
          { l: "Prot", v: cur.protein + "%", c: "#5a6070" },
          { l: "W", v: cur.W || "—", c: "#d4a54a" },
          { l: "Ass.", v: cur.absorption + "%", c: "#5090c0" },
          { l: "Cen.", v: cur.ash + "%", c: "#8a6e55" },
        ].map((it) => (
          <span
            key={it.l}
            style={{
              fontFamily: Fn,
              fontSize: 9,
              color: it.c,
              background: "#f5f2ee",
              borderRadius: 4,
              padding: "1px 5px",
            }}
          >
            {it.l}: <b>{it.v}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* MAIN */
export default function App() {
  const [recipe, setR] = useState(() => JSON.parse(JSON.stringify(INIT)));
  const [openStep, setOS] = useState(null);
  const [tu, setTU] = useState("C");
  const [at, setAT] = useState(24);
  const [pm, setPM] = useState("forward");
  const now = new Date();
  const [fH, sFH] = useState(now.getHours());
  const [fM, sFM] = useState(Math.floor(now.getMinutes() / 5) * 5);
  const [bD, sBD] = useState(1);
  const [bH, sBH] = useState(12);
  const [bM, sBM] = useState(0);
  const [dm, sDM] = useState({});
  const [dt2, sDT] = useState({});
  const [started, sSt] = useState(false);
  const { portioning: po, steps, ingredientGroups: ig } = recipe;
  const dTf = (c) => (tu === "F" ? c2f(c) + " °F" : c + " °C");
  const tA = po.tray.l * po.tray.w;
  const tTD = Math.round(tA * po.thickness * po.tray.count);
  const bTD = po.ball.weight * po.ball.count;
  const target = po.mode === "tray" ? tTD : bTD;
  const tF = steps.reduce(
    (s, st) => s + st.flours.reduce((a, f) => a + f.g, 0),
    0,
  );
  const tL = steps.reduce(
    (s, st) => s + st.liquids.reduce((a, l) => a + l.g, 0),
    0,
  );
  const tE = steps.reduce(
    (s, st) => s + st.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0),
    0,
  );
  const tY = steps.reduce(
    (s, st) => s + (st.yeasts || []).reduce((a, y) => a + y.g, 0),
    0,
  );
  const tD = tF + tL + tE + tY;
  const cH = tF > 0 ? Math.round((tL / tF) * 100) : 0;
  function scaleAll(n) {
    if (tD <= 0) return;
    const f = n / tD;
    setR((p) => ({
      ...p,
      steps: p.steps.map((s) => ({
        ...s,
        flours: s.flours.map((x) => ({ ...x, g: rnd(x.g * f) })),
        liquids: s.liquids.map((x) => ({ ...x, g: rnd(x.g * f) })),
        extras: s.extras.map((x) => (x.unit ? x : { ...x, g: rnd(x.g * f) })),
        yeasts: (s.yeasts || []).map((x) => ({ ...x, g: rnd(x.g * f) })),
      })),
    }));
  }
  function setHyd(h) {
    const t = (tF * h) / 100;
    if (tL <= 0) return;
    const f = t / tL;
    setR((p) => ({
      ...p,
      steps: p.steps.map((s) => ({
        ...s,
        liquids: s.liquids.map((l) => ({ ...l, g: rnd(l.g * f) })),
      })),
    }));
  }
  function setStepH(sid, h) {
    uS(sid, (s) => {
      const sf = s.flours.reduce((a, f) => a + f.g, 0);
      const sl = s.liquids.reduce((a, l) => a + l.g, 0);
      if (sf <= 0 || sl <= 0) return s;
      return {
        ...s,
        liquids: s.liquids.map((l) => ({
          ...l,
          g: rnd((l.g * ((sf * h) / 100)) / sl),
        })),
      };
    });
  }
  function uS(id, fn) {
    setR((p) => ({
      ...p,
      steps: p.steps.map((s) => (s.id === id ? fn(s) : s)),
    }));
  }
  function uSF(id, f, v) {
    uS(id, (s) => ({ ...s, [f]: v }));
  }
  function uPo(fn) {
    setR((p) => ({ ...p, portioning: fn(p.portioning) }));
  }
  function handlePC(np) {
    const nt =
      np.mode === "tray"
        ? np.tray.l * np.tray.w * np.thickness * np.tray.count
        : np.ball.weight * np.ball.count;
    setR((p) => {
      const old = p.steps.reduce(
        (s, st) =>
          s +
          st.flours.reduce((a, f) => a + f.g, 0) +
          st.liquids.reduce((a, l) => a + l.g, 0) +
          st.extras.reduce((a, e) => a + (e.unit ? 0 : e.g), 0) +
          (st.yeasts || []).reduce((a, y) => a + y.g, 0),
        0,
      );
      if (old <= 0) return { ...p, portioning: np };
      const f = nt / old;
      return {
        ...p,
        portioning: np,
        steps: p.steps.map((s) => ({
          ...s,
          flours: s.flours.map((x) => ({ ...x, g: rnd(x.g * f) })),
          liquids: s.liquids.map((x) => ({ ...x, g: rnd(x.g * f) })),
          extras: s.extras.map((x) => (x.unit ? x : { ...x, g: rnd(x.g * f) })),
          yeasts: (s.yeasts || []).map((x) => ({ ...x, g: rnd(x.g * f) })),
        })),
      };
    });
  }
  function applyDef(tk, sk) {
    const subs = RECIPE_SUBTYPES[tk] || [];
    const sub = subs.find((s) => s.key === sk);
    if (!sub) return;
    const d = sub.defaults;
    const np = { ...po, mode: d.mode };
    if (d.thickness) np.thickness = d.thickness;
    if (d.ballG) np.ball = { ...np.ball, weight: d.ballG };
    handlePC(np);
    if (d.hyd) setTimeout(() => setHyd(d.hyd), 50);
  }
  const grpI = useMemo(() => {
    const g = {};
    for (const grp of ig)
      g[grp] = { flours: [], liquids: [], extras: [], yeasts: [] };
    for (const s of steps) {
      const gr = g[s.group];
      if (!gr) continue;
      for (const f of s.flours) {
        const e = gr.flours.find((x) => x.type === f.type);
        if (e) e.g += f.g;
        else gr.flours.push({ ...f });
      }
      for (const l of s.liquids) {
        const e = gr.liquids.find((x) => x.type === l.type);
        if (e) e.g += l.g;
        else gr.liquids.push({ ...l });
      }
      for (const e of s.extras) {
        const ex = gr.extras.find((x) => x.name === e.name);
        if (ex) ex.g += e.g;
        else gr.extras.push({ ...e });
      }
      for (const y of s.yeasts || []) {
        const ex = gr.yeasts.find((x) => x.type === y.type);
        if (ex) ex.g += y.g;
        else gr.yeasts.push({ ...y });
      }
    }
    return g;
  }, [steps, ig]);
  function getYD(rs) {
    const src = rs.sourcePrep
      ? steps.find((s) => s.id === rs.sourcePrep)
      : null;
    const ys = src ? src.yeasts || [] : [];
    if (!ys.length)
      return { fe: 0, sf: 1, fl: tF, bp: blendFP(src ? src.flours : []) };
    let fe = 0,
      ws = 0;
    for (const y of ys) {
      const yt = YEAST_TYPES.find((t) => t.key === y.type) || YEAST_TYPES[0];
      const f = y.g * yt.toFresh;
      fe += f;
      ws += f * yt.speedF;
    }
    return {
      fe,
      sf: fe > 0 ? ws / fe : 1,
      fl: (src ? src.flours.reduce((a, f) => a + f.g, 0) : tF) || tF,
      bp: blendFP(src ? src.flours : []),
    };
  }
  function gFDT(ps) {
    if (!ps || !ps.flours.length) return at;
    const km =
      KNEAD_METHODS.find((m) => m.key === ps.kneadMethod) || KNEAD_METHODS[0];
    return calcFDT(ps.flours, ps.liquids, at, km.ff);
  }
  function sDur(s) {
    if (s.type === "rise" && s.riseMethod) {
      const yd = getYD(s);
      const yP = yd.fl > 0 ? (yd.fe / yd.fl) * 100 : 2;
      const src = s.sourcePrep
        ? steps.find((st) => st.id === s.sourcePrep)
        : null;
      return calcRD(
        s.baseDur,
        s.riseMethod,
        yd.bp,
        yP,
        yd.sf,
        riseTF(gFDT(src), s.riseMethod),
      );
    }
    if (s.type === "bake" && s.ovenCfg) {
      const tm =
        TRAY_MATERIALS.find((m) => m.key === s.ovenCfg.panType) ||
        TRAY_MATERIALS[0];
      return Math.max(
        10,
        Math.round(
          (((tm.bMin + tm.bMax) / 2) * tm.defTemp) /
            Math.max(s.ovenCfg.temp, 100),
        ),
      );
    }
    return s.baseDur;
  }
  const stD = useMemo(
    () => steps.map((s) => ({ ...s, dur: sDur(s) })),
    [steps, at],
  );
  const span = useMemo(() => {
    const t0 = new Date(2e3, 0, 1);
    let mx = t0;
    const tmp = [];
    for (const s of stD) {
      let e = t0;
      for (const d of s.deps) {
        const x = tmp.find((r) => r.id === d.id);
        if (x) {
          const t = new Date(x.s.getTime() + (x.e - x.s) * d.wait);
          if (t > e) e = t;
        }
      }
      const st = new Date(e);
      const en = new Date(st.getTime() + s.dur * 6e4);
      tmp.push({ id: s.id, s: st, e: en });
      if (en > mx) mx = en;
    }
    return Math.round((mx - t0) / 6e4);
  }, [stD]);
  const st0 = useMemo(() => {
    if (pm === "forward")
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), fH, fM);
    return new Date(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + bD,
        bH,
        bM,
      ).getTime() -
        span * 6e4,
    );
  }, [pm, fH, fM, bD, bH, bM, span]);
  const sched = useMemo(() => {
    const r = [];
    for (const s of stD) {
      let e = st0;
      for (const d of s.deps) {
        const x = r.find((z) => z.id === d.id);
        if (x) {
          const dE = x.aE || x.end;
          const t = new Date(x.start.getTime() + (dE - x.start) * d.wait);
          if (t > e) e = t;
        }
      }
      r.push({
        ...s,
        start: new Date(e),
        end: new Date(e.getTime() + s.dur * 6e4),
        aE: dm[s.id] && dt2[s.id] ? new Date(dt2[s.id]) : null,
      });
    }
    return r;
  }, [stD, st0, dm, dt2]);
  const endT = sched.length
    ? sched[sched.length - 1].aE || sched[sched.length - 1].end
    : null;
  const tSm = useMemo(() => {
    const c = {};
    stD.forEach((s) => {
      c[s.type] = (c[s.type] || 0) + s.dur;
    });
    return {
      total: span,
      pr: (c.pre_dough || 0) + (c.dough || 0) + (c.rest || 0) + (c.shape || 0),
      rise: c.rise || 0,
      bake: c.bake || 0,
    };
  }, [stD, span]);
  const fND = stD.find((p) => !dm[p.id])?.id;
  const hDn = (id) => {
    sDM((p) => ({ ...p, [id]: true }));
    sDT((p) => ({ ...p, [id]: Date.now() }));
  };
  const hUn = (id) => {
    const i = stD.findIndex((p) => p.id === id);
    sDM((p) => {
      const n = { ...p };
      for (let j = i; j < stD.length; j++) delete n[stD[j].id];
      return n;
    });
    sDT((p) => {
      const n = { ...p };
      for (let j = i; j < stD.length; j++) delete n[stD[j].id];
      return n;
    });
  };
  const hSt = () => {
    const n = new Date();
    setPM("forward");
    sFH(n.getHours());
    sFM(Math.floor(n.getMinutes() / 5) * 5);
    sDM({});
    sDT({});
    sSt(true);
  };
  const hNw = () => {
    const n = new Date();
    sFH(n.getHours());
    sFM(Math.floor(n.getMinutes() / 5) * 5);
  };
  const DL = ["Oggi", "Domani", "Dopodomani", "Tra 3gg"];
  const relD = (d) => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const df = Math.round(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t) / 864e5,
    );
    return df === 0
      ? "oggi"
      : df === 1
        ? "domani"
        : df === 2
          ? "dopodomani"
          : df < 0
            ? Math.abs(df) + "gg fa"
            : "tra " + df + "gg";
  };
  const thkL = (t) =>
    t <= 0.2
      ? "Sottilissimo"
      : t <= 0.4
        ? "Sottile"
        : t <= 0.6
          ? "Medio"
          : t <= 0.9
            ? "Alto"
            : t <= 1.4
              ? "Molto alto"
              : "Molto spesso";
  const curSubs = RECIPE_SUBTYPES[recipe.meta.type] || [];

  /* Step body renderer */
  function renderBody(s) {
    const sF = s.flours.reduce((a, f) => a + f.g, 0);
    const sL = s.liquids.reduce((a, l) => a + l.g, 0);
    const sH = sF > 0 ? Math.round((sL / sF) * 100) : 0;
    const hasI =
      s.flours.length > 0 ||
      s.liquids.length > 0 ||
      s.extras.length > 0 ||
      (s.yeasts || []).length > 0;
    return (
      <div style={{ padding: "0 12px 12px", borderTop: "1px solid #f0e8df" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <MiniSel
            label="Tipo"
            value={s.type}
            onChange={(v) => uSF(s.id, "type", v)}
            options={STEP_TYPES.map((t) => ({
              k: t.key,
              l: t.icon + " " + t.label,
            }))}
          />
          <MiniSel
            label="Gruppo"
            value={s.group}
            onChange={(v) => uSF(s.id, "group", v)}
            options={[
              ...ig.map((g) => ({ k: g, l: g })),
              { k: "__new__", l: "+ Nuovo..." },
            ]}
            onNew={(n) => {
              setR((p) => ({
                ...p,
                ingredientGroups: [...p.ingredientGroups, n],
              }));
              uSF(s.id, "group", n);
            }}
          />
        </div>
        <p
          style={{
            fontFamily: Fn,
            fontSize: 13,
            lineHeight: 1.65,
            color: "#5a4538",
            margin: "4px 0 8px",
          }}
        >
          {s.desc}
        </p>
        {hasI && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 4,
            }}
          >
            {s.flours.length > 0 && (
              <IngBox
                title="Farine"
                items={s.flours}
                onUpdate={(id, f, v) =>
                  uS(s.id, (st) => ({
                    ...st,
                    flours: st.flours.map((x) =>
                      x.id === id ? { ...x, [f]: v } : x,
                    ),
                  }))
                }
                onRemove={(id) =>
                  uS(s.id, (st) => ({
                    ...st,
                    flours: st.flours.filter((x) => x.id !== id),
                  }))
                }
                onAdd={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    flours: [
                      ...st.flours,
                      {
                        id: nextId(st.flours),
                        type: "gt_00_med",
                        g: 50,
                        temp: null,
                      },
                    ],
                  }))
                }
                renderItem={(item, onU) => (
                  <div>
                    <FlourPicker
                      value={item.type}
                      onChange={(v) => onU("type", v)}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <input
                          type="number"
                          value={item.temp ?? (tu === "F" ? c2f(at) : at)}
                          step={1}
                          onChange={(e) =>
                            onU(
                              "temp",
                              tu === "F"
                                ? f2c(+e.target.value)
                                : +e.target.value,
                            )
                          }
                          style={{ ...numS, fontSize: 11, color: "#8a6e55" }}
                        />
                        <span
                          style={{
                            fontFamily: Fn,
                            fontSize: 8,
                            color: "#b8a08a",
                          }}
                        >
                          {tu === "F" ? "°F" : "°C"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <input
                          type="number"
                          value={item.g}
                          step={5}
                          min={0}
                          onChange={(e) =>
                            onU("g", parseFloat(e.target.value) || 0)
                          }
                          style={numS}
                        />
                        <span
                          style={{
                            fontFamily: Fn,
                            fontSize: 10,
                            color: "#8a6e55",
                          }}
                        >
                          g
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
            {s.liquids.length > 0 && (
              <IngBox
                title="Liquidi"
                items={s.liquids}
                onUpdate={(id, f, v) =>
                  uS(s.id, (st) => ({
                    ...st,
                    liquids: st.liquids.map((x) =>
                      x.id === id ? { ...x, [f]: v } : x,
                    ),
                  }))
                }
                onRemove={(id) =>
                  uS(s.id, (st) => ({
                    ...st,
                    liquids: st.liquids.filter((x) => x.id !== id),
                  }))
                }
                onAdd={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    liquids: [
                      ...st.liquids,
                      {
                        id: nextId(st.liquids),
                        type: "Acqua",
                        g: 50,
                        temp: null,
                      },
                    ],
                  }))
                }
                renderItem={(item, onU) => (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 58px 70px",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    <LiqSel
                      value={item.type}
                      onChange={(v) => onU("type", v)}
                    />
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <input
                        type="number"
                        value={item.temp ?? (tu === "F" ? c2f(at) : at)}
                        step={1}
                        onChange={(e) =>
                          onU(
                            "temp",
                            tu === "F" ? f2c(+e.target.value) : +e.target.value,
                          )
                        }
                        style={{
                          ...numS,
                          fontSize: 11,
                          padding: "5px 4px",
                          color: "#8a6e55",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: Fn,
                          fontSize: 8,
                          color: "#b8a08a",
                        }}
                      >
                        {tu === "F" ? "°F" : "°C"}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <input
                        type="number"
                        value={item.g}
                        step={5}
                        min={0}
                        onChange={(e) =>
                          onU("g", parseFloat(e.target.value) || 0)
                        }
                        style={numS}
                      />
                      <span
                        style={{
                          fontFamily: Fn,
                          fontSize: 10,
                          color: "#8a6e55",
                        }}
                      >
                        g
                      </span>
                    </div>
                  </div>
                )}
              />
            )}
            {sF > 0 && sL > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  background: "#fef6ed",
                  borderRadius: 7,
                  fontFamily: Fn,
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#8a6e40" }}>Idrataz.:</span>
                <input
                  type="number"
                  value={sH}
                  step={1}
                  onChange={(e) => setStepH(s.id, +e.target.value || 0)}
                  style={{
                    width: 54,
                    fontFamily: Fn,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#d4a54a",
                    background: "#fff",
                    border: "1px solid #e0d3c5",
                    borderRadius: 5,
                    padding: "2px 6px",
                    outline: "none",
                    textAlign: "center",
                  }}
                />
                <span style={{ color: "#8a6e40" }}>%</span>
              </div>
            )}
            {s.extras.length > 0 && (
              <IngBox
                title="Extra"
                items={s.extras}
                onUpdate={(id, f, v) =>
                  uS(s.id, (st) => ({
                    ...st,
                    extras: st.extras.map((x) =>
                      x.id === id ? { ...x, [f]: v } : x,
                    ),
                  }))
                }
                onRemove={(id) =>
                  uS(s.id, (st) => ({
                    ...st,
                    extras: st.extras.filter((x) => x.id !== id),
                  }))
                }
                onAdd={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    extras: [
                      ...st.extras,
                      { id: nextId(st.extras), name: "Nuovo", g: 10 },
                    ],
                  }))
                }
                renderItem={(item, onU) => (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 60px",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    <ExtSel
                      value={item.name}
                      onChange={(v) => onU("name", v)}
                    />
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <input
                        type="number"
                        value={item.g}
                        step={1}
                        min={0}
                        onChange={(e) =>
                          onU("g", parseFloat(e.target.value) || 0)
                        }
                        style={numS}
                      />
                      <span
                        style={{
                          fontFamily: Fn,
                          fontSize: 10,
                          color: "#8a6e55",
                        }}
                      >
                        {item.unit || "g"}
                      </span>
                    </div>
                  </div>
                )}
              />
            )}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {s.flours.length === 0 && (
                <AddB
                  l="+ Farina"
                  c={() =>
                    uS(s.id, (st) => ({
                      ...st,
                      flours: [{ id: 0, type: "gt_0_for", g: 100, temp: null }],
                    }))
                  }
                />
              )}
              {s.liquids.length === 0 && (
                <AddB
                  l="+ Liquido"
                  c={() =>
                    uS(s.id, (st) => ({
                      ...st,
                      liquids: [{ id: 0, type: "Acqua", g: 50, temp: null }],
                    }))
                  }
                />
              )}
              {(s.yeasts || []).length === 0 &&
                (s.type === "dough" || s.type === "pre_dough") && (
                  <AddB
                    l="+ Lievito"
                    c={() =>
                      uS(s.id, (st) => ({
                        ...st,
                        yeasts: [{ id: 0, type: "fresh", g: 6 }],
                      }))
                    }
                  />
                )}
            </div>
            {(s.yeasts || []).length > 0 && (
              <IngBox
                title="Lieviti"
                items={s.yeasts}
                onUpdate={(id, f, v) =>
                  uS(s.id, (st) => ({
                    ...st,
                    yeasts: st.yeasts.map((y) =>
                      y.id === id ? { ...y, [f]: v } : y,
                    ),
                  }))
                }
                onRemove={(id) =>
                  uS(s.id, (st) => ({
                    ...st,
                    yeasts: st.yeasts.filter((y) => y.id !== id),
                  }))
                }
                onAdd={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    yeasts: [
                      ...st.yeasts,
                      { id: nextId(st.yeasts), type: "fresh", g: 3 },
                    ],
                  }))
                }
                renderItem={(item, onU) => {
                  const yt =
                    YEAST_TYPES.find((y) => y.key === item.type) ||
                    YEAST_TYPES[0];
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 60px",
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={item.type}
                        onChange={(e) => {
                          const o =
                            YEAST_TYPES.find((y) => y.key === item.type) ||
                            YEAST_TYPES[0];
                          const n =
                            YEAST_TYPES.find((y) => y.key === e.target.value) ||
                            YEAST_TYPES[0];
                          onU("g", rnd((item.g * o.toFresh) / n.toFresh));
                          onU("type", e.target.value);
                        }}
                        style={selS}
                      >
                        {YEAST_TYPES.map((y) => (
                          <option key={y.key} value={y.key}>
                            {y.label}
                          </option>
                        ))}
                      </select>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <input
                          type="number"
                          value={item.g}
                          step={yt.hasFW ? 5 : 0.5}
                          min={0.1}
                          onChange={(e) =>
                            onU("g", parseFloat(e.target.value) || 0.1)
                          }
                          style={numS}
                        />
                        <span
                          style={{
                            fontFamily: Fn,
                            fontSize: 10,
                            color: "#8a6e55",
                          }}
                        >
                          g
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>
        )}
        {s.type === "dough" && sF > 0 && (
          <div
            style={{
              marginTop: 6,
              padding: "8px 10px",
              background: "#f0eef5",
              borderRadius: 8,
              border: "1px solid #d8d0e5",
            }}
          >
            <div
              style={{
                fontFamily: Fn,
                fontSize: 9,
                fontWeight: 600,
                color: "#6050a0",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Impasto & Temperatura
            </div>
            <select
              value={s.kneadMethod || "hand"}
              onChange={(e) => uSF(s.id, "kneadMethod", e.target.value)}
              style={{ ...selS, marginBottom: 4 }}
            >
              {KNEAD_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} (+{m.ff}°C)
                </option>
              ))}
            </select>
            {(() => {
              const fdt = gFDT(s);
              const ok = fdt >= 24 && fdt <= 26;
              return (
                <div
                  style={{
                    fontFamily: Fn,
                    fontSize: 12,
                    fontWeight: 700,
                    color: ok ? "#3a7a3a" : fdt < 24 ? "#4060b0" : "#c45a3a",
                  }}
                >
                  🌡️ {dTf(Math.round(fdt))}{" "}
                  <span
                    style={{ fontSize: 9, fontWeight: 400, color: "#8a6e55" }}
                  >
                    (ideale: {dTf(24)}–{dTf(26)})
                  </span>
                </div>
              );
            })()}
          </div>
        )}
        {s.riseMethod && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {s.sourcePrep != null && (
              <Fld label="Impasto di Riferimento">
                <select
                  value={s.sourcePrep || ""}
                  onChange={(e) => uSF(s.id, "sourcePrep", e.target.value)}
                  style={selS}
                >
                  <option value="">—</option>
                  {steps
                    .filter((st) => (st.yeasts || []).length > 0)
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.title}
                      </option>
                    ))}
                </select>
              </Fld>
            )}
            <Fld label="Metodo">
              <select
                value={s.riseMethod}
                onChange={(e) => uSF(s.id, "riseMethod", e.target.value)}
                style={selS}
              >
                {RISE_METHODS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div
                style={{
                  fontFamily: Fn,
                  fontSize: 10,
                  color: "#8a6e55",
                  marginTop: 2,
                }}
              >
                Durata: <b>{fmtD(sDur(s))}</b>
              </div>
            </Fld>
          </div>
        )}
        {s.ovenCfg && (
          <OvenEd
            cfg={s.ovenCfg}
            tu={tu}
            stu={setTU}
            dT={dTf}
            ch={(f, v) =>
              uS(s.id, (st) => ({ ...st, ovenCfg: { ...st.ovenCfg, [f]: v } }))
            }
            sd={sDur(s)}
            bd={s.baseDur}
          />
        )}
        {s.deps.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary
              style={{
                fontFamily: Fn,
                fontSize: 10,
                color: "#b8a08a",
                cursor: "pointer",
                listStyle: "none",
              }}
            >
              ▸ Dipende da ({s.deps.length})
            </summary>
            <div style={{ marginTop: 3 }}>
              {s.deps.map((dep) => {
                const ds = steps.find((x) => x.id === dep.id);
                return ds ? (
                  <div
                    key={dep.id}
                    style={{
                      fontFamily: Fn,
                      fontSize: 10,
                      color: "#6a5a48",
                      padding: "3px 6px",
                      background: "#f5f0ea",
                      borderRadius: 5,
                      marginBottom: 2,
                    }}
                  >
                    {(STEP_TYPES.find((t) => t.key === ds.type) || {}).icon}{" "}
                    {ds.title}
                  </div>
                ) : null;
              })}
            </div>
          </details>
        )}
      </div>
    );
  }

  /* RENDER */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf6f1",
        fontFamily: "'Playfair Display','Georgia',serif",
        color: "#2c1810",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg,#d4a574,#c4956a 50%,#b8845a)",
          padding: "30px 24px 22px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 2 }}>
          {(RECIPE_TYPES.find((t) => t.key === recipe.meta.type) || {}).icon ||
            "🍞"}
        </div>
        <input
          value={recipe.meta.name}
          onChange={(e) =>
            setR((p) => ({ ...p, meta: { ...p.meta, name: e.target.value } }))
          }
          style={{
            fontSize: "clamp(18px,5vw,26px)",
            fontWeight: 700,
            color: "#fff",
            background: "transparent",
            border: "none",
            outline: "none",
            textAlign: "center",
            width: "100%",
            fontFamily: "'Playfair Display',serif",
          }}
        />
        <div
          style={{
            fontFamily: Fn,
            fontSize: 11,
            color: "rgba(255,255,255,.7)",
            marginTop: 2,
          }}
        >
          di{" "}
          <input
            value={recipe.meta.author}
            onChange={(e) =>
              setR((p) => ({
                ...p,
                meta: { ...p.meta, author: e.target.value },
              }))
            }
            style={{
              fontFamily: Fn,
              fontSize: 11,
              color: "rgba(255,255,255,.9)",
              background: "transparent",
              border: "none",
              borderBottom: "1px dashed rgba(255,255,255,.4)",
              outline: "none",
              textAlign: "center",
              width: 140,
            }}
          />
        </div>
      </div>
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "0 16px 48px" }}>
        {/* TYPE/SUBTYPE */}
        <section style={{ marginTop: 14 }}>
          <Crd>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <label
                  style={{
                    fontFamily: Fn,
                    fontSize: 9,
                    color: "#8a6e55",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Tipologia
                </label>
                <select
                  value={recipe.meta.type}
                  onChange={(e) => {
                    const nk = e.target.value;
                    const ns = (RECIPE_SUBTYPES[nk] || [])[0]?.key || "";
                    setR((p) => ({
                      ...p,
                      meta: { ...p.meta, type: nk, subtype: ns },
                    }));
                    if (ns) applyDef(nk, ns);
                  }}
                  style={selS}
                >
                  {RECIPE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontFamily: Fn,
                    fontSize: 9,
                    color: "#8a6e55",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Sotto-tipologia
                </label>
                <select
                  value={recipe.meta.subtype}
                  onChange={(e) => {
                    setR((p) => ({
                      ...p,
                      meta: { ...p.meta, subtype: e.target.value },
                    }));
                    applyDef(recipe.meta.type, e.target.value);
                  }}
                  style={selS}
                >
                  {curSubs.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Crd>
        </section>

        {/* PORTIONING */}
        <section style={{ marginTop: 14 }}>
          <SH e="📐" t="Porzionatura" />
          <Crd>
            <div
              style={{
                display: "flex",
                borderRadius: 7,
                overflow: "hidden",
                border: "1.5px solid #e0d3c5",
                marginBottom: 10,
              }}
            >
              {[
                { k: "tray", l: "🍳 Teglia" },
                { k: "ball", l: "🫓 Panetti" },
              ].map((tab) => (
                <button
                  key={tab.k}
                  onClick={() => handlePC({ ...po, mode: tab.k })}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    border: "none",
                    cursor: "pointer",
                    background: po.mode === tab.k ? "#d4a574" : "#fff",
                    color: po.mode === tab.k ? "#fff" : "#8a6e55",
                    fontFamily: Fn,
                    fontSize: 11,
                    fontWeight: po.mode === tab.k ? 700 : 400,
                  }}
                >
                  {tab.l}
                </button>
              ))}
            </div>
            {po.mode === "tray" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label
                    style={{
                      fontFamily: Fn,
                      fontSize: 9,
                      color: "#8a6e55",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Teglia
                  </label>
                  <select
                    value={po.tray.preset || ""}
                    onChange={(e) => {
                      const p = TRAY_PRESETS.find(
                        (x) => x.key === e.target.value,
                      );
                      if (p)
                        handlePC({
                          ...po,
                          tray: {
                            ...po.tray,
                            preset: p.key,
                            l: p.l,
                            w: p.w,
                            h: p.h,
                            material: p.material,
                            griglia: p.griglia,
                          },
                        });
                    }}
                    style={selS}
                  >
                    {TRAY_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 6,
                  }}
                >
                  <NI
                    l="L (cm)"
                    v={po.tray.l}
                    set={(v) => handlePC({ ...po, tray: { ...po.tray, l: v } })}
                  />
                  <NI
                    l="P (cm)"
                    v={po.tray.w}
                    set={(v) => handlePC({ ...po, tray: { ...po.tray, w: v } })}
                  />
                  <NI
                    l="H (cm)"
                    v={po.tray.h}
                    set={(v) => handlePC({ ...po, tray: { ...po.tray, h: v } })}
                    s={0.5}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontFamily: Fn,
                        fontSize: 9,
                        color: "#8a6e55",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Materiale
                    </label>
                    <select
                      value={po.tray.material}
                      onChange={(e) =>
                        uPo((p) => ({
                          ...p,
                          tray: { ...p.tray, material: e.target.value },
                        }))
                      }
                      style={selS}
                    >
                      {TRAY_MATERIALS.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label
                    style={{
                      fontFamily: Fn,
                      fontSize: 10,
                      color: "#6a5a48",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      paddingBottom: 6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={po.tray.griglia || false}
                      onChange={(e) =>
                        uPo((p) => ({
                          ...p,
                          tray: { ...p.tray, griglia: e.target.checked },
                        }))
                      }
                      style={{ accentColor: "#d4a574" }}
                    />
                    Foro di sfiato
                  </label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{ fontFamily: Fn, fontSize: 11, color: "#8a6e55" }}
                  >
                    N° teglie
                  </span>
                  <PMB
                    click={() =>
                      handlePC({
                        ...po,
                        tray: {
                          ...po.tray,
                          count: Math.max(1, po.tray.count - 1),
                        },
                      })
                    }
                    l="−"
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      minWidth: 24,
                      textAlign: "center",
                    }}
                  >
                    {po.tray.count}
                  </span>
                  <PMB
                    click={() =>
                      handlePC({
                        ...po,
                        tray: {
                          ...po.tray,
                          count: Math.min(10, po.tray.count + 1),
                        },
                      })
                    }
                    l="+"
                  />
                </div>
                {/* Thickness slider */}
                <div
                  style={{
                    background: "#fef6ed",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: Fn,
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#8a6e40",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Spessore impasto
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={2}
                    step={0.1}
                    value={po.thickness}
                    onChange={(e) =>
                      handlePC({ ...po, thickness: +e.target.value })
                    }
                    style={{ width: "100%", accentColor: "#d4a574" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: Fn,
                      fontSize: 10,
                      color: "#8a6e55",
                      marginTop: 2,
                    }}
                  >
                    <span>
                      {thkL(po.thickness)} ({po.thickness} g/cm²)
                    </span>
                    <span>~{tTD} g</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NI
                  l="Peso singolo (g)"
                  v={po.ball.weight}
                  set={(v) =>
                    handlePC({
                      ...po,
                      ball: { ...po.ball, weight: Math.max(30, v) },
                    })
                  }
                  s={10}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{ fontFamily: Fn, fontSize: 11, color: "#8a6e55" }}
                  >
                    N° panetti
                  </span>
                  <PMB
                    click={() =>
                      handlePC({
                        ...po,
                        ball: {
                          ...po.ball,
                          count: Math.max(1, po.ball.count - 1),
                        },
                      })
                    }
                    l="−"
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      minWidth: 24,
                      textAlign: "center",
                    }}
                  >
                    {po.ball.count}
                  </span>
                  <PMB
                    click={() =>
                      handlePC({
                        ...po,
                        ball: {
                          ...po.ball,
                          count: Math.min(50, po.ball.count + 1),
                        },
                      })
                    }
                    l="+"
                  />
                </div>
              </div>
            )}
            {/* Totale + idratazione */}
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                background: "linear-gradient(135deg,#f9f3ec,#f5ede3)",
                borderRadius: 7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: Fn,
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#8a6e55" }}>Totale impasto</span>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <input
                    type="number"
                    value={Math.round(tD)}
                    step={10}
                    min={50}
                    onChange={(e) => scaleAll(+e.target.value || 50)}
                    style={{
                      width: 70,
                      fontFamily: Fn,
                      fontSize: 14,
                      fontWeight: 700,
                      background: "#fff",
                      border: "1.5px solid #e0d3c5",
                      borderRadius: 6,
                      padding: "3px 6px",
                      outline: "none",
                      textAlign: "center",
                    }}
                  />
                  <span style={{ color: "#8a6e55" }}>g</span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: Fn,
                  fontSize: 10,
                  color: "#8a6e55",
                  marginTop: 4,
                  flexWrap: "wrap",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  Idrataz.:{" "}
                  <input
                    type="number"
                    value={cH}
                    step={1}
                    onChange={(e) => setHyd(+e.target.value || 0)}
                    style={{
                      width: 50,
                      fontFamily: Fn,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#d4a54a",
                      background: "#fff",
                      border: "1px solid #e0d3c5",
                      borderRadius: 4,
                      padding: "1px 5px",
                      outline: "none",
                      textAlign: "center",
                    }}
                  />
                  %
                </div>
                <span>
                  Liq: <b>{rnd(tL)}g</b> · Far: <b>{rnd(tF)}g</b>
                </span>
              </div>
            </div>
          </Crd>
        </section>

        {/* INGREDIENTS */}
        <section style={{ marginTop: 14 }}>
          <SH e="🧈" t="Ingredienti" />
          {ig.map((g) => {
            const grp = grpI[g];
            if (
              !grp ||
              grp.flours.length +
                grp.liquids.length +
                grp.extras.length +
                grp.yeasts.length ===
                0
            )
              return null;
            return (
              <Crd key={g} style={{ marginBottom: 5 }}>
                <Sub>{g}</Sub>
                {grp.flours.map((f) => (
                  <IR
                    key={"f" + f.type}
                    n={getFlour(f.type).label}
                    a={rnd(f.g)}
                    u="g"
                  />
                ))}
                {grp.liquids.map((l) => (
                  <IR key={"l" + l.type} n={l.type} a={rnd(l.g)} u="g" />
                ))}
                {grp.yeasts.map((y) => (
                  <IR
                    key={"y" + y.type}
                    n={
                      (YEAST_TYPES.find((t) => t.key === y.type) || {}).label ||
                      "Lievito"
                    }
                    a={rnd(y.g)}
                    u="g"
                  />
                ))}
                {grp.extras.map((e) => (
                  <IR
                    key={"e" + e.name}
                    n={e.name}
                    a={e.unit ? e.g : rnd(e.g)}
                    u={e.unit || "g"}
                  />
                ))}
              </Crd>
            );
          })}
        </section>

        {/* TEMPI */}
        <section style={{ marginTop: 14 }}>
          <SH e="⏱️" t="Tempi" />
          <Crd>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 5,
                fontFamily: Fn,
              }}
            >
              <TB l="Totale" v={fmtD(tSm.total)} c="#2c1810" />
              <TB l="Prep." v={fmtD(tSm.pr)} c="#8892a8" />
              <TB l="Lievitaz." v={fmtD(tSm.rise)} c="#d4a54a" />
              <TB l="Cottura" v={fmtD(tSm.bake)} c="#d47a50" />
            </div>
          </Crd>
          <Crd style={{ marginTop: 5 }}>
            <div
              style={{
                display: "flex",
                borderRadius: 7,
                overflow: "hidden",
                border: "1.5px solid #e0d3c5",
                marginBottom: 8,
              }}
            >
              {[
                { k: "forward", l: "Dall'inizio" },
                { k: "backward", l: "Dalla fine" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setPM(t.k)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    border: "none",
                    cursor: "pointer",
                    background: pm === t.k ? "#d4a574" : "#fff",
                    color: pm === t.k ? "#fff" : "#8a6e55",
                    fontFamily: Fn,
                    fontSize: 11,
                    fontWeight: pm === t.k ? 700 : 400,
                  }}
                >
                  {t.l}
                </button>
              ))}
            </div>
            {pm === "forward" ? (
              <div style={{ fontFamily: Fn }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#8a6e55" }}>Inizio</span>
                  <select
                    value={fH}
                    onChange={(e) => sFH(+e.target.value)}
                    style={{ ...selS, width: 44, textAlign: "center" }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {pad(i)}
                      </option>
                    ))}
                  </select>
                  <b>:</b>
                  <select
                    value={fM}
                    onChange={(e) => sFM(+e.target.value)}
                    style={{ ...selS, width: 44, textAlign: "center" }}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i * 5}>
                        {pad(i * 5)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={hNw}
                    style={{
                      fontFamily: Fn,
                      fontSize: 9,
                      fontWeight: 600,
                      background: "#f5ede3",
                      border: "1px solid #e0d3c5",
                      borderRadius: 5,
                      padding: "3px 7px",
                      cursor: "pointer",
                      color: "#8a6e55",
                    }}
                  >
                    Adesso
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: "#8a6e55" }}>
                  Fine:{" "}
                  <b
                    style={{
                      fontSize: 18,
                      fontFamily: "'Playfair Display',serif",
                      color: "#2c1810",
                    }}
                  >
                    {endT ? fmtT(endT) : "--:--"}
                  </b>{" "}
                  {endT && <span>({relD(endT)})</span>}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: Fn }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#8a6e55" }}>Pronto</span>
                  <select
                    value={bD}
                    onChange={(e) => sBD(+e.target.value)}
                    style={{ ...selS, width: "auto" }}
                  >
                    {DL.map((l, i) => (
                      <option key={i} value={i}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bH}
                    onChange={(e) => sBH(+e.target.value)}
                    style={{ ...selS, width: 44, textAlign: "center" }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {pad(i)}
                      </option>
                    ))}
                  </select>
                  <b>:</b>
                  <select
                    value={bM}
                    onChange={(e) => sBM(+e.target.value)}
                    style={{ ...selS, width: 44, textAlign: "center" }}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i * 5}>
                        {pad(i * 5)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: "#8a6e55" }}>
                  Inizia:{" "}
                  <b
                    style={{
                      fontSize: 18,
                      fontFamily: "'Playfair Display',serif",
                      color: "#2c1810",
                    }}
                  >
                    {fmtT(st0)}
                  </b>{" "}
                  ({relD(st0)})
                </div>
              </div>
            )}
          </Crd>
        </section>

        {/* STEPS */}
        <section style={{ marginTop: 14 }}>
          <Crd
            style={{
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: Fn,
                fontSize: 11,
              }}
            >
              <span style={{ color: "#8a6e55" }}>🌡️</span>
              <input
                type="number"
                value={tu === "F" ? c2f(at) : at}
                step={1}
                onChange={(e) =>
                  setAT(tu === "F" ? f2c(+e.target.value) : +e.target.value)
                }
                style={{
                  width: 44,
                  fontFamily: Fn,
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#faf6f1",
                  border: "1.5px solid #e0d3c5",
                  borderRadius: 5,
                  padding: "2px 4px",
                  outline: "none",
                  textAlign: "center",
                }}
              />
              <span style={{ color: "#8a6e55", fontSize: 10 }}>
                {tu === "F" ? "°F" : "°C"}
              </span>
              <button
                onClick={() => setTU(tu === "C" ? "F" : "C")}
                style={{
                  fontFamily: Fn,
                  fontSize: 8,
                  color: "#a08060",
                  background: "transparent",
                  border: "1px solid #e0d3c5",
                  borderRadius: 4,
                  padding: "1px 4px",
                  cursor: "pointer",
                }}
              >
                {tu === "C" ? "°F" : "°C"}
              </button>
            </div>
            <button
              onClick={hSt}
              style={{
                fontFamily: Fn,
                fontSize: 10,
                fontWeight: 700,
                background: started
                  ? "#e8e2da"
                  : "linear-gradient(135deg,#d4a574,#b8845a)",
                color: started ? "#8a7a66" : "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {started ? "⟳ Riparti" : "🚀 Inizia!"}
            </button>
          </Crd>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sched.map((s) => {
              const isO = openStep === s.id;
              const dn = !!dm[s.id];
              const cur = s.id === fND;
              const cm = CM[s.type] || CM.dough;
              if (s.type === "done") {
                const allD = stD
                  .filter((x) => x.type !== "done")
                  .every((x) => dm[x.id]);
                return (
                  <div
                    key={s.id}
                    style={{
                      background: allD
                        ? "linear-gradient(135deg,#eaf5ea,#d8f0d8)"
                        : "#fff",
                      borderRadius: 12,
                      border: allD
                        ? "2px solid #5aaa5a"
                        : "1px solid rgba(196,149,106,.1)",
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 26 }}>🎉</div>
                    <div
                      style={{ fontFamily: Fn, fontSize: 14, fontWeight: 700 }}
                    >
                      {allD ? "Buon Appetito!" : "Fine"}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display',serif",
                        fontSize: 20,
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      {fmtT(s.start)}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={s.id}
                  style={{
                    background: dn ? "#f8f5f1" : "#fff",
                    borderRadius: 11,
                    border: cur
                      ? "2px solid #d4a574"
                      : isO
                        ? "1.5px solid #d4a574"
                        : "1px solid rgba(196,149,106,.1)",
                    boxShadow: cur
                      ? "0 2px 10px rgba(212,165,116,.15)"
                      : "none",
                    overflow: "hidden",
                    opacity: dn ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 44,
                        padding: "2px 5px",
                        borderRadius: 6,
                        background: cur ? "#d4a574" : cm.bg,
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: Fn,
                          fontSize: 13,
                          fontWeight: 700,
                          color: cur ? "#fff" : cm.tx,
                          textDecoration: dn ? "line-through" : "none",
                        }}
                      >
                        {fmtT(s.start)}
                      </div>
                    </div>
                    <div
                      onClick={() => setOS(isO ? null : s.id)}
                      style={{ flex: 1, cursor: "pointer" }}
                    >
                      <div
                        style={{
                          fontFamily: Fn,
                          fontSize: 12,
                          fontWeight: 600,
                          color: dn ? "#a09888" : "#2c1810",
                          textDecoration: dn ? "line-through" : "none",
                        }}
                      >
                        {(STEP_TYPES.find((t) => t.key === s.type) || {}).icon}{" "}
                        {s.title}
                      </div>
                      <div
                        style={{
                          fontFamily: Fn,
                          fontSize: 8,
                          color: "#b8a08a",
                          marginTop: 1,
                        }}
                      >
                        {cm.lb} · {fmtD(s.dur)}
                      </div>
                    </div>
                    {dn ? (
                      <button
                        onClick={() => hUn(s.id)}
                        style={{
                          background: "#e8e2da",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontFamily: Fn,
                          fontSize: 9,
                          color: "#8a7a66",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        Annulla
                      </button>
                    ) : (
                      <button
                        onClick={() => hDn(s.id)}
                        style={{
                          background: cur
                            ? "linear-gradient(135deg,#d4a574,#c4956a)"
                            : "#f0e8df",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontFamily: Fn,
                          fontSize: 9,
                          color: cur ? "#fff" : "#c4b8a8",
                          cursor: "pointer",
                          fontWeight: 600,
                          flexShrink: 0,
                          opacity: cur ? 1 : 0.6,
                        }}
                      >
                        Fatto ✓
                      </button>
                    )}
                    <span
                      onClick={() => setOS(isO ? null : s.id)}
                      style={{
                        fontSize: 12,
                        color: "#b8a08a",
                        transform: isO ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform .2s",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      ▾
                    </span>
                  </div>
                  {isO && renderBody(s)}
                </div>
              );
            })}
          </div>
        </section>
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontFamily: Fn,
            fontSize: 9,
            color: "#b8a08a",
          }}
        >
          {recipe.meta.author}
        </div>
      </div>
    </div>
  );
}

/* MICRO COMPONENTS */
function SH({ e, t }) {
  return (
    <h2
      style={{
        fontSize: 15,
        fontWeight: 600,
        margin: "0 0 5px 2px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span>{e}</span> {t}
    </h2>
  );
}
function Crd({ children, style = {} }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 11,
        padding: "11px 13px",
        boxShadow: "0 1px 6px rgba(0,0,0,.04)",
        border: "1px solid rgba(196,149,106,.1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Sub({ children }) {
  return (
    <h3
      style={{
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        color: "#b8845a",
        margin: "0 0 5px",
        fontWeight: 600,
      }}
    >
      {children}
    </h3>
  );
}
function Fld({ label, children }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 9,
          fontWeight: 600,
          color: "#8a6e55",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
function IR({ n, a, u }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3px 0",
        borderBottom: "1px solid #f0e8df",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <span style={{ fontSize: 11, color: "#4a3628" }}>{n}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>
        {a}{" "}
        <span style={{ fontSize: 9, fontWeight: 400, color: "#a08060" }}>
          {u}
        </span>
      </span>
    </div>
  );
}
function TB({ l, v, c }) {
  return (
    <div
      style={{
        padding: "6px 8px",
        background: "#faf6f1",
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 8,
          color: "#8a6e55",
          fontWeight: 500,
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {l}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: c,
          fontFamily: "'Playfair Display',serif",
        }}
      >
        {v}
      </div>
    </div>
  );
}
function NI({ l, v, set, s = 1 }) {
  return (
    <div>
      <label
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 9,
          color: "#8a6e55",
          display: "block",
          marginBottom: 2,
          fontWeight: 500,
        }}
      >
        {l}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1.5px solid #e0d3c5",
          borderRadius: 6,
          overflow: "hidden",
          background: "#faf6f1",
        }}
      >
        <input
          type="number"
          value={v}
          step={s}
          min={0}
          onChange={(e) => set(parseFloat(e.target.value) || 0)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "4px 6px",
            fontSize: 14,
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 600,
            color: "#2c1810",
            width: "100%",
            minWidth: 0,
          }}
        />
      </div>
    </div>
  );
}
function PMB({ click, l }) {
  return (
    <button
      onClick={click}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: "1.5px solid #d4a574",
        background: l === "+" ? "#d4a574" : "#fff",
        color: l === "+" ? "#fff" : "#d4a574",
        fontSize: 16,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {l}
    </button>
  );
}
function AddB({ l, c }) {
  return (
    <button
      onClick={c}
      style={{
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 9,
        fontWeight: 600,
        color: "#d4a574",
        background: "transparent",
        border: "1px dashed #d4a574",
        borderRadius: 5,
        padding: "4px 8px",
        cursor: "pointer",
      }}
    >
      {l}
    </button>
  );
}
function MiniSel({ label, value, onChange, options, onNew }) {
  const [a, sA] = useState(false);
  const [nv, sN] = useState("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 8,
          color: "#b8a08a",
          fontWeight: 500,
        }}
      >
        {label}:
      </span>
      {a ? (
        <div style={{ display: "flex", gap: 2 }}>
          <input
            value={nv}
            onChange={(e) => sN(e.target.value)}
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 10,
              border: "1px solid #e0d3c5",
              borderRadius: 4,
              padding: "2px 4px",
              width: 70,
              outline: "none",
            }}
          />
          <button
            onClick={() => {
              if (nv.trim()) {
                onNew(nv.trim());
                sA(false);
                sN("");
              }
            }}
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 9,
              background: "#d4a574",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "2px 5px",
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) =>
            e.target.value === "__new__" ? sA(true) : onChange(e.target.value)
          }
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 9,
            color: "#6a5a48",
            background: "#f5f0ea",
            border: "1px solid #e0d3c5",
            borderRadius: 4,
            padding: "2px 3px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {options.map((o) => (
            <option key={o.k} value={o.k}>
              {o.l}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
function IngBox({ title, items, onUpdate, onRemove, onAdd, renderItem }) {
  return (
    <div
      style={{
        background: "#f9f5f0",
        borderRadius: 7,
        padding: "7px 9px",
        border: "1px solid #e8e0d5",
      }}
    >
      <div
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 8,
          fontWeight: 600,
          color: "#b8845a",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 3,
        }}
      >
        {title}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 3,
            marginBottom: 4,
          }}
        >
          <div style={{ flex: 1 }}>
            {renderItem(item, (f, v) => onUpdate(item.id, f, v))}
          </div>
          {items.length > 1 && (
            <button
              onClick={() => onRemove(item.id)}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "none",
                background: "#e8e2da",
                color: "#8a7a66",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: 9,
          color: "#d4a574",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "1px 0",
          fontWeight: 600,
        }}
      >
        + Aggiungi
      </button>
    </div>
  );
}
function LiqSel({ value, onChange }) {
  const [c, sC] = useState(false);
  if (c || !LIQUID_PRESETS.includes(value))
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...numS, fontWeight: 400, fontSize: 11 }}
      />
    );
  return (
    <select
      value={value}
      onChange={(e) =>
        e.target.value === "Altro..." ? sC(true) : onChange(e.target.value)
      }
      style={selS}
    >
      {LIQUID_PRESETS.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </select>
  );
}
function ExtSel({ value, onChange }) {
  const [c, sC] = useState(false);
  if (c || !EXTRA_PRESETS.includes(value))
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...numS, fontWeight: 400, fontSize: 11 }}
      />
    );
  return (
    <select
      value={value}
      onChange={(e) =>
        e.target.value === "Inserisci nuovo..."
          ? sC(true)
          : onChange(e.target.value)
      }
      style={selS}
    >
      {EXTRA_PRESETS.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </select>
  );
}
function OvenEd({ cfg, tu, stu, dT, ch, sd, bd }) {
  const tm =
    TRAY_MATERIALS.find((m) => m.key === cfg.panType) || TRAY_MATERIALS[0];
  const ms = MODE_MAP[cfg.ovenType] || ["static"];
  const pp = 100 - cfg.cieloPct;
  return (
    <div
      style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}
    >
      <Fld label="Forno">
        <div style={{ display: "flex", gap: 4 }}>
          <select
            value={cfg.ovenType}
            onChange={(e) => {
              ch("ovenType", e.target.value);
              if (!(MODE_MAP[e.target.value] || []).includes(cfg.ovenMode))
                ch("ovenMode", (MODE_MAP[e.target.value] || ["static"])[0]);
            }}
            style={{ ...selS, flex: 1 }}
          >
            {OVEN_TYPES.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={cfg.ovenMode}
            onChange={(e) => ch("ovenMode", e.target.value)}
            style={{ ...selS, flex: 1 }}
          >
            {ms.map((k) => {
              const m = OVEN_MODES.find((x) => x.key === k);
              return m ? (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ) : null;
            })}
          </select>
        </div>
      </Fld>
      <Fld label={`Temp: ${dT(cfg.temp)}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="range"
            min={tu === "F" ? c2f(18) : 18}
            max={tu === "F" ? c2f(509) : 509}
            step={tu === "F" ? 10 : 5}
            value={tu === "F" ? c2f(cfg.temp) : cfg.temp}
            onChange={(e) =>
              ch(
                "temp",
                tu === "F"
                  ? Math.max(18, Math.min(509, f2c(+e.target.value)))
                  : Math.max(18, Math.min(509, +e.target.value)),
              )
            }
            style={{ flex: 1, accentColor: "#d4a574" }}
          />
          <button
            onClick={() => stu(tu === "C" ? "F" : "C")}
            style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 8,
              color: "#a08060",
              background: "transparent",
              border: "1px solid #e0d3c5",
              borderRadius: 4,
              padding: "1px 4px",
              cursor: "pointer",
            }}
          >
            {tu === "C" ? "°F" : "°C"}
          </button>
        </div>
      </Fld>
      <Fld label={`Cielo ${cfg.cieloPct}% · Platea ${pp}%`}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="range"
            min={20}
            max={80}
            step={5}
            value={cfg.cieloPct}
            onChange={(e) => ch("cieloPct", +e.target.value)}
            style={{ flex: 1, accentColor: "#d47a50" }}
          />
          <button
            onClick={() => ch("cieloPct", 100 - cfg.cieloPct)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              border: "1px solid #e0d3c5",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 2v12"
                stroke="#8a6e55"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M2 4.5L4 2l2 2.5"
                stroke="#8a6e55"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 14V2"
                stroke="#8a6e55"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M10 11.5l2 2.5 2-2.5"
                stroke="#8a6e55"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </Fld>
      {sd !== bd && (
        <div
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 9,
            color: "#8a6e55",
          }}
        >
          Cottura: <b>{fmtD(sd)}</b> (base: {fmtD(bd)})
        </div>
      )}
    </div>
  );
}
