import type { DocumentTableQuery } from '@organisms/DocumentTable/types'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeTextFilter,
  parseStatusesParam,
  type AdvancedSearchFilters,
} from '@lib/search'

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseLibraryQueryParams(
  params: Record<string, string | string[] | undefined>,
): DocumentTableQuery<AdvancedSearchFilters> {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const sortDirection = firstSearchParam(params.sortDirection)
  const cursorDirection = firstSearchParam(params.cursorDirection)

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    search: normalizeTextFilter(firstSearchParam(params.search)),
    orderBy: firstSearchParam(params.orderBy),
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    cursorValue: normalizeTextFilter(firstSearchParam(params.cursorValue)),
    cursorId: normalizeTextFilter(firstSearchParam(params.cursorId)),
    cursorDirection: cursorDirection === 'prev' || cursorDirection === 'next' ? cursorDirection : undefined,
    filters: {
      author: normalizeTextFilter(firstSearchParam(params.author)),
      tag: normalizeTextFilter(firstSearchParam(params.tag)),
      statuses: parseStatusesParam(params.statuses),
      documentType: normalizeDocumentType(firstSearchParam(params.documentType)),
      batch: normalizeTextFilter(firstSearchParam(params.batch)),
      createdFrom: normalizeDateFilter(firstSearchParam(params.createdFrom)),
      createdTo: normalizeDateFilter(firstSearchParam(params.createdTo)),
      collection: normalizeTextFilter(firstSearchParam(params.collection)),
      accessLevel: normalizeAccessLevel(firstSearchParam(params.accessLevel)),
    },
  }
}
