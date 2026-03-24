import { useEffect, useRef } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'

export function EdgeCallout() {
  const selectedEdgeId = useRecipeFlowStore((s) => s.selectedEdgeId)
  const edgeCalloutPos = useRecipeFlowStore((s) => s.edgeCalloutPos)
  const graph = useRecipeFlowStore((s) => s.graph)
  const updateEdgeData = useRecipeFlowStore((s) => s.updateEdgeData)
  const removeEdge = useRecipeFlowStore((s) => s.removeEdge)
  const selectEdge = useRecipeFlowStore((s) => s.selectEdge)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!selectedEdgeId) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        selectEdge(null)
      }
    }
    // Delay to avoid closing immediately from the click that opened it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [selectedEdgeId, selectEdge])

  if (!selectedEdgeId) return null

  const edge = graph.edges.find((e) => e.id === selectedEdgeId)
  if (!edge) return null

  const sourceNode = graph.nodes.find((n) => n.id === edge.source)
  const targetNode = graph.nodes.find((n) => n.id === edge.target)

  return (
    <div
      ref={ref}
      className="absolute z-40 bg-white border border-border rounded-xl shadow-xl p-3 w-[260px]"
      style={{
        left: edgeCalloutPos ? edgeCalloutPos.x : '50%',
        top: edgeCalloutPos ? edgeCalloutPos.y + 10 : undefined,
        bottom: edgeCalloutPos ? undefined : 80,
        transform: edgeCalloutPos ? 'translateX(-50%)' : 'translateX(-50%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-[#8a7a66] uppercase tracking-wider">
          Connessione
        </div>
        <button
          type="button"
          onClick={() => {
            removeEdge(selectedEdgeId)
          }}
          className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-100"
        >
          ✕ Elimina
        </button>
      </div>

      {/* Source → Target */}
      <div className="text-[11px] text-muted-foreground mb-2">
        {sourceNode?.data.title || edge.source} → {targetNode?.data.title || edge.target}
      </div>

      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        Aspetta fino a quando hai:
      </div>

      {/* Schedule: Time completion ratio */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[11px] mb-0.5">
          <span className="text-muted-foreground font-medium">⏱ Tempo completato</span>
          <span className="font-semibold text-foreground">
            {edge.data.scheduleTimeRatio === 1 ? '100%' : `${Math.round(edge.data.scheduleTimeRatio * 100)}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(edge.data.scheduleTimeRatio * 100)}
          onChange={(e) => updateEdgeData(selectedEdgeId, { scheduleTimeRatio: +e.target.value / 100 })}
          className="w-full accent-primary"
        />
      </div>

      {/* Schedule: Quantity production ratio */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-0.5">
          <span className="text-muted-foreground font-medium">📦 Quantità prodotta</span>
          <span className="font-semibold text-foreground">{Math.round(edge.data.scheduleQtyRatio * 100)}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={Math.round(edge.data.scheduleQtyRatio * 100)}
          onChange={(e) => updateEdgeData(selectedEdgeId, { scheduleQtyRatio: +e.target.value / 100 })}
          className="w-full accent-primary"
        />
      </div>
    </div>
  )
}
