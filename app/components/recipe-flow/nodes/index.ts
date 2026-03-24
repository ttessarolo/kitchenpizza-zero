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
}
