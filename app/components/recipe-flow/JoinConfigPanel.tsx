import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'

const JOIN_METHOD_KEYS = ['braid', 'layer', 'fold', 'enclose', 'mix', 'side_by_side', 'generic'] as const

interface JoinConfigPanelProps {
  nodeId: string
}

export function JoinConfigPanel({ nodeId }: JoinConfigPanelProps) {
  const t = useT()
  const graph = useRecipeFlowStore((s) => s.graph)
  const updateNodeData = useRecipeFlowStore((s) => s.updateNodeData)

  const node = graph.nodes.find((n) => n.id === nodeId)
  if (!node || node.type !== 'join') return null

  const d = node.data
  const incomingEdges = graph.edges.filter((e) => e.target === nodeId)

  return (
    <div className="mt-2 space-y-2">
      {/* Join method */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t('label_join_method')}
        </label>
        <select
          value={d.joinMethod || 'generic'}
          onChange={(e) => updateNodeData(nodeId, { joinMethod: e.target.value as any })}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none"
        >
          {JOIN_METHOD_KEYS.map((k) => (
            <option key={k} value={k}>{t(`join_${k}`)}</option>
          ))}
        </select>
      </div>

      {/* Number of inputs */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t('label_input_count')}
        </label>
        <div className="text-sm font-bold text-foreground mt-0.5">
          {incomingEdges.length} {t('label_connections')}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {t('hint_connect_branches')}
        </div>
      </div>

      {/* Output name */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t('label_output_name')}
        </label>
        <input
          type="text"
          value={d.title}
          onChange={(e) => updateNodeData(nodeId, { title: e.target.value })}
          placeholder={t('label_output_name_placeholder')}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-primary"
        />
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {t('hint_output_name')}
        </div>
      </div>
    </div>
  )
}
