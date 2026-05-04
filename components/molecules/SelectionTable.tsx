'use client'

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Box from '@mui/material/Box'
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

// ---------------------------------------------------------------------------
// Shared sort/filter types and utilities
// Used by SelectionTable and any other list UI that needs client-side
// name/id/size/date sorting and substring search.
// ---------------------------------------------------------------------------

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
  if (field === 'filesize') {
    return document.filesize ?? -1
  }

  if (field === 'created_at') {
    const rawValue = document.created_at
    return rawValue ? new Date(rawValue).getTime() : 0
  }

  if (field === 'id_legacy') {
    return document.id_legacy?.toLowerCase() ?? ''
  }

  return document.name?.toLowerCase() ?? ''
}

export function sortDocuments(documents: Document[], sortState: SelectionSortState): Document[] {
  return [...documents].sort((left, right) => {
    const leftValue = getComparableValue(left, sortState.field)
    const rightValue = getComparableValue(right, sortState.field)

    if (leftValue < rightValue) {
      return sortState.direction === 'asc' ? -1 : 1
    }

    if (leftValue > rightValue) {
      return sortState.direction === 'asc' ? 1 : -1
    }

    return (left.name ?? '').localeCompare(right.name ?? '') || left.id.localeCompare(right.id)
  })
}

export function filterDocuments(documents: Document[], query: string): Document[] {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return documents
  }

  return documents.filter((document) => {
    const name = normalizeSearchValue(document.name)
    const legacyId = normalizeSearchValue(document.id_legacy)
    return name.includes(normalizedQuery) || legacyId.includes(normalizedQuery)
  })
}

// ---------------------------------------------------------------------------
// SelectionTable
// A simple MUI table for selecting documents from a list with local search,
// sort, and checkbox state managed by the parent.
// ---------------------------------------------------------------------------

interface SelectionTableProps {
  title: string
  searchLabel: string
  documents: Document[]
  searchValue: string
  onSearchChange: (value: string) => void
  sortState: SelectionSortState
  onSortChange: (field: SelectionSortField) => void
  isChecked: (documentId: string) => boolean
  onToggle: (documentId: string, checked: boolean) => void
  emptyMessage?: string
}

const HEADERS: Array<{ field: SelectionSortField; label: string; align?: 'left' | 'right' }> = [
  { field: 'name', label: 'Name' },
  { field: 'id_legacy', label: 'Legacy ID' },
  { field: 'filesize', label: 'File Size', align: 'right' },
  { field: 'created_at', label: 'Created' },
]

export function SelectionTable({
  title,
  searchLabel,
  documents,
  searchValue,
  onSearchChange,
  sortState,
  onSortChange,
  isChecked,
  onToggle,
  emptyMessage = 'No documents found.',
}: SelectionTableProps): ReactElement {
  const filteredDocuments = useMemo(
    () => sortDocuments(filterDocuments(documents, searchValue), sortState),
    [documents, searchValue, sortState],
  )

  const parentRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(420)

  // Measure the available height so the virtualizer and Dialog can expand appropriately.
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

  // After the scroll container is mounted, force the virtualizer to remeasure
  // now that it knows the actual height of the scroll area.
  useEffect(() => {
    const raf = requestAnimationFrame(() => rowVirtualizer.measure())
    return () => cancelAnimationFrame(raf)
  }, [rowVirtualizer])

  return (
    <Paper sx={{ borderRadius: '1rem', border: '1px solid rgba(53,88,52,0.125)', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: '1px solid rgba(53,88,52,0.125)', p: 2 }}>
        <Typography sx={{ color: '#231f20', fontSize: '1rem', fontWeight: 600 }}>{title}</Typography>
        <TextField
          fullWidth
          size="small"
          label={searchLabel}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
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
                    onClick={() => onSortChange(header.field)}
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
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : virtualRows.length > 0 ? (
              virtualRows.map((virtualRow) => {
                const document = filteredDocuments[virtualRow.index]
                const checked = isChecked(document.id)
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
                      <Checkbox checked={checked} onChange={(event) => onToggle(document.id, event.target.checked)} />
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
            ) : filteredDocuments.map((document, index) => {
              const checked = isChecked(document.id)
              return (
                <TableRow key={document.id} hover sx={{ backgroundColor: index % 2 === 1 ? 'rgba(244,241,240,0.3)' : 'transparent' }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={checked} onChange={(event) => onToggle(document.id, event.target.checked)} />
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
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}