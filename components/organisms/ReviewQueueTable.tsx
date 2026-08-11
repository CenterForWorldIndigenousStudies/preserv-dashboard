'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { MRT_ColumnDef, MRT_RowSelectionState, MRT_Updater } from 'material-react-table'
import { useRouter } from 'next/navigation'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { Button } from '@atoms/Button'
import { DateAtom } from '@atoms/Date'
import { getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import {
  buildDefaultReviewQueueChecklistState,
  type ReviewQueueChecklistItemKey,
  type ReviewQueueChecklistState,
} from '@constants/reviewQueueChecklist'
import { useOverviewTableState } from '@hooks/useOverviewTableState'
import { type AdvancedSearchFilters, type FilterOptions, type StatusOption } from '@lib/search'
import type { DocumentsQueryParams } from '@lib/queries/queries'
import type { Document } from 'types/documents'
import type { DocumentsPageResult } from 'types/pagination'
import type { ReviewQueueDecision } from 'types/reviewQueue'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { NeedsReviewReasonsPopover } from '@molecules/NeedsReviewReasonsPopover'
import { ReviewQueueCommentsPopover } from '@molecules/ReviewQueueCommentsPopover'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import {
  ReviewQueueChecklistPanel,
} from '@organisms/ReviewQueueChecklistPanel'
import type { DocumentTableConfig } from '@organisms/DocumentTable/types'

const REVIEW_QUEUE_SELECTION_STORAGE_PREFIX = 'rq-row-selection'

interface ReviewQueueTableProps {
  initialData?: DocumentsPageResult
  initialQuery?: DocumentsQueryParams
  filterOptions: FilterOptions
  fixedStatuses?: StatusOption[]
  defaultStatuses?: StatusOption[]
}

interface ReviewQueueSelectionProps {
  enableRowSelection: boolean
  rowSelection?: MRT_RowSelectionState
  onRowSelectionChange?: (updater: MRT_Updater<MRT_RowSelectionState>) => void
  excludedRowIds?: readonly string[]
}

interface ReviewQueueBatchApproveButtonProps {
  batchApprovePending: boolean
  selectedCount: number
  onApprove: () => void
}

function getReviewQueueSelectionKey(queryKey: string): string {
  return `${REVIEW_QUEUE_SELECTION_STORAGE_PREFIX}:${queryKey}`
}

function saveReviewQueueSelection(queryKey: string, selection: MRT_RowSelectionState): void {
  try {
    sessionStorage.setItem(getReviewQueueSelectionKey(queryKey), JSON.stringify(selection))
  } catch {
    // Silent fail if storage is unavailable.
  }
}

function restoreReviewQueueSelection(queryKey: string): MRT_RowSelectionState {
  try {
    const stored = sessionStorage.getItem(getReviewQueueSelectionKey(queryKey))
    return stored ? (JSON.parse(stored) as MRT_RowSelectionState) : {}
  } catch {
    return {}
  }
}

function restoreScrollPosition(savedPosition: number): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPosition, behavior: 'auto' })
    })
  })
}

function getValidationStatusBadgeVariant(status: string | null | undefined): BadgeVariant {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'VALIDATED':
      return 'success'
    case 'NEEDS_REVIEW':
    case 'FORMAT_ERRORS':
    case 'GENERAL_ERRORS':
    case 'METADATA_ISSUES':
    case 'REJECTED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function normalizeReviewQueueComment(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}

function buildReviewQueueColumns(params: {
  preservedOverviewHref: string
  getChecklistState: (document: Document) => ReviewQueueChecklistState
  onToggleChecklistItem: (
    documentId: string,
    itemKey: ReviewQueueChecklistItemKey,
    completed: boolean,
    previousState: ReviewQueueChecklistState,
  ) => void
}): MRT_ColumnDef<Document>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Document',
      size: 420,
      Cell: ({ row: { original } }) => (
        <EntityNameBlock
          name={original.name}
          id={original.id}
          legacyId={original.id_legacy}
          sourceId={original.source_id}
          href={getDocumentDetailPath(original.id, params.preservedOverviewHref, PAGE_LABELS.reviewQueue)}
        />
      ),
    },
    {
      accessorKey: 'validation_status',
      header: 'Validation Status',
      size: 190,
      enableSorting: false,
      Cell: ({ row: { original } }) => {
        const reviewReasons = original.needs_review_reasons ?? []
        const statusLabel = original.validation_status ?? (reviewReasons.length > 0 ? 'Review' : null)

        if (!statusLabel) {
          return (
            <Typography variant={'body2'} color={'text.secondary'}>
              {'-'}
            </Typography>
          )
        }

        const statusBadge = <Badge variant={getValidationStatusBadgeVariant(original.validation_status)}>{statusLabel}</Badge>

        if (reviewReasons.length === 0) {
          return statusBadge
        }

        return (
          <NeedsReviewReasonsPopover
            documentId={original.id}
            groups={reviewReasons}
            trigger={statusBadge}
            triggerLabel={`View review reasons for document ${original.id}`}
          />
        )
      },
    },
    {
      id: 'review_details',
      header: 'Review Details',
      size: 220,
      enableSorting: false,
      Cell: ({ row: { original } }) => {
        const validatorName = original.validator_name?.trim()
        const hasComments = Boolean(
          normalizeReviewQueueComment(original.validation_comment) ||
            normalizeReviewQueueComment(original.validation_comment_additional),
        )
        const reviewCommentsPill = hasComments ? <Badge variant={'neutral'}>{'Comments'}</Badge> : null
        const reviewContext = reviewCommentsPill ? (
          <ReviewQueueCommentsPopover
            documentId={original.id}
            comment={original.validation_comment}
            additionalComment={original.validation_comment_additional}
            trigger={reviewCommentsPill}
          />
        ) : null

        return (
          <Stack spacing={0.5}>
            {original.validation_timestamp ? (
              <DateAtom
                value={original.validation_timestamp}
                sx={{ color: 'text.secondary', fontSize: '0.75rem', alignSelf: 'flex-start' }}
              />
            ) : null}
            {validatorName ? <Typography variant={'body2'}>{validatorName}</Typography> : null}
            {reviewContext}
            {!original.validation_timestamp && !validatorName && !hasComments ? (
              <Typography variant={'body2'} color={'text.secondary'}>
                {'-'}
              </Typography>
            ) : null}
          </Stack>
        )
      },
    },
    {
      id: 'validation_checklist',
      header: 'Checklist',
      size: 150,
      enableSorting: false,
      Cell: ({ row: { original } }) => (
        <ReviewQueueChecklistPanel
          documentId={original.id}
          checklistState={params.getChecklistState(original)}
          onToggle={(itemKey) => {
            const checklistState = params.getChecklistState(original)
            params.onToggleChecklistItem(original.id, itemKey, !checklistState[itemKey], checklistState)
          }}
        />
      ),
    },
  ]
}

async function fetchReviewQueueTablePage(params: DocumentsQueryParams): Promise<DocumentsPageResult> {
  const { getNeedsReviewDocumentsAction } = await import('@actions/review-queue')
  return getNeedsReviewDocumentsAction(params)
}

async function applyReviewQueueDecisionForDocument(
  documentId: string,
  decision: ReviewQueueDecision,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { applyReviewQueueDecisionAction } = await import('@actions/review-queue')
  return applyReviewQueueDecisionAction(documentId, decision)
}

async function updateReviewQueueChecklistForDocument(
  documentId: string,
  itemKey: ReviewQueueChecklistItemKey,
  completed: boolean,
): Promise<
  | { ok: true; checklist: ReviewQueueChecklistState }
  | { ok: false; error: string }
> {
  const { updateReviewQueueChecklistAction } = await import('@actions/review-queue')
  return updateReviewQueueChecklistAction(documentId, itemKey, completed)
}

async function applyReviewQueueBatchApproveForDocuments(documentIds: string[]) {
  const { applyReviewQueueBatchApproveAction } = await import('@actions/review-queue')
  return applyReviewQueueBatchApproveAction(documentIds)
}

function getReviewQueueSelectionProps(
  reviewQueueRowSelection: MRT_RowSelectionState,
  setReviewQueueRowSelection: (updater: MRT_Updater<MRT_RowSelectionState>) => void,
  optimisticallyHiddenDocumentIds: string[],
): ReviewQueueSelectionProps {
  return {
    enableRowSelection: true,
    rowSelection: reviewQueueRowSelection,
    onRowSelectionChange: setReviewQueueRowSelection,
    excludedRowIds: optimisticallyHiddenDocumentIds,
  }
}

function getReviewQueueBatchApproveButton({
  batchApprovePending,
  selectedCount,
  onApprove,
}: ReviewQueueBatchApproveButtonProps): ReactElement {
  return (
    <Button
      variant={'secondary'}
      size={'sm'}
      loading={batchApprovePending}
      disabled={batchApprovePending || selectedCount === 0}
      onClick={onApprove}
    >
      {`Approve selected (${selectedCount})`}
    </Button>
  )
}

export function ReviewQueueTable({
  initialData,
  initialQuery,
  filterOptions,
  fixedStatuses,
  defaultStatuses,
}: ReviewQueueTableProps): ReactElement {
  const router = useRouter()
  const resolveStatuses = (nextStatuses: StatusOption[] | undefined): StatusOption[] | undefined => {
    if (fixedStatuses?.length) {
      return fixedStatuses
    }

    if (nextStatuses?.length) {
      return nextStatuses
    }

    return defaultStatuses?.length ? defaultStatuses : undefined
  }
  const {
    accessLevel,
    batch,
    collection,
    createdFrom,
    createdTo,
    documentType,
    globalFilter,
    pathname,
    page,
    pageSize,
    queryParams,
    searchParams,
    statuses,
    tag,
    setGlobalFilter,
    setOverviewFilters,
    setPageSize,
    setSorting,
    sorting,
    goToNextPage,
    goToPreviousPage,
  } = useOverviewTableState(initialQuery)
  const effectiveStatuses = resolveStatuses(statuses)
  const effectiveQueryParams = useMemo<DocumentsQueryParams>(
    () => ({ ...queryParams, statuses: effectiveStatuses }),
    [effectiveStatuses, queryParams],
  )
  const [activeDecision, setActiveDecision] = useState<{ documentId: string; decision: ReviewQueueDecision } | null>(null)
  const [reviewQueueRowSelection, setReviewQueueRowSelection] = useState<MRT_RowSelectionState>({})
  const [batchApprovePending, setBatchApprovePending] = useState(false)
  const [optimisticallyHiddenDocumentIds, setOptimisticallyHiddenDocumentIds] = useState<string[]>([])
  const [reviewQueueChecklistByDocumentId, setReviewQueueChecklistByDocumentId] = useState<
    Record<string, ReviewQueueChecklistState>
  >({})
  const [toastState, setToastState] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const preservedOverviewHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])
  const currentFilters: AdvancedSearchFilters = useMemo(
    () => ({
      author: globalFilter || undefined,
      tag: tag || undefined,
      statuses: effectiveStatuses ?? [],
      documentType,
      batch: batch || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      collection: collection || undefined,
      accessLevel,
    }),
    [accessLevel, batch, collection, createdFrom, createdTo, documentType, effectiveStatuses, globalFilter, tag],
  )
  const reviewQueueQueryKey = useMemo(() => JSON.stringify(effectiveQueryParams), [effectiveQueryParams])
  const selectedReviewQueueDocumentIds = useMemo(
    () =>
      Object.entries(reviewQueueRowSelection)
        .filter(([, isSelected]) => isSelected)
        .map(([documentId]) => documentId),
    [reviewQueueRowSelection],
  )
  const reviewQueueSelectionProps = useMemo(
    () =>
      getReviewQueueSelectionProps(
        reviewQueueRowSelection,
        setReviewQueueRowSelection,
        optimisticallyHiddenDocumentIds,
      ),
    [optimisticallyHiddenDocumentIds, reviewQueueRowSelection],
  )

  useEffect(() => {
    const restored = restoreReviewQueueSelection(reviewQueueQueryKey)
    setReviewQueueRowSelection(restored)
  }, [reviewQueueQueryKey])

  useEffect(() => {
    saveReviewQueueSelection(reviewQueueQueryKey, reviewQueueRowSelection)
  }, [reviewQueueQueryKey, reviewQueueRowSelection])

  function getReviewQueueChecklistState(document: Document): ReviewQueueChecklistState {
    return reviewQueueChecklistByDocumentId[document.id] ?? document.review_checklist ?? buildDefaultReviewQueueChecklistState()
  }

  function toggleReviewQueueChecklistItem(
    documentId: string,
    itemKey: ReviewQueueChecklistItemKey,
    completed: boolean,
    previousState: ReviewQueueChecklistState,
  ): void {
    const nextState = { ...previousState, [itemKey]: completed }
    setReviewQueueChecklistByDocumentId((currentState) => ({
      ...currentState,
      [documentId]: nextState,
    }))

    void updateReviewQueueChecklistForDocument(documentId, itemKey, completed).then((result) => {
      if (result.ok) {
        setReviewQueueChecklistByDocumentId((currentState) => ({
          ...currentState,
          [documentId]: result.checklist,
        }))
        return
      }

      setReviewQueueChecklistByDocumentId((currentState) => ({
        ...currentState,
        [documentId]: previousState,
      }))
      setToastState({ open: true, message: result.error, severity: 'error' })
    })
  }

  async function handleReviewDecision(documentId: string, decision: ReviewQueueDecision): Promise<void> {
    setActiveDecision({ documentId, decision })
    const scrollPos = window.scrollY

    try {
      const result = await applyReviewQueueDecisionForDocument(documentId, decision)

      if (!result.ok) {
        setToastState({ open: true, message: result.error, severity: 'error' })
        return
      }

      setToastState({ open: true, message: result.message, severity: 'success' })
      router.refresh()
      restoreScrollPosition(scrollPos)
    } catch (error: unknown) {
      setToastState({
        open: true,
        message: error instanceof Error ? error.message : 'The review decision could not be saved.',
        severity: 'error',
      })
    } finally {
      setActiveDecision(null)
    }
  }

  async function handleBatchApprove(): Promise<void> {
    if (selectedReviewQueueDocumentIds.length === 0) {
      return
    }

    setBatchApprovePending(true)
    const scrollPos = window.scrollY

    try {
      const result = await applyReviewQueueBatchApproveForDocuments(selectedReviewQueueDocumentIds)

      if (result.approvedIds.length > 0) {
        setOptimisticallyHiddenDocumentIds((currentIds) => [...new Set([...currentIds, ...result.approvedIds])])
        setReviewQueueRowSelection({})
      }

      if (!result.ok) {
        setToastState({ open: true, message: result.error, severity: 'error' })
        return
      }

      setToastState({
        open: true,
        message:
          result.failed.length > 0
            ? `${result.message} Failed IDs: ${result.failed.map((failure) => failure.documentId).join(', ')}.`
            : result.message,
        severity: 'success',
      })
      router.refresh()
      restoreScrollPosition(scrollPos)
    } catch (error: unknown) {
      setToastState({
        open: true,
        message: error instanceof Error ? error.message : 'The selected documents could not be approved.',
        severity: 'error',
      })
    } finally {
      setBatchApprovePending(false)
    }
  }

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () =>
      buildReviewQueueColumns({
        preservedOverviewHref,
        getChecklistState: getReviewQueueChecklistState,
        onToggleChecklistItem: toggleReviewQueueChecklistItem,
      }),
    [preservedOverviewHref, reviewQueueChecklistByDocumentId],
  )
  const tableConfig: DocumentTableConfig<Document, AdvancedSearchFilters> = {
    definition: {
      tableId: 'review-queue-documents',
      columns,
      fetcher: async (query) =>
        fetchReviewQueueTablePage({
          page: query.page,
          pageSize: query.pageSize,
          orderBy: query.orderBy as DocumentsQueryParams['orderBy'],
          sortDirection: query.sortDirection,
          search: query.search,
          author: query.filters.author ?? query.search,
          tag: query.filters.tag,
          statuses: resolveStatuses(query.filters.statuses),
          documentType: query.filters.documentType,
          batch: query.filters.batch,
          createdFrom: query.filters.createdFrom,
          createdTo: query.filters.createdTo,
          collection: query.filters.collection,
          accessLevel: query.filters.accessLevel,
          cursorValue: query.cursorValue,
          cursorId: query.cursorId,
          cursorDirection: query.cursorDirection,
        }),
    },
    rowActions: [
      {
        id: 'review-decisions',
        render: ({ row }) => {
          const isApprovePending = activeDecision?.documentId === row.id && activeDecision.decision === 'APPROVED'
          const isRejectPending = activeDecision?.documentId === row.id && activeDecision.decision === 'REJECTED'
          const isPending = isApprovePending || isRejectPending || batchApprovePending

          return (
            <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                variant={'secondary'}
                size={'sm'}
                loading={isApprovePending}
                disabled={isPending}
                onClick={() => {
                  void handleReviewDecision(row.id, 'APPROVED')
                }}
              >
                {'Approve'}
              </Button>
              <Button
                variant={'ghost'}
                size={'sm'}
                loading={isRejectPending}
                disabled={isPending}
                onClick={() => {
                  void handleReviewDecision(row.id, 'REJECTED')
                }}
              >
                {'Reject'}
              </Button>
            </Stack>
          )
        },
      },
    ],
    emptyMessage: 'No documents matched the current review queue filters.',
    searchPlaceholder: 'Search by name, legacy ID, batch...',
    styleVariant: 'reviewQueueDense',
    ...reviewQueueSelectionProps,
    advancedSearch: {
      filters: currentFilters,
      filterOptions,
      onApply: (filters) => {
        setOverviewFilters({ ...filters, statuses: resolveStatuses(filters.statuses) })
      },
    },
    trailingToolbarSlot: getReviewQueueBatchApproveButton({
      batchApprovePending,
      selectedCount: selectedReviewQueueDocumentIds.length,
      onApprove: () => {
        void handleBatchApprove()
      },
    }),
  }

  return (
    <Box>
      <DocumentTable
        config={tableConfig}
        controller={{
          currentQueryKey: JSON.stringify(effectiveQueryParams),
          filters: currentFilters,
          page,
          pageSize,
          query: {
            page,
            pageSize,
            orderBy: effectiveQueryParams.orderBy,
            sortDirection: effectiveQueryParams.sortDirection,
            search: globalFilter || undefined,
            cursorValue: effectiveQueryParams.cursorValue,
            cursorId: effectiveQueryParams.cursorId,
            cursorDirection: effectiveQueryParams.cursorDirection,
            filters: currentFilters,
          },
          search: globalFilter,
          sorting,
          setFilters: (filters) => {
            setOverviewFilters({ ...filters, statuses: resolveStatuses(filters.statuses) })
          },
          setPageSize,
          setSearch: setGlobalFilter,
          setSorting,
          goToNextPage: (cursor) => {
            goToNextPage(cursor ?? null)
          },
          goToPreviousPage: (cursor) => {
            goToPreviousPage(cursor ?? null)
          },
        }}
        initialData={initialData}
        initialQuery={{
          page: effectiveQueryParams.page ?? 1,
          pageSize: effectiveQueryParams.pageSize ?? 25,
          orderBy: effectiveQueryParams.orderBy,
          sortDirection: effectiveQueryParams.sortDirection,
          search: effectiveQueryParams.search,
          cursorValue: effectiveQueryParams.cursorValue,
          cursorId: effectiveQueryParams.cursorId,
          cursorDirection: effectiveQueryParams.cursorDirection,
          filters: currentFilters,
        }}
      />
      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') {
            setToastState((current) => ({ ...current, open: false }))
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toastState.severity}
          variant={'filled'}
          onClose={() => {
            setToastState((current) => ({ ...current, open: false }))
          }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
