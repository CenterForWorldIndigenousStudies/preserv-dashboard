import { Suspense, type ReactElement } from 'react'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
import { NoDataState } from '@organisms/NoDataState'
import { getReadyForLibraryDocuments } from '@lib/queries'
import { getUniqueDocumentCountByAuthor } from '@lib/ready-for-library-author-metrics'

export const dynamic = 'force-dynamic'

const FEATURED_AUTHOR_NAME = 'Ryser, Rudolph C.'

function AuthorCountCard({ authorName, count }: { authorName: string; count: number }) {
  return (
    <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Featured author</p>
      <p className="mt-2 text-lg font-semibold text-ink">{authorName}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{count}</p>
      <p className="mt-1 text-sm text-ink/70">Unique documents linked to this author</p>
    </div>
  )
}

async function ReadyForLibraryContent() {
  const [result, featuredAuthorDocumentCount] = await Promise.all([
    getReadyForLibraryDocuments(),
    getUniqueDocumentCountByAuthor(FEATURED_AUTHOR_NAME),
  ])

  return (
    <>
      <AuthorCountCard
        authorName={FEATURED_AUTHOR_NAME}
        count={featuredAuthorDocumentCount}
      />
      {result.total === 0 ? (
        <NoDataState message="No documents are currently ready for library ingest." />
      ) : (
        <ReadyForLibraryTable initialData={result} />
      )}
    </>
  )
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
