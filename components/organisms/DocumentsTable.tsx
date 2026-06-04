'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import type { MRT_ColumnDef, MRT_RowSelectionState, MRT_Updater } from 'material-react-table'
import { useRouter } from 'next/navigation'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { Button } from '@atoms/Button'
import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { DOCUMENTS_PATH } from '@constants/paths'
import { useOverviewTableState } from '@hooks/useOverviewTableState'
import {
  type OverviewAdvancedSearchFilters,
  type OverviewFilterOptions,
  type OverviewStatusOption,
} from '@lib/overviewSearch'
import type { DocumentsQueryParams } from '@lib/queries'
import { truncateString } from '@lib/strings'
import type { Document } from 'types/documents'
import type { DocumentsPageResult } from 'types/pagination'
import type { ReviewQueueDecision } from 'types/reviewQueue'
import { DocumentNameBlock } from '@molecules/DocumentNameBlock'
import { DocumentTableAdvancedSearchTrigger } from '@molecules/DocumentTableAdvancedSearchTrigger'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
import { OverviewAdvancedSearchModal } from '@organisms/OverviewAdvancedSearchModal'

// ---------------------------------------------------------------------------
// Review Queue context persistence helpers (sessionStorage-backed)
// Isolated to Review Queue variant only, auto-cleanup on filter change
// ---------------------------------------------------------------------------

const REVIEW_QUEUE_SELECTION_STORAGE_PREFIX = 'rq-row-selection'

function getReviewQueueSelectionKey(queryKey: string): string {
  return `${REVIEW_QUEUE_SELECTION_STORAGE_PREFIX}:${queryKey}`
}

function saveReviewQueueSelection(queryKey: string, selection: MRT_RowSelectionState): void {
  try {
    sessionStorage.setItem(getReviewQueueSelectionKey(queryKey), JSON.stringify(selection))
  } catch {
    // Silent fail if storage is unavailable
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

interface DocumentsTableProps {
  initialData?: DocumentsPageResult
  initialQuery?: DocumentsQueryParams
  filterOptions: OverviewFilterOptions
  variant?: 'overview' | 'reviewQueue'
  fixedStatuses?: OverviewStatusOption[]
  defaultStatuses?: OverviewStatusOption[]
  serverDriven?: boolean
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

function buildReviewQueueCommentTooltipContent(
  document: Pick<Document, 'validation_comment' | 'validation_comment_additional'>,
): ReactElement | null {
  const validationComment = normalizeReviewQueueComment(document.validation_comment)
  const validationCommentAdditional = normalizeReviewQueueComment(document.validation_comment_additional)

  if (!validationComment && !validationCommentAdditional) {
    return null
  }

  return (
    <>
      {validationComment ? <div>{`Comment: ${validationComment}`}</div> : null}
      {validationCommentAdditional ? <div>{`Additional information: ${validationCommentAdditional}`}</div> : null}
    </>
  )
}

function buildReviewQueueColumns(preservedOverviewHref: string): MRT_ColumnDef<Document>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Document',
      size: 420,
      Cell: ({
        row: {
          original: { id, id_legacy, name, source_id },
        },
      }) => {
        return (
          <DocumentNameBlock
            name={name}
            id={id}
            legacyId={id_legacy}
            sourceId={source_id}
            href={`${DOCUMENTS_PATH}/${id}?from=${preservedOverviewHref}`}
          />
        )
      },
    },
    {
      accessorKey: 'validation_status',
      header: 'Validation Status',
      size: 190,
      enableSorting: false,
      Cell: ({
        row: {
          original: { validation_status },
        },
      }) => {
        if (!validation_status) {
          return <span className="txt-muted">{`-`}</span>
        }

        return <Badge variant={getValidationStatusBadgeVariant(validation_status)}>{validation_status}</Badge>
      },
    },
    {
      id: 'review_details',
      header: 'Review Details',
      size: 220,
      enableSorting: false,
      Cell: ({ row: { original } }) => {
        const { validation_comment, validation_comment_additional, validation_timestamp, validator_name } = original
        const validatorName = validator_name?.trim()
        const hasHumanReviewContext = Boolean(validatorName || validation_timestamp)
        const commentTooltipContent = buildReviewQueueCommentTooltipContent({
          validation_comment,
          validation_comment_additional,
        })
        const reviewContextBadge = hasHumanReviewContext ? (
          <Badge variant="neutral">Human reviewed</Badge>
        ) : commentTooltipContent ? (
          <Badge variant="neutral">Comments</Badge>
        ) : null

        return (
          <div className="flex flex-col gap-1">
            {reviewContextBadge ? (
              commentTooltipContent ? (
                <Tooltip title={commentTooltipContent} enterDelay={400}>
                  <span>{reviewContextBadge}</span>
                </Tooltip>
              ) : (
                reviewContextBadge
              )
            ) : null}
            <span className={validatorName || hasHumanReviewContext ? 'text-sm text-ink' : 'txt-muted text-sm'}>
              {validatorName || (hasHumanReviewContext ? 'Reviewer not recorded' : '-')}
            </span>
            {validation_timestamp ? <DateAtom value={validation_timestamp} className="text-xs text-ink/60" /> : null}
          </div>
        )
      },
    },
  ]
}

function buildOverviewColumns(preservedOverviewHref: string): MRT_ColumnDef<Document>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Document',
      size: 420,
      Cell: ({
        row: {
          original: { id, id_legacy, name, source_id },
        },
      }) => {
        return (
          <DocumentNameBlock
            name={name}
            id={id}
            legacyId={id_legacy}
            sourceId={source_id}
            href={`${DOCUMENTS_PATH}/${id}?from=${preservedOverviewHref}`}
          />
        )
      },
    },
    {
      accessorKey: 'filesize',
      header: 'Size',
      size: 110,
      Cell: ({ renderedCellValue }) => <FileSize value={renderedCellValue as bigint | number | null | undefined} />,
    },
    {
      accessorKey: 'hash_binary',
      header: 'Binary Hash',
      size: 180,
      Cell: ({ renderedCellValue }) => {
        const value = String((renderedCellValue as string | null) ?? '')
        if (!value) {
          return '-'
        }

        return (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={value}>
            {truncateString(value, 12)}
          </span>
        )
      },
    },
    {
      accessorKey: 'hash_content',
      header: 'Content Hash',
      size: 180,
      Cell: ({ renderedCellValue }) => {
        const value = String((renderedCellValue as string | null) ?? '')
        if (!value) {
          return '--'
        }

        return (
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={value}>
            {truncateString(value, 12)}
          </span>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      size: 160,
      Cell: ({ renderedCellValue }) => <DateAtom value={renderedCellValue as Document['created_at']} />,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      size: 160,
      Cell: ({ renderedCellValue }) => <DateAtom value={renderedCellValue as Document['updated_at']} />,
    },
    {
      accessorKey: 'is_duplicate',
      header: 'Is Duplicate',
      size: 120,
      Cell: ({
        row: {
          original: { is_duplicate },
        },
      }) => (is_duplicate ? 'True' : 'False'),
    },
  ]
}

async function fetchDocumentsTablePage(
  params: DocumentsQueryParams,
  isReviewQueue: boolean,
): Promise<DocumentsPageResult> {
  if (isReviewQueue) {
    const { getNeedsReviewDocumentsAction } = await import('@actions/review-queue')
    return getNeedsReviewDocumentsAction(params)
  }

  const { getDocumentsAction } = await import('@actions/documents')
  return getDocumentsAction(params)
}

async function applyReviewQueueDecisionForDocument(
  documentId: string,
  decision: ReviewQueueDecision,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { applyReviewQueueDecisionAction } = await import('@actions/review-queue')
  return applyReviewQueueDecisionAction(documentId, decision)
}

async function applyReviewQueueBatchApproveForDocuments(documentIds: string[]) {
  const { applyReviewQueueBatchApproveAction } = await import('@actions/review-queue')
  return applyReviewQueueBatchApproveAction(documentIds)
}

function getDocumentsTableEmptyMessage(isReviewQueue: boolean): string {
  return isReviewQueue ? 'No documents matched the current review queue filters.' : 'No documents found.'
}

function getReviewQueueSelectionProps(
  isReviewQueue: boolean,
  reviewQueueRowSelection: MRT_RowSelectionState,
  setReviewQueueRowSelection: (updater: MRT_Updater<MRT_RowSelectionState>) => void,
  optimisticallyHiddenDocumentIds: string[],
): ReviewQueueSelectionProps {
  if (!isReviewQueue) {
    return {
      enableRowSelection: false,
    }
  }

  return {
    enableRowSelection: true,
    rowSelection: reviewQueueRowSelection,
    onRowSelectionChange: setReviewQueueRowSelection,
    excludedRowIds: optimisticallyHiddenDocumentIds,
  }
}

function getReviewQueueBatchApproveButton(
  isReviewQueue: boolean,
  { batchApprovePending, selectedCount, onApprove }: ReviewQueueBatchApproveButtonProps,
): ReactElement | undefined {
  if (!isReviewQueue) {
    return undefined
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={batchApprovePending}
      disabled={batchApprovePending || selectedCount === 0}
      onClick={onApprove}
    >
      {`Approve selected (${selectedCount})`}
    </Button>
  )
}

export function DocumentsTable({
  initialData,
  initialQuery,
  filterOptions,
  variant = 'overview',
  fixedStatuses,
  defaultStatuses,
  serverDriven: _serverDriven = false,
}: DocumentsTableProps): ReactElement {
  const router = useRouter()
  const isReviewQueue = variant === 'reviewQueue'
  const resolveStatuses = (nextStatuses: OverviewStatusOption[] | undefined): OverviewStatusOption[] | undefined => {
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
    () => ({
      ...queryParams,
      statuses: effectiveStatuses,
    }),
    [effectiveStatuses, queryParams],
  )
  const [activeDecision, setActiveDecision] = useState<{
    documentId: string
    decision: ReviewQueueDecision
  } | null>(null)
  const [reviewQueueRowSelection, setReviewQueueRowSelection] = useState<MRT_RowSelectionState>({})
  const [batchApprovePending, setBatchApprovePending] = useState(false)
  const [optimisticallyHiddenDocumentIds, setOptimisticallyHiddenDocumentIds] = useState<string[]>([])
  const [toastState, setToastState] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const preservedOverviewHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])

  const currentFilters: OverviewAdvancedSearchFilters = useMemo(
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
        isReviewQueue,
        reviewQueueRowSelection,
        setReviewQueueRowSelection,
        optimisticallyHiddenDocumentIds,
      ),
    [isReviewQueue, optimisticallyHiddenDocumentIds, reviewQueueRowSelection],
  )

  // Initialize row selection from sessionStorage for Review Queue
  // Falls back to empty selection if unavailable or different query context
  useEffect(() => {
    if (!isReviewQueue) {
      return
    }

    const restored = restoreReviewQueueSelection(reviewQueueQueryKey)
    setReviewQueueRowSelection(restored)
  }, [isReviewQueue, reviewQueueQueryKey])

  // Persist row selection to sessionStorage whenever it changes
  // Scoped by query key to prevent leakage across filter states
  useEffect(() => {
    if (!isReviewQueue) {
      return
    }

    saveReviewQueueSelection(reviewQueueQueryKey, reviewQueueRowSelection)
  }, [isReviewQueue, reviewQueueQueryKey, reviewQueueRowSelection])

  async function handleReviewDecision(documentId: string, decision: ReviewQueueDecision): Promise<void> {
    setActiveDecision({ documentId, decision })
    const scrollPos = window.scrollY

    try {
      const result = await applyReviewQueueDecisionForDocument(documentId, decision)

      if (!result.ok) {
        setToastState({
          open: true,
          message: result.error,
          severity: 'error',
        })
        return
      }

      setToastState({
        open: true,
        message: result.message,
        severity: 'success',
      })
      router.refresh()
      // Restore scroll position after refresh completes
      if (isReviewQueue) {
        restoreScrollPosition(scrollPos)
      }
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
    if (!isReviewQueue || selectedReviewQueueDocumentIds.length === 0) {
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
        setToastState({
          open: true,
          message: result.error,
          severity: 'error',
        })
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
      // Restore scroll position after refresh completes
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

  const trailingToolbarSlot = getReviewQueueBatchApproveButton(isReviewQueue, {
    batchApprovePending,
    selectedCount: selectedReviewQueueDocumentIds.length,
    onApprove: () => {
      void handleBatchApprove()
    },
  })

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () =>
      isReviewQueue ? buildReviewQueueColumns(preservedOverviewHref) : buildOverviewColumns(preservedOverviewHref),
    [isReviewQueue, preservedOverviewHref],
  )

  return (
    <div>
      <DocumentDataTable<Document, OverviewAdvancedSearchFilters>
        definition={{
          tableId: isReviewQueue ? 'review-queue-documents' : 'overview-documents',
          columns,
          renderRowActions: isReviewQueue
            ? (row) => {
                const isApprovePending = activeDecision?.documentId === row.id && activeDecision.decision === 'APPROVED'
                const isRejectPending = activeDecision?.documentId === row.id && activeDecision.decision === 'REJECTED'
                const isPending = isApprovePending || isRejectPending || batchApprovePending

                return (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={isApprovePending}
                      disabled={isPending}
                      onClick={() => {
                        void handleReviewDecision(row.id, 'APPROVED')
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={isRejectPending}
                      disabled={isPending}
                      onClick={() => {
                        void handleReviewDecision(row.id, 'REJECTED')
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )
              }
            : undefined,
          fetcher: async (query) => {
            return fetchDocumentsTablePage(
              {
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
              },
              isReviewQueue,
            )
          },
        }}
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
            setOverviewFilters({
              ...filters,
              statuses: resolveStatuses(filters.statuses),
            })
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
        emptyMessage={getDocumentsTableEmptyMessage(isReviewQueue)}
        searchPlaceholder="Search by name, legacy ID, batch..."
        styleVariant={isReviewQueue ? 'reviewQueueDense' : 'default'}
        {...reviewQueueSelectionProps}
        leadingToolbarSlot={
          <DocumentTableAdvancedSearchTrigger
            activeFilterCount={
              [
                currentFilters.author,
                currentFilters.statuses?.length ? 'statuses' : undefined,
                currentFilters.documentType && currentFilters.documentType !== 'all'
                  ? currentFilters.documentType
                  : undefined,
                currentFilters.batch,
                currentFilters.createdFrom || currentFilters.createdTo ? 'dates' : undefined,
                currentFilters.collection,
                currentFilters.accessLevel,
              ].filter(Boolean).length
            }
          >
            <OverviewAdvancedSearchModal
              filters={currentFilters}
              filterOptions={filterOptions}
              onApply={(filters) => {
                setOverviewFilters({
                  ...filters,
                  statuses: resolveStatuses(filters.statuses),
                })
              }}
            />
          </DocumentTableAdvancedSearchTrigger>
        }
        trailingToolbarSlot={trailingToolbarSlot}
      />
      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return
          }

          setToastState((current) => ({ ...current, open: false }))
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toastState.severity}
          variant="filled"
          onClose={() => {
            setToastState((current) => ({ ...current, open: false }))
          }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>
    </div>
  )
}
