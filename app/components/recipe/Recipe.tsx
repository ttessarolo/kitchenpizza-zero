import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { DEFAULT_RECIPE } from '@/local_data'
import type { Recipe as RecipeV1Type } from '@commons/types/recipe'
import type { RecipeV2 } from '@commons/types/recipe-graph'
import type { RecipeV3 } from '@commons/types/recipe-layers'
import { ensureRecipeV3 } from '@commons/utils/recipe-migration'
import { autoLayout } from '~/lib/auto-layout'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { RecipeHeader } from './RecipeHeader'
import { RecipeFlowCanvas } from '~/components/recipe-flow/RecipeFlowCanvas'
import { RecipeToolbar } from '~/components/recipe-flow/RecipeToolbar'
import { NodeDetailPanel } from '~/components/recipe-flow/NodeDetailPanel'
import { LeftSidebar } from '~/components/recipe-flow/LeftSidebar'

interface RecipeProps {
  initialRecipe?: RecipeV1Type | RecipeV2 | RecipeV3
}

export function Recipe({ initialRecipe = DEFAULT_RECIPE }: RecipeProps) {
  const loadRecipe = useRecipeFlowStore((s) => s.loadRecipe)
  const meta = useRecipeFlowStore((s) => s.meta)
  const setMeta = useRecipeFlowStore((s) => s.setMeta)
  const viewMode = useRecipeFlowStore((s) => s.viewMode)

  useEffect(() => {
    const v3 = ensureRecipeV3(initialRecipe as RecipeV1Type | RecipeV2 | RecipeV3)
    // Auto-layout each layer if positions are all (0,0)
    const layouted: RecipeV3 = {
      ...v3,
      layers: v3.layers.map((layer) => {
        const needsLayout = layer.nodes.every((n) => n.position.x === 0 && n.position.y === 0)
        if (!needsLayout) return layer
        const graph = autoLayout({ nodes: layer.nodes, edges: layer.edges, lanes: layer.lanes })
        return { ...layer, nodes: graph.nodes, edges: graph.edges, lanes: graph.lanes }
      }),
    }
    loadRecipe(layouted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-background text-foreground font-display">
        {/* Compact header */}
        <RecipeHeader
          meta={meta}
          onNameChange={(name) => setMeta((m) => ({ ...m, name }))}
          onAuthorChange={(author) => setMeta((m) => ({ ...m, author }))}
        />

        {/* Main area: left sidebar + canvas + right toolbar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left sidebar — Layers */}
          <LeftSidebar />

          {/* React Flow canvas */}
          <div className="flex-1 relative">
            <RecipeFlowCanvas />
            <NodeDetailPanel />
          </div>

          {/* Right sidebar toolbar */}
          {viewMode !== 'panoramica' && <RecipeToolbar />}
        </div>
      </div>
    </ReactFlowProvider>
  )
}
