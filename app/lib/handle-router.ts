/**
 * Handle router — picks optimal source/target handle pair
 * based on relative node positions for natural edge flow.
 *
 * Handle IDs:
 * Input (target):  in (top center), in_tl (top left), in_tr (top right), in_sl (left side), in_sr (right side)
 * Output (source): out (bottom center), out_bl (bottom left), out_br (bottom right), out_sl (left side), out_sr (right side)
 */

import { NODE_WIDTH, NODE_HEIGHT } from './auto-layout'

export function pickHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x
  const dy = targetPos.y - sourcePos.y
  const halfW = NODE_WIDTH / 2

  // Target is roughly at the same horizontal level (side connection)
  if (Math.abs(dy) < NODE_HEIGHT * 0.8) {
    if (dx > 0) {
      return { sourceHandle: 'out_sr', targetHandle: 'in_sl' }
    }
    return { sourceHandle: 'out_sl', targetHandle: 'in_sr' }
  }

  // Target is above source (unusual, upward connection)
  if (dy < -NODE_HEIGHT * 0.5) {
    return { sourceHandle: 'out', targetHandle: 'in' }
  }

  // Target is below — most common case
  // Diagonal right
  if (dx > halfW) {
    return { sourceHandle: 'out_br', targetHandle: 'in_tl' }
  }
  // Diagonal left
  if (dx < -halfW) {
    return { sourceHandle: 'out_bl', targetHandle: 'in_tr' }
  }
  // Slightly right
  if (dx > halfW * 0.3) {
    return { sourceHandle: 'out_br', targetHandle: 'in_tl' }
  }
  // Slightly left
  if (dx < -halfW * 0.3) {
    return { sourceHandle: 'out_bl', targetHandle: 'in_tr' }
  }

  // Directly below — classic vertical
  return { sourceHandle: 'out', targetHandle: 'in' }
}
