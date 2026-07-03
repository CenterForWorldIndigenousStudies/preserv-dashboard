import type { ReactElement } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'

import {
  BATCHES_PATH,
  COLLECTIONS_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REVIEW_QUEUE_PATH,
} from '@constants/paths'
import { getDashboardKpiMetrics } from '@lib/dashboardMetrics'
import { ActionCard } from '@molecules/ActionCard'
import { MetricCard } from '@molecules/MetricCard'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

interface DashboardLinkCardProps {
  description: string
  href: string
  title: string
}

const KPI_CARD_DESCRIPTIONS: Record<string, string> = {
  'Needs Review': 'Documents in the current human-review queue using the existing Review Queue defaults.',
  'Ready for Library': 'Documents that meet the current dashboard-visible library eligibility rules.',
  'Active Batches': 'Recent processing batches currently classified as active in the Batches view.',
}

const QUEUE_SNAPSHOTS: DashboardLinkCardProps[] = [
  {
    href: REVIEW_QUEUE_PATH,
    title: 'Review Queue',
    description: 'Open the live review queue for documents needing human attention.',
  },
  {
    href: READY_FOR_LIBRARY_PATH,
    title: 'Ready for Library',
    description: 'Open approved documents with dashboard-visible library-ready criteria.',
  },
]

const QUICK_ACTIONS: DashboardLinkCardProps[] = [
  {
    href: REVIEW_QUEUE_PATH,
    title: 'Review Queue',
    description: 'Go to the current review workflow.',
  },
  {
    href: READY_FOR_LIBRARY_PATH,
    title: 'Ready for Library',
    description: 'Go to the current library-ready list.',
  },
  {
    href: PROCESS_DOCUMENTS_PATH,
    title: 'Process Documents',
    description: 'Go to the existing batch launch page.',
  },
  {
    href: COLLECTIONS_PATH,
    title: 'Collections',
    description: 'Review collection coverage and manage collection records.',
  },
  {
    href: BATCHES_PATH,
    title: 'Batch Summary',
    description: 'Review the current batch summary table.',
  },
]

export default async function DashboardPage(): Promise<ReactElement> {
  const metrics = await getDashboardKpiMetrics()

  return (
    <Stack spacing={8} sx={{ width: '100%' }}>
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

      <Card component="section">
        <CardContent>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            Priority Alerts
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            Placeholder only. Priority alerts will appear here once alert rules and live dashboard metrics are
            implemented.
          </Typography>
        </CardContent>
      </Card>

      <Card component="section">
        <CardContent>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            System Status
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
            Placeholder only. System status messaging will be connected to live pipeline health in a later PR.
          </Typography>
        </CardContent>
      </Card>

      <Stack component="section" spacing={2}>
        <Box>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            Queue Snapshots
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Open the live review and library-ready queues from here. Where dashboard data is not yet
            reliable, the card explains the current limit.
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
          {QUEUE_SNAPSHOTS.map((snapshot) => (
            <ActionCard
              key={snapshot.href}
              href={snapshot.href}
              description={snapshot.description}
              eyebrow="Queue Snapshot"
              title={snapshot.title}
            />
          ))}
        </Box>
      </Stack>

      <Stack component="section" spacing={2}>
        <Box>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            Quick Actions
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Use these links to move from triage into processing, collections, and batch review.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <ActionCard
              key={action.href}
              href={action.href}
              description={action.description}
              eyebrow="Quick Action"
              title={action.title}
            />
          ))}
        </Box>
      </Stack>
    </Stack>
  )
}
