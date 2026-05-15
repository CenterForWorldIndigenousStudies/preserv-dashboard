'use client'

import { useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { MRT_ColumnDef } from 'material-react-table'
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

function truncateDocumentMetadata(value: string | null | undefined, maxLength: number): string | null {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return null
  }

  if (normalizedValue.length <= maxLength) {
    return normalizedValue
  }

  return `${normalizedValue.slice(0, maxLength)}...`
}

function formatShortDocumentId(documentId: string): string {
  return documentId.slice(0, 8)
}

function buildReviewQueueColumns(preservedOverviewHref: string): MRT_ColumnDef<Document>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Document',
      size: 420,
      Cell: ({ row }) => {
        const name = row.original.name?.trim()
        const legacyId = truncateDocumentMetadata(row.original.id_legacy, 20)
        const sourceId = truncateDocumentMetadata(row.original.source_id, 20)

        return (
          <div className="flex flex-col gap-1">
            {name ? (
              <Link
                href={{
                  pathname: `/documents/${row.original.id}`,
                  query: { from: preservedOverviewHref },
                }}
                className="leading-tight font-medium text-moss hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="leading-tight font-medium text-ink">{`Untitled document`}</span>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/60">
              <span className="font-mono uppercase tracking-[0.08em]">{`ID ${formatShortDocumentId(row.original.id)}`}</span>
              {legacyId ? <span title={row.original.id_legacy ?? undefined}>{`Legacy ${legacyId}`}</span> : null}
              {sourceId ? <span title={row.original.source_id ?? undefined}>{`Source ${sourceId}`}</span> : null}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'validation_status',
      header: 'Validation Status',
      size: 190,
      enableSorting: false,
      Cell: ({ row }) => {
        const value = row.original.validation_status
        if (!value) {
          return <span className="txt-muted">--</span>
        }

        return <Badge variant={getValidationStatusBadgeVariant(value)}>{value}</Badge>
      },
    },
    {
      id: 'review_details',
      header: 'Review Details',
      size: 220,
      enableSorting: false,
      Cell: ({ row }) => {
        const validatorName = row.original.validator_name?.trim()

        return (
          <div className="flex flex-col gap-1">
            <span className={validatorName ? 'text-sm text-ink' : 'txt-muted text-sm'}>
              {validatorName || '--'}
            </span>
            {row.original.validation_timestamp ? (
              <DateAtom value={row.original.validation_timestamp} className="text-xs text-ink/60" />
            ) : (
              <span className="txt-muted text-xs">No validation time</span>
            )}
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
      header: 'Name',
      size: 280,
      Cell: ({ row }) => {
        const value = row.original.name
        if (!value) {
          return '--'
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
    {
      accessorKey: 'id_legacy',
      header: 'Legacy ID',
      size: 180,
      Cell: ({ renderedCellValue }) => {
        const value = String((renderedCellValue as string | null) ?? '')
        if (!value) {
          return '--'
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
          return '--'
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
          return '--'
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

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => (isReviewQueue ? buildReviewQueueColumns(preservedOverviewHref) : buildOverviewColumns(preservedOverviewHref)),
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
                const isApprovePending =
                  activeDecision?.documentId === row.id && activeDecision.decision === 'APPROVED'
                const isRejectPending =
                  activeDecision?.documentId === row.id && activeDecision.decision === 'REJECTED'
                const isPending = isApprovePending || isRejectPending

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
        emptyMessage={
          isReviewQueue
            ? 'No documents matched the current review queue filters.'
            : 'No documents found.'
        }
        searchPlaceholder="Search by name, legacy ID, batch..."
        styleVariant={isReviewQueue ? 'reviewQueueDense' : 'default'}
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
