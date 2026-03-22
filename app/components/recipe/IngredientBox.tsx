import { cn } from '~/lib/utils'

interface IngredientBoxProps {
  title: string
  items: { id: number }[]
  onUpdate: (id: number, field: string, value: unknown) => void
  onRemove: (id: number) => void
  onAdd: () => void
  renderItem: (item: { id: number; [key: string]: unknown }, onUpdate: (f: string, v: unknown) => void) => React.ReactNode
  className?: string
}

export function IngredientBox({
  title,
  items,
  onUpdate,
  onRemove,
  onAdd,
  renderItem,
  className,
}: IngredientBoxProps) {
  return (
    <div
      className={cn(
        'bg-[#f9f5f0] rounded-[7px] p-2 border border-[#e8e0d5]',
        className,
      )}
    >
      <div className="text-[11px] font-semibold text-[#b8845a] uppercase tracking-[1px] mb-1">
        {title}
      </div>
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-1 mb-1">
          <div className="flex-1">
            {renderItem(item as { id: number; [key: string]: unknown }, (f, v) => onUpdate(item.id, f, v))}
          </div>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="w-4 h-4 rounded-full border-none bg-[#e8e2da] text-[#8a7a66] text-xs font-bold cursor-pointer flex items-center justify-center p-0 shrink-0 mt-0.5"
            >
              x
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-[11px] text-primary bg-transparent border-none cursor-pointer p-0 font-semibold min-h-7"
      >
        + Aggiungi
      </button>
    </div>
  )
}
