import { type ReactElement } from 'react'

import { PageHeader } from '@organisms/PageHeader'
import { IngestDocumentsManager } from '@organisms/IngestDocumentsManager'
import { getIngestBatchStatuses } from '@lib/ingestBatches'

export const dynamic = 'force-dynamic'

export default async function IngestDocumentsPage(): Promise<ReactElement> {
  const batches = await getIngestBatchStatuses()

  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Ingest Documents"
        title="Select Google Drive folders and start a new ingest batch."
        description="Choose one or more source folders, define a unique batch name, and initiate the data-ingester workflow from the dashboard."
      />
      <IngestDocumentsManager initialBatches={batches} />
    </div>
  )
}
