import { Suspense } from 'react'
import { DocumentsTable } from '@organisms/DocumentsTable'
import { PageHeader } from '@organisms/PageHeader'
import {
  OVERVIEW_ACCESS_LEVEL_OPTIONS,
  normalizeOverviewAccessLevel,
  normalizeOverviewDateFilter,
  normalizeOverviewDocumentType,
  normalizeOverviewTextFilter,
  type OverviewFilterOptions,
} from '@lib/overview-search'
import { getNeedsReviewDocuments, type DocumentsQueryParams } from '@lib/queries'

export const dynamic = 'force-dynamic'

const REVIEW_QUEUE_FILTER_OPTIONS: OverviewFilterOptions = {
  collections: [],
  accessLevels: [...OVERVIEW_ACCESS_LEVEL_OPTIONS],
  statuses: ['NEEDS_REVIEW'],
}

interface ReviewQueuePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseReviewQueueQueryParams(
  params: Record<string, string | string[] | undefined>,
): DocumentsQueryParams {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const orderBy = firstSearchParam(params.orderBy) as DocumentsQueryParams['orderBy']
  const sortDirection = firstSearchParam(params.sortDirection) as DocumentsQueryParams['sortDirection']
  const search = normalizeOverviewTextFilter(firstSearchParam(params.search))
  const tag = normalizeOverviewTextFilter(firstSearchParam(params.tag))
  const batch = normalizeOverviewTextFilter(firstSearchParam(params.batch))
  const collection = normalizeOverviewTextFilter(firstSearchParam(params.collection))
  const createdFrom = normalizeOverviewDateFilter(firstSearchParam(params.createdFrom))
  const createdTo = normalizeOverviewDateFilter(firstSearchParam(params.createdTo))
  const accessLevel = normalizeOverviewAccessLevel(firstSearchParam(params.accessLevel))
  const documentType = normalizeOverviewDocumentType(firstSearchParam(params.documentType))
  const cursorValue = firstSearchParam(params.cursorValue)
  const cursorId = firstSearchParam(params.cursorId)
  const cursorDirection = firstSearchParam(params.cursorDirection) as DocumentsQueryParams['cursorDirection']

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    orderBy,
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    search,
    author: search,
    tag,
    statuses: ['NEEDS_REVIEW'],
    documentType,
    batch,
    createdFrom,
    createdTo,
    collection,
    accessLevel,
    cursorValue: cursorValue?.trim() ? cursorValue : undefined,
    cursorId: cursorId?.trim() ? cursorId : undefined,
    cursorDirection: cursorDirection === 'prev' ? 'prev' : cursorDirection === 'next' ? 'next' : undefined,
  }
}

async function ReviewQueueContent({ searchParams }: ReviewQueuePageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseReviewQueueQueryParams(resolvedSearchParams)
  const initialData = await getNeedsReviewDocuments(initialQuery)
  const tableKey = JSON.stringify(initialQuery)

  return (
    <DocumentsTable
      key={tableKey}
      initialData={initialData}
      initialQuery={initialQuery}
      filterOptions={REVIEW_QUEUE_FILTER_OPTIONS}
      variant="reviewQueue"
      fixedStatuses={['NEEDS_REVIEW']}
      serverDriven
    />
  )
}

export default function ReviewQueuePage({ searchParams }: ReviewQueuePageProps) {
  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Review Queue"
        title="Documents needing review."
        description="This queue only shows documents whose validation_status is NEEDS_REVIEW."
      />

      <Suspense fallback={null}>
        <ReviewQueueContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
