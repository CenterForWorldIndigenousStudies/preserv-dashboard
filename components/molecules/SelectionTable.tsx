'use client'

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { type Updater } from '@tanstack/react-table'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
} from 'material-react-table'

import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import type { Document } from '@lib/types'

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

function getNextSortField(currentSorting: MRT_SortingState, updater: Updater<MRT_SortingState>): SelectionSortField | null {
  const nextSorting = typeof updater === 'function' ? updater(currentSorting) : updater
  const nextField = nextSorting[0]?.id ?? currentSorting[0]?.id

  return nextField ? (nextField as SelectionSortField) : null
}

export function SelectionTable(props: SelectionTableProps): ReactElement {
  const serverMode = isServerModeProps(props)
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

  const searchValue = serverMode ? localSearch : props.searchValue
  const sorting = useMemo(() => toSortingState(props.sortState), [props.sortState])

  const data = useMemo(() => {
    if (serverMode) {
      return props.documents
    }

    return filterDocuments(props.documents, props.searchValue)
  }, [props.documents, props.searchValue, serverMode])

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        id: 'selection',
        header: 'Select',
        enableSorting: false,
        grow: false,
        size: 72,
        Cell: ({ row }) => (
          <Checkbox
            checked={props.isChecked(row.original.id)}
            onChange={(event) => props.onToggle(row.original.id, event.target.checked)}
          />
        ),
        muiTableBodyCellProps: {
          padding: 'checkbox',
        },
        muiTableHeadCellProps: {
          padding: 'checkbox',
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 320,
        sortDescFirst: false,
        sortingFn: (left, right) => compareDocuments(left.original, right.original, 'name'),
        Cell: ({ row }) => row.original.name ?? 'Untitled document',
      },
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 220,
        sortDescFirst: false,
        sortingFn: (left, right) => compareDocuments(left.original, right.original, 'id_legacy'),
        Cell: ({ row }) => row.original.id_legacy ?? '-',
      },
      {
        accessorKey: 'filesize',
        header: 'File Size',
        size: 140,
        sortDescFirst: false,
        sortingFn: (left, right) => compareDocuments(left.original, right.original, 'filesize'),
        Cell: ({ row }) => <FileSize value={row.original.filesize} />,
        muiTableBodyCellProps: {
          align: 'right',
        },
        muiTableHeadCellProps: {
          align: 'right',
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 180,
        sortDescFirst: false,
        sortingFn: (left, right) => compareDocuments(left.original, right.original, 'created_at'),
        Cell: ({ row }) => <DateAtom value={row.original.created_at} />,
      },
    ],
    [props],
  )

  const table = useMaterialReactTable({
    columns,
    data,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableColumnOrdering: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: false,
    enableHiding: false,
    enableMultiSort: false,
    enablePagination: false,
    enableRowVirtualization: true,
    enableSorting: true,
    enableStickyHeader: true,
    getRowId: (row) => row.id,
    localization: {
      noRecordsToDisplay: props.emptyMessage ?? 'No documents found.',
    },
    manualFiltering: true,
    manualPagination: serverMode,
    manualSorting: serverMode,
    muiTableBodyRowProps: ({ staticRowIndex }) => ({
      sx: {
        backgroundColor: staticRowIndex % 2 === 1 ? 'rgba(244,241,240,0.3)' : 'transparent',
      },
    }),
    muiTableContainerProps: {
      sx: {
        height: '100%',
        maxHeight: 'none',
        overflow: 'auto',
      },
    },
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
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        backgroundColor: 'transparent',
        boxShadow: 'none',
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
      },
    },
    muiTableProps: {
      size: 'small',
      sx: {
        tableLayout: 'fixed',
      },
    },
    onSortingChange: (updater) => {
      const nextField = getNextSortField(sorting, updater)
      if (!nextField) {
        return
      }

      if (serverMode) {
        props.onSort(nextField)
        return
      }

      props.onSortChange(nextField)
    },
    rowVirtualizerOptions: {
      estimateSize: () => 52,
      overscan: 10,
    },
    state: {
      globalFilter: searchValue,
      sorting,
    },
  })

  const total = serverMode ? props.total : data.length
  const page = serverMode ? props.page : 1
  const pageSize = serverMode ? props.pageSize : Math.max(data.length, 1)
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = total === 0 ? 0 : Math.min(page * pageSize, total)

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
        <TextField
          fullWidth
          size="small"
          label={props.searchLabel}
          value={searchValue}
          onChange={(event) => {
            if (serverMode) {
              setLocalSearch(event.target.value)
              return
            }

            props.onSearchChange(event.target.value)
          }}
          sx={{ mt: 2 }}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <MaterialReactTable table={table} />
      </Box>

      {serverMode ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 1.5,
            borderTop: '1px solid rgba(53,88,52,0.125)',
          }}
        >
          <Typography variant="body2">
            Showing {start}-{end} of {total}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => props.onPageChange(page - 1)}>
              Prev
            </Button>
            <Button size="small" variant="outlined" disabled={end >= total} onClick={() => props.onPageChange(page + 1)}>
              Next
            </Button>
          </Box>
        </Box>
      ) : null}
    </Paper>
  )
}
