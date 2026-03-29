import { useState } from 'react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { ModeToggle } from './ModeToggle'
import { PanoramicaSummaryPanel } from './PanoramicaSummaryPanel'
import { LayerTypePicker } from './LayerTypePicker'

export function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const t = useT()
  const viewMode = useRecipeFlowStore((s) => s.viewMode)
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const setActiveLayer = useRecipeFlowStore((s) => s.setActiveLayer)
  const removeLayer = useRecipeFlowStore((s) => s.removeLayer)
  const updateLayer = useRecipeFlowStore((s) => s.updateLayer)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute top-2 left-2 z-10 w-8 h-8 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-[#8a7a66] hover:bg-[#faf8f5]"
        title={t('open_layers')}
      >
        ▶
      </button>
    )
  }

  return (
    <div className="w-[220px] shrink-0 bg-white border-r border-border overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-[#8a7a66] uppercase tracking-wider">{t('layers')}</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-[#8a7a66] hover:bg-[#faf8f5] text-xs"
          title={t('close_layers')}
        >
          ◀
        </button>
      </div>

      {/* Mode toggle */}
      <div className="px-3 py-2 border-b border-border">
        <ModeToggle />
      </div>

      {/* Panoramica mode: show summary panel */}
      {viewMode === 'panoramica' ? (
        <PanoramicaSummaryPanel />
      ) : (
        <>
          {/* Layer list */}
          <div className="flex-1 px-1 py-1 space-y-0.5">
            {layers.map((layer) => {
              const isActive = layer.id === activeLayerId
              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="flex-1 text-xs font-medium truncate">{layer.name}</span>
                  <div className="flex items-center gap-0.5">
                    {/* Visibility toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateLayer(layer.id, { visible: !layer.visible })
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] hover:bg-muted ${
                        layer.visible ? 'text-foreground' : 'text-muted-foreground/40'
                      }`}
                      title={layer.visible ? t('hide_layer') : t('show_layer')}
                    >
                      {layer.visible ? '\u{1F441}' : '\u{2014}'}
                    </button>
                    {/* Lock toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateLayer(layer.id, { locked: !layer.locked })
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] hover:bg-muted ${
                        layer.locked ? 'text-amber-600' : 'text-muted-foreground/40'
                      }`}
                      title={layer.locked ? t('unlock_layer') : t('lock_layer')}
                    >
                      {layer.locked ? '\u{1F512}' : '\u{1F513}'}
                    </button>
                    {/* Delete */}
                    {layers.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(t('confirm_remove_layer'))) {
                            removeLayer(layer.id)
                          }
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={t('remove_layer')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add layer */}
          <div className="px-2 py-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full text-xs font-medium bg-background border border-border rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              + {t('add_layer')}
            </button>
          </div>

          {/* Layer type picker modal */}
          {showPicker && <LayerTypePicker onClose={() => setShowPicker(false)} />}
        </>
      )}
    </div>
  )
}
