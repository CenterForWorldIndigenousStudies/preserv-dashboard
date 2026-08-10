'use client'

import { useMemo, useState } from 'react'
import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ExpandedState,
  type MRT_SortingState,
} from 'material-react-table'

import { DateAtom } from '@atoms/Date'
import { KeyValueRow } from '@molecules/KeyValueRow'
import { NestedValueRenderer } from '@molecules/NestedValueRenderer'
import { AccordionPanel } from '@molecules/AccordionPanel'
import type { BatchSummary } from 'types/batches'

interface BatchSummaryTableProps {
  data: BatchSummary[]
  initialExpandedBatchId?: string
  requestedBatchFound?: boolean
}

interface BatchSummaryGroup {
  batch_id: string
  batch_name: string | null
  propertyCount: number
}

export function getInitialExpandedBatchState(
  batchIds: readonly string[],
  requestedBatchId?: string,
): MRT_ExpandedState {
  if (!requestedBatchId || !batchIds.includes(requestedBatchId)) {
    return {}
  }

  return { [requestedBatchId]: true }
}

// ---------------------------------------------------------------------------
// Local utilities for BatchSummary-specific data access
// ---------------------------------------------------------------------------

function parsePropertyValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return value
  }
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  if (!looksLikeJson) {
    return value
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return value
  }
}

// ---------------------------------------------------------------------------
// BatchDetailPanel — renders a single batch's metadata in an accordion pane
// ---------------------------------------------------------------------------

function BatchDetailPanel({ rows }: { rows: BatchSummary[] }): React.ReactElement {
  const batchName = rows[0]?.batch_name ?? null
  const batchId = rows[0]?.batch_id ?? '-'
  const startedAt = rows[0]?.started_at ?? 'Unknown'

  return (
    <Box
      sx={(theme: Theme) => {
        const primaryColor = theme.palette.primary.main
        const panelColor = theme.palette.background.default

        return {
          mx: 0,
          mb: 2,
          border: 1,
          borderColor: alpha(primaryColor, 0.15),
          backgroundColor: panelColor,
          p: { xs: 2, sm: 3 },
        }
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              mb: 1,
            }}
          >
            Batch Drill-In
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
            Inspect the current repository-backed details for this batch from the monitoring workspace.
          </Typography>
          <Stack
            divider={
              <Divider flexItem sx={(theme: Theme) => ({ borderColor: alpha(theme.palette.primary.main, 0.08) })} />
            }
          >
            <KeyValueRow label={'ID'} value={batchId} />
            <KeyValueRow label={'Name'} value={batchName} />
            <KeyValueRow label={'Started At'} value={<DateAtom value={startedAt} />} />
          </Stack>
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              mb: 1,
            }}
          >
            {'Processing Details'}
          </Typography>
          <Stack spacing={1.5}>
            {rows.map((propertyRow) => {
              const parsedValue = parsePropertyValue(propertyRow.property_value)
              const isComplex = typeof parsedValue === 'object' && parsedValue !== null && !Array.isArray(parsedValue)

              if (!isComplex) {
                return (
                  <KeyValueRow
                    key={`${propertyRow.batch_id}-${propertyRow.property_key}`}
                    label={propertyRow.property_key}
                    value={parsedValue}
                  />
                )
              }

              return (
                <AccordionPanel
                  key={`${propertyRow.batch_id}-${propertyRow.property_key}`}
                  summary={
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'primary.main',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {propertyRow.property_key}
                    </Typography>
                  }
                  summarySx={{ px: 1.5, '& .MuiAccordionSummary-content': { my: 1 } }}
                  detailsSx={{ px: 1.5, pt: 0, pb: 1.5 }}
                >
                  <NestedValueRenderer value={parsedValue} />
                </AccordionPanel>
              )
            })}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// BatchSummaryTable
// ---------------------------------------------------------------------------

export function BatchSummaryTable({
  data,
  initialExpandedBatchId,
  requestedBatchFound = true,
}: BatchSummaryTableProps) {
  const [sorting, setSorting] = useState<MRT_SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const groupedBatches = useMemo(() => {
    const map = new Map<string, BatchSummary[]>()
    for (const row of data) {
      const existing = map.get(row.batch_id) ?? []
      existing.push(row)
      map.set(row.batch_id, existing)
    }
    return map
  }, [data])

  const tableData = useMemo<BatchSummaryGroup[]>(() => {
    return Array.from(groupedBatches.entries()).map(([batchId, rows]) => ({
      batch_id: batchId,
      batch_name: rows[0]?.batch_name ?? null,
      propertyCount: rows.length,
    }))
  }, [groupedBatches])

  const initialExpandedState = useMemo(
    () =>
      getInitialExpandedBatchState(
        tableData.map((row) => row.batch_id),
        initialExpandedBatchId,
      ),
    [initialExpandedBatchId, tableData],
  )
  const [expanded, setExpanded] = useState<MRT_ExpandedState>(initialExpandedState)

  const columns = useMemo<MRT_ColumnDef<BatchSummaryGroup>[]>(
    () => [
      {
        accessorKey: 'batch_name',
        header: 'Batch',
        size: 320,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{row.original.batch_name ?? '-'}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.25 }}>
                {`Batch ID: ${row.original.batch_id}`}
              </Typography>
            </Box>
            <Chip
              label={`${row.original.propertyCount} ${row.original.propertyCount === 1 ? 'property' : 'properties'}`}
              size={'small'}
              sx={{
                backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                fontWeight: 600,
              }}
            />
            {row.original.batch_id === initialExpandedBatchId ? (
              <Chip label={'Requested batch'} size={'small'} color={'primary'} variant={'outlined'} />
            ) : null}
          </Box>
        ),
      },
      {
        id: 'inspection',
        header: 'Inspection',
        size: 220,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: () => (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {'Expand to inspect batch details'}
          </Typography>
        ),
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data: tableData,
    enableExpanding: true,
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    renderDetailPanel: ({ row }) => <BatchDetailPanel rows={groupedBatches.get(row.original.batch_id) ?? []} />,
    state: { sorting, globalFilter, expanded },
    initialState: { expanded: initialExpandedState },
    muiTablePaperProps: {
      sx: {
        backgroundColor: 'transparent',
        border: 0,
        boxShadow: 'none',
      },
    },
    muiTableBodyProps: {
      sx: {
        backgroundColor: 'transparent',
      },
    },
    muiTableHeadCellProps: {
      sx: (theme: Theme) => {
        const borderColor = alpha(theme.palette.primary.main, 0.15)

        return {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderBottom: 1,
          borderColor,
          '&:first-of-type': {
            borderLeft: 1,
            borderColor,
            borderBottomLeftRadius: 24,
          },
          '&:last-of-type': {
            borderRight: 1,
            borderColor,
            borderBottomRightRadius: 24,
          },
        }
      },
    },
    muiTableBodyCellProps: ({ row }) => ({
      sx: (theme: Theme) => {
        const borderColor = alpha(theme.palette.primary.main, 0.15)
        const isExpanded = row.getIsExpanded()

        return {
          color: theme.palette.text.primary,
          fontSize: '0.875rem',
          fontWeight: row.getCanExpand() ? 600 : 400,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderBottom: isExpanded ? 0 : 1,
          borderColor,
          '&:first-of-type': {
            borderLeft: 1,
            borderColor,
            borderTopLeftRadius: 24,
            borderBottomLeftRadius: isExpanded ? 0 : 24,
          },
          '&:last-of-type': {
            borderRight: 1,
            borderColor,
            borderTopRightRadius: 24,
            borderBottomRightRadius: isExpanded ? 0 : 24,
          },
        }
      },
    }),
    muiTableBodyRowProps: ({ row }) => ({
      'data-requested-batch': row.original.batch_id === initialExpandedBatchId ? 'true' : undefined,
      sx: (theme: Theme) => {
        return {
          '&:hover > td': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
          ...(row.original.batch_id === initialExpandedBatchId
            ? { '& > td:first-of-type': { borderLeft: `3px solid ${theme.palette.primary.main}` } }
            : {}),
        }
      },
    }),
    muiDetailPanelProps: {
      sx: (theme: Theme) => {
        const borderColor = alpha(theme.palette.primary.main, 0.15)

        return {
          backgroundColor: 'background.paper',
          borderLeft: 1,
          borderRight: 1,
          borderColor,
          borderRadius: '0  0 24px 24px',
          '& > td': {
            backgroundColor: 'transparent',
            border: 0,
            p: 0,
          },
        }
      },
    },
    muiTableContainerProps: {
      sx: { backgroundColor: 'transparent', borderRadius: 0, border: 0, overflow: 'visible' },
    },
    muiSearchTextFieldProps: {
      placeholder: 'Search batches...',
      sx: {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.25),
        },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
      },
    },
    localization: {
      noRecordsToDisplay: 'No batch data found.',
      search: 'Search',
    },
    getRowId: (row) => row.batch_id,
  })

  return (
    <Stack spacing={2}>
      {requestedBatchFound === false && initialExpandedBatchId ? (
        <Alert severity={'warning'}>{`Batch “${initialExpandedBatchId}” was not found.`}</Alert>
      ) : null}
      <Box>
        <Typography sx={{ color: 'text.primary', fontWeight: 600 }}>{'Primary batch drill-in starts here.'}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 0.75 }}>
          {'Expand a batch row to inspect the current repository-backed processing details for that run.'}
        </Typography>
      </Box>
      <MaterialReactTable table={table} />
    </Stack>
  )
}
