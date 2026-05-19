'use client'

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type { Updater } from '@tanstack/react-table'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { MRT_ColumnDef, MRT_RowSelectionState, MRT_SortingState } from 'material-react-table'

import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
import type { DocumentTableController, DocumentTableFetchResult } from '@organisms/document-table/types'
import type { Document } from 'types/documents'

export type SelectionSortField = 'name' | 'id_legacy' | 'filesize' | 'created_at'
export type SelectionSortDirection = 'asc' | 'desc'

export interface SelectionSortState {
  field: SelectionSortField
  direction: SelectionSortDirection
}

export const DEFAULT_SELECTION_SORT: SelectionSortState = {
  field: 'name',
  direction: 'asc',
}

function normalizeSearchValue(value: string | null | undefined): string {
  return value?.toLowerCase().trim() ?? ''
}

function getComparableValue(document: Document, field: SelectionSortField): number | string {
  switch (field) {
    case 'filesize':
      return document.filesize ?? -1
    case 'created_at':
      return document.created_at ? new Date(document.created_at).getTime() : 0
    case 'id_legacy':
      return document.id_legacy?.toLowerCase() ?? ''
    case 'name':
    default:
      return document.name?.toLowerCase() ?? ''
  }
}

function compareDocuments(left: Document, right: Document, field: SelectionSortField): number {
  const leftValue = getComparableValue(left, field)
  const rightValue = getComparableValue(right, field)

  if (leftValue < rightValue) return -1
  if (leftValue > rightValue) return 1
  return (left.name ?? '').localeCompare(right.name ?? '') || left.id.localeCompare(right.id)
}

export function sortDocuments(documents: Document[], sortState: SelectionSortState): Document[] {
  return [...documents].sort((left, right) => {
    const comparison = compareDocuments(left, right, sortState.field)
    return sortState.direction === 'asc' ? comparison : comparison * -1
  })
}

export function filterDocuments(documents: Document[], query: string): Document[] {
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return documents

  return documents.filter((document) => {
    const name = normalizeSearchValue(document.name)
    const legacyId = normalizeSearchValue(document.id_legacy)
    return name.includes(normalizedQuery) || legacyId.includes(normalizedQuery)
  })
}

interface BaseProps {
  title: string
  searchLabel: string
  documents: Document[]
  isChecked: (documentId: string) => boolean
  onToggle: (documentId: string, checked: boolean) => void
  emptyMessage?: string
}

interface ClientModeProps extends BaseProps {
  searchValue: string
  onSearchChange: (value: string) => void
  sortState: SelectionSortState
  onSortChange: (field: SelectionSortField) => void
  total?: never
  page?: never
  pageSize?: never
  onSearch?: never
  onSort?: never
  onPageChange?: never
}

interface ServerModeProps extends BaseProps {
  searchValue: string
  sortState: SelectionSortState
  total: number
  page: number
  pageSize: number
  onSearch: (value: string) => void
  onSort: (field: SelectionSortField) => void
  onPageChange: (page: number) => void
  onSearchChange?: never
  onSortChange?: never
}

type SelectionTableProps = ClientModeProps | ServerModeProps

function isServerModeProps(props: SelectionTableProps): props is ServerModeProps {
  return 'onSearch' in props
}

function toSortingState(sortState: SelectionSortState): MRT_SortingState {
  return [{ id: sortState.field, desc: sortState.direction === 'desc' }]
}

function getNextSortField(
  currentSorting: MRT_SortingState,
  updater: Updater<MRT_SortingState>,
): SelectionSortField | null {
  const nextSorting = typeof updater === 'function' ? updater(currentSorting) : updater
  const nextField = nextSorting[0]?.id ?? currentSorting[0]?.id

  return nextField ? (nextField as SelectionSortField) : null
}

function buildSelectionPageInfo(page: number, pageSize: number, total: number) {
  const hasNextPage = page * pageSize < total

  return {
    pageSize,
    hasNextPage,
    hasPreviousPage: page > 1,
    startCursor: page > 1 ? { id: `page-${page - 1}`, value: String(page - 1) } : null,
    endCursor: hasNextPage ? { id: `page-${page + 1}`, value: String(page + 1) } : null,
  }
}

function buildClientModeResult(
  documents: Document[],
  query: {
    page: number
    pageSize: number
    search?: string
    orderBy?: string
    sortDirection?: 'asc' | 'desc'
  },
): DocumentTableFetchResult<Document> {
  const filteredDocuments = filterDocuments(documents, query.search ?? '')
  const sortedDocuments = query.orderBy
    ? sortDocuments(filteredDocuments, {
        field: query.orderBy as SelectionSortField,
        direction: query.sortDirection === 'desc' ? 'desc' : 'asc',
      })
    : filteredDocuments
  const offset = (query.page - 1) * query.pageSize

  return {
    data: sortedDocuments.slice(offset, offset + query.pageSize),
    totalCount: sortedDocuments.length,
    pageInfo: buildSelectionPageInfo(query.page, query.pageSize, sortedDocuments.length),
  }
}

export function SelectionTable(props: SelectionTableProps): ReactElement {
  const serverMode = isServerModeProps(props)
  const [clientPage, setClientPage] = useState(1)
  const [clientPageSize, setClientPageSize] = useState(25)
  const [localSearch, setLocalSearch] = useState(props.searchValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (serverMode) {
      setLocalSearch(props.searchValue)
    }
  }, [props.searchValue, serverMode])

  useEffect(() => {
    if (!serverMode) {
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (localSearch === props.searchValue) {
      return
    }

    debounceRef.current = setTimeout(() => {
      props.onSearch(localSearch)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [localSearch, props, serverMode])

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 320,
        Cell: ({ row }) => row.original.name ?? 'Untitled document',
      },
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 220,
        Cell: ({ row }) => row.original.id_legacy ?? '-',
      },
      {
        accessorKey: 'filesize',
        header: 'File Size',
        size: 140,
        Cell: ({ row }) => <FileSize value={row.original.filesize} />,
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 180,
        Cell: ({ row }) => <DateAtom value={row.original.created_at} />,
      },
    ],
    [],
  )

  const rowSelection = useMemo<MRT_RowSelectionState>(() => {
    const selectionEntries = props.documents
      .filter((document) => props.isChecked(document.id))
      .map((document) => [document.id, true] as const)

    return Object.fromEntries(selectionEntries)
  }, [props])

  const controller = useMemo<DocumentTableController<Record<string, never>>>(() => {
    if (serverMode) {
      const sorting = toSortingState(props.sortState)

      return {
        currentQueryKey: JSON.stringify([
          props.page,
          props.pageSize,
          props.searchValue,
          props.sortState.field,
          props.sortState.direction,
          props.total,
          props.documents.map((document) => document.id),
        ]),
        filters: {},
        page: props.page,
        pageSize: props.pageSize,
        query: {
          page: props.page,
          pageSize: props.pageSize,
          search: props.searchValue || undefined,
          orderBy: props.sortState.field,
          sortDirection: props.sortState.direction,
          filters: {},
        },
        search: localSearch,
        sorting,
        setFilters: () => undefined,
        setPageSize: () => undefined,
        setSearch: (value: string) => {
          setLocalSearch(value)
        },
        setSorting: (updater) => {
          const nextField = getNextSortField(sorting, updater)
          if (!nextField) {
            return
          }

          props.onSort(nextField)
        },
        goToNextPage: () => {
          props.onPageChange(props.page + 1)
        },
        goToPreviousPage: () => {
          props.onPageChange(Math.max(1, props.page - 1))
        },
      }
    }

    const sorting = toSortingState(props.sortState)

    return {
      currentQueryKey: JSON.stringify([
        clientPage,
        clientPageSize,
        props.searchValue,
        props.sortState.field,
        props.sortState.direction,
        props.documents.map((document) => document.id),
      ]),
      filters: {},
      page: clientPage,
      pageSize: clientPageSize,
      query: {
        page: clientPage,
        pageSize: clientPageSize,
        search: props.searchValue || undefined,
        orderBy: props.sortState.field,
        sortDirection: props.sortState.direction,
        filters: {},
      },
      search: props.searchValue,
      sorting,
      setFilters: () => undefined,
      setPageSize: (value: number) => {
        setClientPageSize(value)
        setClientPage(1)
      },
      setSearch: (value: string) => {
        props.onSearchChange(value)
        setClientPage(1)
      },
      setSorting: (updater) => {
        const nextField = getNextSortField(sorting, updater)
        if (!nextField) {
          return
        }

        props.onSortChange(nextField)
        setClientPage(1)
      },
      goToNextPage: () => {
        setClientPage((currentPage) => currentPage + 1)
      },
      goToPreviousPage: () => {
        setClientPage((currentPage) => Math.max(1, currentPage - 1))
      },
    }
  }, [clientPage, clientPageSize, localSearch, props, serverMode])

  return (
    <Paper
      sx={{
        borderRadius: '1rem',
        border: '1px solid rgba(53,88,52,0.125)',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ borderBottom: '1px solid rgba(53,88,52,0.125)', p: 2 }}>
        <Typography sx={{ color: '#231f20', fontSize: '1rem', fontWeight: 600 }}>{props.title}</Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
        <DocumentDataTable<Document, Record<string, never>>
          definition={{
            tableId: serverMode ? 'selection-table-server' : 'selection-table-client',
            columns,
            fetcher: (query) => {
              if (serverMode) {
                return Promise.resolve({
                  data: props.documents,
                  totalCount: props.total,
                  pageInfo: buildSelectionPageInfo(props.page, props.pageSize, props.total),
                })
              }

              return Promise.resolve(buildClientModeResult(props.documents, query))
            },
          }}
          controller={controller}
          initialData={
            serverMode
              ? {
                  data: props.documents,
                  totalCount: props.total,
                  pageInfo: buildSelectionPageInfo(props.page, props.pageSize, props.total),
                }
              : buildClientModeResult(props.documents, {
                  page: 1,
                  pageSize: 25,
                  search: props.searchValue || undefined,
                  orderBy: props.sortState.field,
                  sortDirection: props.sortState.direction,
                })
          }
          initialQuery={{
            page: 1,
            pageSize: 25,
            search: props.searchValue || undefined,
            orderBy: props.sortState.field,
            sortDirection: props.sortState.direction,
            filters: {},
          }}
          searchPlaceholder={props.searchLabel}
          emptyMessage={props.emptyMessage ?? 'No documents found.'}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={(updater) => {
            const nextSelection =
              typeof updater === 'function' ? updater(rowSelection) : updater

            props.documents.forEach((document) => {
              const previousChecked = Boolean(rowSelection[document.id])
              const nextChecked = Boolean(nextSelection[document.id])

              if (previousChecked !== nextChecked) {
                props.onToggle(document.id, nextChecked)
              }
            })
          }}
        />
      </Box>
    </Paper>
  )
}
