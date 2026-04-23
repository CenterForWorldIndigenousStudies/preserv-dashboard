import { Suspense, type ReactElement } from 'react'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
import { NoDataState } from '@organisms/NoDataState'
import { getReadyForLibraryDocuments } from '@lib/queries'

export const dynamic = 'force-dynamic'

async function ReadyForLibraryContent() {
  const result = await getReadyForLibraryDocuments()

  if (result.total === 0) {
    return <NoDataState message="No documents are currently ready for library ingest." />
  }
  return <ReadyForLibraryTable initialData={result} />
}

export default function ReadyForLibraryPage(): ReactElement {
  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Ready for Library"
        title="Approved documents ready for ingest."
        description="Documents with APPROVED validation status, a set access level, and all required Dublin Core metadata fields (dc_title, dc_type, dc_subject, dc_rights)."
      />

      <Suspense fallback={null}>
        <ReadyForLibraryContent />
      </Suspense>
    </div>
  )
}
