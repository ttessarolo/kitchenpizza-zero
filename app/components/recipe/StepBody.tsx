import { useState } from 'react'
import { useT } from '~/hooks/useTranslation'
import type { RecipeStep, TemperatureUnit, FlourCatalogEntry, CookingConfig, FatIngredient, SteamerConfig, FryConfig, AirFryerConfig, GrillConfig, PanConfig } from '@commons/types/recipe'
import { getDefaultConfig as getBakeDefaultConfig } from '@commons/utils/bake-manager'
import type { ActionableWarning } from '@commons/types/recipe-graph'
import { FAT_TYPES } from '@/local_data/fat-catalog'
import { useRecipeFlowStore, selectGraph, selectPortioning } from '~/stores/recipe-flow-store'
import { rnd, nextId, fmtDuration, celsiusToFahrenheit, fahrenheitToCelsius } from '@commons/utils/format'
import { blendFlourProperties, getSaltPct, getSugarPct, getFatPct } from '@commons/utils/dough-manager'
import { getAncestorIds, getStepTotalWeight } from '@commons/utils/recipe'
import {
  STEP_TYPES,
  KNEAD_METHODS,
  RISE_METHODS,
  YEAST_TYPES,
  OVEN_TYPES,
  OVEN_MODES,
  MODE_MAP,
  FLOUR_CATALOG,
} from '@/local_data'
import { FlourPicker } from './FlourPicker'
import { IngredientBox } from './IngredientBox'
import { MiniSelect, LiquidSelector, ExtraSelector, SaltSelector, SugarSelector, FatSelector, AddButton } from './shared'
import { useRecipe } from './RecipeContext'
import { DepEditor } from './DepEditor'
import { BakingAdvisory } from './BakingAdvisory'

interface StepBodyProps {
  step: RecipeStep
}

export function StepBody({ step: s }: StepBodyProps) {
  const t = useT()
  const {
    recipe,
    editMode,
    temperatureUnit: tu,
    ambientTemp: at,
    displayTemp: dTf,
    getStepDuration: sDur,
    getFDT: gFDT,
    updateStep: uS,
    updateStepField: uSF,
    setStepHydration,
    setRecipe,
    setTemperatureUnit,
    getValidParents,
    totalDough,
  } = useRecipe()
  const { ingredientGroups: ig, steps: allSteps } = recipe
  const flourMix = useRecipeFlowStore((s) => selectPortioning(s).flourMix)
  const sF = s.flours.reduce((a, f) => a + f.g, 0)
  const sL = s.liquids.reduce((a, l) => a + l.g, 0)
  const sH = sF > 0 ? Math.round((sL / sF) * 100) : 0
  const hasI =
    s.flours.length > 0 || s.liquids.length > 0 || s.extras.length > 0 || (s.yeasts || []).length > 0 || (s.salts || []).length > 0 || (s.sugars || []).length > 0 || (s.fats || []).length > 0

  const currentTypeEntry = STEP_TYPES.find((t) => t.key === s.type)
  const subtypes = currentTypeEntry?.subtypes || []
  // Bake/pre_bake/post_bake/done nodes should NOT show dough ingredient editors
  const showDoughIngredients = !['bake', 'pre_bake', 'post_bake', 'done'].includes(s.type)

  // Duration helpers (baseDur in minutes → h/m/s)
  const baseDurH = Math.floor(s.baseDur / 60)
  const baseDurM = Math.floor(s.baseDur % 60)
  const baseDurS = Math.round((s.baseDur % 1) * 60)
  const restDur = s.restDur || 0
  const restDurH = Math.floor(restDur / 60)
  const restDurM = Math.floor(restDur % 60)
  const restDurS = Math.round((restDur % 1) * 60)

  function setDuration(field: 'baseDur' | 'restDur', h: number, m: number, sec: number) {
    uSF(s.id, field, h * 60 + m + sec / 60)
  }

  // Tangzhong warning
  const tangzhongWarning = s.type === 'pre_dough' && s.subtype === 'tangzhong' && sL > 0
    ? (() => {
        const flourPct = (sF / sL) * 100
        if (flourPct < 1.5) return { type: 'warn' as const, msg: t("tangzhong_flour_pct_warn", { pct: rnd(flourPct) }) }
        if (flourPct > 2) return { type: 'warn' as const, msg: t("tangzhong_flour_pct_warn", { pct: rnd(flourPct) }) }
        return { type: 'ok' as const, msg: t("tangzhong_flour_pct_ok", { pct: rnd(flourPct) }) }
      })()
    : null

  return (
    <div className="px-3 pb-3 border-t border-[#f0e8df]">
      {/* Title */}
      <div className="mt-2 mb-1.5">
        <input
          type="text"
          value={s.title}
          onChange={(e) => uSF(s.id, 'title', e.target.value)}
          placeholder={t("step_title_placeholder")}
          disabled={!editMode}
          className="w-full text-sm font-semibold text-foreground bg-transparent border-none border-b border-dashed border-border outline-none pb-0.5 disabled:opacity-50"
        />
      </div>

      {/* Type + Subtype + Group selectors */}
      <div className="flex gap-2 mb-1.5 flex-wrap">
        <MiniSelect
          label={t("label_type")}
          value={s.type}
          onChange={(v) => uSF(s.id, 'type', v)}
          options={STEP_TYPES.map((st) => ({
            k: st.key,
            l: st.icon + ' ' + t(st.labelKey),
          }))}
        />
        {subtypes.length > 0 && (
          <MiniSelect
            label={t("label_subtype")}
            value={s.subtype || ''}
            onChange={(v) => {
              const newSubtype = v || null
              const subtypeEntry = subtypes.find((st) => st.key === v)
              uS(s.id, (st) => {
                const updated = { ...st, subtype: newSubtype }
                if (subtypeEntry?.defaults.baseDur != null) updated.baseDur = subtypeEntry.defaults.baseDur
                if (subtypeEntry?.defaults.kneadMethod) updated.kneadMethod = subtypeEntry.defaults.kneadMethod
                if (subtypeEntry?.defaults.riseMethod) updated.riseMethod = subtypeEntry.defaults.riseMethod
                // Re-create preFermentCfg when switching pre_ferment subtype
                if (st.type === 'pre_ferment' && subtypeEntry?.defaults) {
                  const d = subtypeEntry.defaults
                  updated.preFermentCfg = {
                    preFermentPct: d.preFermentPct ?? 45,
                    hydrationPct: d.hydrationPct ?? 44,
                    yeastType: d.yeastType ?? 'fresh',
                    yeastPct: d.yeastPct ?? null,
                    fermentTemp: d.fermentTemp ?? null,
                    fermentDur: d.fermentDur ?? null,
                    roomTempDur: d.roomTempDur ?? null,
                    starterForm: null,
                  }
                }
                // Re-create cookingCfg when switching bake subtype
                if (st.type === 'bake' && newSubtype) {
                  try {
                    const newCfg = getBakeDefaultConfig(newSubtype)
                    updated.cookingCfg = newCfg
                    // Keep ovenCfg in sync for legacy compat (forno/pentola)
                    if (newCfg.method === 'forno' || newCfg.method === 'pentola') {
                      updated.ovenCfg = newCfg.cfg
                    } else {
                      updated.ovenCfg = null
                    }
                  } catch {
                    // Unknown subtype — clear config
                    updated.cookingCfg = null
                  }
                }
                return updated
              })
            }}
            options={subtypes.map((st) => ({ k: st.key, l: t(st.labelKey) }))}
          />
        )}
        <GroupSelect
          value={s.group}
          groups={ig}
          allSteps={allSteps}
          editMode={editMode}
          onChange={(v) => uSF(s.id, 'group', v)}
          onNew={(n) => {
            setRecipe((p) => ({
              ...p,
              ingredientGroups: [...p.ingredientGroups, n],
            }))
            uSF(s.id, 'group', n)
          }}
          onDelete={(g) => {
            setRecipe((p) => ({
              ...p,
              ingredientGroups: p.ingredientGroups.filter((x) => x !== g),
            }))
          }}
        />
      </div>

      {/* Duration (left) + Rest (right) */}
      <div className="flex justify-between mb-1.5">
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">{t("label_duration")}</div>
          <div className="flex items-center gap-0.5 text-xs">
            <input type="number" min={0} value={baseDurH} onChange={(e) => setDuration('baseDur', +e.target.value || 0, baseDurM, baseDurS)} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
            <span className="text-muted-foreground">h</span>
            <input type="number" min={0} max={59} value={baseDurM} onChange={(e) => setDuration('baseDur', baseDurH, +e.target.value || 0, baseDurS)} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
            <span className="text-muted-foreground">m</span>
            <input type="number" min={0} max={59} value={baseDurS} onChange={(e) => setDuration('baseDur', baseDurH, baseDurM, +e.target.value || 0)} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
            <span className="text-muted-foreground">s</span>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5 text-right">{t("label_rest")}</div>
          <div className="flex items-center gap-0.5 text-xs">
            <input type="number" min={0} value={restDurH} onChange={(e) => setDuration('restDur', +e.target.value || 0, restDurM, restDurS)} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
            <span className="text-muted-foreground">h</span>
            <input type="number" min={0} max={59} value={restDurM} onChange={(e) => setDuration('restDur', restDurH, +e.target.value || 0, restDurS)} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
            <span className="text-muted-foreground">m</span>
            <input type="number" min={0} max={59} value={restDurS} onChange={(e) => setDuration('restDur', restDurH, restDurM, +e.target.value || 0)} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
            <span className="text-muted-foreground">s</span>
          </div>
          {/* Rest temperature */}
          {restDur > 0 && (
            <div className="flex items-center gap-1 mt-1 justify-end">
              <span className="text-[11px] text-muted-foreground">{t("label_temp")}</span>
              <input
                type="number"
                step={0.1}
                value={s.restTemp ?? (tu === 'F' ? celsiusToFahrenheit(at) : at)}
                onChange={(e) => uSF(s.id, 'restTemp', tu === 'F' ? fahrenheitToCelsius(+e.target.value) : +e.target.value)}
                className="w-14 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7"
              />
              <span className="text-[11px] text-muted-foreground">{tu === 'F' ? '°F' : '°C'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {s.desc && <p className="text-sm leading-relaxed text-[#5a4538] my-1">{s.desc}</p>}

      {/* Tangzhong warning */}
      {tangzhongWarning && (
        <div className={`text-xs px-2 py-1.5 rounded-md mb-1.5 ${tangzhongWarning.type === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {tangzhongWarning.msg}
        </div>
      )}

      {/* Pre-ferment config (reveal, before ingredients) */}
      {s.type === 'pre_ferment' && s.preFermentCfg && (() => {
        const cfg = s.preFermentCfg
        const pfSubtypeEntry = currentTypeEntry?.subtypes?.find((st) => st.key === s.subtype)
        const pfDefaults = pfSubtypeEntry?.defaults || {}
        const isTwoPhase = (pfDefaults.phases ?? 2) === 2
        // Use ACTUAL step ingredients for display (not computePreFermentAmounts which uses stale target)
        const actualFlour = s.flours.reduce((a, f) => a + f.g, 0)
        const actualLiquid = s.liquids.reduce((a, l) => a + l.g, 0)
        const actualYeast = (s.yeasts || []).reduce((a, y) => a + y.g, 0)
        const actualWeight = actualFlour + actualLiquid + actualYeast
        const pfRange = pfDefaults.preFermentPctRange || [10, 100]
        const hydRange = pfDefaults.hydrationPctRange || [40, 130]
        const isHydLocked = pfDefaults.hydrationLocked === true

        function updateCfg(field: string, value: unknown) {
          // Uses uS (updateStep) which auto-reconciles pre_ferment + dough in the hook
          uS(s.id, (st) => {
            if (!st.preFermentCfg) return st
            return { ...st, preFermentCfg: { ...st.preFermentCfg, [field]: value } }
          })
        }

        return (
          <details className="mt-1.5 bg-[#fef8eb] rounded-lg border border-[#e8d8a0] group">
            <summary className="p-2.5 cursor-pointer list-none text-xs font-semibold text-[#7a6020] uppercase tracking-[1px]">
              <span className="inline-block transition-transform group-open:rotate-90">▸</span>{' '}
              {t("pf_config_title")} — {cfg.preFermentPct}% · {cfg.hydrationPct}% {t("pf_hyd_abbr")} · {rnd(actualWeight)}g
            </summary>
            <div className="px-2.5 pb-2.5">
              {/* PreFerment % */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                  <span>{t("pf_label")}</span>
                  <span><b>{cfg.preFermentPct}%</b> · {rnd(actualWeight)}g</span>
                </div>
                <input type="range" min={pfRange[0]} max={pfRange[1]} step={1} value={cfg.preFermentPct} onChange={(e) => updateCfg('preFermentPct', +e.target.value)} className="w-full accent-[#7a6020]" />
              </div>

              {/* Hydration % */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                  <span>{t("pf_hydration")}</span>
                  <span><b>{cfg.hydrationPct}%</b>{isHydLocked && ` (${t("pf_hydration_locked")})`}</span>
                </div>
                <input type="range" min={hydRange[0]} max={hydRange[1]} step={1} value={cfg.hydrationPct} onChange={(e) => updateCfg('hydrationPct', +e.target.value)} disabled={isHydLocked} className="w-full accent-[#7a6020]" />
              </div>

              {/* Yeast (two-phase only) */}
              {isTwoPhase && cfg.yeastType != null && (
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">{t("pf_yeast")}</div>
                    <select value={cfg.yeastType || 'fresh'} onChange={(e) => updateCfg('yeastType', e.target.value)} className="w-full text-xs font-medium bg-background border border-border rounded-lg py-1 pl-2 pr-6 cursor-pointer outline-none min-h-7">
                      {YEAST_TYPES.filter((y) => !y.key.startsWith('madre')).map((y) => (
                        <option key={y.key} value={y.key}>{t(y.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <div className="text-xs text-muted-foreground mb-0.5">{t("pf_yeast_pct")}</div>
                    <input type="number" step={0.1} min={0.01} value={cfg.yeastPct ?? 1} onChange={(e) => updateCfg('yeastPct', +e.target.value || 0.1)} className="w-full text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
                  </div>
                </div>
              )}

              {/* Sourdough starter form toggle */}
              {s.subtype === 'sourdough' && (
                <div className="mb-2">
                  <div className="text-xs text-muted-foreground mb-0.5">{t("pf_starter_type")}</div>
                  <div className="flex gap-1">
                    {[{ k: 'solid', l: t("pf_pasta_madre") }, { k: 'licoli', l: t("pf_licoli") }].map((f) => (
                      <button key={f.k} type="button" onClick={() => { updateCfg('starterForm', f.k); updateCfg('hydrationPct', f.k === 'solid' ? 50 : 100) }} className={`flex-1 text-xs py-1 rounded border cursor-pointer ${cfg.starterForm === f.k ? 'bg-[#7a6020] text-white border-[#7a6020] font-semibold' : 'bg-white text-muted-foreground border-border'}`}>
                        {f.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fermentation temp + duration (two-phase only) */}
              {isTwoPhase && (
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">{t("pf_ferm_temp")}</div>
                    <div className="flex items-center gap-0.5">
                      <input type="number" step={0.1} value={cfg.fermentTemp ?? 18} onChange={(e) => updateCfg('fermentTemp', +e.target.value)} className="w-14 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
                      <span className="text-xs text-muted-foreground">°C</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">{t("pf_ferm_duration")}</div>
                    <div className="flex items-center gap-0.5">
                      <input type="number" min={0} value={Math.floor((cfg.fermentDur ?? 0) / 60)} onChange={(e) => updateCfg('fermentDur', (+e.target.value || 0) * 60 + ((cfg.fermentDur ?? 0) % 60))} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
                      <span className="text-xs text-muted-foreground">h</span>
                      <input type="number" min={0} max={59} value={Math.floor((cfg.fermentDur ?? 0) % 60)} onChange={(e) => updateCfg('fermentDur', Math.floor((cfg.fermentDur ?? 0) / 60) * 60 + (+e.target.value || 0))} className="w-11 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
                      <span className="text-xs text-muted-foreground">m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Computed values — show ACTUAL step ingredients */}
              <div className="mt-2 p-2 bg-white rounded border border-[#e8d8a0] text-xs">
                <div className="font-semibold text-[#7a6020] mb-1">{t("pf_computed_values")}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span>{t("pf_weight")}</span><span className="font-semibold text-foreground">{rnd(actualWeight)}g</span>
                  <span>{t("pf_flour")}</span><span className="font-semibold text-foreground">{rnd(actualFlour)}g</span>
                  <span>{t("pf_water")}</span><span className="font-semibold text-foreground">{rnd(actualLiquid)}g</span>
                  {actualYeast > 0 && (<><span>{t("pf_yeast_amount")}</span><span className="font-semibold text-foreground">{rnd(actualYeast)}g</span></>)}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#e8d8a0] text-amber-700">
                  {t("pf_main_dough_reduction", { flour: rnd(actualFlour), water: rnd(actualLiquid) })}
                </div>
              </div>
            </div>
          </details>
        )
      })()}

      {/* Pre-ferment salt warning */}
      {s.type === 'pre_ferment' && (s.salts || []).length > 0 && (
        <div className="mt-1.5 p-2 bg-red-50 rounded border border-red-200 text-xs text-red-800">
          {t("pf_salt_warning")}
        </div>
      )}

      {/* Pre-ferment fat warning */}
      {s.type === 'pre_ferment' && (s.fats || []).length > 0 && (
        <div className="mt-1.5 p-2 bg-red-50 rounded border border-red-200 text-xs text-red-800">
          {t("pf_fat_warning")}
        </div>
      )}

      {/* Dough: Preparations to incorporate (before ingredients) */}
      {s.type === 'dough' && (() => {
        const { steps } = recipe
        const ancestorIds = getAncestorIds(s.id, steps)
        const preps = steps.filter(
          (st) => ancestorIds.has(st.id) && (st.type === 'pre_dough' || st.type === 'pre_ferment'),
        )
        if (preps.length === 0) return null
        return (
          <div className="mt-1.5 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-[1px] mb-1.5">
              {t("dough_preps_to_add")}
            </div>
            {preps.map((prep) => {
              const icon = STEP_TYPES.find((t) => t.key === prep.type)?.icon || ''
              const weight = getStepTotalWeight(prep)
              const flourG = prep.flours.reduce((a, f) => a + f.g, 0)
              const liquidG = prep.liquids.reduce((a, l) => a + l.g, 0)
              const yeastG = (prep.yeasts || []).reduce((a, y) => a + y.g, 0)
              const parts: string[] = []
              if (flourG > 0) parts.push(`${t("pf_flour")} ${rnd(flourG)}g`)
              if (liquidG > 0) parts.push(`${t("pf_water")} ${rnd(liquidG)}g`)
              if (yeastG > 0) parts.push(`${t("pf_yeast_amount")} ${rnd(yeastG)}g`)
              return (
                <div key={prep.id} className="mb-1 last:mb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900">
                      {icon} {prep.title}
                    </span>
                    <span className="text-xs font-bold text-amber-800">{rnd(weight)}g</span>
                  </div>
                  {parts.length > 0 && (
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      {parts.join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Ingredients — hidden for bake/pre_bake/post_bake/done */}
      {showDoughIngredients && hasI && (
        <div className="flex flex-col gap-1.5 mt-1">
          {/* Flours */}
          {s.flours.length > 0 && (
            <IngredientBox
              title={t('label_flours')}
              items={s.flours}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  flours: st.flours.map((x) => (x.id === id ? { ...x, [f]: v } : x)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  flours: st.flours.filter((x) => x.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  flours: [...st.flours, { id: nextId(st.flours), type: 'gt_00_med', g: 50, temp: null }],
                }))
              }
              renderItem={(item, onU) => (
                <div>
                  <FlourPicker
                    value={item.type as string}
                    onChange={(v) => onU('type', v)}
                    allowedKeys={flourMix?.length ? flourMix : undefined}
                  />
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={(item.temp as number | null) ?? (tu === 'F' ? celsiusToFahrenheit(at) : at)}
                        step={0.1}
                        onChange={(e) =>
                          onU('temp', tu === 'F' ? fahrenheitToCelsius(+e.target.value) : +e.target.value)
                        }
                        className="w-full text-xs font-semibold text-[#8a6e55] bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                      />
                      <span className="text-xs text-[#b8a08a]">{tu === 'F' ? '°F' : '°C'}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={item.g as number}
                        step={0.1}
                        min={0}
                        onChange={(e) => onU('g', parseFloat(e.target.value) || 0)}
                        className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                      />
                      <span className="text-xs text-[#8a6e55]">g</span>
                    </div>
                  </div>
                </div>
              )}
            />
          )}

          {/* Liquids */}
          {s.liquids.length > 0 && (
            <IngredientBox
              title={t('label_liquids')}
              items={s.liquids}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  liquids: st.liquids.map((x) => (x.id === id ? { ...x, [f]: v } : x)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  liquids: st.liquids.filter((x) => x.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  liquids: [...st.liquids, { id: nextId(st.liquids), type: 'Acqua', g: 50, temp: null }],
                }))
              }
              renderItem={(item, onU) => (
                <div className="grid grid-cols-[1fr_70px_90px] gap-1 items-center">
                  <LiquidSelector value={item.type as string} onChange={(v) => onU('type', v)} />
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={(item.temp as number | null) ?? (tu === 'F' ? celsiusToFahrenheit(at) : at)}
                      step={0.1}
                      onChange={(e) =>
                        onU('temp', tu === 'F' ? fahrenheitToCelsius(+e.target.value) : +e.target.value)
                      }
                      className="w-full text-xs font-semibold text-[#8a6e55] bg-white border border-border rounded-md px-1 py-1 outline-none min-h-8"
                    />
                    <span className="text-xs text-[#b8a08a]">{tu === 'F' ? '°F' : '°C'}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={item.g as number}
                      step={0.1}
                      min={0}
                      onChange={(e) => onU('g', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                    />
                    <span className="text-xs text-[#8a6e55]">g</span>
                  </div>
                </div>
              )}
            />
          )}

          {/* Step hydration */}
          {sF > 0 && sL > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#fef6ed] rounded-[7px] text-xs">
              <span className="text-[#8a6e40]">{t("label_hydration_short")}</span>
              <input
                type="number"
                value={sH}
                step={1}
                onChange={(e) => setStepHydration(s.id, +e.target.value || 0)}
                className="w-[54px] text-xs font-bold text-accent bg-white border border-border rounded-[5px] px-1.5 py-0.5 outline-none text-center min-h-7"
              />
              <span className="text-[#8a6e40]">%</span>
            </div>
          )}

          {/* Extras */}
          {s.extras.length > 0 && (
            <IngredientBox
              title={t('label_extras')}
              items={s.extras}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  extras: st.extras.map((x) => (x.id === id ? { ...x, [f]: v } : x)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  extras: st.extras.filter((x) => x.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  extras: [...st.extras, { id: nextId(st.extras), name: t("ingredient_new"), g: 10 }],
                }))
              }
              renderItem={(item, onU) => (
                <div className="grid grid-cols-[1fr_90px] gap-1 items-center">
                  <ExtraSelector value={item.name as string} onChange={(v) => onU('name', v)} />
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={item.g as number}
                      step={0.1}
                      min={0}
                      onChange={(e) => onU('g', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                    />
                    <span className="text-xs text-[#8a6e55]">{(item.unit as string) || 'g'}</span>
                  </div>
                </div>
              )}
            />
          )}

          {/* Add buttons for missing ingredient types */}
          <div className="flex gap-1 flex-wrap">
            {s.flours.length === 0 && (
              <AddButton
                label={`+ ${t("label_flours")}`}
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    flours: [{ id: 0, type: 'gt_0_for', g: 100, temp: null }],
                  }))
                }
              />
            )}
            {s.liquids.length === 0 && (
              <AddButton
                label={`+ ${t("label_liquids")}`}
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    liquids: [{ id: 0, type: 'Acqua', g: 50, temp: null }],
                  }))
                }
              />
            )}
            {(s.yeasts || []).length === 0 && (s.type === 'dough' || s.type === 'pre_dough') && (
              <AddButton
                label={`+ ${t("label_yeasts")}`}
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    yeasts: [{ id: 0, type: 'fresh', g: 6 }],
                  }))
                }
              />
            )}
            {(s.salts || []).length === 0 && (
              <AddButton
                label={`+ ${t("label_salts")}`}
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    salts: [{ id: 0, type: 'sale_fino', g: 10 }],
                  }))
                }
              />
            )}
            {(s.sugars || []).length === 0 && (
              <AddButton
                label={`+ ${t("label_sugars")}`}
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    sugars: [{ id: 0, type: 'zucchero', g: 10 }],
                  }))
                }
              />
            )}
            {(s.fats || []).length === 0 && (
              <AddButton
                label={`+ ${t("label_fats")}`}
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    fats: [{ id: 0, type: 'olio_evo', g: 10 }],
                  }))
                }
              />
            )}
          </div>

          {/* Yeasts */}
          {(s.yeasts || []).length > 0 && (
            <IngredientBox
              title={t('label_yeasts')}
              items={s.yeasts}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  yeasts: st.yeasts.map((y) => (y.id === id ? { ...y, [f]: v } : y)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  yeasts: st.yeasts.filter((y) => y.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  yeasts: [...st.yeasts, { id: nextId(st.yeasts), type: 'fresh', g: 3 }],
                }))
              }
              renderItem={(item, onU) => {
                return (
                  <div className="grid grid-cols-[1fr_90px] gap-1 items-center">
                    <select
                      value={item.type as string}
                      onChange={(e) => {
                        const o = YEAST_TYPES.find((y) => y.key === (item.type as string)) || YEAST_TYPES[0]
                        const n = YEAST_TYPES.find((y) => y.key === e.target.value) || YEAST_TYPES[0]
                        onU('g', rnd(((item.g as number) * o.toFresh) / n.toFresh))
                        onU('type', e.target.value)
                      }}
                      className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
                    >
                      {YEAST_TYPES.map((y) => (
                        <option key={y.key} value={y.key}>
                          {t(y.labelKey)}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={item.g as number}
                        step={0.1}
                        min={0.1}
                        onChange={(e) => onU('g', parseFloat(e.target.value) || 0.1)}
                        className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                      />
                      <span className="text-xs text-[#8a6e55]">g</span>
                    </div>
                  </div>
                )
              }}
            />
          )}

          {/* Salts */}
          {(s.salts || []).length > 0 && (
            <IngredientBox
              title={t('label_salts')}
              items={s.salts}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  salts: st.salts.map((x) => (x.id === id ? { ...x, [f]: v } : x)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  salts: st.salts.filter((x) => x.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  salts: [...st.salts, { id: nextId(st.salts), type: 'sale_fino', g: 10 }],
                }))
              }
              renderItem={(item, onU) => (
                <div className="grid grid-cols-[1fr_90px] gap-1 items-center">
                  <SaltSelector value={item.type as string} onChange={(v) => onU('type', v)} />
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={item.g as number}
                      step={0.1}
                      min={0}
                      onChange={(e) => onU('g', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                    />
                    <span className="text-xs text-[#8a6e55]">g</span>
                  </div>
                </div>
              )}
            />
          )}

          {/* Sugars */}
          {(s.sugars || []).length > 0 && (
            <IngredientBox
              title={t('label_sugars')}
              items={s.sugars}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  sugars: st.sugars.map((x) => (x.id === id ? { ...x, [f]: v } : x)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  sugars: st.sugars.filter((x) => x.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  sugars: [...st.sugars, { id: nextId(st.sugars), type: 'zucchero', g: 10 }],
                }))
              }
              renderItem={(item, onU) => (
                <div className="grid grid-cols-[1fr_90px] gap-1 items-center">
                  <SugarSelector value={item.type as string} onChange={(v) => onU('type', v)} />
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={item.g as number}
                      step={0.1}
                      min={0}
                      onChange={(e) => onU('g', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                    />
                    <span className="text-xs text-[#8a6e55]">g</span>
                  </div>
                </div>
              )}
            />
          )}

          {/* Fats */}
          {(s.fats || []).length > 0 && (
            <IngredientBox
              title={t('label_fats')}
              items={s.fats || []}
              onUpdate={(id, f, v) =>
                uS(s.id, (st) => ({
                  ...st,
                  fats: (st.fats || []).map((x) => (x.id === id ? { ...x, [f]: v } : x)),
                }))
              }
              onRemove={(id) =>
                uS(s.id, (st) => ({
                  ...st,
                  fats: (st.fats || []).filter((x) => x.id !== id),
                }))
              }
              onAdd={() =>
                uS(s.id, (st) => ({
                  ...st,
                  fats: [...(st.fats || []), { id: nextId(st.fats || []), type: 'olio_evo', g: 10 }],
                }))
              }
              renderItem={(item, onU) => (
                <div className="grid grid-cols-[1fr_90px] gap-1 items-center">
                  <FatSelector value={item.type as string} onChange={(v) => onU('type', v)} />
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={item.g as number}
                      step={0.1}
                      min={0}
                      onChange={(e) => onU('g', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-semibold text-foreground bg-white border border-border rounded-md px-1.5 py-1 outline-none min-h-8"
                    />
                    <span className="text-xs text-[#8a6e55]">g</span>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}

      {/* Dough: Knead method + FDT */}
      {s.type === 'dough' && sF > 0 && (
        <div className="mt-1.5 p-2.5 bg-[#f0eef5] rounded-lg border border-[#d8d0e5]">
          <div className="text-xs font-semibold text-[#6050a0] uppercase tracking-[1px] mb-1">
            {t("dough_knead_temp")}
          </div>
          <select
            value={s.kneadMethod || 'hand'}
            onChange={(e) => uSF(s.id, 'kneadMethod', e.target.value)}
            className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none mb-1 min-h-8"
          >
            {KNEAD_METHODS.map((m) => (
              <option key={m.key} value={m.key}>
                {t(m.labelKey)} (+{m.ff}°C)
              </option>
            ))}
          </select>
          {(() => {
            const fdt = gFDT(s)
            const ok = fdt >= 24 && fdt <= 26
            return (
              <div
                className="text-xs font-bold"
                style={{ color: ok ? '#3a7a3a' : fdt < 24 ? '#4060b0' : '#c45a3a' }}
              >
                🌡️ {dTf(Math.round(fdt))}{' '}
                <span className="text-xs font-normal text-[#8a6e55]">
                  {t("fdt_ideal", { min: dTf(24), max: dTf(26) })}
                </span>
              </div>
            )
          })()}

          {/* Flour-based suggestions */}
          {(() => {
            const bp = blendFlourProperties(s.flours, FLOUR_CATALOG as unknown as FlourCatalogEntry[])
            const tips: string[] = []
            if (bp.absorption > 65) tips.push(t('tip_flour_high_absorption'))
            if (bp.W > 350) tips.push(t('tip_flour_strong'))
            if (bp.W > 0 && bp.W < 150) tips.push(t('tip_flour_weak'))
            if (bp.protein > 13.5) tips.push(t('tip_flour_high_protein'))
            if (bp.PL > 0.8) tips.push(t('tip_flour_high_pl'))
            if (bp.PL > 0 && bp.PL < 0.4) tips.push(t('tip_flour_low_pl'))
            if (bp.fallingNumber > 0 && bp.fallingNumber < 250) tips.push(t('tip_flour_low_falling'))
            if (bp.fiber > 6) tips.push(t('tip_flour_high_fiber'))
            if (!tips.length) return null
            return (
              <div className="mt-1.5 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-800">
                <div className="font-semibold mb-0.5">{t("tip_header_suggestions")}</div>
                {tips.map((t, i) => <div key={i} className="mt-0.5">- {t}</div>)}
              </div>
            )
          })()}

          {/* Salt & sugar suggestions */}
          {(() => {
            const stepFlour = s.flours.reduce((a, f) => a + f.g, 0)
            const saltPct = getSaltPct(s.salts || [], stepFlour > 0 ? stepFlour : sF)
            const sugarPct = getSugarPct(s.sugars || [], stepFlour > 0 ? stepFlour : sF)
            const tips: string[] = []
            if ((s.salts || []).length > 0 && saltPct < 2.0) tips.push(t("tip_salt_low", { pct: saltPct }))
            if (saltPct > 3.0) tips.push(t("tip_salt_high", { pct: saltPct }))
            if (s.type === 'dough' && (s.salts || []).length === 0) tips.push(t("tip_salt_none"))
            if (sugarPct > 8) tips.push(t("tip_sugar_high", { pct: sugarPct }))
            if (!tips.length) return null
            return (
              <div className="mt-1.5 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                <div className="font-semibold mb-0.5">{t("tip_header_salt_sugar")}</div>
                {tips.map((t, i) => <div key={i} className="mt-0.5">- {t}</div>)}
              </div>
            )
          })()}

          {/* Fat suggestions */}
          {(() => {
            const stepFlour = s.flours.reduce((a, f) => a + f.g, 0)
            const fatPct = getFatPct(s.fats || [], stepFlour > 0 ? stepFlour : 1)
            const tips: string[] = []
            if (s.fats && s.fats.length > 0 && fatPct > 12) tips.push(t("tip_fat_high", { pct: fatPct }))
            if (s.fats && s.fats.some(f => f.type === 'burro')) tips.push(t("tip_fat_butter_water"))
            if (!tips.length) return null
            return (
              <div className="mt-1.5 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                <div className="font-semibold mb-0.5">{t("tip_header_fats")}</div>
                {tips.map((t, i) => <div key={i} className="mt-0.5">- {t}</div>)}
              </div>
            )
          })()}
        </div>
      )}

      {/* Rise method */}
      {s.riseMethod && (
        <div className="mt-1.5 flex flex-col gap-1">
          {s.sourcePrep != null && (
            <div className="mt-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
                {t("shape_reference_dough")}
              </div>
              <select
                value={s.sourcePrep || ''}
                onChange={(e) => uSF(s.id, 'sourcePrep', e.target.value)}
                className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
              >
                <option value="">—</option>
                {getValidParents(s.id)
                  .filter((st) => (st.yeasts || []).length > 0)
                  .map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="mt-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
              {t("rise_method_label")}
            </div>
            <select
              value={s.riseMethod}
              onChange={(e) => uSF(s.id, 'riseMethod', e.target.value)}
              className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
            >
              {RISE_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>
            <div className="text-xs text-[#8a6e55] mt-0.5">
              {t("label_duration_value")} <b>{fmtDuration(sDur(s))}</b>
            </div>

            {/* Rise-step flour suggestions */}
            {(() => {
              const src = s.sourcePrep ? recipe.steps.find((st) => st.id === s.sourcePrep) : null
              if (!src || !src.flours.length) return null
              const bp = blendFlourProperties(src.flours, FLOUR_CATALOG as unknown as FlourCatalogEntry[])
              const riseDur = sDur(s)
              const tips: string[] = []
              if (bp.W > 0 && bp.W < 180 && riseDur > 180) tips.push(t('tip_rise_weak_long'))
              if (bp.fallingNumber > 0 && bp.fallingNumber < 220) tips.push(t('tip_rise_high_enzyme'))
              if (!tips.length) return null
              return (
                <div className="mt-1.5 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                  <div className="font-semibold mb-0.5">{t("tip_header_warning")}</div>
                  {tips.map((t, i) => <div key={i} className="mt-0.5">- {t}</div>)}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Cooking config — dispatches to method-specific editor */}
      {s.type === 'bake' && (() => {
        const cc = s.cookingCfg
        if (!cc && s.ovenCfg) {
          // Legacy: render OvenEditor for old nodes without cookingCfg
          return (
            <OvenEditor
              cfg={s.ovenCfg}
              tu={tu}
              setTU={setTemperatureUnit}
              dT={dTf}
              onChange={(f, v) =>
                uS(s.id, (st) => ({ ...st, ovenCfg: { ...st.ovenCfg!, [f]: v } }))
              }
              stepDur={sDur(s)}
              baseDur={s.baseDur}
              recipeType={recipe.meta.type}
              recipeSubtype={recipe.meta.subtype}
              nodeId={s.id}
            />
          )
        }
        if (!cc) return null
        const updateCookingCfg = (field: string, value: unknown) =>
          uS(s.id, (st) => {
            const prev = st.cookingCfg
            if (!prev) return st
            const newCfg = { ...prev, cfg: { ...prev.cfg, [field]: value } } as CookingConfig
            const update: Partial<RecipeStep> = { cookingCfg: newCfg }
            // Keep ovenCfg in sync for forno/pentola
            if (prev.method === 'forno' || prev.method === 'pentola') {
              update.ovenCfg = newCfg.cfg as RecipeStep['ovenCfg']
            }
            return { ...st, ...update }
          })
        switch (cc.method) {
          case 'forno':
          case 'pentola':
            return (
              <OvenEditor
                cfg={cc.cfg}
                tu={tu}
                setTU={setTemperatureUnit}
                dT={dTf}
                onChange={updateCookingCfg}
                stepDur={sDur(s)}
                baseDur={s.baseDur}
                recipeType={recipe.meta.type}
                recipeSubtype={recipe.meta.subtype}
                nodeId={s.id}
                method={cc.method}
              />
            )
          case 'vapore':
            return (
              <>
                <SteamerEditor cfg={cc.cfg} onChange={updateCookingCfg} />
                <CookingAdvisory cookingCfg={cc} recipeType={recipe.meta.type} recipeSubtype={recipe.meta.subtype} baseDur={s.baseDur} nodeId={s.id} />
              </>
            )
          case 'frittura':
            return (
              <>
                <FryEditor cfg={cc.cfg} onChange={updateCookingCfg} />
                <CookingFatsEditor
                  cookingFats={s.cookingFats ?? []}
                  onChange={(fats) => uS(s.id, (st) => ({ ...st, cookingFats: fats }))}
                />
                <CookingAdvisory cookingCfg={cc} recipeType={recipe.meta.type} recipeSubtype={recipe.meta.subtype} baseDur={s.baseDur} nodeId={s.id} />
              </>
            )
          case 'aria':
            return (
              <>
                <AirFryerEditor cfg={cc.cfg} onChange={updateCookingCfg} dT={dTf} />
                <CookingFatsEditor
                  cookingFats={s.cookingFats ?? []}
                  onChange={(fats) => uS(s.id, (st) => ({ ...st, cookingFats: fats }))}
                />
                <CookingAdvisory cookingCfg={cc} recipeType={recipe.meta.type} recipeSubtype={recipe.meta.subtype} baseDur={s.baseDur} nodeId={s.id} />
              </>
            )
          case 'griglia':
            return (
              <>
                <GrillEditor cfg={cc.cfg} onChange={updateCookingCfg} dT={dTf} />
                <CookingAdvisory cookingCfg={cc} recipeType={recipe.meta.type} recipeSubtype={recipe.meta.subtype} baseDur={s.baseDur} nodeId={s.id} />
              </>
            )
          case 'padella':
            return (
              <>
                <PanEditor cfg={cc.cfg} onChange={updateCookingCfg} dT={dTf} />
                <CookingFatsEditor
                  cookingFats={s.cookingFats ?? []}
                  onChange={(fats) => uS(s.id, (st) => ({ ...st, cookingFats: fats }))}
                />
                <CookingAdvisory cookingCfg={cc} recipeType={recipe.meta.type} recipeSubtype={recipe.meta.subtype} baseDur={s.baseDur} nodeId={s.id} />
              </>
            )
          default:
            return null
        }
      })()}

      {/* Formatura (shape) config */}
      {s.type === 'shape' && (() => {
        const count = s.shapeCount || 1
        const weightPerPiece = totalDough > 0 ? rnd(totalDough / count) : 0
        return (
          <div className="mt-1.5 flex flex-col gap-1">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
                {t("shape_reference_dough")}
              </div>
              <select
                value={s.sourcePrep || ''}
                onChange={(e) => uSF(s.id, 'sourcePrep', e.target.value)}
                className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
              >
                <option value="">—</option>
                {getValidParents(s.id)
                  .filter((st) => st.type === 'dough' || st.type === 'pre_dough')
                  .map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
                {t("shape_num_pieces")}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={s.shapeCount ?? 1}
                  onChange={(e) => uSF(s.id, 'shapeCount', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 outline-none min-h-8"
                />
                {totalDough > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t("shape_weight_per_piece", { weight: weightPerPiece })}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Dependencies */}
      <DepEditor step={s} />
    </div>
  )
}

// ── GroupSelect sub-component ────────────────────────────────
function GroupSelect({
  value,
  groups,
  allSteps,
  editMode,
  onChange,
  onNew,
  onDelete,
}: {
  value: string
  groups: string[]
  allSteps: RecipeStep[]
  editMode: boolean
  onChange: (v: string) => void
  onNew: (name: string) => void
  onDelete: (group: string) => void
}) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function isGroupEmpty(g: string) {
    return !allSteps.some((s) => s.group === g)
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-[#b8a08a] font-medium">{t("label_group")}</span>
      {adding ? (
        <div className="flex gap-0.5">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="text-xs border border-border rounded px-1 py-0.5 w-[70px] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (newValue.trim()) {
                onNew(newValue.trim())
                setAdding(false)
                setNewValue('')
              }
            }}
            className="text-[11px] bg-primary text-primary-foreground border-none rounded px-1.5 py-0.5 cursor-pointer"
          >
            OK
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <select
            value={value}
            onChange={(e) =>
              e.target.value === '__new__' ? setAdding(true) : onChange(e.target.value)
            }
            disabled={!editMode}
            className="text-[11px] text-[#6a5a48] bg-[#f5f0ea] border border-border rounded px-1 py-0.5 cursor-pointer outline-none min-h-7"
          >
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
            <option value="__new__">{t("group_new")}</option>
          </select>
          {/* Delete button for empty groups */}
          {editMode && isGroupEmpty(value) && value !== groups[0] && (
            <>
              {confirmDelete === value ? (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(value)
                      if (groups.length > 1) onChange(groups.find((g) => g !== value) || groups[0])
                      setConfirmDelete(null)
                    }}
                    className="text-[10px] bg-red-500 text-white border-none rounded px-1 py-0.5 cursor-pointer"
                  >
                    {t("action_delete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="text-[10px] bg-[#e8e2da] text-[#8a7a66] border-none rounded px-1 py-0.5 cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(value)}
                  className="w-5 h-5 rounded-full border-none bg-[#fde8e8] text-[#c45a3a] text-[10px] font-bold cursor-pointer flex items-center justify-center p-0"
                  title={t("group_delete_empty")}
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── OvenEditor sub-component ─────────────────────────────────
interface OvenEditorProps {
  cfg: NonNullable<RecipeStep['ovenCfg']>
  tu: TemperatureUnit
  setTU: (u: TemperatureUnit) => void
  dT: (c: number) => string
  onChange: (field: string, value: unknown) => void
  stepDur: number
  baseDur: number
  recipeType: string
  recipeSubtype: string | null
  nodeId: string
  method?: string
}

function OvenEditor({ cfg, tu, setTU, dT, onChange: ch, stepDur: sd, baseDur: bd, recipeType, recipeSubtype, nodeId, method }: OvenEditorProps) {
  const t = useT()
  const ms = MODE_MAP[cfg.ovenType] || ['static']
  const pp = 100 - cfg.cieloPct

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {/* Oven type + mode */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          {t("oven_label")}
        </div>
        <div className="flex gap-1">
          <select
            value={cfg.ovenType}
            onChange={(e) => {
              ch('ovenType', e.target.value)
              if (!(MODE_MAP[e.target.value] || []).includes(cfg.ovenMode))
                ch('ovenMode', (MODE_MAP[e.target.value] || ['static'])[0])
            }}
            className="flex-1 text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
          >
            {OVEN_TYPES.map((o) => (
              <option key={o.key} value={o.key}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
          <select
            value={cfg.ovenMode}
            onChange={(e) => ch('ovenMode', e.target.value)}
            className="flex-1 text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
          >
            {ms.map((k) => {
              const m = OVEN_MODES.find((x) => x.key === k)
              return m ? (
                <option key={k} value={k}>
                  {t(m.labelKey)}
                </option>
              ) : null
            })}
          </select>
        </div>
      </div>

      {/* Temperature */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          {t("label_temp")} {dT(cfg.temp)}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="range"
            min={tu === 'F' ? celsiusToFahrenheit(18) : 18}
            max={tu === 'F' ? celsiusToFahrenheit(509) : 509}
            step={tu === 'F' ? 10 : 5}
            value={tu === 'F' ? celsiusToFahrenheit(cfg.temp) : cfg.temp}
            onChange={(e) =>
              ch(
                'temp',
                tu === 'F'
                  ? Math.max(18, Math.min(509, fahrenheitToCelsius(+e.target.value)))
                  : Math.max(18, Math.min(509, +e.target.value)),
              )
            }
            className="flex-1 accent-primary"
          />
          <button
            type="button"
            onClick={() => setTU(tu === 'C' ? 'F' : 'C')}
            className="text-xs text-[#a08060] bg-transparent border border-border rounded px-1 py-px cursor-pointer"
          >
            {tu === 'C' ? '°F' : '°C'}
          </button>
        </div>
      </div>

      {/* Cielo / Platea */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          {t("oven_cielo_platea", { cielo: cfg.cieloPct, platea: pp })}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="range"
            min={20}
            max={80}
            step={5}
            value={cfg.cieloPct}
            onChange={(e) => ch('cieloPct', +e.target.value)}
            className="flex-1 accent-destructive"
          />
          <button
            type="button"
            onClick={() => ch('cieloPct', 100 - cfg.cieloPct)}
            className="w-[22px] h-[22px] rounded-[5px] border border-border bg-white cursor-pointer flex items-center justify-center p-0"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 2v12" stroke="#8a6e55" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 4.5L4 2l2 2.5" stroke="#8a6e55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 14V2" stroke="#8a6e55" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 11.5l2 2.5 2-2.5" stroke="#8a6e55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {(() => {
          const plateaOff = Math.round((pp - 50) * 1.5)
          const cieloOff = Math.round((pp - 50) * 0.5)
          return (
            <div className="text-[10px] text-muted-foreground mt-0.5 flex justify-between px-0.5">
              <span>{t("oven_cielo_temp", { temp: dT(cfg.temp - cieloOff) })}</span>
              <span>{t("oven_platea_temp", { temp: dT(cfg.temp + plateaOff) })}</span>
            </div>
          )
        })()}
      </div>

      {/* Shelf position */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          {t("oven_shelf_label")}
        </div>
        <select
          value={cfg.shelfPosition ?? 1}
          onChange={(e) => ch('shelfPosition', +e.target.value)}
          className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{t("oven_shelf", { n })}</option>
          ))}
        </select>
      </div>

      {/* Lid toggle — only for pentola */}
      {method === 'pentola' && (
        <div className="mt-2">
          <label className={editorCheckLabel}>
            <input
              type="checkbox"
              checked={cfg.lidOn ?? true}
              onChange={(e) => {
                ch('lidOn', e.target.checked)
                // Auto-sync ovenMode: lid on → steam (vapore intrappolato), lid off → static (calore secco)
                ch('ovenMode', e.target.checked ? 'steam' : 'static')
              }}
              className="accent-primary"
            />
            {t("oven_lid_on")}
          </label>
        </div>
      )}

      {/* Steam % slider — visible when mode is steam */}
      {cfg.ovenMode === 'steam' && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-[#8a6e55] font-semibold uppercase tracking-[1px]">{t("oven_steam_pct")}</span>
            <span className="font-bold text-foreground">{cfg.steamPct ?? 100}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={cfg.steamPct ?? 100}
            onChange={(e) => ch('steamPct', +e.target.value)}
            className="w-full accent-primary"
          />
        </div>
      )}

      {sd !== bd && (
        <div className="text-xs text-[#8a6e55] mt-1">
          {t("oven_cooking_duration", { dur: fmtDuration(sd), base: fmtDuration(bd) })}
        </div>
      )}

      <BakingAdvisory
        ovenCfg={cfg}
        recipeType={recipeType}
        recipeSubtype={recipeSubtype}
        calculatedDur={sd}
        baseDur={bd}
        nodeId={nodeId}
        method={method}
      />
    </div>
  )
}

// ── Shared editor styles ──────────────────────────────────────
const editorLabel = "text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5"
const editorSelect = "w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
const editorSlider = "flex-1 accent-primary"
const editorRow = "mt-1"
const editorCheckLabel = "flex items-center gap-1.5 text-xs text-foreground cursor-pointer"

// ── SteamerEditor ─────────────────────────────────────────────
function SteamerEditor({ cfg, onChange: ch }: { cfg: SteamerConfig; onChange: (f: string, v: unknown) => void }) {
  const t = useT()
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className={editorRow}>
        <div className={editorLabel}>{t("steamer_type")}</div>
        <select value={cfg.steamerType} onChange={(e) => ch('steamerType', e.target.value)} className={editorSelect}>
          <option value="bamboo">{t("steamer_bamboo")}</option>
          <option value="electric">{t("steamer_electric")}</option>
          <option value="pot_basket">{t("steamer_pot_basket")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("steamer_temp", { temp: cfg.temp })}</div>
        <input type="range" min={95} max={105} step={1} value={cfg.temp} onChange={(e) => ch('temp', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("steamer_water_level")}</div>
        <select value={cfg.waterLevel} onChange={(e) => ch('waterLevel', e.target.value)} className={editorSelect}>
          <option value="full">{t("steamer_water_full")}</option>
          <option value="half">{t("steamer_water_half")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.paperLiner} onChange={(e) => ch('paperLiner', e.target.checked)} />
          {t("steamer_paper_liner")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.lidLift} onChange={(e) => ch('lidLift', e.target.checked)} />
          {t("steamer_lid_lift")}
        </label>
      </div>
    </div>
  )
}

// ── FryEditor ─────────────────────────────────────────────────
function FryEditor({ cfg, onChange: ch }: { cfg: FryConfig; onChange: (f: string, v: unknown) => void }) {
  const t = useT()
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className={editorRow}>
        <div className={editorLabel}>{t("fry_method")}</div>
        <select value={cfg.fryMethod} onChange={(e) => ch('fryMethod', e.target.value)} className={editorSelect}>
          <option value="deep">{t("fry_deep")}</option>
          <option value="shallow">{t("fry_shallow")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("fry_oil_temp", { temp: cfg.oilTemp })}</div>
        <input type="range" min={170} max={195} step={5} value={cfg.oilTemp} onChange={(e) => ch('oilTemp', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("fry_max_weight", { weight: cfg.maxDoughWeight })}</div>
        <input type="range" min={120} max={200} step={5} value={cfg.maxDoughWeight} onChange={(e) => ch('maxDoughWeight', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.flipHalf} onChange={(e) => ch('flipHalf', e.target.checked)} />
          {t("fry_flip_half")}
        </label>
      </div>
    </div>
  )
}

// ── AirFryerEditor ────────────────────────────────────────────
function AirFryerEditor({ cfg, onChange: ch, dT }: { cfg: AirFryerConfig; onChange: (f: string, v: unknown) => void; dT: (c: number) => string }) {
  const t = useT()
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className={editorRow}>
        <div className={editorLabel}>{t("airfryer_type")}</div>
        <select value={cfg.basketType} onChange={(e) => ch('basketType', e.target.value)} className={editorSelect}>
          <option value="drawer">{t("airfryer_drawer")}</option>
          <option value="oven_style">{t("airfryer_oven_style")}</option>
          <option value="dual_zone">{t("airfryer_dual_zone")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("airfryer_capacity")}</div>
        <select value={cfg.capacity} onChange={(e) => ch('capacity', e.target.value)} className={editorSelect}>
          <option value="small">{t("airfryer_small")}</option>
          <option value="standard">{t("airfryer_standard")}</option>
          <option value="large">{t("airfryer_large")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("airfryer_temp", { temp: dT(cfg.temp) })}</div>
        <input type="range" min={150} max={220} step={5} value={cfg.temp} onChange={(e) => ch('temp', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.preheat} onChange={(e) => ch('preheat', e.target.checked)} />
          {t("airfryer_preheat", { dur: cfg.preheatDur })}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.oilSpray} onChange={(e) => ch('oilSpray', e.target.checked)} />
          {t("airfryer_oil_spray")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.flipHalf} onChange={(e) => ch('flipHalf', e.target.checked)} />
          {t("airfryer_flip_half")}
        </label>
      </div>
    </div>
  )
}

// ── GrillEditor ───────────────────────────────────────────────
function GrillEditor({ cfg, onChange: ch, dT }: { cfg: GrillConfig; onChange: (f: string, v: unknown) => void; dT: (c: number) => string }) {
  const t = useT()
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className={editorRow}>
        <div className={editorLabel}>{t("grill_type")}</div>
        <select value={cfg.grillType} onChange={(e) => ch('grillType', e.target.value)} className={editorSelect}>
          <option value="gas">{t("grill_gas")}</option>
          <option value="charcoal">{t("grill_charcoal")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("grill_direct_temp", { temp: dT(cfg.directTemp) })}</div>
        <input type="range" min={370} max={480} step={10} value={cfg.directTemp} onChange={(e) => ch('directTemp', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("grill_indirect_temp", { temp: dT(cfg.indirectTemp) })}</div>
        <input type="range" min={150} max={250} step={10} value={cfg.indirectTemp} onChange={(e) => ch('indirectTemp', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.twoZone} onChange={(e) => ch('twoZone', e.target.checked)} />
          {t("grill_two_zone")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.lidClosed} onChange={(e) => ch('lidClosed', e.target.checked)} />
          {t("grill_lid_closed")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.oilSpray} onChange={(e) => ch('oilSpray', e.target.checked)} />
          {t("grill_oil_spray")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.flipOnce} onChange={(e) => ch('flipOnce', e.target.checked)} />
          {t("grill_flip_once")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.dockDough} onChange={(e) => ch('dockDough', e.target.checked)} />
          {t("grill_dock_dough")}
        </label>
      </div>
    </div>
  )
}

// ── PanEditor ─────────────────────────────────────────────────
function PanEditor({ cfg, onChange: ch, dT }: { cfg: PanConfig; onChange: (f: string, v: unknown) => void; dT: (c: number) => string }) {
  const t = useT()
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className={editorRow}>
        <div className={editorLabel}>{t("pan_type")}</div>
        <select value={cfg.panMaterial} onChange={(e) => ch('panMaterial', e.target.value)} className={editorSelect}>
          <option value="cast_iron">{t("pan_cast_iron")}</option>
          <option value="nonstick">{t("pan_nonstick")}</option>
          <option value="steel">{t("pan_steel")}</option>
        </select>
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("pan_diameter", { size: cfg.panSize })}</div>
        <input type="range" min={20} max={36} step={2} value={cfg.panSize} onChange={(e) => ch('panSize', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <div className={editorLabel}>{t("pan_temp", { temp: dT(cfg.temp) })}</div>
        <input type="range" min={180} max={250} step={5} value={cfg.temp} onChange={(e) => ch('temp', +e.target.value)} className={editorSlider} />
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.oilSpray} onChange={(e) => ch('oilSpray', e.target.checked)} />
          {t("pan_oil_spray")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.flipOnce} onChange={(e) => ch('flipOnce', e.target.checked)} />
          {t("pan_flip_once")}
        </label>
      </div>
      <div className={editorRow}>
        <label className={editorCheckLabel}>
          <input type="checkbox" checked={cfg.lidUsed} onChange={(e) => ch('lidUsed', e.target.checked)} />
          {t("pan_lid_used")}
        </label>
      </div>
    </div>
  )
}

// ── CookingFatsEditor — dropdown fryable fats + grams ─────────
const fryableFats = FAT_TYPES.filter((f) => f.fryable)

function CookingFatsEditor({
  cookingFats,
  onChange,
}: {
  cookingFats: FatIngredient[]
  onChange: (fats: FatIngredient[]) => void
}) {
  const t = useT()
  const addFat = () => {
    const defaultType = fryableFats[0]?.key ?? 'olio_arachidi'
    onChange([...cookingFats, { id: Date.now(), type: defaultType, g: 500 }])
  }

  const updateFat = (idx: number, field: 'type' | 'g', value: string | number) => {
    onChange(cookingFats.map((f, i) => (i === idx ? { ...f, [field]: value } : f)))
  }

  const removeFat = (idx: number) => {
    onChange(cookingFats.filter((_, i) => i !== idx))
  }

  return (
    <div className="mt-1.5">
      <div className={editorLabel}>{t("cooking_fats_label")}</div>
      {cookingFats.map((fat, idx) => (
        <div key={fat.id} className="flex gap-1 items-center mt-1">
          <select
            value={fat.type}
            onChange={(e) => updateFat(idx, 'type', e.target.value)}
            className={editorSelect + ' flex-1'}
          >
            {fryableFats.map((ft) => (
              <option key={ft.key} value={ft.key}>{t(ft.labelKey)}</option>
            ))}
          </select>
          <input
            type="number"
            value={fat.g}
            onChange={(e) => updateFat(idx, 'g', Math.max(0, +e.target.value))}
            className="w-[80px] text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 px-2 text-right min-h-8"
          />
          <span className="text-xs text-muted-foreground">g</span>
          {cookingFats.length > 1 && (
            <button type="button" onClick={() => removeFat(idx)} className="text-xs text-destructive cursor-pointer px-1">✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addFat} className="text-xs text-primary mt-1 cursor-pointer">{t("cooking_fats_add")}</button>
    </div>
  )
}

// ── CookingAdvisory — warnings for ALL cooking methods ────────
// Warnings are computed server-side by the reconciler and stored in the store.
function CookingAdvisory({
  cookingCfg: _cookingCfg,
  recipeType: _recipeType,
  recipeSubtype: _recipeSubtype,
  baseDur: _baseDur,
  nodeId,
}: {
  cookingCfg: CookingConfig
  recipeType: string
  recipeSubtype: string | null
  baseDur: number
  nodeId: string
}) {
  const t = useT()
  const applyWarningAction = useRecipeFlowStore((s) => s.applyWarningAction)
  const graphNodes = useRecipeFlowStore((s) => selectGraph(s).nodes)
  const graphEdges = useRecipeFlowStore((s) => selectGraph(s).edges)
  const storeWarnings = useRecipeFlowStore((s) => s.warnings)

  // Filter store warnings for this specific node
  const warnings: ActionableWarning[] = storeWarnings.filter((w) => w.sourceNodeId === nodeId)
  if (warnings.length === 0) return null

  // Check which advisory IDs already have downstream nodes tagged with advisorySourceId
  const appliedAdvisoryIds = new Set<string>()
  const downstreamIds = graphEdges.filter((e) => e.source === nodeId).map((e) => e.target)
  for (const dId of downstreamIds) {
    const dNode = graphNodes.find((n) => n.id === dId)
    if (dNode?.data.advisorySourceId) appliedAdvisoryIds.add(dNode.data.advisorySourceId)
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      {warnings.map((w) => {
        const alreadyApplied = appliedAdvisoryIds.has(w.id)
        return (
          <div
            key={w.id}
            className={`p-2 rounded border text-xs ${
              w.severity === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : w.severity === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div>{t(w.messageKey, w.messageVars)}</div>
            {w.actions?.map((action, ai) => {
              const hasAddNode = action.mutations.some((m) => m.type === 'addNodeAfter')
              if (hasAddNode && alreadyApplied) {
                return (
                  <span key={ai} className="mt-1.5 inline-block text-[10px] font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
                    ✓ {t('warning_already_added')}
                  </span>
                )
              }
              return (
                <button
                  key={ai}
                  type="button"
                  onClick={() => applyWarningAction(w, ai)}
                  className="mt-1.5 text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  ✓ {t(action.labelKey)}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
