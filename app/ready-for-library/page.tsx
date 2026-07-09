import { Suspense, type ReactElement } from 'react'
import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
import { NoDataState } from '@organisms/NoDataState'
import type { DocumentTableFetchResult, DocumentTableQuery } from '@organisms/document-table/types'
import { getReadyForLibraryDocuments } from '@lib/queries'
import { getUniqueDocumentCountByAuthor } from '@lib/readyForLibraryAuthorMetrics'
import type { ReadyForLibraryItem } from 'types/documents'

export const dynamic = 'force-dynamic'

const FEATURED_AUTHOR_NAME = 'Ryser, Rudolph C.'

const READINESS_EXPLANATION_GROUPS = {
  'Why documents appear here': [
    'Validation status is APPROVED.',
    'An access level is set.',
  ],
  'What to inspect before handoff': [
    'This page shows whether required Dublin Core fields are present: dc_title, dc_type, dc_subject, and dc_rights.',
    'Documents can still appear here when Metadata Complete is Incomplete.',
  ],
  'What this page does not confirm': [
    'This page does not confirm final Fedora handoff readiness.',
    'Collection linkage, Fedora collection mapping, duplicate and review exclusions, and other ingest checks may still block handoff.',
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
        What this workspace tells you
      </p>
      <NeedsReviewReasons value={READINESS_EXPLANATION_GROUPS} />
    </section>
  )
}

interface ReadyForLibraryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function normalizeReadyForLibrarySearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function getReadyForLibrarySortValue(item: ReadyForLibraryItem, orderBy: string): number | string {
  switch (orderBy) {
    case 'validation_timestamp':
      return Number(item.validation_timestamp ?? 0)
    case 'metadata_complete':
      return Number(item.metadata_complete)
    case 'access_level':
      return String(item.access_level ?? '').toLowerCase()
    case 'validation_status':
      return String(item.validation_status ?? '').toLowerCase()
    case 'name':
    default:
      return String(item.name ?? '').toLowerCase()
  }
}

function sortReadyForLibraryItems(
  items: ReadyForLibraryItem[],
  orderBy?: string,
  sortDirection?: 'asc' | 'desc',
): ReadyForLibraryItem[] {
  if (!orderBy) {
    return items
  }

  const multiplier = sortDirection === 'desc' ? -1 : 1
  return [...items].sort((left, right) => {
    const leftValue = getReadyForLibrarySortValue(left, orderBy)
    const rightValue = getReadyForLibrarySortValue(right, orderBy)

    if (leftValue < rightValue) return -1 * multiplier
    if (leftValue > rightValue) return 1 * multiplier
    return String(left.id).localeCompare(String(right.id))
  })
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseReadyForLibraryQueryParams(
  params: Record<string, string | string[] | undefined>,
): DocumentTableQuery<Record<string, never>> {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const sortDirection = firstSearchParam(params.sortDirection)
  const search = firstSearchParam(params.search)?.trim()

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    search: search || undefined,
    orderBy: firstSearchParam(params.orderBy),
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    filters: {},
  }
}

function buildReadyForLibraryInitialData(
  result: { items: ReadyForLibraryItem[]; total: number },
  query: DocumentTableQuery<Record<string, never>>,
): DocumentTableFetchResult<ReadyForLibraryItem> {
  const normalizedSearch = normalizeReadyForLibrarySearch(query.search)
  const filteredItems = normalizedSearch
    ? result.items.filter((item) =>
        String(item.name ?? '')
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : result.items
  const sortedItems = sortReadyForLibraryItems(filteredItems, query.orderBy, query.sortDirection)
  const offset = (query.page - 1) * query.pageSize
  const pagedItems = sortedItems.slice(offset, offset + query.pageSize)

  return {
    data: pagedItems,
    totalCount: sortedItems.length,
    pageInfo: {
      pageSize: query.pageSize,
      hasNextPage: offset + query.pageSize < sortedItems.length,
      hasPreviousPage: query.page > 1,
      startCursor: null,
      endCursor: null,
    },
  }
}

async function ReadyForLibraryContent({ searchParams }: ReadyForLibraryPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseReadyForLibraryQueryParams(resolvedSearchParams)
  const [result, featuredAuthorDocumentCount] = await Promise.all([
    getReadyForLibraryDocuments(),
    getUniqueDocumentCountByAuthor(FEATURED_AUTHOR_NAME),
  ])
  const initialData = buildReadyForLibraryInitialData(result, initialQuery)

  return (
    <>
      <AuthorCountCard authorName={FEATURED_AUTHOR_NAME} count={featuredAuthorDocumentCount} />
      {result.total === 0 ? (
        <NoDataState message="No documents currently meet the dashboard-visible library eligibility criteria." />
      ) : (
        <ReadyForLibraryTable initialData={initialData} initialQuery={initialQuery} />
      )}
    </>
  )
}

export default function ReadyForLibraryPage({ searchParams }: ReadyForLibraryPageProps): ReactElement {
  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Ready for Library"
        title="Post-approval handoff inspection"
        description="Use this workspace to inspect approved documents with an access level before the next handoff. Metadata completeness is shown to support review, but this page does not confirm final Fedora readiness."
      />

      <ReadyForLibraryReadinessExplanation />

      <Suspense fallback={null}>
        <ReadyForLibraryContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
