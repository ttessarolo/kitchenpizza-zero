import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { ModeToggle } from './ModeToggle'
import { PanoramicaSummaryPanel } from './PanoramicaSummaryPanel'
import { LayerTypePicker } from './LayerTypePicker'
import { ActionableWarningBox } from './ActionableWarningBox'
import { WarningCard } from './WarningCard'
import { deduplicateWarnings } from '@commons/utils/warning-dedup'
import { getActiveLayerWarnings, hasLayerWarnings } from '~/lib/warning-helpers'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'

export function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [deleteLayerId, setDeleteLayerId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const isResizing = useRef(false)
  const t = useT()

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = Math.min(500, Math.max(320, e.clientX))
    setSidebarWidth(newWidth)
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback(() => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])
  const viewMode = useRecipeFlowStore((s) => s.viewMode)
  const layers = useRecipeFlowStore((s) => s.layers)
  const activeLayerId = useRecipeFlowStore((s) => s.activeLayerId)
  const setActiveLayer = useRecipeFlowStore((s) => s.setActiveLayer)
  const removeLayer = useRecipeFlowStore((s) => s.removeLayer)
  const updateLayer = useRecipeFlowStore((s) => s.updateLayer)
  const inactiveLayerOpacity = useRecipeFlowStore((s) => s.inactiveLayerOpacity)
  const setInactiveLayerOpacity = useRecipeFlowStore((s) => s.setInactiveLayerOpacity)
  const meta = useRecipeFlowStore((s) => s.meta)
  const setMeta = useRecipeFlowStore((s) => s.setMeta)
  const warnings = useRecipeFlowStore((s) => s.warnings)
  const isReconciling = useRecipeFlowStore((s) => s.isReconciling)
  const llmInsights = useRecipeFlowStore((s) => s.llmInsights)
  const applyAllWarningActions = useRecipeFlowStore((s) => s.applyAllWarningActions)

  // Warnings for the active layer (includes canonical warnings)
  const activeLayerWarnings = useMemo(() =>
    getActiveLayerWarnings(activeLayerId, warnings, layers),
    [activeLayerId, warnings, layers],
  )

  const activeDeduped = useMemo(() => deduplicateWarnings(activeLayerWarnings), [activeLayerWarnings])
  const activeActionable = useMemo(() => activeDeduped.filter(w => w.actions && w.actions.length > 0), [activeDeduped])
  const activeInformational = useMemo(() => activeDeduped.filter(w => !w.actions || w.actions.length === 0), [activeDeduped])

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 bg-card border-r border-border flex flex-col items-center pt-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-panel-header hover:bg-panel-hover text-xs"
          title={t('open_layers')}
        >
          ▶
        </button>
      </div>
    )
  }

  return (
    <div className="shrink-0 bg-card border-r border-border overflow-y-auto flex flex-col relative" style={{ width: sidebarWidth }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-panel-header uppercase tracking-wider">{t('layers')}</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-panel-header hover:bg-panel-hover text-xs"
          title={t('close_layers')}
        >
          ◀
        </button>
      </div>

      {/* Mode toggle */}
      <div className="px-3 py-2 border-b border-border">
        <ModeToggle />
      </div>

      {/* Recipe details — always visible in both modes, default closed */}
      <details className="border-b border-border">
        <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
          {t('section_recipe_details')}
          <span className="text-[8px]">▾</span>
        </summary>
        <div className="px-3 pb-2 space-y-1.5">
          <div>
            <label className="text-[10px] text-muted-foreground">{t('label_recipe_name')}</label>
            <input
              type="text"
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              placeholder={t('label_recipe_name_placeholder')}
              className="w-full text-xs border border-border rounded px-2 py-1 mt-0.5 outline-none focus:border-primary bg-background"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">{t('label_author')}</label>
            <input
              type="text"
              value={meta.author}
              onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
              placeholder={t('label_author_placeholder')}
              className="w-full text-xs border border-border rounded px-2 py-1 mt-0.5 outline-none focus:border-primary bg-background"
            />
          </div>
        </div>
      </details>

      {/* Panoramica mode: show summary panel */}
      {viewMode === 'panoramica' ? (
        <PanoramicaSummaryPanel />
      ) : (
        <details open className="border-b border-border flex-1 flex flex-col">
          <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
            {t('layer_panel_title')}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowPicker(true) }}
                className="w-5 h-5 rounded flex items-center justify-center text-primary hover:bg-primary/10 text-sm font-bold"
                title={t('add_layer')}
              >
                +
              </button>
              <span className="text-[8px]">▾</span>
            </div>
          </summary>
          <div className="flex-1 flex flex-col">
            {/* Inactive layer opacity slider */}
            {layers.length >= 2 && (
              <div className="px-3 py-1.5 border-b border-border flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">{t('layer_opacity')}</span>
                <input
                  type="range"
                  min={20} max={80} step={5}
                  value={Math.round(inactiveLayerOpacity * 100)}
                  onChange={(e) => setInactiveLayerOpacity(+e.target.value / 100)}
                  className="flex-1"
                />
                <span className="text-[9px] text-muted-foreground tabular-nums w-7 text-right">
                  {Math.round(inactiveLayerOpacity * 100)}%
                </span>
              </div>
            )}

            {/* Layer list */}
            <div className="flex-1 px-1 py-1 space-y-0.5">
              {layers.map((layer) => {
                const isActive = layer.id === activeLayerId
                return (
                  <div
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      layer.locked
                        ? 'bg-muted border border-border text-muted-foreground'
                        : isActive
                          ? 'bg-accent/10 text-accent ring-1 ring-accent/30'
                          : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {hasLayerWarnings(layer.id, warnings, layers) ? (
                      <span className="w-3 h-3 shrink-0 text-[11px] leading-none">⚠️</span>
                    ) : (
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                    <span className={`flex-1 text-sm truncate ${isActive ? 'font-bold' : 'font-semibold'}`}>{layer.name}</span>
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
                          layer.locked ? 'text-warning' : 'text-muted-foreground/40'
                        }`}
                        title={layer.locked ? t('unlock_layer') : t('lock_layer')}
                      >
                        {layer.locked ? '\u{1F512}' : '\u{1F513}'}
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteLayerId(layer.id)
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={t('remove_layer')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Layer type picker modal */}
          {showPicker && <LayerTypePicker onClose={() => setShowPicker(false)} />}
        </details>
      )}

      {/* Active layer warnings — reveal "Criticità" */}
      {viewMode !== 'panoramica' && (isReconciling || activeActionable.length > 0 || activeInformational.length > 0) && (
        <details open className="border-t border-border">
          <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
            {t('section_warnings')}
            <span className="text-[8px]">▾</span>
          </summary>
          <div className="px-2 pb-2 space-y-1.5 overflow-y-auto">
            {isReconciling && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>{t('warning_thinking')}</span>
              </div>
            )}
            {!isReconciling && activeActionable.length > 0 && (
              <ActionableWarningBox warnings={activeActionable} onApplyAll={applyAllWarningActions} />
            )}
            {!isReconciling && activeInformational.map((w) => (
              <WarningCard key={w.id} warning={w} count={w.count} />
            ))}
          </div>
        </details>
      )}

      {/* AI Insights */}
      {viewMode !== 'panoramica' && llmInsights && llmInsights.length > 0 && (
        <details open className="border-t border-border">
          <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              {t('section_ai_insights')}
            </span>
            <span className="text-[8px]">▾</span>
          </summary>
          <div className="px-2 pb-2 space-y-1.5">
            {llmInsights.map((insight: any, i: number) => (
              <div key={i} className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{insight.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-10"
      />

      {/* Delete layer confirmation dialog */}
      <AlertDialog open={deleteLayerId !== null} onOpenChange={(open) => { if (!open) setDeleteLayerId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_remove_layer_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_remove_layer_description', { name: layers.find(l => l.id === deleteLayerId)?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteLayerId(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteLayerId) removeLayer(deleteLayerId)
                setDeleteLayerId(null)
              }}
            >
              {t('confirm_remove_layer_action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
