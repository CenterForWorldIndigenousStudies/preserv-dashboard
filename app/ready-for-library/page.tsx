import { Suspense, type ReactElement } from 'react'
import { Stack } from '@mui/material'

import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
import { ReadyForLibraryHandoff } from '@organisms/ReadyForLibraryHandoff'
import type { DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { getDocumentFilterOptions } from '@lib/queries/queries'
import {
  getReadyForLibraryDocuments,
  parseReadyForLibraryQueryParams,
  type ReadyForLibrarySortField,
} from '@lib/queries/readyForLibraryQueries'
import type { AdvancedSearchFilters } from '@lib/search'
import { PAGE_LABELS } from '@constants/pageLabels'
import type { ReadyForLibraryItem } from 'types/documents'

export const dynamic = 'force-dynamic'

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

function ReadyForLibraryReadinessExplanation(): ReactElement {
  return (
    <Stack spacing={1.5}>
      <NeedsReviewReasons value={READINESS_EXPLANATION_GROUPS} />
    </Stack>
  )
}

interface ReadyForLibraryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function buildReadyForLibraryInitialData(
  result: { items: ReadyForLibraryItem[]; total: number },
  query: DocumentTableQuery<AdvancedSearchFilters>,
): DocumentTableFetchResult<ReadyForLibraryItem> {
  const offset = (query.page - 1) * query.pageSize
  return {
    data: result.items,
    totalCount: result.total,
    pageInfo: {
      pageSize: query.pageSize,
      hasNextPage: offset + result.items.length < result.total,
      hasPreviousPage: query.page > 1,
      startCursor: null,
      endCursor: null,
    },
  }
}

async function ReadyForLibraryContent({ searchParams }: ReadyForLibraryPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = parseReadyForLibraryQueryParams(resolvedSearchParams)
  const [result, filterOptions] = await Promise.all([
    getReadyForLibraryDocuments({
      ...initialQuery.filters,
      page: initialQuery.page,
      pageSize: initialQuery.pageSize,
      search: initialQuery.search,
      orderBy: initialQuery.orderBy as ReadyForLibrarySortField,
      sortDirection: initialQuery.sortDirection,
    }),
    getDocumentFilterOptions(),
  ])
  const initialData = buildReadyForLibraryInitialData(result, initialQuery)

  return (
      <ReadyForLibraryTable initialData={initialData} initialQuery={initialQuery} filterOptions={filterOptions} />
  )
}

export default function ReadyForLibraryPage({ searchParams }: ReadyForLibraryPageProps): ReactElement {
  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <PageHeader
        eyebrow={PAGE_LABELS.readyForLibrary}
        title={'Post-approval handoff inspection'}
        description={
          'Use this workspace to inspect approved documents with an access level and queue the downstream library handoff when the current review is complete. Metadata completeness is shown to support review, but runtime checks still apply.'
        }
        infoTitle={'What this workspace tells you'}
        infoContent={<ReadyForLibraryReadinessExplanation />}
      />

      <ReadyForLibraryHandoff />

      <Suspense fallback={null}>
        <ReadyForLibraryContent searchParams={searchParams} />
      </Suspense>
    </Stack>
  )
}
