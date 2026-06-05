import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import {
  BATCH_SUMMARY_PATH,
  FAILED_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REVIEW_QUEUE_PATH,
} from '@constants/paths'
import { getDashboardKpiMetrics } from '@lib/dashboardMetrics'
import { MetricCard } from '@molecules/MetricCard'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

interface QuickActionProps {
  href: string
  label: string
  description: string
}

const KPI_CARD_DESCRIPTIONS: Record<string, string> = {
  'Needs Review': 'Documents in the current human-review queue using the existing Review Queue defaults.',
  'Ready for Library': 'Approved documents that meet the current library-ready handoff rules.',
  'Active Batches': 'Recent processing batches currently classified as active in the Batches view.',
}

const QUICK_ACTIONS: QuickActionProps[] = [
  {
    href: REVIEW_QUEUE_PATH,
    label: 'Open Review Queue',
    description: 'Go to the current review workflow.',
  },
  {
    href: READY_FOR_LIBRARY_PATH,
    label: 'Open Ready for Library',
    description: 'Go to the current library-ready list.',
  },
  {
    href: PROCESS_DOCUMENTS_PATH,
    label: 'Start Process Documents',
    description: 'Go to the existing batch launch page.',
  },
  {
    href: BATCH_SUMMARY_PATH,
    label: 'Open Batch Summary',
    description: 'Review the current batch summary table.',
  },
  {
    href: FAILED_PATH,
    label: 'Open Failures',
    description: 'Inspect the current failures view.',
  },
]

function QuickActionCard({ href, label, description }: QuickActionProps): ReactElement {
  return (
    <article className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Quick Action</p>
      <h2 className="mt-2 text-lg font-semibold text-ink">{label}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/70">{description}</p>
      <div className="mt-4">
        <Button href={href} variant="secondary">
          Open
        </Button>
      </div>
    </article>
  )
}

export default async function DashboardPage(): Promise<ReactElement> {
  const metrics = await getDashboardKpiMetrics()

  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Operational dashboard."
        description="Start here for a live snapshot of review backlog, ingest-ready work, and current batch activity across the preservation dashboard."
      />

      <Stack component="section" spacing={2}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'text.primary' }}>
            Operational Snapshot
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            These cards now reflect the current live review queue, library-ready backlog, and active batch workload.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              description={KPI_CARD_DESCRIPTIONS[metric.title] ?? 'Open the related dashboard destination.'}
              href={metric.href}
              value={metric.value}
            />
          ))}
        </Box>
      </Stack>

      <section className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-ink">Priority Alerts</h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Placeholder only. Priority alerts will appear here once alert rules and live dashboard metrics are implemented.
        </p>
      </section>

      <section className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-ink">System Status</h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Placeholder only. System status messaging will be connected to live pipeline health in a later PR.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Quick Actions</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Use these links to reach existing dashboard destinations while this page remains a skeleton.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.href}
              href={action.href}
              label={action.label}
              description={action.description}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
