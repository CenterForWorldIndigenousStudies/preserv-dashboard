import { Stack } from '@mui/material'

import { PageHeader } from '@organisms/PageHeader'
import { LibraryTable } from '@organisms/LibraryTable'
import type { DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { getDocumentFilterOptions, getLibraryDocuments, type DocumentsQueryParams } from '@lib/queries'
import type { AdvancedSearchFilters } from '@lib/search'
import { PAGE_LABELS } from '@constants/pageLabels'
import { parseLibraryQueryParams } from './query'
import type { LibraryDocumentItem, LibraryDocumentsPageResult } from 'types/documents'

export const dynamic = 'force-dynamic'

interface LibraryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function buildInitialData(result: LibraryDocumentsPageResult): DocumentTableFetchResult<LibraryDocumentItem> {
  return {
    data: result.items,
    totalCount: result.total,
    pageInfo: {
      pageSize: result.pageSize,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
      startCursor: result.startCursor,
      endCursor: result.endCursor,
    },
  }
}

function buildQueryParams(query: DocumentTableQuery<AdvancedSearchFilters>): DocumentsQueryParams {
  return {
    ...query.filters,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    orderBy: query.orderBy as DocumentsQueryParams['orderBy'],
    sortDirection: query.sortDirection,
    cursorValue: query.cursorValue,
    cursorId: query.cursorId,
    cursorDirection: query.cursorDirection,
  }
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseLibraryQueryParams(resolvedSearchParams)
  const [result, filterOptions] = await Promise.all([
    getLibraryDocuments(buildQueryParams(initialQuery)),
    getDocumentFilterOptions(),
  ])

  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.library}
        title={PAGE_LABELS.library}
        description="Documents that have successfully reached the library. The current document state is ingested_fedora."
      />
      <LibraryTable
        filterOptions={filterOptions}
        initialData={buildInitialData(result)}
        initialQuery={initialQuery}
      />
    </Stack>
  )
}
