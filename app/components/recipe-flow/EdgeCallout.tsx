import { useEffect, useRef } from 'react'
import { useRecipeFlowStore, selectGraph } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'
import { EdgeStylePanel } from './EdgeStylePanel'

export function EdgeCallout() {
  const t = useT()
  const selectedEdgeId = useRecipeFlowStore((s) => s.selectedEdgeId)
  const edgeCalloutPos = useRecipeFlowStore((s) => s.edgeCalloutPos)
  const graph = useRecipeFlowStore(selectGraph)
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
      className="absolute z-40 bg-card border border-border rounded-xl shadow-xl p-3 w-[340px]"
      style={{
        left: edgeCalloutPos ? edgeCalloutPos.x : '50%',
        top: edgeCalloutPos ? edgeCalloutPos.y + 10 : undefined,
        bottom: edgeCalloutPos ? undefined : 80,
        transform: edgeCalloutPos ? 'translateX(-50%)' : 'translateX(-50%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-panel-header uppercase tracking-wider">
          {t("edge_connection")}
        </div>
        <button
          type="button"
          onClick={() => {
            removeEdge(selectedEdgeId)
          }}
          className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2 py-1 hover:bg-destructive/20"
        >
          {"✕ " + t("edge_delete")}
        </button>
      </div>

      {/* Source → Target */}
      <div className="text-[9px] text-muted-foreground mb-2">
        {sourceNode?.data.title || edge.source} → {targetNode?.data.title || edge.target}
      </div>

      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {t("dep_wait_until", { n: "" })}
      </div>

      {/* Schedule: Time completion ratio */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] mb-0.5">
          <span className="text-muted-foreground font-medium">{"⏱ " + t("dep_time_completed")}</span>
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
          className="w-full"
        />
      </div>

      {/* Schedule: Quantity production ratio */}
      <div>
        <div className="flex items-center justify-between text-[9px] mb-0.5">
          <span className="text-muted-foreground font-medium">{"📦 " + t("dep_qty_produced")}</span>
          <span className="font-semibold text-foreground">{Math.round(edge.data.scheduleQtyRatio * 100)}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={Math.round(edge.data.scheduleQtyRatio * 100)}
          onChange={(e) => updateEdgeData(selectedEdgeId, { scheduleQtyRatio: +e.target.value / 100 })}
          className="w-full"
        />
      </div>

      {/* Visual style reveal */}
      <EdgeStylePanel
        style={edge.data.style}
        onChange={(s) => updateEdgeData(selectedEdgeId, { style: s })}
      />
    </div>
  )
}
