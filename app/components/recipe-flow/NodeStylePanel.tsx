import { useT } from '~/hooks/useTranslation'
import { LayerColorPicker } from './LayerColorPicker'
import type { NodeStyle } from '@commons/types/recipe-graph'

// ── Preset swatches ──────────────────────────────────────────

const STROKE_COLORS = [
  '#1a1a1a',
  '#dc2626',
  '#16a34a',
  '#2563eb',
  '#ea580c',
  '#a855f7',
]

const FILL_COLORS = [
  '#f5f5f5',
  '#fecaca',
  '#bbf7d0',
  '#bfdbfe',
  '#fed7aa',
  '#e9d5ff',
]

// ── Component ────────────────────────────────────────────────

export function NodeStylePanel({
  style,
  onChange,
}: {
  style: NodeStyle | undefined
  onChange: (style: NodeStyle) => void
}) {
  const t = useT()
  const s = style ?? {}

  const merge = (patch: Partial<NodeStyle>) => onChange({ ...s, ...patch })

  return (
    <details className="border-t border-border">
      <summary className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
        {t('style_section')}
        <span className="text-[8px]">&#x25BE;</span>
      </summary>

      <div className="px-3 pb-3 space-y-3">
        {/* ── Stroke color ─────────────────────────────── */}
        <Section label={t('style_stroke_color')}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STROKE_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                active={s.strokeColor === c}
                onClick={() => merge({ strokeColor: c })}
              />
            ))}
            <LayerColorPicker
              color={s.strokeColor ?? '#1a1a1a'}
              onChange={(c) => merge({ strokeColor: c })}
            />
          </div>
        </Section>

        {/* ── Fill color ───────────────────────────────── */}
        <Section label={t('style_fill_color')}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILL_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                active={s.fillColor === c}
                onClick={() => merge({ fillColor: c })}
              />
            ))}
            <LayerColorPicker
              color={s.fillColor ?? '#f5f5f5'}
              onChange={(c) => merge({ fillColor: c })}
            />
          </div>
        </Section>

        {/* ── Fill pattern ─────────────────────────────── */}
        <Section label={t('style_fill_pattern')}>
          <ToggleRow>
            <ToggleBtn active={s.fillPattern === 'solid'} onClick={() => merge({ fillPattern: 'solid' })}>{t('style_solid')}</ToggleBtn>
            <ToggleBtn active={s.fillPattern === 'hachure'} onClick={() => merge({ fillPattern: 'hachure' })}>{t('style_hachure')}</ToggleBtn>
            <ToggleBtn active={s.fillPattern === 'cross-hatch'} onClick={() => merge({ fillPattern: 'cross-hatch' })}>{t('style_cross_hatch')}</ToggleBtn>
          </ToggleRow>
        </Section>

        {/* ── Stroke width ─────────────────────────────── */}
        <Section label={t('style_stroke_width')}>
          <ToggleRow>
            <ToggleBtn active={s.strokeWidth === 'thin'} onClick={() => merge({ strokeWidth: 'thin' })}>{t('style_thin')}</ToggleBtn>
            <ToggleBtn active={s.strokeWidth === 'medium'} onClick={() => merge({ strokeWidth: 'medium' })}>{t('style_medium')}</ToggleBtn>
            <ToggleBtn active={s.strokeWidth === 'thick'} onClick={() => merge({ strokeWidth: 'thick' })}>{t('style_thick')}</ToggleBtn>
          </ToggleRow>
        </Section>

        {/* ── Stroke style ─────────────────────────────── */}
        <Section label={t('style_stroke_style')}>
          <ToggleRow>
            <ToggleBtn active={s.strokeStyle === 'solid'} onClick={() => merge({ strokeStyle: 'solid' })}>{t('style_solid')}</ToggleBtn>
            <ToggleBtn active={s.strokeStyle === 'dashed'} onClick={() => merge({ strokeStyle: 'dashed' })}>{t('style_dashed')}</ToggleBtn>
            <ToggleBtn active={s.strokeStyle === 'dotted'} onClick={() => merge({ strokeStyle: 'dotted' })}>{t('style_dotted')}</ToggleBtn>
          </ToggleRow>
        </Section>

        {/* ── Roughness ────────────────────────────────── */}
        <Section label={t('style_roughness')}>
          <ToggleRow>
            <ToggleBtn active={s.roughness === 'low'} onClick={() => merge({ roughness: 'low' })}>{t('style_low')}</ToggleBtn>
            <ToggleBtn active={s.roughness === 'medium'} onClick={() => merge({ roughness: 'medium' })}>{t('style_medium')}</ToggleBtn>
            <ToggleBtn active={s.roughness === 'high'} onClick={() => merge({ roughness: 'high' })}>{t('style_high')}</ToggleBtn>
          </ToggleRow>
        </Section>

        {/* ── Borders ──────────────────────────────────── */}
        <Section label={t('style_border_radius')}>
          <ToggleRow>
            <ToggleBtn active={s.borderRadius === 'small'} onClick={() => merge({ borderRadius: 'small' })}>{t('style_small')}</ToggleBtn>
            <ToggleBtn active={s.borderRadius === 'large'} onClick={() => merge({ borderRadius: 'large' })}>{t('style_large')}</ToggleBtn>
          </ToggleRow>
        </Section>

        {/* ── Opacity ──────────────────────────────────── */}
        <Section label={t('style_opacity')}>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={s.opacity ?? 100}
              onChange={(e) => merge({ opacity: Number(e.target.value) })}
              className="flex-1 h-1.5 accent-primary"
            />
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {s.opacity ?? 100}
            </span>
          </div>
        </Section>
      </div>
    </details>
  )
}

// ── Internal helpers ─────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-muted-foreground font-medium">{label}</div>
      {children}
    </div>
  )
}

function ToggleRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-1 flex-wrap">{children}</div>
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ColorSwatch({
  color,
  active,
  onClick,
}: {
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`w-6 h-6 rounded-full border-2 transition-shadow ${
        active ? 'ring-2 ring-primary ring-offset-1' : 'border-border'
      }`}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  )
}
