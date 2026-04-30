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
import type { BatchSummary } from '@lib/types'

interface BatchSummaryTableProps {
  data: BatchSummary[]
}

interface BatchSummaryGroup {
  batch_id: string
  batch_name: string | null
  batch_id_legacy: string | null
  propertyCount: number
}

function isPrimitiveValue(value: unknown): value is string | number | boolean | null | undefined {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePropertyValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return value
  }

  const looksLikeJson =
    (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
    (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))

  if (!looksLikeJson) {
    return value
  }

  try {
    return JSON.parse(trimmedValue) as unknown
  } catch {
    return value
  }
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value) || isRecord(value)) {
    try {
      return JSON.stringify(value)
    } catch {
      return '[complex value]'
    }
  }

  return '-'
}

function truncateBatchId(batchId: string): string {
  return batchId.length > 12 ? `${batchId.slice(0, 12)}...` : batchId
}

function findNestedValueByKey(value: unknown, targetKey: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedValue = findNestedValueByKey(item, targetKey)
      if (nestedValue !== undefined) {
        return nestedValue
      }
    }

    return undefined
  }

  if (isRecord(value)) {
    if (targetKey in value) {
      return value[targetKey]
    }

    for (const nestedValue of Object.values(value)) {
      const result = findNestedValueByKey(nestedValue, targetKey)
      if (result !== undefined) {
        return result
      }
    }
  }

  return undefined
}

function KeyValueRow({
  label,
  value,
  level = 0,
}: {
  label: string
  value: unknown
  level?: number
}) {
  const displayValue = formatDisplayValue(value)
  const useMonospace = typeof value === 'string' && value.length > 32

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(12rem, 16rem) 1fr' },
        gap: 1.5,
        py: 1,
        pl: level * 2,
        borderLeft: level > 0 ? '2px solid rgba(53,88,52,0.12)' : 'none',
      }}
    >
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#231f20' }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: '0.875rem',
          color: '#231f20',
          fontFamily: useMonospace ? 'monospace' : 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  )
}

function NestedValueRenderer({ value, level = 1 }: { value: unknown; level?: number }) {
  if (Array.isArray(value)) {
    const arrayValues = value as unknown[]

    if (arrayValues.length === 0) {
      return <KeyValueRow label="0" value="[]" level={level} />
    }

    return arrayValues.map((item, index) => {
      if (isPrimitiveValue(item)) {
        return <KeyValueRow key={`${level}-${index}`} label={String(index)} value={item} level={level} />
      }

      return (
        <Box key={`${level}-${index}`} sx={{ pl: level * 2, py: 0.5 }}>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#355834',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {index}
          </Typography>
          <NestedValueRenderer value={item} level={level + 1} />
        </Box>
      )
    })
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return <KeyValueRow label="value" value="{}" level={level} />
    }

    return entries.map(([nestedKey, nestedValue]) => {
      if (isPrimitiveValue(nestedValue)) {
        return <KeyValueRow key={`${level}-${nestedKey}`} label={nestedKey} value={nestedValue} level={level} />
      }

      return (
        <Box key={`${level}-${nestedKey}`} sx={{ pl: level * 2, py: 0.5 }}>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#355834',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {nestedKey}
          </Typography>
          <NestedValueRenderer value={nestedValue} level={level + 1} />
        </Box>
      )
    })
  }

  return <KeyValueRow label="value" value={value} level={level} />
}

function BatchDetailPanel({ rows }: { rows: BatchSummary[] }) {
  const batchName = rows[0]?.batch_name ?? null
  const batchId = rows[0]?.batch_id ?? '-'
  const batchIdLegacy = rows[0]?.batch_id_legacy ?? null

  const startedAt = rows.reduce<unknown>((foundValue, row) => {
    if (foundValue !== undefined) {
      return foundValue
    }

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

              if (isPrimitiveValue(parsedValue)) {
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
                      '& .MuiAccordionSummary-content': {
                        my: 0.5,
                      },
                      '&.Mui-expanded': {
                        minHeight: 'unset',
                      },
                      '&.Mui-expanded .MuiAccordionSummary-content': {
                        my: 0.5,
                      },
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

export function BatchSummaryTable({ data }: BatchSummaryTableProps) {
  const [sorting, setSorting] = useState<MRT_SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const groupedBatches = useMemo(() => {
    const groupedRows = new Map<string, BatchSummary[]>()

    for (const row of data) {
      const existingRows = groupedRows.get(row.batch_id) ?? []
      existingRows.push(row)
      groupedRows.set(row.batch_id, existingRows)
    }

    return groupedRows
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
        Cell: ({ row }) => {
          const batchId = row.original.batch_id

          return (
            <Typography sx={{ fontFamily: 'monospace', color: '#231f20' }} title={batchId}>
              {truncateBatchId(batchId)}
            </Typography>
          )
        },
      },
      {
        accessorKey: 'batch_id_legacy',
        header: 'Legacy Batch ID',
        size: 180,
        Cell: ({ row }) => {
          const batchIdLegacy = row.original.batch_id_legacy

          return (
            <Typography sx={{ fontFamily: 'monospace', color: '#231f20' }} title={batchIdLegacy ?? '-'}>
              {batchIdLegacy ?? '-'}
            </Typography>
          )
        },
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
    muiDetailPanelProps: {
      sx: {
        backgroundColor: 'transparent',
      },
    },
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
