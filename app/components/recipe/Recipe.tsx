import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { DEFAULT_RECIPE } from '@/local_data'
import type { Recipe as RecipeV1Type } from '@commons/types/recipe'
import type { RecipeV2 } from '@commons/types/recipe-graph'
import type { RecipeV3 } from '@commons/types/recipe-layers'
import { ensureRecipeV3 } from '@commons/utils/recipe-migration'
import { autoLayout } from '~/lib/auto-layout'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'
import { RecipeHeader } from './RecipeHeader'
import { RecipeFlowCanvas } from '~/components/recipe-flow/RecipeFlowCanvas'
import { RecipeToolbar } from '~/components/recipe-flow/RecipeToolbar'
import { NodeDetailPanel } from '~/components/recipe-flow/NodeDetailPanel'
import { LeftSidebar } from '~/components/recipe-flow/LeftSidebar'
import { LayerTypePicker } from '~/components/recipe-flow/LayerTypePicker'

interface RecipeProps {
  initialRecipe?: RecipeV1Type | RecipeV2 | RecipeV3
}

export function Recipe({ initialRecipe = DEFAULT_RECIPE }: RecipeProps) {
  const t = useT()
  const loadRecipe = useRecipeFlowStore((s) => s.loadRecipe)
  const meta = useRecipeFlowStore((s) => s.meta)
  const setMeta = useRecipeFlowStore((s) => s.setMeta)
  const viewMode = useRecipeFlowStore((s) => s.viewMode)
  const layers = useRecipeFlowStore((s) => s.layers)
  const showOnboarding = useRecipeFlowStore((s) => s.showOnboarding)
  const dismissOnboarding = useRecipeFlowStore((s) => s.dismissOnboarding)
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false)

  useEffect(() => {
    const v3 = ensureRecipeV3(initialRecipe as RecipeV1Type | RecipeV2 | RecipeV3)
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

  const hasLayers = layers.length > 0
  const showToolbar = hasLayers && viewMode !== 'panoramica'

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-background text-foreground font-display">
        <RecipeHeader
          meta={meta}
          onNameChange={(name) => setMeta((m) => ({ ...m, name }))}
          onAuthorChange={(author) => setMeta((m) => ({ ...m, author }))}
        />

        {/* Main area: left strip/sidebar + canvas + right strip/sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar (or collapsed strip) */}
          {hasLayers && <LeftSidebar />}

          {/* React Flow canvas */}
          <div className="flex-1 relative">
            <RecipeFlowCanvas />
            {hasLayers && <NodeDetailPanel />}
          </div>

          {/* Right sidebar open */}
          {showToolbar && !toolbarCollapsed && (
            <RecipeToolbar
              collapsed={false}
              onToggleCollapse={() => setToolbarCollapsed(true)}
            />
          )}

          {/* Right sidebar collapsed strip */}
          {showToolbar && toolbarCollapsed && (
            <div className="w-10 shrink-0 bg-card border-l border-border flex flex-col items-center pt-2">
              <button
                type="button"
                onClick={() => setToolbarCollapsed(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-panel-header hover:bg-panel-hover text-xs"
                title={t('label_open_toolbar')}
              >
                ◀
              </button>
            </div>
          )}
        </div>

        {/* Onboarding picker */}
        {showOnboarding && !hasLayers && (
          <LayerTypePicker
            mode="onboarding"
            onClose={dismissOnboarding}
            onSkip={dismissOnboarding}
          />
        )}
      </div>
    </ReactFlowProvider>
  )
}
