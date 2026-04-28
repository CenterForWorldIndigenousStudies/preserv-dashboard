import { Suspense } from 'react'
import { DocumentsTable } from '@organisms/DocumentsTable'
import { getAllDocuments, type DocumentsQueryParams } from '@lib/queries'

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
  const search = firstSearchParam(params.search)
  const cursorValue = firstSearchParam(params.cursorValue)
  const cursorId = firstSearchParam(params.cursorId)
  const cursorDirection = firstSearchParam(params.cursorDirection) as DocumentsQueryParams['cursorDirection']

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    orderBy,
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    search: search?.trim() ? search : undefined,
    cursorValue: cursorValue?.trim() ? cursorValue : undefined,
    cursorId: cursorId?.trim() ? cursorId : undefined,
    cursorDirection: cursorDirection === 'prev' ? 'prev' : cursorDirection === 'next' ? 'next' : undefined,
  }
}

async function OverviewContent({ searchParams }: OverviewPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseOverviewQueryParams(resolvedSearchParams)
  const initialData = await getAllDocuments(initialQuery)
  return <DocumentsTable initialData={initialData} initialQuery={initialQuery} />
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
