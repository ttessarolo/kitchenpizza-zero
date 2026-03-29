import { useState } from 'react'
import { useT } from '~/hooks/useTranslation'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { computeGraphTotals, computeGroupedIngredients, computeSchedule, computeTimeSummary } from '~/hooks/useGraphCalculator'
import { RecipeTypeSelector } from '~/components/recipe/RecipeTypeSelector'
import { PortioningSection } from '~/components/recipe/PortioningSection'
import { IngredientsOverview } from '~/components/recipe/IngredientsOverview'
import { TimeSummary } from '~/components/recipe/TimeSummary'
import { DoughCompositionPanel } from './DoughCompositionPanel'
import { DoughTotalsPanel } from './DoughTotalsPanel'
import { RECIPE_SUBTYPES } from '@/local_data'
import { Switch } from '~/components/ui/switch'

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
  const scaleAllNodes = useRecipeFlowStore((s) => s.scaleAllNodes)
  const setGlobalHydration = useRecipeFlowStore((s) => s.setGlobalHydration)
  const handlePortioningChangeWithScale = useRecipeFlowStore((s) => s.handlePortioningChangeWithScale)
  const setPortioning = useRecipeFlowStore((s) => s.setPortioning)
  const applyTypeDefaults = useRecipeFlowStore((s) => s.applyTypeDefaults)
  const generateDough = useRecipeFlowStore((s) => s.generateDough)
  const graphEmpty = useRecipeFlowStore((s) => s.graph.nodes.length === 0)
  const t = useT()

  const currentSubtypes = (RECIPE_SUBTYPES[meta.type] || []).map((s) => ({
    key: s.key,
    label: t(s.labelKey),
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
        title={t("label_open_toolbar")}
      >
        ◀
      </button>
    )
  }

  return (
    <div className="w-[320px] shrink-0 bg-white border-l border-border overflow-y-auto flex flex-col">
      {/* Collapse button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-[#8a7a66] uppercase tracking-wider">{t('section_configuration')}</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-[#8a7a66] hover:bg-[#faf8f5] text-xs"
          title={t('close_toolbar')}
        >
          ▶
        </button>
      </div>

      {/* 1. Tipologia */}
      <AccordionSection title={t('section_type')} icon="📋">
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

        {/* Auto-correct settings */}
        <div className="mt-3 space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium">{t('label_auto_correct')}</span>
            <Switch
              checked={portioning.autoCorrect}
              onCheckedChange={(checked) => setPortioning((p) => ({ ...p, autoCorrect: checked }))}
            />
          </label>
          {portioning.autoCorrect && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('label_reasoning_level')}</label>
              <select
                value={portioning.reasoningLevel}
                onChange={(e) => setPortioning((p) => ({ ...p, reasoningLevel: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none"
              >
                <option value="low">{t('reasoning_low')}</option>
                <option value="medium">{t('reasoning_medium')}</option>
                <option value="high">{t('reasoning_high')}</option>
              </select>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* 1b. Dettagli ricetta */}
      <AccordionSection title={t('section_recipe_details')} icon="📝">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('label_recipe_name')}</label>
            <input
              type="text"
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              placeholder={t('label_recipe_name_placeholder')}
              className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('label_author')}</label>
            <input
              type="text"
              value={meta.author}
              onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
              placeholder={t('label_author_placeholder')}
              className="w-full text-sm border border-border rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-primary"
            />
          </div>
        </div>
      </AccordionSection>

      {/* 2. Porzionatura */}
      <AccordionSection title={t('section_portioning')} icon="📐">
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
      <AccordionSection title={t('section_composition')} icon="🧪">
        <DoughCompositionPanel />
      </AccordionSection>

      {/* 4. Totale impasto */}
      <AccordionSection title={t('section_dough_total')} icon="📊">
        <DoughTotalsPanel />
      </AccordionSection>

      {/* 5. Ingredienti */}
      <AccordionSection title={t('section_ingredients')} icon="🧈">
        {hasIngredients ? (
          <IngredientsOverview
            ingredientGroups={ingredientGroups}
            groupedIngredients={grouped}
            hideHeader
          />
        ) : (
          <div className="text-xs space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('label_estimated_from_composition')}</div>
            {estimatedFlour > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("default_flour_name")}</span><span className="font-bold">{estimatedFlour}g</span></div>}
            {estimatedLiquid > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("label_water")}</span><span className="font-bold">{estimatedLiquid}g</span></div>}
            {portioning.yeastPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("default_yeast_name")}</span><span className="font-bold">{Math.round(estimatedFlour * portioning.yeastPct / 100 * 10) / 10}g</span></div>}
            {portioning.saltPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("default_salt_name")}</span><span className="font-bold">{Math.round(estimatedFlour * portioning.saltPct / 100 * 10) / 10}g</span></div>}
            {portioning.fatPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("default_fat_name")}</span><span className="font-bold">{Math.round(estimatedFlour * portioning.fatPct / 100 * 10) / 10}g</span></div>}
          </div>
        )}
      </AccordionSection>

      {/* 6. Tempi */}
      <AccordionSection title={t('section_times')} icon="⏱️">
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
            {t('btn_generate_dough')}
          </button>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {t('btn_generate_dough_help')}
          </p>
        </div>
      )}
    </div>
  )
}
