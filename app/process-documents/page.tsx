import { type ReactElement } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'

import { BATCHES_PATH } from '@constants/paths'
import { getProcessBatchStatuses } from '@lib/processBatches'
import { RECENT_BATCH_LIMIT } from '@lib/processDocuments'
import { getBatchDraft, getBatchDrafts } from '@lib/queries/batchDraftQueries'
import { ProcessDocumentsWorkspace } from '@organisms/ProcessDocumentsWorkspace'
import { PageHeader } from '@organisms/PageHeader'
import { PAGE_LABELS } from '@constants/pageLabels'

export const dynamic = 'force-dynamic'

function ProcessDocumentsInfo(): ReactElement {
  return (
    <Stack spacing={2}>
      <Typography component={'h2'} variant={'h6'} sx={{ fontWeight: 600, color: 'text.primary' }}>
        {'Process owns setup, launch, and early confirmation.'}
      </Typography>
      <Typography sx={{ maxWidth: '48rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}>
        {
          'Start new work here, confirm that a batch was accepted, and keep recent status nearby while the run begins. When you need routine monitoring or deeper investigation, continue in Batches.'
        }
      </Typography>
      <Box>
        <Button
          href={BATCHES_PATH}
          variant={'outlined'}
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
              color: 'text.primary',
            },
          }}
        >
          {'Open Batches for Monitoring'}
        </Button>
      </Box>
    </Stack>
  )
}

interface ProcessDocumentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProcessDocumentsPage({ searchParams }: ProcessDocumentsPageProps): Promise<ReactElement> {
  const params = await searchParams
  const draftIdValue = params.draftId
  const draftId = (Array.isArray(draftIdValue) ? draftIdValue[0] : draftIdValue)?.trim()
  const [batches, drafts, draft] = await Promise.all([
    getProcessBatchStatuses(RECENT_BATCH_LIMIT),
    getBatchDrafts(),
    draftId ? getBatchDraft(draftId) : Promise.resolve(null),
  ])

  return (
    <Stack spacing={4}>
      <PageHeader
        eyebrow={PAGE_LABELS.process}
        title={'Select Google Drive folders and start a new processing batch.'}
        description={
          'Choose one or more source folders, define a unique batch name, and launch the document-processing pipeline from the dashboard. Use this route for launch and orchestration, then move to Batches for deeper monitoring.'
        }
        infoTitle={'Launch Workspace'}
        infoContent={<ProcessDocumentsInfo />}
      />
      <ProcessDocumentsWorkspace initialBatches={batches} initialDrafts={drafts} initialDraft={draft} />
    </Stack>
  )
}
