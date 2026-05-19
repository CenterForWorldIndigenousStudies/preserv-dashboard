'use client'

import { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
} from 'material-react-table'

import { KeyValueRow } from '@molecules/KeyValueRow'
import { NestedValueRenderer } from '@molecules/NestedValueRenderer'
import type { BatchSummary } from 'types/batches'

interface BatchSummaryTableProps {
  data: BatchSummary[]
}

interface BatchSummaryGroup {
  batch_id: string
  batch_name: string | null
  batch_id_legacy: string | null
  propertyCount: number
}

// ---------------------------------------------------------------------------
// Local utilities for BatchSummary-specific data access
// ---------------------------------------------------------------------------

function truncateBatchId(batchId: string): string {
  return batchId.length > 12 ? `${batchId.slice(0, 12)}...` : batchId
}

function parsePropertyValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return value
  }
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  if (!looksLikeJson) {
    return value
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return value
  }
}

function findNestedValueByKey(value: unknown, targetKey: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value as unknown[]) {
      const found = findNestedValueByKey(item, targetKey)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if (targetKey in record) {
      return record[targetKey]
    }
    for (const nestedValue of Object.values(record)) {
      const found = findNestedValueByKey(nestedValue, targetKey)
      if (found !== undefined) return found
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// BatchDetailPanel — renders a single batch's metadata in an accordion pane
// ---------------------------------------------------------------------------

function BatchDetailPanel({ rows }: { rows: BatchSummary[] }): React.ReactElement {
  const batchName = rows[0]?.batch_name ?? null
  const batchId = rows[0]?.batch_id ?? '-'
  const batchIdLegacy = rows[0]?.batch_id_legacy ?? null

  const startedAt = rows.reduce<unknown>((found, row) => {
    if (found !== undefined) return found
    if (row.property_key === 'started_at') {
      return row.property_value
    }
    return findNestedValueByKey(parsePropertyValue(row.property_value), 'started_at')
  }, undefined)

  return (
    <Box
      sx={{
        mx: 2,
        mb: 2,
        borderRadius: '0.75rem',
        border: '1px solid rgba(53,88,52,0.12)',
        backgroundColor: 'rgba(244,241,240,0.65)',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#355834',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              mb: 1,
            }}
          >
            Batch Info
          </Typography>
          <Stack divider={<Divider flexItem sx={{ borderColor: 'rgba(53,88,52,0.08)' }} />}>
            <KeyValueRow label="batch_id" value={batchId} />
            <KeyValueRow label="Batch ID (Legacy)" value={batchIdLegacy} />
            <KeyValueRow label="batch_name" value={batchName} />
            <KeyValueRow label="started_at" value={startedAt} />
          </Stack>
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#355834',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              mb: 1,
            }}
          >
            Processing Details
          </Typography>
          <Stack divider={<Divider flexItem sx={{ borderColor: 'rgba(53,88,52,0.08)' }} />}>
            {rows.map((propertyRow) => {
              const parsedValue = parsePropertyValue(propertyRow.property_value)
              const isComplex =
                typeof parsedValue === 'object' &&
                parsedValue !== null &&
                !Array.isArray(parsedValue)

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
                <Accordion
                  key={`${propertyRow.batch_id}-${propertyRow.property_key}`}
                  disableGutters
                  elevation={0}
                  sx={{
                    backgroundColor: 'transparent',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />}
                    sx={{
                      px: 0,
                      minHeight: 'unset',
                      '& .MuiAccordionSummary-content': { my: 0.5 },
                      '&.Mui-expanded': { minHeight: 'unset' },
                      '&.Mui-expanded .MuiAccordionSummary-content': { my: 0.5 },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#355834',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {propertyRow.property_key}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0, pb: 0.5 }}>
                    <NestedValueRenderer value={parsedValue} />
                  </AccordionDetails>
                </Accordion>
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

export function BatchSummaryTable({ data }: BatchSummaryTableProps) {
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
      batch_id_legacy: rows[0]?.batch_id_legacy ?? null,
      propertyCount: rows.length,
    }))
  }, [groupedBatches])

  const columns = useMemo<MRT_ColumnDef<BatchSummaryGroup>[]>(
    () => [
      {
        accessorKey: 'batch_name',
        header: 'Batch Name',
        size: 320,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700, color: '#231f20' }}>{row.original.batch_name ?? '-'}</Typography>
            <Chip
              label={`${row.original.propertyCount} ${row.original.propertyCount === 1 ? 'property' : 'properties'}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(53,88,52,0.12)',
                color: '#355834',
                fontWeight: 600,
              }}
            />
          </Box>
        ),
      },
      {
        accessorKey: 'batch_id',
        header: 'Batch ID',
        size: 180,
        Cell: ({ row }) => (
          <Typography sx={{ fontFamily: 'monospace', color: '#231f20' }} title={row.original.batch_id}>
            {truncateBatchId(row.original.batch_id)}
          </Typography>
        ),
      },
      {
        accessorKey: 'batch_id_legacy',
        header: 'Legacy Batch ID',
        size: 180,
        Cell: ({ row }) => (
          <Typography sx={{ fontFamily: 'monospace', color: '#231f20' }}>
            {row.original.batch_id_legacy ?? '-'}
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
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    renderDetailPanel: ({ row }) => <BatchDetailPanel rows={groupedBatches.get(row.original.batch_id) ?? []} />,
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
    muiTableBodyCellProps: ({ row }) => ({
      sx: {
        color: '#231f20',
        fontSize: '0.875rem',
        fontWeight: row.getCanExpand() ? 600 : 400,
        backgroundColor: row.getIsExpanded() ? 'rgba(53,88,52,0.04)' : 'inherit',
      },
    }),
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        backgroundColor: row.getIsExpanded() ? 'rgba(53,88,52,0.04)' : 'rgba(244,241,240,0.45)',
        '&:hover': { backgroundColor: 'rgba(53,88,52,0.08)' },
      },
    }),
    muiDetailPanelProps: { sx: { backgroundColor: 'transparent' } },
    muiTableContainerProps: {
      sx: { borderRadius: '0.75rem', border: '1px solid rgba(53,88,52,0.125)' },
    },
    muiSearchTextFieldProps: {
      placeholder: 'Search batches...',
      sx: {
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(53,88,52,0.25)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#355834' },
      },
    },
    localization: {
      noRecordsToDisplay: 'No batch data found.',
      search: 'Search',
    },
    getRowId: (row) => row.batch_id,
  })

  return <MaterialReactTable table={table} />
}
