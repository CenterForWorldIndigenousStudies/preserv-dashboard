import {
  ACCESS_LEVEL_OPTIONS,
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeTextFilter,
  type FilterOptions,
} from '@lib/search'
import { getNeedsReviewDocuments, type DocumentsQueryParams } from '@lib/queries'
import { DocumentsTable } from '@organisms/DocumentsTable'
import { ReviewQueuePageProps } from 'types/reviewQueue'

const REVIEW_QUEUE_FILTER_OPTIONS: FilterOptions = {
  collections: [],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: ['NEEDS_REVIEW'],
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

export async function ReviewQueueContent({ searchParams }: ReviewQueuePageProps) {
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
