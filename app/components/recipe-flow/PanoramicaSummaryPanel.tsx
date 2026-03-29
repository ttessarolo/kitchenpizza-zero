import { useMemo } from 'react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computePanoramica } from '@commons/utils/panoramica-manager'
import { staticProvider } from '@commons/utils/science/static-science-provider'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function PanoramicaSummaryPanel() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const crossEdges = useRecipeFlowStore((s) => s.crossEdges)

  const result = useMemo(() => {
    if (layers.length === 0) return null
    try { return computePanoramica(staticProvider, layers, crossEdges) }
    catch { return null }
  }, [layers, crossEdges])

  if (!result) {
    return <div className="p-3 text-xs text-muted-foreground">{t('panoramica_title')}</div>
  }

  return (
    <div className="flex-1 overflow-y-auto text-xs">
      {/* Total Duration */}
      <div className="p-3 border-b border-border">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('panoramica_total_duration')}</div>
        <div className="text-xl font-bold text-primary">{formatDuration(result.totalDuration)}</div>
      </div>

      {/* Layer summaries */}
      <div className="p-3 border-b border-border">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('layers')}</div>
        <div className="space-y-1.5">
          {result.layers.map((layer) => (
            <div key={layer.layerId} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  layer.layerId === result.criticalLayerId ? 'ring-2 ring-primary/40' : ''
                }`}
                style={{ backgroundColor: layers.find((l) => l.id === layer.layerId)?.color ?? '#888' }}
              />
              <span className="flex-1 truncate font-medium">{layer.name}</span>
              <span className="text-muted-foreground">{formatDuration(layer.totalDuration)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical path of the longest layer */}
      {result.layers.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('panoramica_critical_path')}</div>
          {result.layers
            .filter((l) => l.layerId === result.criticalLayerId)
            .map((layer) => (
              <div key={layer.layerId} className="space-y-0.5">
                {layer.criticalPath.map((nodeId) => {
                  const layerData = layers.find((l) => l.id === layer.layerId)
                  const node = layerData?.nodes.find((n) => n.id === nodeId)
                  return (
                    <div key={nodeId} className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layerData?.color ?? '#888' }}
                      />
                      <span className="flex-1 truncate">{node?.data.title || nodeId}</span>
                      {node && node.data.baseDur > 0 && (
                        <span className="text-muted-foreground">{formatDuration(node.data.baseDur)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}

      {/* Cross-layer dependencies */}
      {result.crossDependencies.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('panoramica_dependencies')}</div>
          <div className="space-y-1">
            {result.crossDependencies.map((dep) => {
              const srcLayer = layers.find((l) => l.id === dep.sourceLayerId)
              const tgtLayer = layers.find((l) => l.id === dep.targetLayerId)
              return (
                <div key={dep.edgeId} className="flex items-center gap-1 text-muted-foreground">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: srcLayer?.color ?? '#888' }}
                  />
                  <span className="truncate">{srcLayer?.name ?? dep.sourceLayerId}</span>
                  <span className="text-[10px]">&rarr;</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tgtLayer?.color ?? '#888' }}
                  />
                  <span className="truncate">{tgtLayer?.name ?? dep.targetLayerId}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-layer node count summary */}
      <div className="p-3">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('panoramica_summary')}</div>
        {result.layers.map((layer) => (
          <div key={layer.layerId} className="flex justify-between text-muted-foreground mb-0.5">
            <span>{layer.name}</span>
            <span>{layer.nodeCount} {t('nodes')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
