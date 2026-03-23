import { useState } from 'react'
import type { RecipeStep, TemperatureUnit, FlourCatalogEntry } from '@commons/types/recipe'
import { rnd, nextId, fmtDuration, celsiusToFahrenheit, fahrenheitToCelsius, getAncestorIds, getStepTotalWeight, blendFlourProperties } from '@commons/utils/recipe'
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
import { MiniSelect, LiquidSelector, ExtraSelector, AddButton } from './shared'
import { useRecipe } from './RecipeContext'
import { DepEditor } from './DepEditor'

interface StepBodyProps {
  step: RecipeStep
}

export function StepBody({ step: s }: StepBodyProps) {
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
  const sF = s.flours.reduce((a, f) => a + f.g, 0)
  const sL = s.liquids.reduce((a, l) => a + l.g, 0)
  const sH = sF > 0 ? Math.round((sL / sF) * 100) : 0
  const hasI =
    s.flours.length > 0 || s.liquids.length > 0 || s.extras.length > 0 || (s.yeasts || []).length > 0

  const currentTypeEntry = STEP_TYPES.find((t) => t.key === s.type)
  const subtypes = currentTypeEntry?.subtypes || []

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
        if (flourPct < 1.5) return { type: 'warn' as const, msg: `Farina ${rnd(flourPct)}% dell'acqua — minimo consigliato: 1.5%` }
        if (flourPct > 2) return { type: 'warn' as const, msg: `Farina ${rnd(flourPct)}% dell'acqua — consigliato: 1.5–2%` }
        return { type: 'ok' as const, msg: `Farina ${rnd(flourPct)}% dell'acqua (1.5–2%)` }
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
          placeholder="Titolo step..."
          disabled={!editMode}
          className="w-full text-sm font-semibold text-foreground bg-transparent border-none border-b border-dashed border-border outline-none pb-0.5 disabled:opacity-50"
        />
      </div>

      {/* Type + Subtype + Group selectors */}
      <div className="flex gap-2 mb-1.5 flex-wrap">
        <MiniSelect
          label="Tipo"
          value={s.type}
          onChange={(v) => uSF(s.id, 'type', v)}
          options={STEP_TYPES.map((t) => ({
            k: t.key,
            l: t.icon + ' ' + t.label,
          }))}
        />
        {subtypes.length > 0 && (
          <MiniSelect
            label="Sub"
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
                return updated
              })
            }}
            options={subtypes.map((st) => ({ k: st.key, l: st.label }))}
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
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">Durata</div>
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
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5 text-right">Riposo</div>
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
              <span className="text-[11px] text-muted-foreground">Temp:</span>
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
              Configurazione Prefermento — {cfg.preFermentPct}% · {cfg.hydrationPct}% idr. · {rnd(actualWeight)}g
            </summary>
            <div className="px-2.5 pb-2.5">
              {/* PreFerment % */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                  <span>Prefermento</span>
                  <span><b>{cfg.preFermentPct}%</b> · {rnd(actualWeight)}g</span>
                </div>
                <input type="range" min={pfRange[0]} max={pfRange[1]} step={1} value={cfg.preFermentPct} onChange={(e) => updateCfg('preFermentPct', +e.target.value)} className="w-full accent-[#7a6020]" />
              </div>

              {/* Hydration % */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                  <span>Idratazione</span>
                  <span><b>{cfg.hydrationPct}%</b>{isHydLocked && ' (fisso)'}</span>
                </div>
                <input type="range" min={hydRange[0]} max={hydRange[1]} step={1} value={cfg.hydrationPct} onChange={(e) => updateCfg('hydrationPct', +e.target.value)} disabled={isHydLocked} className="w-full accent-[#7a6020]" />
              </div>

              {/* Yeast (two-phase only) */}
              {isTwoPhase && cfg.yeastType != null && (
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">Lievito</div>
                    <select value={cfg.yeastType || 'fresh'} onChange={(e) => updateCfg('yeastType', e.target.value)} className="w-full text-xs font-medium bg-background border border-border rounded-lg py-1 pl-2 pr-6 cursor-pointer outline-none min-h-7">
                      {YEAST_TYPES.filter((y) => !y.key.startsWith('madre')).map((y) => (
                        <option key={y.key} value={y.key}>{y.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <div className="text-xs text-muted-foreground mb-0.5">Lievito %</div>
                    <input type="number" step={0.1} min={0.01} value={cfg.yeastPct ?? 1} onChange={(e) => updateCfg('yeastPct', +e.target.value || 0.1)} className="w-full text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
                  </div>
                </div>
              )}

              {/* Sourdough starter form toggle */}
              {s.subtype === 'sourdough' && (
                <div className="mb-2">
                  <div className="text-xs text-muted-foreground mb-0.5">Tipo starter</div>
                  <div className="flex gap-1">
                    {[{ k: 'solid', l: 'Pasta Madre (50%)' }, { k: 'licoli', l: 'Li.Co.Li. (100%)' }].map((f) => (
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
                    <div className="text-xs text-muted-foreground mb-0.5">Temp. ferm.</div>
                    <div className="flex items-center gap-0.5">
                      <input type="number" step={0.1} value={cfg.fermentTemp ?? 18} onChange={(e) => updateCfg('fermentTemp', +e.target.value)} className="w-14 text-xs font-bold bg-background border border-border rounded px-1 py-0.5 outline-none text-center min-h-7" />
                      <span className="text-xs text-muted-foreground">°C</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-0.5">Durata ferm.</div>
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
                <div className="font-semibold text-[#7a6020] mb-1">Valori calcolati</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span>Peso prefermento:</span><span className="font-semibold text-foreground">{rnd(actualWeight)}g</span>
                  <span>Farina:</span><span className="font-semibold text-foreground">{rnd(actualFlour)}g</span>
                  <span>Acqua:</span><span className="font-semibold text-foreground">{rnd(actualLiquid)}g</span>
                  {actualYeast > 0 && (<><span>Lievito:</span><span className="font-semibold text-foreground">{rnd(actualYeast)}g</span></>)}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#e8d8a0] text-amber-700">
                  Riduzione impasto principale: farina <b>-{rnd(actualFlour)}g</b> · acqua <b>-{rnd(actualLiquid)}g</b>
                </div>
              </div>
            </div>
          </details>
        )
      })()}

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
              Preparazioni da Aggiungere
            </div>
            {preps.map((prep) => {
              const icon = STEP_TYPES.find((t) => t.key === prep.type)?.icon || ''
              const weight = getStepTotalWeight(prep)
              const flourG = prep.flours.reduce((a, f) => a + f.g, 0)
              const liquidG = prep.liquids.reduce((a, l) => a + l.g, 0)
              const yeastG = (prep.yeasts || []).reduce((a, y) => a + y.g, 0)
              const parts: string[] = []
              if (flourG > 0) parts.push(`Farina ${rnd(flourG)}g`)
              if (liquidG > 0) parts.push(`Acqua ${rnd(liquidG)}g`)
              if (yeastG > 0) parts.push(`Lievito ${rnd(yeastG)}g`)
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

      {/* Ingredients */}
      {hasI && (
        <div className="flex flex-col gap-1.5 mt-1">
          {/* Flours */}
          {s.flours.length > 0 && (
            <IngredientBox
              title="Farine"
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
              title="Liquidi"
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
                <div className="grid grid-cols-[1fr_58px_70px] gap-1 items-center">
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
              <span className="text-[#8a6e40]">Idrataz.:</span>
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
              title="Extra"
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
                  extras: [...st.extras, { id: nextId(st.extras), name: 'Nuovo', g: 10 }],
                }))
              }
              renderItem={(item, onU) => (
                <div className="grid grid-cols-[1fr_60px] gap-1 items-center">
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
                label="+ Farina"
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
                label="+ Liquido"
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
                label="+ Lievito"
                onClick={() =>
                  uS(s.id, (st) => ({
                    ...st,
                    yeasts: [{ id: 0, type: 'fresh', g: 6 }],
                  }))
                }
              />
            )}
          </div>

          {/* Yeasts */}
          {(s.yeasts || []).length > 0 && (
            <IngredientBox
              title="Lieviti"
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
                  <div className="grid grid-cols-[1fr_80px] gap-1 items-center">
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
                          {y.label}
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
        </div>
      )}

      {/* Dough: Knead method + FDT */}
      {s.type === 'dough' && sF > 0 && (
        <div className="mt-1.5 p-2.5 bg-[#f0eef5] rounded-lg border border-[#d8d0e5]">
          <div className="text-xs font-semibold text-[#6050a0] uppercase tracking-[1px] mb-1">
            Impasto & Temperatura
          </div>
          <select
            value={s.kneadMethod || 'hand'}
            onChange={(e) => uSF(s.id, 'kneadMethod', e.target.value)}
            className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none mb-1 min-h-8"
          >
            {KNEAD_METHODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} (+{m.ff}°C)
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
                  (ideale: {dTf(24)}–{dTf(26)})
                </span>
              </div>
            )
          })()}

          {/* Flour-based suggestions */}
          {(() => {
            const bp = blendFlourProperties(s.flours, FLOUR_CATALOG as unknown as FlourCatalogEntry[])
            const tips: string[] = []
            if (bp.absorption > 65) tips.push('Farina ad alto assorbimento: considera +5-10% idratazione')
            if (bp.W > 350) tips.push('Farina di forza: impasto lungo, ottima per lievitazioni prolungate')
            if (bp.W > 0 && bp.W < 150) tips.push('Farina debole: limita la lievitazione a max 2-3h')
            if (bp.protein > 13.5) tips.push('Alto contenuto proteico: impasta a lungo per sviluppare il glutine')
            if (bp.PL > 0.8) tips.push('P/L alto: impasto tenace, lascia riposare prima di formare')
            if (bp.PL > 0 && bp.PL < 0.4) tips.push('P/L basso: impasto molto estensibile, forma subito')
            if (bp.fallingNumber > 0 && bp.fallingNumber < 250) tips.push('Falling Number basso: alta attività enzimatica, riduci tempi di lievitazione')
            if (bp.fiber > 6) tips.push('Alto contenuto di fibra: aumenta idratazione e tempi di impasto')
            if (!tips.length) return null
            return (
              <div className="mt-1.5 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-800">
                <div className="font-semibold mb-0.5">Suggerimenti</div>
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
                Impasto di Riferimento
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
              Metodo
            </div>
            <select
              value={s.riseMethod}
              onChange={(e) => uSF(s.id, 'riseMethod', e.target.value)}
              className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
            >
              {RISE_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-[#8a6e55] mt-0.5">
              Durata: <b>{fmtDuration(sDur(s))}</b>
            </div>

            {/* Rise-step flour suggestions */}
            {(() => {
              const src = s.sourcePrep ? recipe.steps.find((st) => st.id === s.sourcePrep) : null
              if (!src || !src.flours.length) return null
              const bp = blendFlourProperties(src.flours, FLOUR_CATALOG as unknown as FlourCatalogEntry[])
              const riseDur = sDur(s)
              const tips: string[] = []
              if (bp.W > 0 && bp.W < 180 && riseDur > 180) tips.push('Farina debole con lievitazione lunga: rischio di over-proofing')
              if (bp.fallingNumber > 0 && bp.fallingNumber < 220) tips.push('Attività enzimatica alta: controlla la lievitazione frequentemente')
              if (!tips.length) return null
              return (
                <div className="mt-1.5 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                  <div className="font-semibold mb-0.5">Attenzione</div>
                  {tips.map((t, i) => <div key={i} className="mt-0.5">- {t}</div>)}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Oven config */}
      {s.ovenCfg && (
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
        />
      )}

      {/* Formatura (shape) config */}
      {s.type === 'shape' && (() => {
        const count = s.shapeCount || 1
        const weightPerPiece = totalDough > 0 ? rnd(totalDough / count) : 0
        return (
          <div className="mt-1.5 flex flex-col gap-1">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
                Impasto di Riferimento
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
                Numero di elementi
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
                    → <b>{weightPerPiece}g</b> / elemento
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
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function isGroupEmpty(g: string) {
    return !allSteps.some((s) => s.group === g)
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-[#b8a08a] font-medium">Gruppo:</span>
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
            <option value="__new__">+ Nuovo...</option>
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
                    Elimina
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
                  title="Elimina gruppo vuoto"
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
}

function OvenEditor({ cfg, tu, setTU, dT, onChange: ch, stepDur: sd, baseDur: bd }: OvenEditorProps) {
  const ms = MODE_MAP[cfg.ovenType] || ['static']
  const pp = 100 - cfg.cieloPct

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {/* Oven type + mode */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          Forno
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
                {o.label}
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
                  {m.label}
                </option>
              ) : null
            })}
          </select>
        </div>
      </div>

      {/* Temperature */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          Temp: {dT(cfg.temp)}
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
          Cielo {cfg.cieloPct}% · Platea {pp}%
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
      </div>

      {/* Shelf position */}
      <div className="mt-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[1px] mb-0.5">
          Piano forno
        </div>
        <select
          value={cfg.shelfPosition ?? 1}
          onChange={(e) => ch('shelfPosition', +e.target.value)}
          className="text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-8"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>Piano {n}</option>
          ))}
        </select>
      </div>

      {sd !== bd && (
        <div className="text-xs text-[#8a6e55] mt-1">
          Cottura: <b>{fmtDuration(sd)}</b> (base: {fmtDuration(bd)})
        </div>
      )}
    </div>
  )
}
