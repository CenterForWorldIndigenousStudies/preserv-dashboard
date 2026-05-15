'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { MRT_ColumnDef, MRT_RowSelectionState, MRT_Updater } from 'material-react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { Button } from '@atoms/Button'
import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { SourceId } from '@atoms/SourceId'
import { useOverviewTableState } from '@hooks/useOverviewTableState'
import {
  type OverviewAdvancedSearchFilters,
  type OverviewFilterOptions,
  type OverviewStatusOption,
} from '@lib/overview-search'
import type { DocumentsQueryParams } from '@lib/queries'
import type { Document, DocumentsPageResult, ReviewQueueDecision } from '@lib/types'
import { DocumentTableAdvancedSearchTrigger } from '@molecules/DocumentTableAdvancedSearchTrigger'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
import { OverviewAdvancedSearchModal } from '@organisms/OverviewAdvancedSearchModal'

interface DocumentsTableProps {
  initialData?: DocumentsPageResult
  initialQuery?: DocumentsQueryParams
  filterOptions: OverviewFilterOptions
  variant?: 'overview' | 'reviewQueue'
  fixedStatuses?: OverviewStatusOption[]
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
  {
    batchApprovePending,
    selectedCount,
    onApprove,
  }: ReviewQueueBatchApproveButtonProps,
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
  serverDriven: _serverDriven = false,
}: DocumentsTableProps): ReactElement {
  const router = useRouter()
  const isReviewQueue = variant === 'reviewQueue'
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
  const effectiveStatuses = fixedStatuses?.length ? fixedStatuses : statuses
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
  const trailingToolbarSlot = getReviewQueueBatchApproveButton(isReviewQueue, {
    batchApprovePending,
    selectedCount: selectedReviewQueueDocumentIds.length,
    onApprove: () => {
      void handleBatchApprove()
    },
  })

  useEffect(() => {
    if (!isReviewQueue) {
      return
    }

    setReviewQueueRowSelection({})
  }, [isReviewQueue, reviewQueueQueryKey])

  async function handleReviewDecision(documentId: string, decision: ReviewQueueDecision): Promise<void> {
    setActiveDecision({ documentId, decision })

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
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => {
          const value = row.original.name
          if (!value) {
            return '—'
          }

          return (
            <Link
              href={{
                pathname: `/documents/${row.original.id}`,
                query: { from: preservedOverviewHref },
              }}
              style={{ color: '#355834' }}
            >
              {value}
            </Link>
          )
        },
      },
      ...(isReviewQueue
        ? [
            {
              accessorKey: 'validation_status',
              header: 'Validation Status',
              size: 180,
              enableSorting: false,
              Cell: ({ row }) => {
                const value = row.original.validation_status
                if (!value) {
                  return <span className="txt-muted">--</span>
                }

                return <Badge variant={getValidationStatusBadgeVariant(value)}>{value}</Badge>
              },
            } satisfies MRT_ColumnDef<Document>,
            {
              accessorKey: 'validator_name',
              header: 'Validator Name',
              size: 170,
              enableSorting: false,
              Cell: ({ row }) => row.original.validator_name ?? <span className="txt-muted">--</span>,
            } satisfies MRT_ColumnDef<Document>,
            {
              accessorKey: 'validation_timestamp',
              header: 'Validation Time',
              size: 180,
              enableSorting: false,
              Cell: ({ row }) =>
                row.original.validation_timestamp ? (
                  <DateAtom value={row.original.validation_timestamp} />
                ) : (
                  <span className="txt-muted">--</span>
                ),
            } satisfies MRT_ColumnDef<Document>,
          ]
        : []),
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const value = String((renderedCellValue as string | null) ?? '')
          if (!value) {
            return '—'
          }
          return <span title={value}>{value.length > 30 ? `${value.slice(0, 30)}...` : value}</span>
        },
      },
      {
        accessorKey: 'source_id',
        header: 'Source ID',
        size: 150,
        Cell: ({ renderedCellValue }) => <SourceId value={renderedCellValue as string | null | undefined} />,
      },
      {
        accessorKey: 'filesize',
        header: 'Size',
        size: 110,
        Cell: ({ renderedCellValue }) => (
          <FileSize value={renderedCellValue as bigint | number | null | undefined} />
        ),
      },
      {
        accessorKey: 'hash_binary',
        header: 'Binary Hash',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const value = String((renderedCellValue as string | null) ?? '')
          if (!value) {
            return '—'
          }

          return (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={value}>
              {value.length > 20 ? `${value.slice(0, 20)}...` : value}
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
            return '—'
          }

          return (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={value}>
              {value.length > 20 ? `${value.slice(0, 20)}...` : value}
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
        Cell: ({ row }) => (row.original.is_duplicate ? 'True' : 'False'),
      },
    ],
    [activeDecision, batchApprovePending, isReviewQueue, preservedOverviewHref],
  )

  return (
    <div>
      <DocumentDataTable<Document, OverviewAdvancedSearchFilters>
        definition={{
          tableId: isReviewQueue ? 'review-queue-documents' : 'overview-documents',
          columns,
          renderRowActions: isReviewQueue
            ? (row) => {
                const isApprovePending =
                  activeDecision?.documentId === row.id && activeDecision.decision === 'APPROVED'
                const isRejectPending =
                  activeDecision?.documentId === row.id && activeDecision.decision === 'REJECTED'
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
            return fetchDocumentsTablePage({
              page: query.page,
              pageSize: query.pageSize,
              orderBy: query.orderBy as DocumentsQueryParams['orderBy'],
              sortDirection: query.sortDirection,
              search: query.search,
              author: query.filters.author ?? query.search,
              tag: query.filters.tag,
              statuses: fixedStatuses?.length ? fixedStatuses : query.filters.statuses,
              documentType: query.filters.documentType,
              batch: query.filters.batch,
              createdFrom: query.filters.createdFrom,
              createdTo: query.filters.createdTo,
              collection: query.filters.collection,
              accessLevel: query.filters.accessLevel,
              cursorValue: query.cursorValue,
              cursorId: query.cursorId,
              cursorDirection: query.cursorDirection,
            }, isReviewQueue)
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
              statuses: fixedStatuses?.length ? fixedStatuses : filters.statuses,
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
        {...reviewQueueSelectionProps}
        leadingToolbarSlot={
          <DocumentTableAdvancedSearchTrigger
            activeFilterCount={[
              currentFilters.author,
              currentFilters.statuses?.length ? 'statuses' : undefined,
              currentFilters.documentType && currentFilters.documentType !== 'all'
                ? currentFilters.documentType
                : undefined,
              currentFilters.batch,
              currentFilters.createdFrom || currentFilters.createdTo ? 'dates' : undefined,
              currentFilters.collection,
              currentFilters.accessLevel,
            ].filter(Boolean).length}
          >
            <OverviewAdvancedSearchModal
              filters={currentFilters}
              filterOptions={filterOptions}
              onApply={(filters) => {
                setOverviewFilters({
                  ...filters,
                  statuses: fixedStatuses?.length ? fixedStatuses : filters.statuses,
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
