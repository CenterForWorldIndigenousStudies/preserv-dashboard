import { Suspense, type ReactElement } from 'react'
import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
import { NoDataState } from '@organisms/NoDataState'
import { getReadyForLibraryDocuments } from '@lib/queries'
import { getUniqueDocumentCountByAuthor } from '@lib/readyForLibraryAuthorMetrics'

export const dynamic = 'force-dynamic'

const FEATURED_AUTHOR_NAME = 'Ryser, Rudolph C.'

const READINESS_EXPLANATION_GROUPS = {
  'Dashboard-visible preconditions': [
    'Validation status must be APPROVED.',
    'An access level must be set.',
  ],
  'Metadata completeness shown for review': [
    'Required Dublin Core fields are checked for display: dc_title, dc_type, dc_subject, and dc_rights.',
    'Documents may still appear here when Metadata Complete is Incomplete.',
  ],
  'Runtime checks still required': [
    'This page does not confirm final Fedora handoff eligibility.',
    'Collection linkage, Fedora collection mapping, duplicate and review exclusions, and other ingest checks may still prevent handoff.',
    'Drive, Fedora, and Workbench conditions are still evaluated at execution time.',
  ],
}

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

function ReadyForLibraryReadinessExplanation() {
  return (
    <section aria-labelledby="ready-for-library-readiness-explanation" className="space-y-3">
      <p
        id="ready-for-library-readiness-explanation"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/60"
      >
        How this page evaluates readiness
      </p>
      <NeedsReviewReasons value={READINESS_EXPLANATION_GROUPS} />
    </section>
  )
}

async function ReadyForLibraryContent() {
  const [result, featuredAuthorDocumentCount] = await Promise.all([
    getReadyForLibraryDocuments(),
    getUniqueDocumentCountByAuthor(FEATURED_AUTHOR_NAME),
  ])

  return (
    <>
      <AuthorCountCard authorName={FEATURED_AUTHOR_NAME} count={featuredAuthorDocumentCount} />
      {result.total === 0 ? (
        <NoDataState message="No documents currently meet the dashboard-visible library eligibility criteria." />
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
        title="Documents in Ready for Library view"
        description="Approved documents with an access level. Metadata completeness is shown for review."
      />

      <ReadyForLibraryReadinessExplanation />

      <Suspense fallback={null}>
        <ReadyForLibraryContent />
      </Suspense>
    </div>
  )
}
