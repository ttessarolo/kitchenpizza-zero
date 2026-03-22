import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { TRAY_PRESETS, TRAY_MATERIALS } from '@/local_data'
import { rnd, thicknessLabel } from '@commons/utils/recipe'
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
}

function PlusMinusButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-[30px] h-[30px] rounded-[7px] border-[1.5px] border-primary text-base font-semibold cursor-pointer flex items-center justify-center min-h-8 ${
        label === '+' ? 'bg-primary text-primary-foreground' : 'bg-white text-primary'
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
}: PortioningSectionProps) {
  return (
    <section className="mt-3.5">
      <SectionHeader emoji="📐" title="Porzionatura" />
      <Card className="p-3">
        {/* Mode toggle */}
        <div className="flex rounded-[7px] overflow-hidden border-[1.5px] border-border mb-2.5">
          {([
            { k: 'tray' as const, l: '🍳 Teglia' },
            { k: 'ball' as const, l: '🫓 Panetti' },
          ]).map((tab) => (
            <button
              key={tab.k}
              type="button"
              onClick={() => onPortioningChange({ ...po, mode: tab.k })}
              className={`flex-1 py-2 border-none cursor-pointer text-xs min-h-11 ${
                po.mode === tab.k
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-white text-muted-foreground font-normal'
              }`}
            >
              {tab.l}
            </button>
          ))}
        </div>

        {po.mode === 'tray' ? (
          <div className="flex flex-col gap-2">
            {/* Tray preset */}
            <div>
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-[1px]">
                Teglia
              </label>
              <select
                value={po.tray.preset || ''}
                onChange={(e) => {
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
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-1.5">
              <NumberInput
                label="L (cm)"
                value={po.tray.l}
                onChange={(v) => onPortioningChange({ ...po, tray: { ...po.tray, l: v } })}
              />
              <NumberInput
                label="P (cm)"
                value={po.tray.w}
                onChange={(v) => onPortioningChange({ ...po, tray: { ...po.tray, w: v } })}
              />
              <NumberInput
                label="H (cm)"
                value={po.tray.h}
                onChange={(v) => onPortioningChange({ ...po, tray: { ...po.tray, h: v } })}
                step={0.5}
              />
            </div>

            {/* Material + griglia */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-[1px]">
                  Materiale
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
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="text-xs text-[#6a5a48] flex items-center gap-1 cursor-pointer pb-1.5">
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
                Foro di sfiato
              </label>
            </div>

            {/* Tray count */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">N° teglie</span>
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
            <div className="bg-[#fef6ed] rounded-lg p-2.5">
              <div className="text-xs font-semibold text-[#8a6e40] uppercase tracking-[1px] mb-1">
                Spessore impasto
              </div>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.1}
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
        ) : (
          <div className="flex flex-col gap-2">
            <NumberInput
              label="Peso singolo (g)"
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
              <span className="text-xs text-muted-foreground">N° panetti</span>
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

        {/* Dough summary */}
        <div className="mt-2.5 p-2.5 bg-gradient-to-br from-[#f9f3ec] to-[#f5ede3] rounded-[7px]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Totale impasto</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={Math.round(totalDough)}
                step={10}
                min={50}
                onChange={(e) => onScaleAll(+e.target.value || 50)}
                className="w-[70px] text-sm font-bold bg-white border-[1.5px] border-border rounded-md px-1.5 py-0.5 outline-none text-center min-h-9"
              />
              <span className="text-muted-foreground">g</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 flex-wrap gap-1">
            <div className="flex items-center gap-1">
              Idrataz.:{' '}
              <input
                type="number"
                value={currentHydration}
                step={1}
                onChange={(e) => onSetHydration(+e.target.value || 0)}
                className="w-[50px] text-xs font-bold text-accent bg-white border border-border rounded px-1.5 py-px outline-none text-center min-h-7"
              />
              %
            </div>
            <span>
              Liq: <b>{rnd(totalLiquid)}g</b> · Far: <b>{rnd(totalFlour)}g</b>
            </span>
          </div>
        </div>
      </Card>
    </section>
  )
}
