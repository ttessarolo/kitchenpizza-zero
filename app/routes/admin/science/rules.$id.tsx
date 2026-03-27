import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { FileScienceProvider } from '@commons/utils/science/science-provider'
import * as path from 'path'

const loadBlock = createServerFn()
  .handler(async ({ data: id }: { data: string }) => {
    const provider = new FileScienceProvider(
      path.resolve(process.cwd(), 'science'),
      path.resolve(process.cwd(), 'i18n'),
    )
    const block = provider.getBlock(id)
    const i18nIt = provider.getI18nKeys('it')
    const i18nEn = provider.getI18nKeys('en')
    return { block, i18nIt, i18nEn }
  })

export const Route = createFileRoute('/admin/science/rules/$id')({
  loader: ({ params }) => loadBlock({ data: params.id }),
  component: RuleDetail,
})

function RuleDetail() {
  const { block, i18nIt, i18nEn } = Route.useLoaderData()
  const { id } = Route.useParams()

  if (!block) {
    return (
      <div className="p-6">
        <Link to="/admin/science" className="text-sm text-muted-foreground">&larr; Back</Link>
        <p className="mt-4">Block "{id}" not found.</p>
      </div>
    )
  }

  const t = (key: string) => i18nIt[key] ?? i18nEn[key] ?? key
  const b = block as Record<string, unknown>
  const meta = b._meta as Record<string, unknown> | undefined

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/admin/science" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to list</Link>

      <div className="mt-4 border rounded-lg p-6 bg-background">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{meta ? t(String(meta.displayName)) : b.id as string}</h2>
            {meta?.description && (
              <p className="text-sm text-muted-foreground mt-1">{t(String(meta.description))}</p>
            )}
          </div>
          <span className="text-xs font-semibold bg-muted px-2 py-1 rounded">{b.type as string}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-muted-foreground">ID:</span> <code className="bg-muted px-1 rounded">{b.id as string}</code>
          </div>
          {meta?.section && (
            <div>
              <span className="text-muted-foreground">Section:</span> {String(meta.section)}
            </div>
          )}
          {b.ref && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Ref:</span> {String(b.ref)}
            </div>
          )}
          {meta?.tags && (
            <div className="col-span-2 flex gap-1 items-center">
              <span className="text-muted-foreground">Tags:</span>
              {(meta.tags as string[]).map((tag) => (
                <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Formula expression */}
        {b.expression && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expression</h3>
            <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{String(b.expression)}</pre>
          </div>
        )}

        {/* Variants */}
        {b.variants && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Variants</h3>
            <div className="space-y-2">
              {(b.variants as Array<Record<string, unknown>>).map((v) => (
                <div key={String(v.key)} className={`border rounded-lg p-3 ${v.default ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{t(String(v.nameKey))}</span>
                    {v.default && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">default</span>}
                  </div>
                  <pre className="bg-muted p-2 rounded text-xs font-mono">{String(v.expression)}</pre>
                  {v.constants && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Constants: {Object.entries(v.constants as Record<string, number>).map(([k, val]) => `${k}=${val}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constants */}
        {b.constants && Object.keys(b.constants as object).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Constants</h3>
            <div className="bg-muted rounded-lg p-3">
              <table className="text-sm w-full">
                <tbody>
                  {Object.entries(b.constants as Record<string, number>).map(([k, v]) => (
                    <tr key={k}>
                      <td className="font-mono pr-4">{k}</td>
                      <td className="font-bold">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Factor chain */}
        {b.factors && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Factors ({(b.factors as unknown[]).length})</h3>
            <div className="space-y-1">
              {(b.factors as Array<Record<string, unknown>>).map((f) => (
                <div key={String(f.id)} className="bg-muted rounded p-2 text-xs">
                  <span className="font-mono font-semibold">{String(f.id)}</span>
                  {f.expression && <span className="ml-2 text-muted-foreground">{String(f.expression)}</span>}
                  {f.source === 'lookup' && <span className="ml-2 text-muted-foreground">lookup: {String(f.table)}.{String(f.field)}</span>}
                  {f.ref && <span className="ml-2 italic text-muted-foreground">— {String(f.ref)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Piecewise segments */}
        {b.segments && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Segments</h3>
            <div className="bg-muted rounded-lg p-3">
              <table className="text-sm w-full">
                <thead><tr><th className="text-left pr-4">Condition</th><th className="text-left">Value</th></tr></thead>
                <tbody>
                  {(b.segments as Array<Record<string, unknown>>).map((s, i) => (
                    <tr key={i}>
                      <td className="font-mono pr-4">
                        {s.gt !== undefined && `> ${s.gt}`}
                        {s.gte !== undefined && `>= ${s.gte}`}
                        {s.lt !== undefined && `< ${s.lt}`}
                        {s.lte !== undefined && `<= ${s.lte}`}
                        {s.default && 'default'}
                      </td>
                      <td className="font-bold">{String(s.value ?? b.default)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rule conditions */}
        {b.conditions && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Conditions (AND)</h3>
            <div className="space-y-1">
              {(b.conditions as Array<Record<string, unknown>>).map((c, i) => (
                <div key={i} className="bg-muted rounded p-2 text-xs font-mono">
                  {String(c.field)} {String(c.op)} {JSON.stringify(c.value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {b.actions && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Actions {b.selectionMode === 'choose_one' && <span className="text-primary">(choose one)</span>}
            </h3>
            <div className="space-y-2">
              {(b.actions as Array<Record<string, unknown>>).map((a, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="text-sm font-medium">{t(String(a.labelKey))}</div>
                  {a.descriptionKey && <div className="text-xs text-muted-foreground mt-0.5">{t(String(a.descriptionKey))}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{(a.mutations as unknown[]).length} mutations</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        {b.output && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Output</h3>
            <div className="bg-muted rounded p-2 text-sm font-mono">
              {JSON.stringify(b.output)}
            </div>
          </div>
        )}

        {/* Raw JSON */}
        <details className="mt-6">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Raw JSON</summary>
          <pre className="mt-2 bg-muted p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(block, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
