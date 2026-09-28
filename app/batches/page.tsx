import type { ReactElement } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'

import { PROCESS_DOCUMENTS_PATH } from '@constants/paths'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { PAGE_LABELS } from '@constants/pageLabels'
import { BatchesTable } from '@organisms/BatchesTable'
import { PageHeader } from '@organisms/PageHeader'
import { getBatchOverviewMetrics, getBatches, parseBatchQueryParams } from '@lib/queries/batchQueries'
import { getDocumentFilterOptions } from '@lib/queries/queries'
import { getBatchDrafts } from '@lib/queries/batchDraftQueries'
import { BatchCart } from '@molecules/BatchCart'

export const dynamic = 'force-dynamic'

function BatchesInfo(): ReactElement {
  return (
    <Stack spacing={2}>
      <Typography component={'h2'} variant={'h6'} sx={{ fontWeight: 600, color: 'text.primary' }}>
        {'Batches owns monitoring and investigation.'}
      </Typography>
      <Typography sx={{ maxWidth: '48rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}>
        {
          'Review in-flight and historical batches here, then open a batch to inspect the currently available operational details. Return to Process when you need to configure or launch another run.'
        }
      </Typography>
      <Box>
        <Button
          href={PROCESS_DOCUMENTS_PATH}
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
          {'Back to Process'}
        </Button>
      </Box>
    </Stack>
  )
}

interface BatchesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BatchesPage({ searchParams }: BatchesPageProps): Promise<ReactElement> {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseBatchQueryParams(resolvedSearchParams)
  const [initialData, overview, filterOptions, drafts] = await Promise.all([
    getBatches(initialQuery),
    getBatchOverviewMetrics(initialQuery),
    getDocumentFilterOptions(),
    getBatchDrafts(),
  ])
  const batchFilterOptions = {
    ...filterOptions,
    lifecycleStatuses: Object.values(GENERATED_BATCH_LIFECYCLE_STATUSES),
  }

  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.batches}
        title={'Monitor batch health and investigate batch history'}
        description={
          'Use this workspace for routine monitoring, in-flight inspection, and historical batch details from the current operational data. Start and configure new runs in Process.'
        }
        infoTitle={'Monitoring Workspace'}
        infoContent={<BatchesInfo />}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><BatchCart drafts={drafts} /></Box>
      <BatchesTable
        initialData={initialData}
        initialQuery={initialQuery}
        filterOptions={batchFilterOptions}
        totalDocuments={overview.totalDocuments}
      />
    </Stack>
  )
}
