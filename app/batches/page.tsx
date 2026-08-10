import type { ReactElement } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'

import { PROCESS_DOCUMENTS_PATH } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { BatchesTable } from '@organisms/BatchesTable'
import { PageHeader } from '@organisms/PageHeader'
import { getBatchOverviewMetrics, getBatches, parseBatchQueryParams } from '@lib/queries/batchQueries'

export const dynamic = 'force-dynamic'

function SummaryCard({ totalBatches, totalDocuments }: { totalBatches: number; totalDocuments: number }) {
  const metrics = [
    { label: 'Total Batches', value: totalBatches },
    { label: 'Total Documents', value: totalDocuments },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      {metrics.map(({ label, value }) => (
        <Card key={label} component={'section'} sx={{ border: '1px solid', borderColor: 'rgba(53, 88, 52, 0.15)' }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography
              variant={'caption'}
              sx={{ color: 'text.secondary', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {label}
            </Typography>
            <Typography component={'p'} variant={'h3'} sx={{ color: 'text.primary', mt: 1 }}>
              {value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

interface BatchesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BatchesPage({ searchParams }: BatchesPageProps): Promise<ReactElement> {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseBatchQueryParams(resolvedSearchParams)
  const [initialData, overview] = await Promise.all([getBatches(initialQuery), getBatchOverviewMetrics()])

  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.batches}
        title={'Monitor batch health and investigate batch history'}
        description={
          'Use this workspace for routine monitoring, in-flight inspection, and historical batch details from the current operational data. Start and configure new runs in Process.'
        }
      />
      <Card
        component={'section'}
        sx={{ p: 3, borderRadius: 2, border: 1, borderColor: 'rgba(53, 88, 52, 0.15)', boxShadow: 2 }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Typography variant={'overline'} sx={{ color: 'rgb(53, 88, 52)', fontWeight: 600, letterSpacing: '0.18em' }}>
            {'Monitoring Workspace'}
          </Typography>
          <Typography component={'h2'} variant={'h6'} sx={{ mt: 1.5, fontWeight: 600, color: 'text.primary' }}>
            {'Batches owns monitoring and investigation.'}
          </Typography>
          <Typography
            sx={{ mt: 1.5, maxWidth: '48rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}
          >
            {
              'Review in-flight and historical batches here, then open a batch to inspect the currently available operational details. Return to Process when you need to configure or launch another run.'
            }
          </Typography>
          <Box sx={{ mt: 2 }}>
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
        </CardContent>
      </Card>

      <SummaryCard totalBatches={overview.totalBatches} totalDocuments={overview.totalDocuments} />
      <BatchesTable initialData={initialData} initialQuery={initialQuery} />
    </Stack>
  )
}
