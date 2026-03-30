import { useT } from '~/hooks/useTranslation'
import { LayerColorPicker } from './LayerColorPicker'
import type { EdgeStyle } from '@commons/types/recipe-graph'

const PRESET_COLORS = [
  '#1a1a1a',
  '#dc2626',
  '#16a34a',
  '#2563eb',
  '#ea580c',
]

interface EdgeStylePanelProps {
  style: EdgeStyle | undefined
  onChange: (style: EdgeStyle) => void
}

export function EdgeStylePanel({ style, onChange }: EdgeStylePanelProps) {
  const t = useT()
  const s = style ?? {}

  const currentColor = s.strokeColor ?? '#1a1a1a'
  const currentWidth = s.strokeWidth ?? 'medium'
  const currentStyle = s.strokeStyle ?? 'solid'
  const currentRoughness = s.roughness ?? 'medium'
  const currentArrowType = s.arrowType ?? 'curved'
  const currentArrowHead = s.arrowHead ?? 'arrow'
  const currentOpacity = s.opacity ?? 100

  return (
    <details className="border-t border-border">
      <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
        {t('style_section')}
        <span className="text-[8px]">▾</span>
      </summary>
      <div className="px-3 pb-3 space-y-3">

        {/* Stroke color */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_stroke_color')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border transition-shadow ${
                  currentColor === color
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'border-border hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => onChange({ ...s, strokeColor: color })}
              />
            ))}
            <LayerColorPicker
              color={currentColor}
              onChange={(c) => onChange({ ...s, strokeColor: c })}
            />
          </div>
        </div>

        {/* Stroke width */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_stroke_width')}
          </label>
          <div className="flex gap-1.5">
            {(['thin', 'medium', 'thick'] as const).map((val) => (
              <button
                key={val}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  currentWidth === val
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => onChange({ ...s, strokeWidth: val })}
              >
                {t(`style_${val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Stroke style */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_stroke_style')}
          </label>
          <div className="flex gap-1.5">
            {(['solid', 'dashed', 'dotted'] as const).map((val) => (
              <button
                key={val}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  currentStyle === val
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => onChange({ ...s, strokeStyle: val })}
              >
                {t(`style_${val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Roughness */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_roughness')}
          </label>
          <div className="flex gap-1.5">
            {(['low', 'medium', 'high'] as const).map((val) => (
              <button
                key={val}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  currentRoughness === val
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => onChange({ ...s, roughness: val })}
              >
                {t(`style_${val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Arrow type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_arrow_type')}
          </label>
          <div className="flex gap-1.5">
            {(['straight', 'curved', 's-curve'] as const).map((val) => {
              const key = val === 's-curve' ? 'style_s_curve' : `style_${val}`
              return (
                <button
                  key={val}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    currentArrowType === val
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}
                  onClick={() => onChange({ ...s, arrowType: val })}
                >
                  {t(key)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Arrow head */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_arrow_head')}
          </label>
          <div className="flex gap-1.5">
            {(['none', 'arrow'] as const).map((val) => (
              <button
                key={val}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  currentArrowHead === val
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
                onClick={() => onChange({ ...s, arrowHead: val })}
              >
                {t(`style_${val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground">
            {t('style_opacity')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={currentOpacity}
              onChange={(e) =>
                onChange({ ...s, opacity: Number(e.target.value) })
              }
              className="flex-1 h-1.5 accent-primary"
            />
            <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
              {currentOpacity}%
            </span>
          </div>
        </div>

      </div>
    </details>
  )
}
