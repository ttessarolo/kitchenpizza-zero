import type { RecipeStep, TemperatureUnit } from '@commons/types/recipe'
import { rnd, nextId, fmtDuration, celsiusToFahrenheit, fahrenheitToCelsius } from '@commons/utils/recipe'
import {
  STEP_TYPES,
  KNEAD_METHODS,
  RISE_METHODS,
  YEAST_TYPES,
  OVEN_TYPES,
  OVEN_MODES,
  MODE_MAP,
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
  const { ingredientGroups: ig } = recipe
  const sF = s.flours.reduce((a, f) => a + f.g, 0)
  const sL = s.liquids.reduce((a, l) => a + l.g, 0)
  const sH = sF > 0 ? Math.round((sL / sF) * 100) : 0
  const hasI =
    s.flours.length > 0 || s.liquids.length > 0 || s.extras.length > 0 || (s.yeasts || []).length > 0

  return (
    <div className="px-3 pb-3 border-t border-[#f0e8df]">
      {/* Type/Group selectors */}
      <div className="flex gap-2 mt-2 mb-1.5 flex-wrap">
        <MiniSelect
          label="Tipo"
          value={s.type}
          onChange={(v) => uSF(s.id, 'type', v)}
          options={STEP_TYPES.map((t) => ({
            k: t.key,
            l: t.icon + ' ' + t.label,
          }))}
        />
        <MiniSelect
          label="Gruppo"
          value={s.group}
          onChange={(v) => uSF(s.id, 'group', v)}
          options={[
            ...ig.map((g) => ({ k: g, l: g })),
            { k: '__new__', l: '+ Nuovo...' },
          ]}
          onNew={(n) => {
            setRecipe((p) => ({
              ...p,
              ingredientGroups: [...p.ingredientGroups, n],
            }))
            uSF(s.id, 'group', n)
          }}
        />
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-[#5a4538] my-1">{s.desc}</p>

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
                        step={1}
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
                        step={5}
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
                      step={1}
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
                      step={5}
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
                      step={1}
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
                const yt = YEAST_TYPES.find((y) => y.key === (item.type as string)) || YEAST_TYPES[0]
                return (
                  <div className="grid grid-cols-[1fr_60px] gap-1 items-center">
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
                        step={yt.hasFW ? 5 : 0.5}
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

      {sd !== bd && (
        <div className="text-xs text-[#8a6e55]">
          Cottura: <b>{fmtDuration(sd)}</b> (base: {fmtDuration(bd)})
        </div>
      )}
    </div>
  )
}
