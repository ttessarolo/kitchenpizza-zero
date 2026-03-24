import { useState } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computeGraphTotals, computeGroupedIngredients, computeSchedule, computeTimeSummary } from '~/hooks/useGraphCalculator'
import { RecipeTypeSelector } from '~/components/recipe/RecipeTypeSelector'
import { PortioningSection } from '~/components/recipe/PortioningSection'
import { IngredientsOverview } from '~/components/recipe/IngredientsOverview'
import { TimeSummary } from '~/components/recipe/TimeSummary'
import { RECIPE_SUBTYPES } from '@/local_data'

function AccordionSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#8a7a66] uppercase tracking-wider hover:bg-[#faf8f5] transition-colors"
      >
        <span>{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function RecipeToolbar() {
  const [collapsed, setCollapsed] = useState(false)
  const meta = useRecipeFlowStore((s) => s.meta)
  const portioning = useRecipeFlowStore((s) => s.portioning)
  const graph = useRecipeFlowStore((s) => s.graph)
  const ingredientGroups = useRecipeFlowStore((s) => s.ingredientGroups)
  const setMeta = useRecipeFlowStore((s) => s.setMeta)
  const setPortioning = useRecipeFlowStore((s) => s.setPortioning)
  const scaleAllNodes = useRecipeFlowStore((s) => s.scaleAllNodes)
  const setGlobalHydration = useRecipeFlowStore((s) => s.setGlobalHydration)
  const handlePortioningChangeWithScale = useRecipeFlowStore((s) => s.handlePortioningChangeWithScale)
  const applyTypeDefaults = useRecipeFlowStore((s) => s.applyTypeDefaults)

  const currentSubtypes = (RECIPE_SUBTYPES[meta.type] || []).map((s) => ({
    key: s.key,
    label: s.label,
    defaults: s.defaults,
  }))

  // Computed values
  const totals = computeGraphTotals(graph)
  const grouped = computeGroupedIngredients(graph, ingredientGroups)
  const { nodes: nodesWithDur, span } = computeSchedule(graph, meta.type, meta.subtype, portioning.thickness)
  const timeSummary = computeTimeSummary(nodesWithDur, span)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-[#8a7a66] hover:bg-[#faf8f5]"
        title="Apri toolbar"
      >
        ◀
      </button>
    )
  }

  return (
    <div className="w-[320px] shrink-0 bg-white border-l border-border overflow-y-auto flex flex-col">
      {/* Collapse button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-[#8a7a66] uppercase tracking-wider">Configurazione</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-[#8a7a66] hover:bg-[#faf8f5] text-xs"
          title="Chiudi toolbar"
        >
          ▶
        </button>
      </div>

      {/* 1. Tipologia */}
      <AccordionSection title="Tipologia" icon="📋">
        <RecipeTypeSelector
          meta={meta}
          currentSubtypes={currentSubtypes}
          onTypeChange={(typeKey, subtypeKey) => {
            setMeta((m) => ({ ...m, type: typeKey, subtype: subtypeKey }))
            if (subtypeKey) applyTypeDefaults(typeKey, subtypeKey)
          }}
          onSubtypeChange={(subtypeKey) => {
            setMeta((m) => ({ ...m, subtype: subtypeKey }))
            applyTypeDefaults(meta.type, subtypeKey)
          }}
        />
      </AccordionSection>

      {/* 2. Porzionatura */}
      <AccordionSection title="Porzionatura" icon="📐">
        <PortioningSection
          hideHeader
          portioning={portioning}
          totalDough={totals.totalDough}
          totalFlour={totals.totalFlour}
          totalLiquid={totals.totalLiquid}
          currentHydration={totals.currentHydration}
          trayTotalDough={
            portioning.mode === 'tray'
              ? Math.round(portioning.thickness * portioning.tray.l * portioning.tray.w * portioning.tray.count)
              : 0
          }
          onPortioningChange={(np) => handlePortioningChangeWithScale(np)}
          onUpdatePortioning={(fn) => {
            const newP = fn(portioning)
            handlePortioningChangeWithScale(newP)
          }}
          onScaleAll={scaleAllNodes}
          onSetHydration={setGlobalHydration}
        />
      </AccordionSection>

      {/* 3. Ingredienti */}
      <AccordionSection title="Ingredienti" icon="🧈">
        <IngredientsOverview
          ingredientGroups={ingredientGroups}
          groupedIngredients={grouped}
          hideHeader
        />
      </AccordionSection>

      {/* 4. Tempi */}
      <AccordionSection title="Tempi" icon="⏱️">
        <TimeSummary timeSummary={timeSummary} hideHeader />
      </AccordionSection>
    </div>
  )
}
