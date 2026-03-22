import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { MetricBox } from './shared/MetricBox'
import { fmtDuration } from '@commons/utils/recipe'
import type { TimeSummary as TimeSummaryType } from '@commons/types/recipe'

interface TimeSummaryProps {
  timeSummary: TimeSummaryType
}

export function TimeSummary({ timeSummary }: TimeSummaryProps) {
  return (
    <section className="mt-3.5">
      <SectionHeader emoji="⏱️" title="Tempi" />
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-1.5">
          <MetricBox label="Totale" value={fmtDuration(timeSummary.total)} color="#2c1810" />
          <MetricBox label="Prep." value={fmtDuration(timeSummary.prep)} color="#8892a8" />
          <MetricBox label="Lievitaz." value={fmtDuration(timeSummary.rise)} color="#d4a54a" />
          <MetricBox label="Cottura" value={fmtDuration(timeSummary.bake)} color="#d47a50" />
        </div>
      </Card>
    </section>
  )
}
