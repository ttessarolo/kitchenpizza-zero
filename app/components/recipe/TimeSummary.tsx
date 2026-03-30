import { Card } from '~/components/ui/card'
import { SectionHeader } from './shared/SectionHeader'
import { MetricBox } from './shared/MetricBox'
import { fmtDuration } from '@commons/utils/format'
import { useT } from '~/hooks/useTranslation'
import type { TimeSummary as TimeSummaryType } from '@commons/types/recipe'

interface TimeSummaryProps {
  timeSummary: TimeSummaryType
  hideHeader?: boolean
}

export function TimeSummary({ timeSummary, hideHeader }: TimeSummaryProps) {
  const t = useT()
  return (
    <section className={hideHeader ? '' : 'mt-3.5'}>
      {!hideHeader && <SectionHeader emoji="⏱️" title={t('section_times')} />}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-1.5">
          <MetricBox label={t('time_total')} value={fmtDuration(timeSummary.total)} color="hsl(var(--foreground))" />
          <MetricBox label={t('time_prep')} value={fmtDuration(timeSummary.prep)} color="hsl(var(--muted-foreground))" />
          <MetricBox label={t('time_rise')} value={fmtDuration(timeSummary.rise)} color="hsl(var(--muted-foreground))" />
          <MetricBox label={t('time_bake')} value={fmtDuration(timeSummary.bake)} color="hsl(var(--muted-foreground))" />
        </div>
      </Card>
    </section>
  )
}
