import type { ReactElement } from 'react'

import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { getFailures } from '@lib/queries'

import { FailuresDocumentTable } from './FailuresDocumentTable'

export const dynamic = 'force-dynamic'

export default async function FailuresPage(): Promise<ReactElement> {
  try {
    const failures = await getFailures()

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Processing Failures"
          title="Inspect documents that did not complete processing."
          description="Failed documents are sorted by ingestion time. Failure reasons are derived from metadata when an error-like field is present."
        />

        {failures.length === 0 ? (
          <NoDataState message="There are no failure records to display yet." />
        ) : (
          <FailuresDocumentTable failures={failures} />
        )}
      </div>
    )
  } catch {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Processing Failures"
          title="Inspect documents that did not complete processing."
          description="Failed documents are sorted by ingestion time. Failure reasons are derived from metadata when an error-like field is present."
        />
        <NoDataState message="No data is available right now. The database may be empty, unavailable, or still being initialized." />
      </div>
    )
  }
}
