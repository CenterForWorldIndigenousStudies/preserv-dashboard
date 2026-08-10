import type { ReactElement } from 'react'
import { Stack } from '@mui/material'

import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { getFailures } from '@lib/queries/queries'
import { PAGE_LABELS } from '@constants/pageLabels'

import { FailuresDocumentTable } from './FailuresDocumentTable'

export const dynamic = 'force-dynamic'

export default async function FailuresPage(): Promise<ReactElement> {
  try {
    const failures = await getFailures()

    return (
      <Stack spacing={4} sx={{ width: '100%' }}>
        <PageHeader
          eyebrow={PAGE_LABELS.processingFailures}
          title={'Inspect documents that did not complete processing'}
          description={
            'Failed documents are sorted by ingestion time. Failure reasons are derived from metadata when an error-like field is present.'
          }
        />

        {failures.length === 0 ? (
          <NoDataState message={'There are no failure records to display yet.'} />
        ) : (
          <FailuresDocumentTable failures={failures} />
        )}
      </Stack>
    )
  } catch {
    return (
      <Stack spacing={4} sx={{ width: '100%' }}>
        <PageHeader
          eyebrow={PAGE_LABELS.processingFailures}
          title={'Inspect documents that did not complete processing'}
          description={
            'Failed documents are sorted by ingestion time. Failure reasons are derived from metadata when an error-like field is present.'
          }
        />
        <NoDataState
          message={
            'No data is available right now. The database may be empty, unavailable, or still being initialized.'
          }
        />
      </Stack>
    )
  }
}
