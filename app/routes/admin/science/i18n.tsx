import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getScienceProvider } from '~/server/middleware/science'

const loadI18n = createServerFn().handler(async () => {
  const provider = await getScienceProvider()
  return {
    en: provider.getI18nKeys('en'),
    it: provider.getI18nKeys('it'),
  }
})

export const Route = createFileRoute('/admin/science/i18n')({
  loader: () => loadI18n(),
  component: I18nEditor,
})

function I18nEditor() {
  const { en, it } = Route.useLoaderData()
  const allKeys = [...new Set([...Object.keys(en), ...Object.keys(it)])].sort()

  // Group by prefix
  const grouped = new Map<string, string[]>()
  for (const key of allKeys) {
    const prefix = key.split('.')[0]
    if (!grouped.has(prefix)) grouped.set(prefix, [])
    grouped.get(prefix)!.push(key)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">i18n Keys</h2>
      <p className="text-sm text-muted-foreground mb-6">{allKeys.length} keys across EN and IT</p>

      {Array.from(grouped.entries()).map(([prefix, keys]) => (
        <div key={prefix} className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {prefix} <span className="text-xs font-normal">({keys.length})</span>
          </h3>
          <div className="border rounded-lg divide-y">
            {keys.map((key) => (
              <div key={key} className="px-4 py-3">
                <div className="text-xs font-mono text-muted-foreground mb-1">{key}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[10px] font-semibold text-info uppercase">EN</span>
                    <div className="text-foreground">{en[key] ?? <span className="text-destructive/60 italic">missing</span>}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-success uppercase">IT</span>
                    <div className="text-foreground">{it[key] ?? <span className="text-destructive/60 italic">missing</span>}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
