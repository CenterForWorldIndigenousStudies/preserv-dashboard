import type { ReactElement } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'

import {
  BATCHES_PATH,
  DASHBOARD_PATH,
  READY_FOR_LIBRARY_PATH,
  REVIEW_QUEUE_PATH,
} from '@constants/paths'
import { ActionCard } from '@molecules/ActionCard'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

interface ReportWorkspaceLink {
  description: string
  href: string
  title: string
}

const REPORT_WORKSPACE_LINKS: ReportWorkspaceLink[] = [
  {
    href: DASHBOARD_PATH,
    title: 'Dashboard',
    description: 'Open the live operational snapshot for review backlog, library-ready work, and current batch activity.',
  },
  {
    href: BATCHES_PATH,
    title: 'Batches',
    description: 'Review the current batch processing details and batch-level activity already available in the dashboard.',
  },
  {
    href: REVIEW_QUEUE_PATH,
    title: 'Review Queue',
    description: 'Open the current document review workflow for records that still need human attention.',
  },
  {
    href: READY_FOR_LIBRARY_PATH,
    title: 'Ready for Library',
    description: 'Review documents that meet the current dashboard-visible library criteria without implying final handoff readiness.',
  },
]

const listStyles = {
  color: 'text.secondary',
  mb: 0,
  mt: 2,
  pl: 3,
  '& li + li': {
    mt: 1.5,
  },
} as const

export default function ReportsPage(): ReactElement {
  return (
    <Stack spacing={8}>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="Use this workspace as a starting point for current reporting-related workflows across the preservation dashboard. These links point to live operational views that already surface review, batch, readiness, and failure signals."
      />

      <Card component="section">
        <CardContent>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            What you can review today
          </Typography>
          <Box component="ul" sx={listStyles}>
            <li>Dashboard provides a live snapshot of review backlog, library-ready work, and current batch activity.</li>
            <li>Batches shows batch processing details by batch from the current operational view.</li>
            <li>Failures remain part of the reporting scope as an operational signal alongside queue pressure, readiness, and batch activity.</li>
            <li>Review Queue defaults to documents whose validation status still needs human review.</li>
            <li>Ready for Library shows approved documents with an access level and metadata completeness displayed for review.</li>
          </Box>
        </CardContent>
      </Card>

      <Stack component="section" spacing={2}>
        <Box>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            Current live workspaces
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Use these existing routes to review operational signals. This page does not add new reporting logic or
            derived analytics.
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
          {REPORT_WORKSPACE_LINKS.map((workspace) => (
            <ActionCard
              key={workspace.href}
              href={workspace.href}
              description={workspace.description}
              eyebrow="Current Workspace"
              title={workspace.title}
            />
          ))}
        </Box>
      </Stack>

      <Card component="section">
        <CardContent>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            What this page does not do yet
          </Typography>
          <Box component="ul" sx={listStyles}>
            <li>This page does not introduce standalone reports, charts, exports, filters, or saved views.</li>
            <li>It does not create new metrics, backend queries, or API routes.</li>
            <li>It is a navigation and orientation layer over existing live operational workspaces.</li>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
