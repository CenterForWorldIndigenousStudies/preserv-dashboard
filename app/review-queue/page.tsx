import { Suspense } from 'react'
import { Stack } from '@mui/material'
import { REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES } from '@constants/reviewQueue'
import { DocumentsTable } from '@organisms/DocumentsTable'
import { PageHeader } from '@organisms/PageHeader'
import {
  ACCESS_LEVEL_OPTIONS,
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeTextFilter,
  parseStatusesParam,
  type FilterOptions,
  type StatusOption,
} from '@lib/search'
import {
  getNeedsReviewDocuments,
  getNeedsReviewDocumentsCount,
  getReadyForLibraryDocuments,
  type DocumentsQueryParams,
} from '@lib/queries/queries'
import { PAGE_LABELS } from '@constants/pageLabels'

import { ReviewQueueTabbedWorkspace } from './ReviewQueueTabbedWorkspace'

export const dynamic = 'force-dynamic'

const REVIEW_QUEUE_FILTER_OPTIONS: FilterOptions = {
  collections: [],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: [...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES],
}

function normalizeReviewQueueStatuses(statuses: StatusOption[] | undefined): StatusOption[] {
  const allowedStatuses = new Set<string>(REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES)
  const filteredStatuses = statuses?.filter((status) => allowedStatuses.has(status)) ?? []

  return filteredStatuses.length > 0 ? filteredStatuses : [...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES]
}

interface ReviewQueuePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseReviewQueueQueryParams(params: Record<string, string | string[] | undefined>): DocumentsQueryParams {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const orderBy = firstSearchParam(params.orderBy) as DocumentsQueryParams['orderBy']
  const sortDirection = firstSearchParam(params.sortDirection) as DocumentsQueryParams['sortDirection']
  const search = normalizeTextFilter(firstSearchParam(params.search))
  const tag = normalizeTextFilter(firstSearchParam(params.tag))
  const batch = normalizeTextFilter(firstSearchParam(params.batch))
  const collection = normalizeTextFilter(firstSearchParam(params.collection))
  const createdFrom = normalizeDateFilter(firstSearchParam(params.createdFrom))
  const createdTo = normalizeDateFilter(firstSearchParam(params.createdTo))
  const accessLevel = normalizeAccessLevel(firstSearchParam(params.accessLevel))
  const documentType = normalizeDocumentType(firstSearchParam(params.documentType))
  const statuses = normalizeReviewQueueStatuses(parseStatusesParam(params.statuses))
  const cursorValue = firstSearchParam(params.cursorValue)
  const cursorId = firstSearchParam(params.cursorId)
  const cursorDirection = firstSearchParam(params.cursorDirection) as DocumentsQueryParams['cursorDirection']

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50,
    orderBy,
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    search,
    author: search,
    tag,
    statuses,
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
      variant={'reviewQueue'}
      defaultStatuses={[...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES]}
      serverDriven
    />
  )
}

export default async function ReviewQueuePage({ searchParams }: ReviewQueuePageProps) {
  const [needsReviewCount, readyForLibraryResult] = await Promise.all([
    getNeedsReviewDocumentsCount({
      statuses: [...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES],
    }),
    getReadyForLibraryDocuments(),
  ])

  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.reviewQueue}
        title={'Documents needing review.'}
        description={
          'Use this human judgment workspace to review documents that need a deliberate approve or reject decision before they move forward.'
        }
      />

      <Suspense fallback={null}>
        <ReviewQueueTabbedWorkspace
          needsReviewCount={needsReviewCount}
          readyForLibraryCount={readyForLibraryResult.total}
          needsReviewPanel={<ReviewQueueContent searchParams={searchParams} />}
        />
      </Suspense>
    </Stack>
  )
}
