import { Suspense } from 'react'
import { Stack } from '@mui/material'

import { DocumentsTable } from '@organisms/DocumentsTable'
import { PageHeader } from '@organisms/PageHeader'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeTextFilter,
  parseStatusesParam,
} from '@lib/search'
import { getAllDocuments, getDocumentFilterOptions, type DocumentsQueryParams } from '@lib/queries'
import { PAGE_LABELS } from '@constants/pageLabels'

export const dynamic = 'force-dynamic'

interface DocumentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseDocumentQueryParams(params: Record<string, string | string[] | undefined>): DocumentsQueryParams {
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
  const statuses = parseStatusesParam(params.statuses)
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

async function DocumentsContent({ searchParams }: DocumentsPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseDocumentQueryParams(resolvedSearchParams)
  const [initialData, filterOptions] = await Promise.all([getAllDocuments(initialQuery), getDocumentFilterOptions()])

  return <DocumentsTable initialData={initialData} initialQuery={initialQuery} filterOptions={filterOptions} />
}

export default function DocumentsPage({ searchParams }: DocumentsPageProps) {
  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.documents}
        title={PAGE_LABELS.documents}
        description="Use this canonical browse and discovery workspace to search, filter, and open documents across the preservation system."
      />

      <Suspense fallback={null}>
        <DocumentsContent searchParams={searchParams} />
      </Suspense>
    </Stack>
  )
}
