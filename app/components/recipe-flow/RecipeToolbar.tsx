import { useState } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computeGraphTotals, computeGroupedIngredients, computeSchedule, computeTimeSummary } from '~/hooks/useGraphCalculator'
import { RecipeTypeSelector } from '~/components/recipe/RecipeTypeSelector'
import { PortioningSection } from '~/components/recipe/PortioningSection'
import { IngredientsOverview } from '~/components/recipe/IngredientsOverview'
import { TimeSummary } from '~/components/recipe/TimeSummary'
import { DoughCompositionPanel } from './DoughCompositionPanel'
import { DoughTotalsPanel } from './DoughTotalsPanel'
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
  const generateDough = useRecipeFlowStore((s) => s.generateDough)
  const graphEmpty = useRecipeFlowStore((s) => s.graph.nodes.length === 0)

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

  // Target dough from portioning (used when graph is empty or has no ingredients)
  const portioningTarget = portioning.mode === 'tray'
    ? Math.round(portioning.thickness * portioning.tray.l * portioning.tray.w * portioning.tray.count)
    : portioning.ball.weight * portioning.ball.count

  const hasIngredients = totals.totalDough > 0
  const displayTotalDough = hasIngredients ? totals.totalDough : portioningTarget
  const displayHydration = hasIngredients ? totals.currentHydration : portioning.targetHyd

  // Estimate flour/liquid from target + hydration when graph has no ingredients
  const estimatedFlour = hasIngredients
    ? totals.totalFlour
    : Math.round(portioningTarget / (1 + portioning.targetHyd / 100))
  const estimatedLiquid = hasIngredients
    ? totals.totalLiquid
    : Math.round(estimatedFlour * portioning.targetHyd / 100)

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

      {/* 1b. Dettagli ricetta */}
      <AccordionSection title="Dettagli Ricetta" icon="📝">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nome ricetta</label>
            <input
              type="text"
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              placeholder="Es. Pizza Margherita"
              className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Autore</label>
            <input
              type="text"
              value={meta.author}
              onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
              placeholder="Il tuo nome"
              className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-primary"
            />
          </div>
        </div>
      </AccordionSection>

      {/* 2. Porzionatura */}
      <AccordionSection title="Porzionatura" icon="📐">
        <PortioningSection
          hideHeader
          hideTotals
          portioning={portioning}
          totalDough={displayTotalDough}
          totalFlour={estimatedFlour}
          totalLiquid={estimatedLiquid}
          currentHydration={displayHydration}
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

      {/* 3. Composizione impasto */}
      <AccordionSection title="Composizione Impasto" icon="🧪">
        <DoughCompositionPanel />
      </AccordionSection>

      {/* 4. Totale impasto */}
      <AccordionSection title="Totale Impasto" icon="📊">
        <DoughTotalsPanel />
      </AccordionSection>

      {/* 5. Ingredienti */}
      <AccordionSection title="Ingredienti" icon="🧈">
        {hasIngredients ? (
          <IngredientsOverview
            ingredientGroups={ingredientGroups}
            groupedIngredients={grouped}
            hideHeader
          />
        ) : (
          <div className="text-xs space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stima (da composizione)</div>
            {estimatedFlour > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Farina 00 forte</span><span className="font-bold">{estimatedFlour}g</span></div>}
            {estimatedLiquid > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Acqua</span><span className="font-bold">{estimatedLiquid}g</span></div>}
            {portioning.yeastPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Lievito birra fresco</span><span className="font-bold">{Math.round(estimatedFlour * portioning.yeastPct / 100 * 10) / 10}g</span></div>}
            {portioning.saltPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Sale fino</span><span className="font-bold">{Math.round(estimatedFlour * portioning.saltPct / 100 * 10) / 10}g</span></div>}
            {portioning.fatPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Olio EVO</span><span className="font-bold">{Math.round(estimatedFlour * portioning.fatPct / 100 * 10) / 10}g</span></div>}
          </div>
        )}
      </AccordionSection>

      {/* 6. Tempi */}
      <AccordionSection title="Tempi" icon="⏱️">
        <TimeSummary timeSummary={timeSummary} hideHeader />
      </AccordionSection>

      {/* Genera Impasto — only for empty graphs */}
      {graphEmpty && (
        <div className="p-3 border-t border-border">
          <button
            type="button"
            onClick={generateDough}
            className="w-full py-2.5 rounded-xl bg-gradient-to-br from-primary to-[#c4956a] text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            🚀 Genera Impasto
          </button>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Genera tutti i nodi dell'impasto basandosi sulle impostazioni sopra
          </p>
        </div>
      )}
    </div>
  )
}
