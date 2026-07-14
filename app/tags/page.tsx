import type { ReactElement } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'

import { DOCUMENTS_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { ActionCard } from '@molecules/ActionCard'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

interface WorkflowAction {
  description: string
  href: string
  title: string
}

const TAG_WORKFLOWS: WorkflowAction[] = [
  {
    href: DOCUMENTS_PATH,
    title: 'Documents',
    description: 'Browse documents, then open Document Detail to add, remove, or create tags in the current live workflow.',
  },
  {
    href: REVIEW_QUEUE_PATH,
    title: 'Review Queue',
    description: 'Review documents that need attention and use advanced search to filter the queue by tag.',
  },
]

export default function TagsPage(): ReactElement {
  return (
    <Stack spacing={8}>
      <PageHeader
        eyebrow={PAGE_LABELS.tags}
        title={PAGE_LABELS.tags}
        description="Tags help organize, classify, and filter preservation documents across the dashboard. Current tag management happens in Document Detail, while this workspace provides a starting point for tag-focused navigation."
      />

      <Card component="section">
        <CardContent>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            What you can do today
          </Typography>
          <Box
            component="ul"
            sx={{
              color: 'text.secondary',
              mb: 0,
              mt: 2,
              pl: 3,
              '& li + li': {
                mt: 1.5,
              },
            }}
          >
            <li>Add and remove tags from a document in Document Detail.</li>
            <li>Create a new tag while assigning it to a document.</li>
            <li>Search and filter documents by tag from Documents and Review Queue advanced search.</li>
          </Box>
        </CardContent>
      </Card>

      <Stack component="section" spacing={2}>
        <Box>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            Current live workflows
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Use Document Detail to manage tags on a specific document. Use advanced search to filter by tag name or
            close match.
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
          {TAG_WORKFLOWS.map((workflow) => (
            <ActionCard
              key={workflow.href}
              href={workflow.href}
              description={workflow.description}
              eyebrow="Current Workflow"
              title={workflow.title}
            />
          ))}
        </Box>
      </Stack>

      <Card component="section">
        <CardContent>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            What this page does not do yet
          </Typography>
          <Box
            component="ul"
            sx={{
              color: 'text.secondary',
              mb: 0,
              mt: 2,
              pl: 3,
              '& li + li': {
                mt: 1.5,
              },
            }}
          >
            <li>This page does not provide standalone tag editing, deletion, or a full tag table.</li>
            <li>Existing tag operations remain document-scoped.</li>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
