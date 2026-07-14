import { type ReactElement } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'

import { BATCHES_PATH } from '@constants/paths'
import { getProcessBatchStatuses } from '@lib/processBatches'
import { ProcessDocumentsWorkspace } from '@organisms/ProcessDocumentsWorkspace'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

export default async function ProcessDocumentsPage(): Promise<ReactElement> {
  const batches = await getProcessBatchStatuses()

  return (
    <Stack spacing={4}>
      <PageHeader
        eyebrow="Process Documents"
        title="Select Google Drive folders and start a new processing batch."
        description="Choose one or more source folders, define a unique batch name, and launch the document-processing pipeline from the dashboard. Use this route for launch and orchestration, then move to Batches for deeper monitoring."
      />
      <Card component="section" sx={{ p: 3, borderRadius: 2, border: 1, borderColor: 'rgba(53, 88, 52, 0.15)', boxShadow: 2 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Typography
            variant="overline"
            sx={{ color: 'rgb(53, 88, 52)', fontWeight: 600, letterSpacing: '0.18em' }}
          >
            Launch Workspace
          </Typography>
          <Typography component="h2" variant="h6" sx={{ mt: 1.5, fontWeight: 600, color: 'ink.main' }}>
            Process owns setup, launch, and early confirmation.
          </Typography>
          <Typography sx={{ mt: 1.5, maxWidth: '48rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}>
            Start new work here, confirm that a batch was accepted, and keep recent status nearby while the run begins.
            When you need routine monitoring or deeper investigation, continue in Batches.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              href={BATCHES_PATH}
              variant="outlined"
              sx={{
                borderRadius: 999,
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                borderColor: 'rgba(53, 88, 52, 0.25)',
                color: 'rgb(53, 88, 52)',
                '&:hover': {
                  borderColor: 'rgb(53, 88, 52)',
                  color: 'ink.main',
                },
              }}
            >
              Open Batches for Monitoring
            </Button>
          </Box>
        </CardContent>
      </Card>
      <ProcessDocumentsWorkspace initialBatches={batches} />
    </Stack>
  )
}
