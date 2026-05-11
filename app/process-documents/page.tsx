import { type ReactElement } from 'react'

import { getProcessBatchStatuses } from '@lib/processBatches'
import { ProcessDocumentsManager } from '@organisms/ProcessDocumentsManager'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

export default async function ProcessDocumentsPage(): Promise<ReactElement> {
  const batches = await getProcessBatchStatuses()

  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Process Documents"
        title="Select Google Drive folders and start a new processing batch."
        description="Choose one or more source folders, define a unique batch name, and launch the document-processing pipeline from the dashboard."
      />
      <ProcessDocumentsManager initialBatches={batches} />
    </div>
  )
}
