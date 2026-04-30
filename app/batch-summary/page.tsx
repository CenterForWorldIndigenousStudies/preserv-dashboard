import { Suspense, type ReactElement } from 'react'
import { BatchSummaryTable } from '@organisms/BatchSummaryTable'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { getBatchSummary } from '@lib/queries'

export const dynamic = 'force-dynamic'

function SummaryCard({
  totalBatches,
  totalDocuments,
}: {
  totalBatches: number
  totalDocuments: number
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Total Batches</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{totalBatches}</p>
      </div>
      <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Total Documents</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{totalDocuments}</p>
      </div>
    </div>
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
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Batch Summary"
        title="Batch processing details by batch."
        description="Flattened processing details and aggregated processing time per batch, from the batches and document_to_batches tables."
      />

      <Suspense fallback={null}>
        <BatchSummaryContent />
      </Suspense>
    </div>
  )
}
