import { useRecipeCalculator } from '~/hooks/useRecipeCalculator'
import { DEFAULT_RECIPE } from '@/local_data'
import type { Recipe as RecipeType } from '@commons/types/recipe'
import { RecipeProvider } from './RecipeContext'
import { RecipeHeader } from './RecipeHeader'
import { RecipeTypeSelector } from './RecipeTypeSelector'
import { PortioningSection } from './PortioningSection'
import { IngredientsOverview } from './IngredientsOverview'
import { TimeSummary } from './TimeSummary'
import { ScheduleEditor } from './ScheduleEditor'
import { StepsList } from './StepsList'

interface RecipeProps {
  initialRecipe?: RecipeType
}

export function Recipe({ initialRecipe = DEFAULT_RECIPE }: RecipeProps) {
  const calc = useRecipeCalculator(initialRecipe)

  return (
    <RecipeProvider calc={calc}>
      <div className="min-h-screen bg-background text-foreground font-display">
        {/* Header */}
        <RecipeHeader
          meta={calc.recipe.meta}
          onNameChange={(name) =>
            calc.setRecipe((p) => ({ ...p, meta: { ...p.meta, name } }))
          }
          onAuthorChange={(author) =>
            calc.setRecipe((p) => ({ ...p, meta: { ...p.meta, author } }))
          }
        />

        <div className="max-w-xl mx-auto px-4 pb-12">
          {/* Type selector */}
          <RecipeTypeSelector
            meta={calc.recipe.meta}
            currentSubtypes={calc.currentSubtypes}
            onTypeChange={(typeKey, subtypeKey) => {
              calc.setRecipe((p) => ({
                ...p,
                meta: { ...p.meta, type: typeKey, subtype: subtypeKey },
              }))
              if (subtypeKey) calc.applyDefaults(typeKey, subtypeKey)
            }}
            onSubtypeChange={(subtypeKey) => {
              calc.setRecipe((p) => ({
                ...p,
                meta: { ...p.meta, subtype: subtypeKey },
              }))
              calc.applyDefaults(calc.recipe.meta.type, subtypeKey)
            }}
          />

          {/* Portioning */}
          <PortioningSection
            portioning={calc.recipe.portioning}
            totalDough={calc.totalDough}
            totalFlour={calc.totalFlour}
            totalLiquid={calc.totalLiquid}
            currentHydration={calc.currentHydration}
            trayTotalDough={calc.trayTotalDough}
            onPortioningChange={calc.handlePortioningChange}
            onUpdatePortioning={calc.updatePortioning}
            onScaleAll={calc.scaleAll}
            onSetHydration={calc.setHydration}
          />

          {/* Ingredients overview */}
          <IngredientsOverview
            ingredientGroups={calc.recipe.ingredientGroups}
            groupedIngredients={calc.groupedIngredients}
          />

          {/* Time summary */}
          <TimeSummary timeSummary={calc.timeSummary} />

          {/* Schedule editor */}
          <ScheduleEditor
            planningMode={calc.planningMode}
            forwardHour={calc.forwardHour}
            forwardMinute={calc.forwardMinute}
            backwardDay={calc.backwardDay}
            backwardHour={calc.backwardHour}
            backwardMinute={calc.backwardMinute}
            startTime={calc.startTime}
            endTime={calc.endTime}
            onPlanningModeChange={calc.setPlanningMode}
            onForwardHourChange={calc.setForwardHour}
            onForwardMinuteChange={calc.setForwardMinute}
            onBackwardDayChange={calc.setBackwardDay}
            onBackwardHourChange={calc.setBackwardHour}
            onBackwardMinuteChange={calc.setBackwardMinute}
            onNow={calc.handleNow}
          />

          {/* Steps list */}
          <StepsList />

          {/* Footer */}
          <div className="mt-5 text-center text-[11px] text-[#b8a08a]">
            {calc.recipe.meta.author}
          </div>
        </div>
      </div>
    </RecipeProvider>
  )
}
