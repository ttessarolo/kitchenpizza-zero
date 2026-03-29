import { useState } from 'react'
import {
  Wheat,
  Droplet,
  Utensils,
  FlaskConical,
  CakeSlice,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  X,
} from 'lucide-react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import type { RecipeLayer } from '@commons/types/recipe-layers'
import { LayerTypePicker } from './LayerTypePicker'

// ── Icon mapping from LAYER_TYPE_META string keys to lucide components ──

const LAYER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wheat: Wheat,
  droplet: Droplet,
  utensils: Utensils,
  'flask-conical': FlaskConical,
  'cake-slice': CakeSlice,
}

function LayerIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LAYER_ICON_MAP[name]
  if (!Icon) return <span className={className}>?</span>
  return <Icon className={className} />
}

// ── Single layer row ────────────────────────────────────────────

function LayerRow({ layer, isActive }: { layer: RecipeLayer; isActive: boolean }) {
  const t = useT()
  const setActiveLayer = useRecipeFlowStore((s) => s.setActiveLayer)
  const updateLayer = useRecipeFlowStore((s) => s.updateLayer)
  const removeLayer = useRecipeFlowStore((s) => s.removeLayer)
  const layerCount = useRecipeFlowStore((s) => s.layers.length)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(layer.name)

  function commitName() {
    updateLayer(layer.id, { name: editName })
    setEditing(false)
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm
        ${isActive
          ? 'bg-primary/10 border border-primary/30 shadow-sm'
          : 'hover:bg-muted/50 border border-transparent'}`}
      onClick={() => setActiveLayer(layer.id)}
    >
      <LayerIcon name={layer.icon} className="size-3.5 flex-shrink-0 text-muted-foreground" />

      {editing ? (
        <input
          className="flex-1 min-w-0 text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') commitName() }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 min-w-0 text-xs font-medium truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
        >
          {layer.name}
        </span>
      )}

      <span
        className="w-2 h-2 rounded-full flex-shrink-0 border border-white/30"
        style={{ backgroundColor: layer.color }}
      />

      <button
        type="button"
        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }) }}
        title={t('layer_visible')}
      >
        {layer.visible
          ? <Eye className="size-3" />
          : <EyeOff className="size-3 opacity-40" />}
      </button>

      <button
        type="button"
        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }) }}
        title={t('layer_locked')}
      >
        {layer.locked
          ? <Lock className="size-3 text-destructive" />
          : <Unlock className="size-3 opacity-40" />}
      </button>

      {layerCount > 1 && (
        <button
          type="button"
          className="flex-shrink-0 opacity-30 hover:opacity-100 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id) }}
          title={t('remove_layer')}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

// ── Layer list panel ────────────────────────────────────────────

export function LayerPanel() {
  const t = useT()
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {layers.map((layer) => (
          <LayerRow key={layer.id} layer={layer} isActive={layer.id === activeLayerId} />
        ))}
      </div>

      <div className="px-2 py-2 border-t border-border">
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1.5 border border-dashed border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
        >
          + {t('add_layer')}
        </button>
      </div>

      {showPicker && <LayerTypePicker onClose={() => setShowPicker(false)} />}
    </div>
  )
}
