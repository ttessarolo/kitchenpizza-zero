import { z } from 'zod'

// ── Minimal graph schemas for oRPC validation ───────────────────
// These are intentionally loose — the reconciler handles detailed validation.

const nodeDataSchema = z.record(z.string(), z.unknown())

const recipeNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  subtype: z.string().nullable(),
  position: z.object({ x: z.number(), y: z.number() }),
  lane: z.string(),
  data: nodeDataSchema,
})

const recipeEdgeDataSchema = z.object({
  scheduleTimeRatio: z.number().min(0).max(1).default(1),
  scheduleQtyRatio: z.number().min(0).max(1).default(1),
  label: z.string().optional(),
})

const recipeEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  data: recipeEdgeDataSchema,
})

const laneSchema = z.object({
  id: z.string(),
  label: z.string(),
  isMain: z.boolean(),
  color: z.string().optional(),
  origin: z.object({
    type: z.enum(['user', 'split', 'prep']),
    splitNodeId: z.string().optional(),
  }).optional(),
})

const recipeGraphSchema = z.object({
  nodes: z.array(recipeNodeSchema),
  edges: z.array(recipeEdgeSchema),
  lanes: z.array(laneSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
})

const portioningSchema = z.object({
  mode: z.enum(['tray', 'ball']),
  tray: z.object({
    preset: z.string(),
    l: z.number(),
    w: z.number(),
    h: z.number(),
    material: z.string(),
    griglia: z.boolean(),
    count: z.number(),
  }),
  ball: z.object({ weight: z.number(), count: z.number() }),
  thickness: z.number(),
  targetHyd: z.number(),
  doughHours: z.number(),
  yeastPct: z.number(),
  saltPct: z.number(),
  fatPct: z.number(),
  preImpasto: z.string().nullable(),
  preFermento: z.string().nullable(),
  flourMix: z.array(z.string()).default([]),
})

const recipeMetaSchema = z.object({
  name: z.string(),
  author: z.string(),
  type: z.string(),
  subtype: z.string(),
  locale: z.string().default('it'),
})

const mutationSchema = z.object({
  type: z.string(),
  target: z.record(z.string(), z.unknown()).optional(),
  patch: z.record(z.string(), z.unknown()).optional(),
  nodeType: z.string().optional(),
  subtype: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

const warningActionSchema = z.object({
  labelKey: z.string(),
  descriptionKey: z.string().optional(),
  mutations: z.array(mutationSchema),
})

const warningSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string().optional(),
  category: z.string(),
  severity: z.enum(['info', 'warning', 'error']),
  messageKey: z.string(),
  messageVars: z.record(z.string(), z.unknown()).optional(),
  _ctx: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(warningActionSchema).optional(),
  _llmVerdict: z.enum(['confirmed', 'downgraded', 'upgraded']).optional(),
  _llmReason: z.string().optional(),
})

// ── Public schemas ──────────────────────────────────────────────

export const reconcileInputSchema = z.object({
  graph: recipeGraphSchema,
  portioning: portioningSchema,
  meta: recipeMetaSchema,
  locale: z.string().default('it'),
  llmVerify: z.boolean().default(true),
  autoResolve: z.boolean().default(false),
  layerType: z.string().default('impasto'),
  layerSubtype: z.string().default(''),
  layerVariant: z.string().default(''),
})

export const reconcileOutputSchema = z.object({
  graph: recipeGraphSchema,
  portioning: portioningSchema,
  warnings: z.array(warningSchema),
  llmInsights: z.array(z.object({
    category: z.string(),
    severity: z.enum(['info', 'warning']),
    explanation: z.string(),
  })).optional(),
})
