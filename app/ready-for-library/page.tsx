import { Suspense, type ReactElement } from 'react'
import { Card, CardContent, Stack, Typography } from '@mui/material'

import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
import { ReadyForLibraryHandoff } from '@organisms/ReadyForLibraryHandoff'
import type { DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { getDocumentFilterOptions, getReadyForLibraryDocuments, type DocumentsQueryParams } from '@lib/queries'
import { getUniqueDocumentCountByAuthor } from '@lib/readyForLibraryAuthorMetrics'
import type { AdvancedSearchFilters } from '@lib/search'
import { parseReadyForLibraryQueryParams } from './query'
import { PAGE_LABELS } from '@constants/pageLabels'
import type { ReadyForLibraryItem } from 'types/documents'

export const dynamic = 'force-dynamic'

const FEATURED_AUTHOR_NAME = 'Ryser, Rudolph C.'

const READINESS_EXPLANATION_GROUPS = {
  'Why documents appear here': ['Validation status is APPROVED.', 'An access level is set.'],
  'What to inspect before handoff': [
    'This page shows whether required Dublin Core fields are present: dc_title, dc_type, dc_subject, and dc_rights.',
    'Documents can still appear here when Metadata Complete is Incomplete.',
  ],
  'What this page does not confirm': [
    'This page does not confirm final library handoff readiness until the handoff is queued and completes.',
    'Collection linkage, Fedora collection mapping, duplicate and review exclusions, and other ingest checks may still block handoff.',
    'Drive, Fedora, and Workbench conditions are still evaluated at execution time.',
  ],
}

function AuthorCountCard({ authorName, count }: { authorName: string; count: number }) {
  return (
    <Card component="section" sx={{ border: '1px solid', borderColor: 'rgba(53, 88, 52, 0.15)' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: '0.15em', textTransform: 'uppercase' }}
        >
          Featured author
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.primary', mt: 1 }}>
          {authorName}
        </Typography>
        <Typography component="p" variant="h3" sx={{ color: 'text.primary', mt: 1.5 }}>
          {count}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Unique documents linked to this author
        </Typography>
      </CardContent>
    </Card>
  )
}

function ReadyForLibraryReadinessExplanation() {
  return (
    <Stack component="section" spacing={1.5} aria-labelledby="ready-for-library-readiness-explanation">
      <Typography
        id="ready-for-library-readiness-explanation"
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}
      >
        What this workspace tells you
      </Typography>
      <NeedsReviewReasons value={READINESS_EXPLANATION_GROUPS} />
    </Stack>
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

function buildReadyForLibraryInitialData(
  result: { items: ReadyForLibraryItem[]; total: number },
  query: DocumentTableQuery<AdvancedSearchFilters>,
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
  const [result, filterOptions, featuredAuthorDocumentCount] = await Promise.all([
    getReadyForLibraryDocuments({
      ...initialQuery.filters,
      page: initialQuery.page,
      pageSize: initialQuery.pageSize,
      search: initialQuery.search,
      orderBy: initialQuery.orderBy as DocumentsQueryParams['orderBy'],
      sortDirection: initialQuery.sortDirection,
    }),
    getDocumentFilterOptions(),
    getUniqueDocumentCountByAuthor(FEATURED_AUTHOR_NAME),
  ])
  const initialData = buildReadyForLibraryInitialData(result, initialQuery)

  return (
    <>
      <AuthorCountCard authorName={FEATURED_AUTHOR_NAME} count={featuredAuthorDocumentCount} />
      <ReadyForLibraryTable initialData={initialData} initialQuery={initialQuery} filterOptions={filterOptions} />
    </>
  )
}

export default function ReadyForLibraryPage({ searchParams }: ReadyForLibraryPageProps): ReactElement {
  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.readyForLibrary}
        title="Post-approval handoff inspection"
        description="Use this workspace to inspect approved documents with an access level and queue the downstream library handoff when the current review is complete. Metadata completeness is shown to support review, but runtime checks still apply."
      />

      <ReadyForLibraryReadinessExplanation />

      <ReadyForLibraryHandoff />

      <Suspense fallback={null}>
        <ReadyForLibraryContent searchParams={searchParams} />
      </Suspense>
    </Stack>
  )
}
