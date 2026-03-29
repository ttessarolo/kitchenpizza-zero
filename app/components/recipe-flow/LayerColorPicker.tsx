import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useT } from '~/hooks/useTranslation'

const PRESET_COLORS = [
  '#D97706', '#DC2626', '#16A34A', '#7C3AED', '#EC4899',
  '#2563EB', '#0891B2', '#65A30D', '#CA8A04', '#9333EA',
  '#E11D48', '#059669', '#4F46E5', '#EA580C', '#0D9488',
  '#6D28D9',
]

interface LayerColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export function LayerColorPicker({ color, onChange }: LayerColorPickerProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="relative">
      {/* Trigger circle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-6 h-6 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
        title={t('layer_color')}
      />

      {/* Popover */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-8 right-0 z-50 bg-background rounded-lg shadow-xl border border-border p-3 w-[220px]">
            {/* Preset colors */}
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('color_preset')}
            </div>
            <div className="grid grid-cols-8 gap-1.5 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false) }}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform ${
                    c === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Custom color toggle */}
            <button
              type="button"
              onClick={() => setShowCustom(!showCustom)}
              className="text-[10px] text-primary hover:text-primary/80 font-medium mb-2"
            >
              {showCustom ? t('color_hide_custom') : t('color_show_custom')}
            </button>

            {/* Custom HexColorPicker */}
            {showCustom && (
              <div className="mt-1">
                <HexColorPicker color={color} onChange={onChange} style={{ width: '100%', height: 120 }} />
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">HEX</span>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
                    className="flex-1 text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
