import { Suspense, type ReactElement } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'

import { BatchSummaryTable } from '@organisms/BatchSummaryTable'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { getBatchSummary } from '@lib/queries'

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
        <Card key={label} component="section" sx={{ border: '1px solid', borderColor: 'rgba(53, 88, 52, 0.15)' }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {label}
            </Typography>
            <Typography component="p" variant="h3" sx={{ color: 'ink.main', mt: 1 }}>
              {value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

async function BatchSummaryContent() {
  const rows = await getBatchSummary()

  if (rows.length === 0) {
    return <NoDataState message="No batch data is available yet." />
  }

  const totalBatches = new Set(rows.map((row) => row.batch_id)).size
  const totalDocuments = rows.reduce((sum, row) => {
    if (row.property_key !== 'total_documents' || typeof row.property_value !== 'number') {
      return sum
    }

    return sum + row.property_value
  }, 0)

  return (
    <>
      <SummaryCard totalBatches={totalBatches} totalDocuments={totalDocuments} />
      <BatchSummaryTable data={rows} />
    </>
  )
}

export default function BatchSummaryPage(): ReactElement {
  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Batch Summary"
        title="Batch processing details by batch."
        description="Flattened processing details and aggregated processing time per batch, from the batches and document_to_batches tables."
      />

      <Suspense fallback={null}>
        <BatchSummaryContent />
      </Suspense>
    </Stack>
  )
}
