'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
} from 'material-react-table'
import Link from 'next/link'
import { Button } from '@atoms/Button'
import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { getDocumentsAction } from '@actions/documents'
import { OverviewAdvancedSearchModal } from '@organisms/OverviewAdvancedSearchModal'
import {
  serializeOverviewStatusesParam,
  type OverviewAdvancedSearchFilters,
  type OverviewFilterOptions,
} from '@lib/overview-search'
import type { DocumentsQueryParams } from '@lib/queries'
import type { Document, DocumentsPageResult } from '@lib/types'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface DocumentsTableProps {
  initialData?: DocumentsPageResult
  initialQuery?: DocumentsQueryParams
  filterOptions: OverviewFilterOptions
}

function buildInitialSorting(initialQuery?: DocumentsQueryParams): MRT_SortingState {
  if (!initialQuery?.orderBy) {
    return []
  }

  return [
    {
      id: initialQuery.orderBy,
      desc: initialQuery.sortDirection !== 'asc',
    },
  ]
}

function normalizePageNumber(page?: number): number {
  if (!page || page < 1 || Number.isNaN(page)) {
    return 1
  }

  return Math.floor(page)
}

function defaultQueryValue<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value
}

function buildComparableQueryShape(queryParams: DocumentsQueryParams | undefined): string {
  return JSON.stringify([
    normalizePageNumber(queryParams?.page),
    defaultQueryValue(queryParams?.pageSize, 25),
    queryParams?.orderBy,
    queryParams?.sortDirection,
    queryParams?.search,
    serializeOverviewStatusesParam(queryParams?.statuses),
    queryParams?.documentType,
    queryParams?.batch,
    queryParams?.createdFrom,
    queryParams?.createdTo,
    queryParams?.collection,
    queryParams?.accessLevel,
    queryParams?.cursorValue,
    queryParams?.cursorId,
    queryParams?.cursorDirection,
  ])
}

function syncSearchParam(nextParams: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    nextParams.set(key, value)
    return
  }

  nextParams.delete(key)
}

function syncOverviewFilterSearchParams(nextParams: URLSearchParams, queryParams: DocumentsQueryParams): void {
  syncSearchParam(nextParams, 'search', queryParams.search)
  syncSearchParam(nextParams, 'statuses', serializeOverviewStatusesParam(queryParams.statuses))
  syncSearchParam(nextParams, 'documentType', queryParams.documentType && queryParams.documentType !== 'all' ? queryParams.documentType : undefined)
  syncSearchParam(nextParams, 'batch', queryParams.batch)
  syncSearchParam(nextParams, 'createdFrom', queryParams.createdFrom)
  syncSearchParam(nextParams, 'createdTo', queryParams.createdTo)
  syncSearchParam(nextParams, 'collection', queryParams.collection)
  syncSearchParam(nextParams, 'accessLevel', queryParams.accessLevel)
}

function canReuseInitialData(
  initialData: DocumentsTableProps['initialData'],
  initialQuery: DocumentsQueryParams | undefined,
  queryParams: DocumentsQueryParams,
): boolean {
  if (!initialData) {
    return false
  }

  return buildComparableQueryShape(initialQuery) === buildComparableQueryShape(queryParams)
}

function useOverviewTableState(initialQuery?: DocumentsQueryParams) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [page, setPage] = useState(normalizePageNumber(initialQuery?.page))
  const [pageSize, setPageSize] = useState(initialQuery?.pageSize ?? 25)
  const [sorting, setSorting] = useState<MRT_SortingState>(buildInitialSorting(initialQuery))
  const [globalFilter, setGlobalFilter] = useState(initialQuery?.search ?? '')
  const [statuses, setStatuses] = useState(initialQuery?.statuses)
  const [documentType, setDocumentType] = useState(initialQuery?.documentType ?? 'all')
  const [batch, setBatch] = useState(initialQuery?.batch)
  const [createdFrom, setCreatedFrom] = useState(initialQuery?.createdFrom)
  const [createdTo, setCreatedTo] = useState(initialQuery?.createdTo)
  const [collection, setCollection] = useState(initialQuery?.collection)
  const [accessLevel, setAccessLevel] = useState(initialQuery?.accessLevel)
  const [cursorValue, setCursorValue] = useState(initialQuery?.cursorValue)
  const [cursorId, setCursorId] = useState(initialQuery?.cursorId)
  const [cursorDirection, setCursorDirection] = useState<DocumentsQueryParams['cursorDirection']>(
    initialQuery?.cursorDirection,
  )

  const queryParams: DocumentsQueryParams = useMemo(
    () => ({
      page,
      pageSize,
      orderBy: sorting[0]?.id as DocumentsQueryParams['orderBy'],
      sortDirection: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
      search: globalFilter || undefined,
      author: globalFilter || undefined,
      statuses,
      documentType,
      batch,
      createdFrom,
      createdTo,
      collection,
      accessLevel,
      cursorValue,
      cursorId,
      cursorDirection,
    }),
    [accessLevel, batch, collection, createdFrom, createdTo, cursorDirection, cursorId, cursorValue, documentType, globalFilter, page, pageSize, sorting, statuses],
  )

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString())

    nextParams.set('page', String(queryParams.page ?? 1))
    nextParams.set('pageSize', String(queryParams.pageSize ?? 25))

    if (queryParams.orderBy) {
      nextParams.set('orderBy', queryParams.orderBy)
    } else {
      nextParams.delete('orderBy')
    }

    if (queryParams.sortDirection) {
      nextParams.set('sortDirection', queryParams.sortDirection)
    } else {
      nextParams.delete('sortDirection')
    }

    syncOverviewFilterSearchParams(nextParams, queryParams)

    if (queryParams.cursorValue && queryParams.cursorId && queryParams.cursorDirection) {
      nextParams.set('cursorValue', queryParams.cursorValue)
      nextParams.set('cursorId', queryParams.cursorId)
      nextParams.set('cursorDirection', queryParams.cursorDirection)
    } else {
      nextParams.delete('cursorValue')
      nextParams.delete('cursorId')
      nextParams.delete('cursorDirection')
    }

    const nextSearch = nextParams.toString()
    const currentSearch = searchParams.toString()
    if (nextSearch !== currentSearch) {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false })
    }
  }, [pathname, queryParams, router, searchParams])

  const resetToFirstPage = () => {
    setPage(1)
    setCursorValue(undefined)
    setCursorId(undefined)
    setCursorDirection(undefined)
  }

  return {
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
    setGlobalFilter: (nextValue: string) => {
      setGlobalFilter(nextValue)
      resetToFirstPage()
    },
    setOverviewFilters: (filters: OverviewAdvancedSearchFilters) => {
      setGlobalFilter(filters.author ?? '')
      setStatuses(filters.statuses)
      setDocumentType(filters.documentType ?? 'all')
      setBatch(filters.batch)
      setCreatedFrom(filters.createdFrom)
      setCreatedTo(filters.createdTo)
      setCollection(filters.collection)
      setAccessLevel(filters.accessLevel)
      resetToFirstPage()
    },
    setPageSize: (nextPageSize: number) => {
      setPageSize(nextPageSize)
      resetToFirstPage()
    },
    setSorting: (updater: MRT_SortingState | ((prev: MRT_SortingState) => MRT_SortingState)) => {
      setSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater))
      resetToFirstPage()
    },
    sorting,
    goToNextPage: (endCursor: DocumentsPageResult['pageInfo']['endCursor']) => {
      if (!endCursor) return
      setPage((prev) => prev + 1)
      setCursorValue(endCursor.value)
      setCursorId(endCursor.id)
      setCursorDirection('next')
    },
    goToPreviousPage: (startCursor: DocumentsPageResult['pageInfo']['startCursor']) => {
      if (!startCursor) return
      setPage((prev) => Math.max(1, prev - 1))
      setCursorValue(startCursor.value)
      setCursorId(startCursor.id)
      setCursorDirection('prev')
    },
  }
}

export function DocumentsTable({ initialData, initialQuery, filterOptions }: DocumentsTableProps): ReactElement {
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
    setGlobalFilter,
    setOverviewFilters,
    setPageSize,
    setSorting,
    sorting,
    statuses,
    goToNextPage,
    goToPreviousPage,
  } = useOverviewTableState(initialQuery)
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
  const [isLoading, setIsLoading] = useState(false)

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
    [preservedOverviewHref],
  )

  const shouldUseInitialData = canReuseInitialData(initialData, initialQuery, queryParams)
  const currentFilters: OverviewAdvancedSearchFilters = useMemo(
    () => ({
      author: globalFilter || undefined,
      statuses,
      documentType,
      batch,
      createdFrom,
      createdTo,
      collection,
      accessLevel,
    }),
    [accessLevel, batch, collection, createdFrom, createdTo, documentType, globalFilter, statuses],
  )

  useEffect(() => {
    if (shouldUseInitialData && initialData) {
      setIsLoading(false)
      setData(initialData.data)
      setPageInfo(initialData.pageInfo)
      return
    }

    let cancelled = false
    setIsLoading(true)
    getDocumentsAction(queryParams)
      .then((result: DocumentsPageResult) => {
        if (!cancelled) {
          setData(result.data)
          setPageInfo(result.pageInfo)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData([])
          setPageInfo({
            page,
            pageSize,
            hasNextPage: false,
            hasPreviousPage: page > 1,
            startCursor: null,
            endCursor: null,
          })
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [initialData, initialQuery, page, pageSize, queryParams, shouldUseInitialData])

  const table = useMaterialReactTable({
    columns,
    data,
    enablePagination: false,
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#f4f1f0',
        color: '#231f20',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '2px solid #355834',
      },
    },
    muiTableBodyCellProps: {
      sx: { color: '#231f20', fontSize: '0.875rem' },
    },
    muiTableContainerProps: {
      sx: { borderRadius: '0.75rem', border: '1px solid rgba(53,88,52,0.125)' },
    },
    muiSearchTextFieldProps: {
      placeholder: 'Search authors...',
      sx: {
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(53,88,52,0.25)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#355834' },
      },
    },
    localization: {
      noRecordsToDisplay: 'No documents found.',
      search: 'Author filter',
    },
    renderTopToolbarCustomActions: () => (
      <OverviewAdvancedSearchModal
        filters={currentFilters}
        filterOptions={filterOptions}
        onApply={setOverviewFilters}
      />
    ),
    getRowId: (row) => row.id,
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      sx: row.original.is_duplicate
        ? {
            '& td': { backgroundColor: 'rgba(184, 96, 80, 0.12)' },
            '&:hover td': { backgroundColor: 'rgba(184, 96, 80, 0.18)' },
          }
        : {
            '& td': {
              backgroundColor: staticRowIndex % 2 === 1 ? 'rgba(244,241,240,0.3)' : undefined,
            },
            '&:hover td': { backgroundColor: 'rgba(53,88,52,0.06)' },
          },
    }),
  })

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div aria-live="polite" className="flex justify-center">
          <Button loading variant="secondary">
            Refreshing data
          </Button>
        </div>
      ) : null}
      <MaterialReactTable table={table} />
      <div className="flex flex-col gap-3 rounded-xl border border-[rgba(53,88,52,0.125)] bg-[rgba(244,241,240,0.35)] px-4 py-3 text-sm text-[#231f20] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium">Page {pageInfo.page}</span>
          <span>{data.length} document{data.length === 1 ? '' : 's'} shown</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.1em] text-[#5b5654]">Rows</span>
            <select
              aria-label="Rows per page"
              className="rounded-md border border-[rgba(53,88,52,0.25)] bg-white px-2 py-1"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={isLoading || !pageInfo.hasPreviousPage || !pageInfo.startCursor}
              onClick={() => {
                goToPreviousPage(pageInfo.startCursor)
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={isLoading || !pageInfo.hasNextPage || !pageInfo.endCursor}
              onClick={() => {
                goToNextPage(pageInfo.endCursor)
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
