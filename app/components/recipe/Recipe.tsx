import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { DEFAULT_RECIPE } from '@/local_data'
import type { Recipe as RecipeV1Type } from '@commons/types/recipe'
import type { RecipeV2 } from '@commons/types/recipe-graph'
import { ensureRecipeV2 } from '@commons/utils/recipe-migration'
import { autoLayout } from '~/lib/auto-layout'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { RecipeHeader } from './RecipeHeader'
import { RecipeFlowCanvas } from '~/components/recipe-flow/RecipeFlowCanvas'
import { RecipeToolbar } from '~/components/recipe-flow/RecipeToolbar'
import { NodeDetailPanel } from '~/components/recipe-flow/NodeDetailPanel'

interface RecipeProps {
  initialRecipe?: RecipeV1Type | RecipeV2
}

export function Recipe({ initialRecipe = DEFAULT_RECIPE }: RecipeProps) {
  const loadRecipe = useRecipeFlowStore((s) => s.loadRecipe)
  const meta = useRecipeFlowStore((s) => s.meta)
  const setMeta = useRecipeFlowStore((s) => s.setMeta)

  useEffect(() => {
    const v2 = ensureRecipeV2(initialRecipe as RecipeV1Type)
    // Auto-layout if positions are all (0,0)
    const needsLayout = v2.graph.nodes.every((n) => n.position.x === 0 && n.position.y === 0)
    const recipe = needsLayout ? { ...v2, graph: autoLayout(v2.graph) } : v2
    loadRecipe(recipe)
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

        {/* Main area: canvas + toolbar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* React Flow canvas */}
          <div className="flex-1 relative">
            <RecipeFlowCanvas />
            <NodeDetailPanel />
          </div>

          {/* Right sidebar toolbar */}
          <RecipeToolbar />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
