import fs from 'node:fs'
import path from 'node:path'
import { Suspense, type ReactElement } from 'react'
import { Box, Stack } from '@mui/material'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

const PUBLICATION_GUIDE = 'READY_FOR_LIBRARY_PUBLICATION.md'
const DASHBOARD_DOCS_URL =
  'https://github.com/CenterForWorldIndigenousStudies/preserv-pipeline/blob/main/documentation/dashboard/'

const guideComponents: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h3>{children}</h3>,
  a: ({ href, children }) => (
    <a href={href?.startsWith('http') ? href : href ? `${DASHBOARD_DOCS_URL}${href}` : undefined}>{children}</a>
  ),
}

function readPublicationGuide(): string {
  let filePath = path.join(process.cwd(), '../../documentation/dashboard', PUBLICATION_GUIDE)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), PUBLICATION_GUIDE)
  }

  return fs.readFileSync(filePath, 'utf-8').replace(/^Keywords:.*\r?\n/m, '')
}

function ReadyForLibraryReadinessExplanation(): ReactElement {
  return (
    <Stack spacing={1.5}>
      <NeedsReviewReasons value={READINESS_EXPLANATION_GROUPS} />
      <Box
        component={'section'}
        sx={{
          '& h2, & h3': { color: 'text.primary', mb: 1.5, mt: 2 },
          '& p, & li': { color: 'text.primary', lineHeight: 1.6 },
          '& a': { color: 'primary.main' },
          '& ul': { listStyleType: 'disc', pl: 3 },
          '& ol': { listStyleType: 'decimal', pl: 3 },
          '& li': { mb: 0.75 },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={guideComponents}>
          {readPublicationGuide()}
        </ReactMarkdown>
      </Box>
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

  return <ReadyForLibraryTable initialData={initialData} initialQuery={initialQuery} filterOptions={filterOptions} />
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
