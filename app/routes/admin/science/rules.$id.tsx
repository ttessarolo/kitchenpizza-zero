import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getScienceProvider } from '~/server/middleware/science'
import { FormulaDisplay, FormulaCard } from '~/components/science/FormulaDisplay'
import type { MathJSON } from '@commons/utils/science/types'

const loadBlock = (createServerFn() as any)
  .handler(async ({ data: id }: { data: string }) => {
    const provider = await getScienceProvider()
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
  const b = block as unknown as Record<string, unknown>
  const meta = b._meta as Record<string, unknown> | undefined

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/admin/science" className="text-sm text-muted-foreground hover:text-foreground">&larr; Back to list</Link>

      <div className="mt-4 border rounded-lg p-6 bg-background">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{meta ? t(String(meta.displayName)) : String(b.id)}</h2>
            {meta?.description != null && (
              <p className="text-sm text-muted-foreground mt-1">{t(String(meta.description))}</p>
            )}
          </div>
          <span className="text-xs font-semibold bg-muted px-2 py-1 rounded">{String(b.type)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-muted-foreground">ID:</span> <code className="bg-muted px-1 rounded">{String(b.id)}</code>
          </div>
          {meta?.section != null && (
            <div>
              <span className="text-muted-foreground">Section:</span> {String(meta.section)}
            </div>
          )}
          {b.ref != null && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Ref:</span> {String(b.ref)}
            </div>
          )}
          {meta?.tags != null && (
            <div className="col-span-2 flex gap-1 items-center">
              <span className="text-muted-foreground">Tags:</span>
              {(meta.tags as string[]).map((tag) => (
                <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Formula expression (MathJSON + KaTeX rendering) */}
        {b.expr != null && (
          <FormulaCard
            label="Expression"
            expr={b.expr as MathJSON}
            latex={b.latex as string | null}
            className="mb-4"
          />
        )}

        {/* Variants */}
        {b.variants != null && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Variants</h3>
            <div className="space-y-2">
              {(b.variants as Array<Record<string, unknown>>).map((v) => (
                <div key={String(v.key)} className={`border rounded-lg p-3 ${v.default ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{t(String(v.nameKey))}</span>
                    {v.default != null && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">default</span>}
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <FormulaDisplay expr={v.expr as MathJSON} latex={v.latex as string | null} />
                  </div>
                  {v.constants != null && (
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
        {b.constants != null && Object.keys(b.constants as object).length > 0 && (
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
        {b.factors != null && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Factors ({(b.factors as unknown[]).length})</h3>
            <div className="space-y-1">
              {(b.factors as Array<Record<string, unknown>>).map((f) => (
                <div key={String(f.id)} className="bg-muted rounded p-2 text-xs">
                  <span className="font-mono font-semibold">{String(f.id)}</span>
                  {f.expr != null && <span className="ml-2"><FormulaDisplay expr={f.expr as MathJSON} latex={f.latex as string | null} className="text-sm" /></span>}
                  {f.source === 'lookup' && <span className="ml-2 text-muted-foreground">lookup: {String(f.table)}.{String(f.field)}</span>}
                  {f.ref != null && <span className="ml-2 italic text-muted-foreground">— {String(f.ref)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Piecewise segments */}
        {b.segments != null && (
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
                        {s.default != null && 'default'}
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
        {b.conditions != null && (
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
        {b.actions != null && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Actions {b.selectionMode === 'choose_one' && <span className="text-primary">(choose one)</span>}
            </h3>
            <div className="space-y-2">
              {(b.actions as Array<Record<string, unknown>>).map((a, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="text-sm font-medium">{t(String(a.labelKey))}</div>
                  {a.descriptionKey != null && <div className="text-xs text-muted-foreground mt-0.5">{t(String(a.descriptionKey))}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{(a.mutations as unknown[]).length} mutations</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        {b.output != null && (
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
