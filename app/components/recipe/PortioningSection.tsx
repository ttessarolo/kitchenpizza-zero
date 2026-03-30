import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { SegmentedToggle } from '~/components/ui/SegmentedToggle'
import { TRAY_PRESETS, TRAY_MATERIALS } from '@/local_data'
import { rnd, thicknessLabel } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import type { Portioning } from '@commons/types/recipe'

interface PortioningSectionProps {
  portioning: Portioning
  totalDough: number
  totalFlour: number
  totalLiquid: number
  currentHydration: number
  trayTotalDough: number
  onPortioningChange: (np: Portioning) => void
  onUpdatePortioning: (fn: (p: Portioning) => Portioning) => void
  onScaleAll: (n: number) => void
  onSetHydration: (h: number) => void
  hideHeader?: boolean
  hideTotals?: boolean
}

function PlusMinusButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-[30px] h-[30px] rounded-[7px] border-[1.5px] border-primary text-base font-semibold cursor-pointer flex items-center justify-center min-h-8 ${
        label === '+' ? 'bg-primary text-primary-foreground' : 'bg-card text-primary'
      }`}
    >
      {label}
    </button>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-0.5 font-medium">
        {label}
      </label>
      <div className="flex items-center border-[1.5px] border-border rounded-md overflow-hidden bg-background">
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 border-none outline-none bg-transparent px-1.5 py-1 text-sm font-semibold text-foreground w-full min-w-0 min-h-11"
        />
      </div>
    </div>
  )
}

export function PortioningSection({
  portioning: po,
  totalDough,
  totalFlour,
  totalLiquid,
  currentHydration,
  trayTotalDough,
  onPortioningChange,
  onUpdatePortioning,
  onScaleAll,
  onSetHydration,
  hideHeader,
  hideTotals,
}: PortioningSectionProps) {
  const t = useT()
  return (
    <section className={hideHeader ? '' : 'mt-3.5'}>
      {!hideHeader && <SectionHeader emoji="📐" title={t('section_portioning')} />}
      <Card className="p-3">
        {/* Mode toggle */}
        <div className="mb-2.5">
          <SegmentedToggle
            options={[
              { key: 'tray' as const, label: t('tab_tray') },
              { key: 'ball' as const, label: t('tab_balls') },
            ]}
            value={po.mode}
            onChange={(mode) => onPortioningChange({ ...po, mode })}
          />
        </div>

        {po.mode === 'tray' ? (
          (() => {
            const isCustom = !TRAY_PRESETS.some(
              (p) => p.l === po.tray.l && p.w === po.tray.w && p.h === po.tray.h,
            )
            const currentMaterial = TRAY_MATERIALS.find((m) => m.key === po.tray.material)
            return (
          <div className="flex flex-col gap-2">
            {/* Tray preset */}
            <div>
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-[1px]">
                {t('section_portioning')}
              </label>
              <select
                value={isCustom ? '__custom' : (po.tray.preset || '')}
                onChange={(e) => {
                  if (e.target.value === '__custom') return
                  const p = TRAY_PRESETS.find((x) => x.key === e.target.value)
                  if (p)
                    onPortioningChange({
                      ...po,
                      tray: {
                        ...po.tray,
                        preset: p.key,
                        l: p.l,
                        w: p.w,
                        h: p.h,
                        material: p.material,
                        griglia: p.griglia,
                      },
                    })
                }}
                className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-11"
              >
                {TRAY_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {t(p.labelKey)}
                  </option>
                ))}
                {isCustom && (
                  <option value="__custom">
                    Teglia {po.tray.l}×{po.tray.w}×{po.tray.h}
                  </option>
                )}
              </select>
            </div>

            {/* Collapsible dimensions + material */}
            <details className="group">
              <summary className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground">
                {t('tray_dimensions_material')}
              </summary>
              <div className="mt-1.5 flex flex-col gap-2">
                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-1.5">
                  <NumberInput
                    label="L (cm)"
                    value={po.tray.l}
                    onChange={(v) => onPortioningChange({ ...po, tray: { ...po.tray, l: v, preset: '' } })}
                  />
                  <NumberInput
                    label="P (cm)"
                    value={po.tray.w}
                    onChange={(v) => onPortioningChange({ ...po, tray: { ...po.tray, w: v, preset: '' } })}
                  />
                  <NumberInput
                    label="H (cm)"
                    value={po.tray.h}
                    onChange={(v) => onPortioningChange({ ...po, tray: { ...po.tray, h: v, preset: '' } })}
                    step={0.5}
                  />
                </div>

                {/* Material */}
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-[1px]">
                    {t('label_material')}
                  </label>
                  <select
                    value={po.tray.material}
                    onChange={(e) =>
                      onUpdatePortioning((p) => ({
                        ...p,
                        tray: { ...p.tray, material: e.target.value },
                      }))
                    }
                    className="w-full text-xs font-medium text-foreground bg-background border-[1.5px] border-border rounded-lg py-1.5 pl-2 pr-7 cursor-pointer outline-none appearance-none min-h-11"
                  >
                    {TRAY_MATERIALS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {t(m.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Foro di sfiato — only for materials that support it */}
                {currentMaterial?.hasVent && (
                  <label className="text-xs text-foreground flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={po.tray.griglia || false}
                      onChange={(e) =>
                        onUpdatePortioning((p) => ({
                          ...p,
                          tray: { ...p.tray, griglia: e.target.checked },
                        }))
                      }
                      className="accent-primary"
                    />
                    {t('label_vent_hole')}
                  </label>
                )}
              </div>
            </details>

            {/* Save custom tray */}
            {isCustom && (
              <button
                type="button"
                onClick={() => {
                  // TODO: save to user preferences — implement when persistence layer is ready
                  // Should persist { key, label, l, w, h, material, griglia } to user's custom tray list
                  alert(t('btn_save_tray_soon'))
                }}
                className="text-[9px] font-medium text-primary border border-dashed border-primary rounded-lg py-1.5 hover:bg-primary/5"
              >
                {t('btn_save_tray')} {po.tray.l}×{po.tray.w}×{po.tray.h}
              </button>
            )}

            {/* Tray count */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('label_tray_count')}</span>
              <PlusMinusButton
                onClick={() =>
                  onPortioningChange({
                    ...po,
                    tray: { ...po.tray, count: Math.max(1, po.tray.count - 1) },
                  })
                }
                label="−"
              />
              <span className="text-lg font-bold min-w-[24px] text-center">
                {po.tray.count}
              </span>
              <PlusMinusButton
                onClick={() =>
                  onPortioningChange({
                    ...po,
                    tray: { ...po.tray, count: Math.min(10, po.tray.count + 1) },
                  })
                }
                label="+"
              />
            </div>

            {/* Thickness slider */}
            <div className="bg-muted rounded-lg p-2.5">
              <div className="text-xs font-semibold text-accent uppercase tracking-[1px] mb-1">
                {t('label_dough_thickness')}
              </div>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.01}
                value={po.thickness}
                onChange={(e) =>
                  onPortioningChange({ ...po, thickness: +e.target.value })
                }
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>
                  {thicknessLabel(po.thickness)} ({po.thickness} g/cm²)
                </span>
                <span>~{trayTotalDough} g</span>
              </div>
            </div>
          </div>
            )
          })()
        ) : (
          <div className="flex flex-col gap-2">
            <NumberInput
              label={t('label_single_weight_g')}
              value={po.ball.weight}
              onChange={(v) =>
                onPortioningChange({
                  ...po,
                  ball: { ...po.ball, weight: Math.max(30, v) },
                })
              }
              step={10}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('label_ball_count')}</span>
              <PlusMinusButton
                onClick={() =>
                  onPortioningChange({
                    ...po,
                    ball: { ...po.ball, count: Math.max(1, po.ball.count - 1) },
                  })
                }
                label="−"
              />
              <span className="text-lg font-bold min-w-[24px] text-center">
                {po.ball.count}
              </span>
              <PlusMinusButton
                onClick={() =>
                  onPortioningChange({
                    ...po,
                    ball: { ...po.ball, count: Math.min(50, po.ball.count + 1) },
                  })
                }
                label="+"
              />
            </div>
          </div>
        )}

        {/* Dough summary (hidden when managed by separate panel) */}
        {!hideTotals && <div className="mt-2.5 p-2.5 bg-muted rounded-[7px]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{t('label_total_dough')}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={Math.round(totalDough)}
                step={10}
                min={50}
                onChange={(e) => onScaleAll(+e.target.value || 50)}
                className="w-[70px] text-sm font-bold bg-card border-[1.5px] border-border rounded-md px-1.5 py-0.5 outline-none text-center min-h-9"
              />
              <span className="text-muted-foreground">g</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <span>{t('label_hydration')}:</span>
            <input
              type="number"
              value={currentHydration}
              step={1}
              onChange={(e) => onSetHydration(+e.target.value || 0)}
              className="w-[50px] text-xs font-bold text-accent bg-card border border-border rounded px-1.5 py-px outline-none text-center min-h-7"
            />
            <span>%</span>
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t('label_flours')}</span>
              <span className="font-bold text-foreground">{rnd(totalFlour)}g</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t('label_liquids')}</span>
              <span className="font-bold text-foreground">{rnd(totalLiquid)}g</span>
            </div>
          </div>
        </div>}
      </Card>
    </section>
  )
}
