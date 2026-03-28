import { useState } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'
import { STEP_TYPES } from '@/local_data'
import type { NodeTypeKey } from '@commons/types/recipe-graph'

export function NodeContextToolbar() {
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const selectedNodeId = useRecipeFlowStore((s) => s.expandedNodeId)
  const addNode = useRecipeFlowStore((s) => s.addNode)
  const addRootNode = useRecipeFlowStore((s) => s.addRootNode)
  const runAutoLayout = useRecipeFlowStore((s) => s.runAutoLayout)
  const graphEmpty = useRecipeFlowStore((s) => s.graph.nodes.length === 0)

  if (graphEmpty) return null

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="h-8 px-3 rounded-lg bg-white border border-border shadow-sm text-xs font-medium text-[#8a7a66] hover:bg-[#faf8f5] flex items-center gap-1"
        >
          {t('btn_add_node')}
        </button>
        {menuOpen && (
          <div className="absolute top-9 left-0 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[400px] overflow-y-auto z-50">
            {STEP_TYPES.map((st) => (
              <div key={st.key}>
                <button
                  type="button"
                  onClick={() => {
                    const sub = st.subtypes?.[0]?.key ?? null
                    if (selectedNodeId) {
                      addNode(selectedNodeId, st.key as NodeTypeKey, sub)
                    } else {
                      const graph = useRecipeFlowStore.getState().graph
                      const lastNonDone = [...graph.nodes].reverse().find((n) => n.type !== 'done')
                      if (lastNonDone) {
                        addNode(lastNonDone.id, st.key as NodeTypeKey, sub)
                      } else {
                        addRootNode(st.key as NodeTypeKey, sub)
                      }
                    }
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#faf8f5] flex items-center gap-2"
                >
                  <span>{st.icon}</span>
                  <span>{t(st.labelKey)}</span>
                </button>
                {st.subtypes && st.subtypes.length > 0 && (
                  <div className="pl-7">
                    {st.subtypes.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          const graph = useRecipeFlowStore.getState().graph
                          const target = selectedNodeId || [...graph.nodes].reverse().find((n) => n.type !== 'done')?.id
                          if (target) {
                            addNode(target, st.key as NodeTypeKey, s.key)
                          } else {
                            addRootNode(st.key as NodeTypeKey, s.key)
                          }
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-2 py-1 text-[11px] text-muted-foreground hover:bg-[#faf8f5]"
                      >
                        {t(s.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={runAutoLayout}
        className="h-8 px-3 rounded-lg bg-white border border-border shadow-sm text-xs font-medium text-[#8a7a66] hover:bg-[#faf8f5]"
        title={t('btn_reorder_title')}
      >
        {t('btn_reorder')}
      </button>
    </div>
  )
}
