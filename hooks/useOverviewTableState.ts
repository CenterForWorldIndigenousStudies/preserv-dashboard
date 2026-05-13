'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { MRT_SortingState } from 'material-react-table'

import {
  serializeOverviewStatusesParam,
  type OverviewAdvancedSearchFilters,
} from '@lib/overview-search'
import type { DocumentsQueryParams } from '@lib/queries'
import type { DocumentsCursor } from '@lib/types'

// ---------------------------------------------------------------------------
// Utility functions (server-safe, no React hooks)
// ---------------------------------------------------------------------------

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
    queryParams?.requireValidationStatus ?? false,
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

export function canReuseInitialData(
  initialData: unknown,
  initialQuery: DocumentsQueryParams | undefined,
  queryParams: DocumentsQueryParams,
): boolean {
  if (!initialData) {
    return false
  }

  return buildComparableQueryShape(initialQuery) === buildComparableQueryShape(queryParams)
}

// ---------------------------------------------------------------------------
// useOverviewTableState hook
// Manages all table state for the overview documents table: pagination,
// sorting, filtering, cursor-based pagination, and URL sync.
// ---------------------------------------------------------------------------

export interface UseOverviewTableStateOptions {
  initialQuery?: DocumentsQueryParams
}

export function useOverviewTableState(initialQuery?: DocumentsQueryParams) {
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
      requireValidationStatus: initialQuery?.requireValidationStatus,
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
    goToNextPage: (endCursor: DocumentsCursor | null) => {
      if (!endCursor?.value || !endCursor.id) return
      setPage((prev) => prev + 1)
      setCursorValue(endCursor.value)
      setCursorId(endCursor.id)
      setCursorDirection('next')
    },
    goToPreviousPage: (startCursor: DocumentsCursor | null) => {
      if (!startCursor?.value || !startCursor.id) return
      setPage((prev) => Math.max(1, prev - 1))
      setCursorValue(startCursor.value)
      setCursorId(startCursor.id)
      setCursorDirection('prev')
    },
  }
}
