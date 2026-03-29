import type { NodeTypes } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { SplitNode } from './SplitNode'
import { JoinNode } from './JoinNode'
import { DoneNode } from './DoneNode'

/**
 * All custom node types for React Flow.
 * Most types use BaseNode — split, join, done have custom renderers.
 */
export const customNodeTypes: NodeTypes = {
  // Impasto (existing)
  pre_dough: BaseNode,
  pre_ferment: BaseNode,
  dough: BaseNode,
  rest: BaseNode,
  rise: BaseNode,
  shape: BaseNode,
  pre_bake: BaseNode,
  bake: BaseNode,
  post_bake: BaseNode,
  prep: BaseNode,
  split: SplitNode,
  join: JoinNode,
  done: DoneNode,
  // Multi-layer shared
  ingredient: BaseNode,
  cook: BaseNode,
  mix: BaseNode,
  // Sauce
  blend: BaseNode,
  emulsify: BaseNode,
  strain: BaseNode,
  season: BaseNode,
  // Prep
  wash: BaseNode,
  cut: BaseNode,
  peel: BaseNode,
  grate: BaseNode,
  stuff: BaseNode,
  assemble: BaseNode,
  plate: BaseNode,
  garnish: BaseNode,
  // Ferment
  brine: BaseNode,
  inoculate: BaseNode,
  ferment_node: BaseNode,
  check: BaseNode,
  store: BaseNode,
  // Pastry
  whip: BaseNode,
  temper: BaseNode,
  fold: BaseNode,
  chill: BaseNode,
  mold: BaseNode,
  glaze: BaseNode,
}
