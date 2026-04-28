import { Suspense } from 'react'
import { DocumentsTable } from '@organisms/DocumentsTable'
import {
  normalizeOverviewAccessLevel,
  normalizeOverviewDateFilter,
  normalizeOverviewDocumentType,
  normalizeOverviewTextFilter,
  parseOverviewStatusesParam,
} from '@lib/overview-search'
import { getAllDocuments, getOverviewFilterOptions, type DocumentsQueryParams } from '@lib/queries'

export const dynamic = 'force-dynamic'

interface OverviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseOverviewQueryParams(
  params: Record<string, string | string[] | undefined>,
): DocumentsQueryParams {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const orderBy = firstSearchParam(params.orderBy) as DocumentsQueryParams['orderBy']
  const sortDirection = firstSearchParam(params.sortDirection) as DocumentsQueryParams['sortDirection']
  const search = normalizeOverviewTextFilter(firstSearchParam(params.search))
  const batch = normalizeOverviewTextFilter(firstSearchParam(params.batch))
  const collection = normalizeOverviewTextFilter(firstSearchParam(params.collection))
  const createdFrom = normalizeOverviewDateFilter(firstSearchParam(params.createdFrom))
  const createdTo = normalizeOverviewDateFilter(firstSearchParam(params.createdTo))
  const accessLevel = normalizeOverviewAccessLevel(firstSearchParam(params.accessLevel))
  const documentType = normalizeOverviewDocumentType(firstSearchParam(params.documentType))
  const statuses = parseOverviewStatusesParam(params.statuses)
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

async function OverviewContent({ searchParams }: OverviewPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseOverviewQueryParams(resolvedSearchParams)
  const [initialData, filterOptions] = await Promise.all([
    getAllDocuments(initialQuery),
    getOverviewFilterOptions(),
  ])

  return <DocumentsTable initialData={initialData} initialQuery={initialQuery} filterOptions={filterOptions} />
}

export default function OverviewPage({ searchParams }: OverviewPageProps) {
  return (
    <div className="w-full">
      <Suspense fallback={null}>
        <OverviewContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
