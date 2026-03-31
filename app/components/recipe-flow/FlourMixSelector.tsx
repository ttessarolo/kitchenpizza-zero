import { useState, useEffect } from 'react'
import { useRecipeFlowStore, selectGraph, selectPortioning } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'
import { FLOUR_CATALOG, FLOUR_GROUPS } from '@/local_data/flour-catalog'
import { estimateBlendWRPC, blendFlourPropertiesRPC } from '~/lib/recipe-rpc'
import type { FlourCatalogEntry } from '@commons/types/recipe'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from '~/components/ui/command'
import { Badge } from '~/components/ui/badge'

const catalog = FLOUR_CATALOG as unknown as FlourCatalogEntry[]

export function FlourMixSelector() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const flourMix = useRecipeFlowStore((s) => selectPortioning(s).flourMix ?? [])
  const setPortioning = useRecipeFlowStore((s) => s.setPortioning)
  const graph = useRecipeFlowStore(selectGraph)

  // Compute W: use real blend from graph nodes if available, else estimate from keys
  const doughNode = graph.nodes.find((n) => n.type === 'dough')
  const realFlours = doughNode?.data.flours ?? []
  const hasRealFlours = realFlours.length > 0 && realFlours.some((f) => f.g > 0)
  const [blendW, setBlendW] = useState(0)
  const wLabel = hasRealFlours ? t('label_blended_w') : t('label_estimated_w')
  const blendKey = hasRealFlours
    ? realFlours.map((f) => `${f.type}:${f.g}`).join(',')
    : flourMix.join(',')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (hasRealFlours) {
          const bp = await blendFlourPropertiesRPC(realFlours)
          if (!cancelled) setBlendW(bp.W)
        } else if (flourMix.length > 0) {
          const w = await estimateBlendWRPC(flourMix)
          if (!cancelled) setBlendW(w)
        } else {
          if (!cancelled) setBlendW(0)
        }
      } catch { /* keep previous */ }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blendKey])

  function toggle(key: string) {
    setPortioning((p) => ({
      ...p,
      flourMix: (p.flourMix ?? []).includes(key)
        ? (p.flourMix ?? []).filter((k) => k !== key)
        : [...(p.flourMix ?? []), key],
    }))
  }

  function selectAll() {
    setPortioning((p) => ({
      ...p,
      flourMix: catalog.map((f) => f.key),
    }))
  }

  function deselectAll() {
    setPortioning((p) => ({ ...p, flourMix: [] }))
  }

  const triggerLabel = flourMix.length === 0
    ? t('label_flour_mix_all')
    : t('label_flour_mix_count', { count: flourMix.length })

  return (
    <div className="mb-3">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {t('label_flour_mix')}
      </label>
      <div className="flex items-center gap-2 mt-0.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-1 flex items-center justify-between text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card hover:bg-accent/50 transition-colors text-left min-h-8"
            >
              <span className="truncate">{triggerLabel}</span>
              <svg className="h-3.5 w-3.5 ml-1 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t('label_flour_mix_placeholder')} />
              <div className="flex items-center gap-1 px-2 py-1.5 border-b">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] text-primary hover:underline"
                >
                  {t('btn_select_all')}
                </button>
                <span className="text-[10px] text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[10px] text-primary hover:underline"
                >
                  {t('btn_deselect_all')}
                </button>
              </div>
              <CommandList className="max-h-[240px]">
                <CommandEmpty>{t('label_empty')}</CommandEmpty>
                {FLOUR_GROUPS.map((group) => {
                  const groupFlours = catalog.filter((f) => f.groupKey === group)
                  if (groupFlours.length === 0) return null
                  return (
                    <CommandGroup key={group} heading={t(group)}>
                      {groupFlours.map((flour) => {
                        const selected = flourMix.includes(flour.key)
                        return (
                          <CommandItem
                            key={flour.key}
                            value={`${t(flour.labelKey)} ${t(flour.subKey)}`}
                            onSelect={() => toggle(flour.key)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                              selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {selected && (
                                <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs truncate">{t(flour.labelKey)}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{t(flour.subKey)}</div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              W{flour.W}
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {(flourMix.length > 0) && (
          <Badge variant="secondary" className="shrink-0 text-[10px] font-mono">
            {wLabel} {blendW}
          </Badge>
        )}
      </div>
    </div>
  )
}
