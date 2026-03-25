import { useState } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { STEP_TYPES } from '@/local_data'
import type { NodeTypeKey } from '@commons/types/recipe-graph'

export function NodeContextToolbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const selectedNodeId = useRecipeFlowStore((s) => s.expandedNodeId)
  const addNode = useRecipeFlowStore((s) => s.addNode)
  const addRootNode = useRecipeFlowStore((s) => s.addRootNode)
  const removeNode = useRecipeFlowStore((s) => s.removeNode)
  const runAutoLayout = useRecipeFlowStore((s) => s.runAutoLayout)
  const graphEmpty = useRecipeFlowStore((s) => s.graph.nodes.length === 0)

  // Hide when graph is empty — user should use "Genera Impasto" from toolbar
  if (graphEmpty) return null

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
      {/* Add node button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="h-8 px-3 rounded-lg bg-white border border-border shadow-sm text-xs font-medium text-[#8a7a66] hover:bg-[#faf8f5] flex items-center gap-1"
        >
          + Aggiungi nodo
        </button>
        {menuOpen && (
          <div className="absolute top-9 left-0 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[400px] overflow-y-auto z-50">
            {STEP_TYPES.map((t) => (
              <div key={t.key}>
                <button
                  type="button"
                  onClick={() => {
                    const sub = t.subtypes?.[0]?.key ?? null
                    if (selectedNodeId) {
                      addNode(selectedNodeId, t.key as NodeTypeKey, sub)
                    } else {
                      const graph = useRecipeFlowStore.getState().graph
                      const lastNonDone = [...graph.nodes].reverse().find((n) => n.type !== 'done')
                      if (lastNonDone) {
                        addNode(lastNonDone.id, t.key as NodeTypeKey, sub)
                      } else {
                        // Empty graph or only "done" → add as root node
                        addRootNode(t.key as NodeTypeKey, sub)
                      }
                    }
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#faf8f5] flex items-center gap-2"
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
                {t.subtypes && t.subtypes.length > 0 && (
                  <div className="pl-7">
                    {t.subtypes.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          const graph = useRecipeFlowStore.getState().graph
                          const target = selectedNodeId || [...graph.nodes].reverse().find((n) => n.type !== 'done')?.id
                          if (target) {
                            addNode(target, t.key as NodeTypeKey, s.key)
                          } else {
                            addRootNode(t.key as NodeTypeKey, s.key)
                          }
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-2 py-1 text-[11px] text-muted-foreground hover:bg-[#faf8f5]"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-layout button */}
      <button
        type="button"
        onClick={runAutoLayout}
        className="h-8 px-3 rounded-lg bg-white border border-border shadow-sm text-xs font-medium text-[#8a7a66] hover:bg-[#faf8f5]"
        title="Riordina layout"
      >
        ⟳ Riordina
      </button>
    </div>
  )
}
