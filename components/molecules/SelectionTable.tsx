'use client'

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

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

export function sortDocuments(documents: Document[], sortState: SelectionSortState): Document[] {
  return [...documents].sort((left, right) => {
    const leftValue = getComparableValue(left, sortState.field)
    const rightValue = getComparableValue(right, sortState.field)

    if (leftValue < rightValue) return sortState.direction === 'asc' ? -1 : 1
    if (leftValue > rightValue) return sortState.direction === 'asc' ? 1 : -1
    return (left.name ?? '').localeCompare(right.name ?? '') || left.id.localeCompare(right.id)
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

const HEADERS: Array<{ field: SelectionSortField; label: string; align?: 'left' | 'right' }> = [
  { field: 'name', label: 'Name' },
  { field: 'id_legacy', label: 'Legacy ID' },
  { field: 'filesize', label: 'File Size', align: 'right' },
  { field: 'created_at', label: 'Created' },
]

export function SelectionTable(props: SelectionTableProps): ReactElement {
  const serverProps = 'onSearch' in props ? (props as ServerModeProps) : undefined
  const clientProps = serverProps ? undefined : (props as ClientModeProps)
  const activeProps = serverProps ?? clientProps!
  const serverMode = Boolean(serverProps)
  const [localSearch, setLocalSearch] = useState(props.searchValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (serverProps) {
      setLocalSearch(serverProps.searchValue)
    }
  }, [serverProps])

  useEffect(() => {
    if (!serverProps) {
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (localSearch === serverProps.searchValue) {
      return
    }

    debounceRef.current = setTimeout(() => {
      serverProps.onSearch(localSearch)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [localSearch, serverProps])

  const filteredDocuments = useMemo(() => {
    if (serverProps) {
      return serverProps.documents
    }

    return sortDocuments(filterDocuments(clientProps!.documents, clientProps!.searchValue), clientProps!.sortState)
  }, [clientProps, serverProps])

  const parentRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(520)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(Math.max(100, entry.contentRect.height - 8))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: filteredDocuments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  useEffect(() => {
    const raf = requestAnimationFrame(() => rowVirtualizer.measure())
    return () => cancelAnimationFrame(raf)
  }, [rowVirtualizer])

  const total: number = serverProps ? serverProps.total : filteredDocuments.length
  const page: number = serverProps ? serverProps.page : 1
  const pageSize: number = serverProps ? serverProps.pageSize : Math.max(filteredDocuments.length, 1)
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = total === 0 ? 0 : Math.min(page * pageSize, total)
  const searchValue = serverMode ? localSearch : props.searchValue
  const sortState = serverMode ? serverProps!.sortState : clientProps!.sortState

  return (
    <Paper sx={{ borderRadius: '1rem', border: '1px solid rgba(53,88,52,0.125)', overflow: 'hidden' }}>
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
            } else {
              clientProps!.onSearchChange(event.target.value)
            }
          }}
          sx={{ mt: 2 }}
        />
      </Box>

      <TableContainer ref={parentRef} sx={{ maxHeight: containerHeight, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ backgroundColor: '#f4f1f0' }}>
                Select
              </TableCell>
              {HEADERS.map((header) => (
                <TableCell
                  key={header.field}
                  align={header.align}
                  sx={{
                    backgroundColor: '#f4f1f0',
                    color: '#231f20',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  <TableSortLabel
                    active={sortState.field === header.field}
                    direction={sortState.field === header.field ? sortState.direction : 'asc'}
                    onClick={() => {
                      if (serverMode) {
                        serverProps!.onSort(header.field)
                      } else {
                        clientProps!.onSortChange(header.field)
                      }
                    }}
                  >
                    {header.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody sx={{ position: 'relative', display: 'block' }}>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'rgba(35,31,32,0.7)', py: 3, textAlign: 'center' }}>
                  {activeProps.emptyMessage ?? 'No documents found.'}
                </TableCell>
              </TableRow>
            ) : virtualRows.length > 0 ? (
              virtualRows.map((virtualRow) => {
                const document = filteredDocuments[virtualRow.index]
                const checked = activeProps.isChecked(document.id)
                return (
                  <TableRow
                    key={document.id}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      '& td': {
                        backgroundColor: virtualRow.index % 2 === 1 ? 'rgba(244,241,240,0.3)' : 'transparent',
                      },
                    }}
                    hover
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={checked} onChange={(event) => activeProps.onToggle(document.id, event.target.checked)} />
                    </TableCell>
                    <TableCell>{document.name ?? 'Untitled document'}</TableCell>
                    <TableCell>{document.id_legacy ?? '—'}</TableCell>
                    <TableCell align="right">
                      <FileSize value={document.filesize} />
                    </TableCell>
                    <TableCell>
                      <DateAtom value={document.created_at} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              filteredDocuments.map((document, index) => {
                const checked = activeProps.isChecked(document.id)
                return (
                  <TableRow key={document.id} hover sx={{ backgroundColor: index % 2 === 1 ? 'rgba(244,241,240,0.3)' : 'transparent' }}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={checked} onChange={(event) => activeProps.onToggle(document.id, event.target.checked)} />
                    </TableCell>
                    <TableCell>{document.name ?? 'Untitled document'}</TableCell>
                    <TableCell>{document.id_legacy ?? '—'}</TableCell>
                    <TableCell align="right">
                      <FileSize value={document.filesize} />
                    </TableCell>
                    <TableCell>
                      <DateAtom value={document.created_at} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {serverMode ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderTop: '1px solid rgba(53,88,52,0.125)' }}>
          <Typography variant="body2">Showing {start}-{end} of {total}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => serverProps!.onPageChange(page - 1)}>
              Prev
            </Button>
            <Button size="small" variant="outlined" disabled={end >= total} onClick={() => serverProps!.onPageChange(page + 1)}>
              Next
            </Button>
          </Box>
        </Box>
      ) : null}
    </Paper>
  )
}
