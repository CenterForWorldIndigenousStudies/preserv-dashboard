'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table'
import Link from 'next/link'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { FileSize } from '@atoms/FileSize'
import { DateAtom } from '@atoms/Date'
import { getDocumentsAction } from '@actions/documents'
import { getNeedsReviewDocumentsAction } from '@actions/review-queue'
import { OverviewAdvancedSearchModal } from '@organisms/OverviewAdvancedSearchModal'
import {
  type OverviewAdvancedSearchFilters,
  type OverviewFilterOptions,
  type OverviewStatusOption,
} from '@lib/overview-search'
import type { Document, DocumentsPageResult } from '@lib/types'
import type { DocumentsQueryParams } from '@lib/queries'
import { useOverviewTableState, canReuseInitialData } from '@hooks/useOverviewTableState'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

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

export function DocumentsTable({
  initialData,
  initialQuery,
  filterOptions,
  variant = 'overview',
  fixedStatuses,
  serverDriven = false,
}: DocumentsTableProps): ReactElement {
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
  const fetchDocumentsAction = isReviewQueue ? getNeedsReviewDocumentsAction : getDocumentsAction
  const [data, setData] = useState<Document[]>(initialData?.data ?? [])
  const [pageInfo, setPageInfo] = useState<DocumentsPageResult['pageInfo']>(
    initialData?.pageInfo ?? {
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  )
  const [, setIsLoading] = useState(false)

  const preservedOverviewHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 120,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          return <span title={val}>{val.length > 8 ? `${val.slice(0, 8)}...` : val}</span>
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => {
          const val = row.original.name
          if (!val) return '—'
          return (
            <Link
              href={{
                pathname: `/documents/${row.original.id}`,
                query: { from: preservedOverviewHref },
              }}
              style={{ color: '#355834' }}
            >
              {val}
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
          ]
        : []),
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          if (!val) return '—'
          return <span title={val}>{val.length > 30 ? `${val.slice(0, 30)}...` : val}</span>
        },
      },
      {
        accessorKey: 'source_id',
        header: 'Source ID',
        size: 150,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
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
          const val = String((renderedCellValue as string | null) ?? '')
          if (!val) return '—'
          return (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={val}>
              {val.length > 20 ? `${val.slice(0, 20)}...` : val}
            </span>
          )
        },
      },
      {
        accessorKey: 'hash_content',
        header: 'Content Hash',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          if (!val) return '—'
          return (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={val}>
              {val.length > 20 ? `${val.slice(0, 20)}...` : val}
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
    [isReviewQueue, preservedOverviewHref],
  )

  const effectiveInitialQuery = useMemo<DocumentsQueryParams | undefined>(() => {
    if (!initialQuery) {
      return undefined
    }

    return {
      ...initialQuery,
      statuses: fixedStatuses?.length ? fixedStatuses : initialQuery.statuses,
    }
  }, [fixedStatuses, initialQuery])

  const shouldUseInitialData = canReuseInitialData(initialData, effectiveInitialQuery, effectiveQueryParams)
  const currentFilters: OverviewAdvancedSearchFilters = useMemo(
    () => ({
      author: globalFilter || undefined,
      statuses: effectiveStatuses ?? [],
      documentType,
      batch: batch || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      collection: collection || undefined,
      accessLevel,
    }),
    [accessLevel, batch, collection, createdFrom, createdTo, documentType, effectiveStatuses, globalFilter],
  )

  // Fetch new data when query params change
  useEffect(() => {
    if (serverDriven || shouldUseInitialData) {
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetchDocumentsAction(effectiveQueryParams)
      .then((result) => {
        if (cancelled) {
          return
        }

        setData(result.data)
        setPageInfo(result.pageInfo)
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setData([])
        setPageInfo({
          page: effectiveQueryParams.page ?? 1,
          pageSize: effectiveQueryParams.pageSize ?? 25,
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        })
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [effectiveQueryParams, fetchDocumentsAction, serverDriven, shouldUseInitialData])

  const table = useMaterialReactTable({
    columns,
    data: shouldUseInitialData && initialData ? initialData.data : data,
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      sorting,
      globalFilter,
    },
    pageCount: -1,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableRowSelection: false,
    onSortingChange: setSorting,
    muiTableBodyRowProps: ({ staticRowIndex }) => ({
      sx: { backgroundColor: staticRowIndex % 2 === 1 ? 'rgba(244,241,240,0.3)' : 'transparent' },
    }),
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#f4f1f0',
        color: '#231f20',
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
    },
    muiTableBodyCellProps: {
      sx: { color: '#231f20' },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by name, legacy ID, batch..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#355834]/20 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#355834]/30"
          />
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
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 border border-[#355834]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#355834]/30"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </select>
        </div>
      </div>
      <MaterialReactTable table={table} />
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-[#231f20]/60">
          Page {pageInfo.page} of {pageInfo.hasNextPage ? 'multiple' : pageInfo.page}{' '}
          {pageInfo.hasPreviousPage && page > 1 && (
            <button
              onClick={() => goToPreviousPage(pageInfo.startCursor)}
              className="ml-2 text-[#355834] hover:underline"
            >
              Previous
            </button>
          )}
        </div>
        <div className="text-sm text-[#231f20]/60">
          {pageInfo.hasNextPage && (
            <button
              onClick={() => goToNextPage(pageInfo.endCursor)}
              className="text-[#355834] hover:underline"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
