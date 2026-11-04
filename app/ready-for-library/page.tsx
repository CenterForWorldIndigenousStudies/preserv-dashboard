import { Suspense, type ReactElement } from 'react'
import { Stack } from '@mui/material'
import Link from 'next/link'

import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { PageHeader } from '@organisms/PageHeader'
import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'
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
  'Why documents appear here': ['Validation status and latest document state are APPROVED.', 'An access level is set.'],
  'What to inspect before publishing': [
    'This page shows whether required Dublin Core fields are present: dc_title, dc_type, dc_subject, and dc_rights.',
    'Documents can still appear here when Metadata Complete is Incomplete.',
  ],
  'What this page does not confirm': [
    'The selected documents are published through a new Data Ingester batch followed by Fedora Ingester.',
    'Collection linkage, Fedora collection mapping, duplicate and review exclusions, and other ingest checks may still block handoff.',
    'Drive, Fedora, and Workbench conditions are still evaluated at execution time.',
  ],
}

function ReadyForLibraryReadinessExplanation(): ReactElement {
  return (
    <Stack spacing={1.5}>
      <NeedsReviewReasons value={READINESS_EXPLANATION_GROUPS} />
      <Link href={'https://github.com/CenterForWorldIndigenousStudies/preserv-pipeline/blob/main/documentation/dashboard/READY_FOR_LIBRARY_PUBLICATION.md'}>
        Ready for Library publication guide
      </Link>
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
        title={'Ready for Library'}
        description={
          'Select the documents you want to publish, then choose Actions > Publish to create a new Data Ingester and Fedora Ingester batch.'
        }
        infoTitle={'What this workspace tells you'}
        infoContent={<ReadyForLibraryReadinessExplanation />}
      />

      <Suspense fallback={null}>
        <ReadyForLibraryContent searchParams={searchParams} />
      </Suspense>
    </Stack>
  )
}
