import { useRecipeFlowStore } from '~/stores/recipe-flow-store'

const JOIN_METHODS = [
  { key: 'braid', label: 'Intreccio' },
  { key: 'layer', label: 'Sovrapposizione' },
  { key: 'fold', label: 'Piega' },
  { key: 'enclose', label: 'Avvolgimento' },
  { key: 'mix', label: 'Rimescolamento' },
  { key: 'side_by_side', label: 'Affiancamento' },
  { key: 'generic', label: 'Generico' },
]

interface JoinConfigPanelProps {
  nodeId: string
}

export function JoinConfigPanel({ nodeId }: JoinConfigPanelProps) {
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
          Metodo di unione
        </label>
        <select
          value={d.joinMethod || 'generic'}
          onChange={(e) => updateNodeData(nodeId, { joinMethod: e.target.value as any })}
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none"
        >
          {JOIN_METHODS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Number of inputs */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          N° elementi in ingresso
        </label>
        <div className="text-sm font-bold text-foreground mt-0.5">
          {incomingEdges.length} connessioni
        </div>
        <div className="text-[10px] text-muted-foreground">
          Collega i rami trascinando le connessioni ai connettori in alto del nodo.
        </div>
      </div>

      {/* Output name */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Nome elemento di output
        </label>
        <input
          type="text"
          value={d.title}
          onChange={(e) => updateNodeData(nodeId, { title: e.target.value })}
          placeholder="Es. Treccia bicolore"
          className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-primary"
        />
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Questo nome sarà visibile nei nodi successivi come riferimento.
        </div>
      </div>
    </div>
  )
}
