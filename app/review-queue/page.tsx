import { Suspense } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { READY_FOR_LIBRARY_PATH } from '@constants/paths'
import { REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES } from '@constants/reviewQueue'
import { ActionCard } from '@molecules/ActionCard'
import { DocumentsTable } from '@organisms/DocumentsTable'
import { PageHeader } from '@organisms/PageHeader'
import {
  OVERVIEW_ACCESS_LEVEL_OPTIONS,
  normalizeOverviewAccessLevel,
  normalizeOverviewDateFilter,
  normalizeOverviewDocumentType,
  parseOverviewStatusesParam,
  normalizeOverviewTextFilter,
  type OverviewFilterOptions,
  type OverviewStatusOption,
} from '@lib/overviewSearch'
import { getNeedsReviewDocuments, type DocumentsQueryParams } from '@lib/queries'

export const dynamic = 'force-dynamic'

const REVIEW_QUEUE_FILTER_OPTIONS: OverviewFilterOptions = {
  collections: [],
  accessLevels: [...OVERVIEW_ACCESS_LEVEL_OPTIONS],
  statuses: [...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES],
}

function normalizeReviewQueueStatuses(statuses: OverviewStatusOption[] | undefined): OverviewStatusOption[] {
  const allowedStatuses = new Set<string>(REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES)
  const filteredStatuses = statuses?.filter((status) => allowedStatuses.has(status)) ?? []

  return filteredStatuses.length > 0 ? filteredStatuses : [...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES]
}

interface ReviewQueuePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseReviewQueueQueryParams(params: Record<string, string | string[] | undefined>): DocumentsQueryParams {
  const page = Number(firstSearchParam(params.page))
  const pageSize = Number(firstSearchParam(params.pageSize))
  const orderBy = firstSearchParam(params.orderBy) as DocumentsQueryParams['orderBy']
  const sortDirection = firstSearchParam(params.sortDirection) as DocumentsQueryParams['sortDirection']
  const search = normalizeOverviewTextFilter(firstSearchParam(params.search))
  const tag = normalizeOverviewTextFilter(firstSearchParam(params.tag))
  const batch = normalizeOverviewTextFilter(firstSearchParam(params.batch))
  const collection = normalizeOverviewTextFilter(firstSearchParam(params.collection))
  const createdFrom = normalizeOverviewDateFilter(firstSearchParam(params.createdFrom))
  const createdTo = normalizeOverviewDateFilter(firstSearchParam(params.createdTo))
  const accessLevel = normalizeOverviewAccessLevel(firstSearchParam(params.accessLevel))
  const documentType = normalizeOverviewDocumentType(firstSearchParam(params.documentType))
  const statuses = normalizeReviewQueueStatuses(parseOverviewStatusesParam(params.statuses))
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

async function ReviewQueueContent({ searchParams }: ReviewQueuePageProps) {
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
      defaultStatuses={[...REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES]}
      serverDriven
    />
  )
}

export default function ReviewQueuePage({ searchParams }: ReviewQueuePageProps) {
  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Review Queue"
        title="Documents needing review."
        description="Use this human judgment workspace to review documents that need a deliberate approve or reject decision before they move forward."
      />

      <Stack
        component="section"
        spacing={2}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '1.5rem',
          bgcolor: 'background.paper',
          p: 3,
        }}
      >
        <Box>
          <Typography component="h2" variant="h5" sx={{ color: 'text.primary' }}>
            Review decisions and next step
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Review Queue is where human judgment happens. Approve and reject decisions happen here, and approved work
            continues to Ready for Library as the next operational checkpoint.
          </Typography>
        </Box>

        <ActionCard
          href={READY_FOR_LIBRARY_PATH}
          eyebrow="Next Operational Checkpoint"
          title="Ready for Library"
          description="Open the standalone readiness workspace for approved documents before handoff."
          label="Open Ready for Library"
        />
      </Stack>

      <Suspense fallback={null}>
        <ReviewQueueContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
