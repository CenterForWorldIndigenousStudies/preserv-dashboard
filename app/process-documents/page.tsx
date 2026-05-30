import { type ReactElement } from 'react'
import { Stack } from '@mui/material'

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
        description="Choose one or more source folders, define a unique batch name, and launch the document-processing pipeline from the dashboard."
      />
      <ProcessDocumentsWorkspace initialBatches={batches} />
    </Stack>
  )
}
