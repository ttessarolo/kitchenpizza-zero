import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getScienceProvider } from '~/server/middleware/science'

const loadBlocks = createServerFn().handler(async () => {
  const provider = await getScienceProvider()
  const blocks = provider.listAll()
  const i18nIt = provider.getI18nKeys('it')
  const i18nEn = provider.getI18nKeys('en')

  return blocks.map((b) => ({
    id: b.id,
    type: b.type,
    section: b._meta?.section ?? 'other',
    title: (b as any).title ?? null,
    displayName: i18nIt[b._meta?.displayName ?? ''] ?? i18nEn[b._meta?.displayName ?? ''] ?? b.id,
    description: i18nIt[b._meta?.description ?? ''] ?? i18nEn[b._meta?.description ?? ''] ?? '',
    tags: b._meta?.tags ?? [],
  }))
})

export const Route = createFileRoute('/admin/science/')({
  loader: () => loadBlocks(),
  component: ScienceDashboard,
})

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  formula: { label: 'Formula', color: 'bg-blue-100 text-blue-800' },
  factor_chain: { label: 'Factor Chain', color: 'bg-purple-100 text-purple-800' },
  piecewise: { label: 'Piecewise', color: 'bg-orange-100 text-orange-800' },
  classification: { label: 'Classification', color: 'bg-success/10 text-success' },
  rule: { label: 'Rule', color: 'bg-warning/10 text-warning' },
  catalog: { label: 'Catalog', color: 'bg-muted text-muted-foreground' },
  defaults: { label: 'Defaults', color: 'bg-teal-100 text-teal-800' },
}

const SECTIONS: Record<string, string> = {
  dough: 'Impasto',
  flour: 'Farine',
  rise: 'Lievitazione',
  bake: 'Cottura',
  'pre-bake': 'Pre-cottura',
  advisory: 'Advisory',
  composition: 'Composizione',
  portioning: 'Porzionatura',
  other: 'Altro',
}

function ScienceDashboard() {
  const blocks = Route.useLoaderData()

  // Group by section
  const grouped = new Map<string, typeof blocks>()
  for (const b of blocks) {
    const section = b.section
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push(b)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Science Rules</h2>
      <p className="text-sm text-muted-foreground mb-8">
        {blocks.length} blocchi scientifici in {grouped.size} sezioni
      </p>

      {Array.from(grouped.entries()).map(([section, items]) => (
        <div key={section} className="mb-8">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {SECTIONS[section] ?? section}
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">{items.length}</span>
          </h3>
          <div className="border rounded-lg divide-y">
            {items.map((item) => {
              const badge = TYPE_BADGES[item.type] ?? { label: item.type, color: 'bg-muted' }
              return (
                <Link
                  key={item.id}
                  to="/admin/science/rules/$id"
                  params={{ id: item.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge.color}`}>
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.title ?? item.displayName}</div>
                    {!item.title && item.description && (
                      <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
