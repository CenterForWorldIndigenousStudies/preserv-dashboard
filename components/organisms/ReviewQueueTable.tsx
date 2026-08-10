'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
} from 'material-react-table'
import Link from 'next/link'
import { getReviewQueueAction } from '@actions/review-queue'
import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { DOCUMENTS_PATH } from '@constants/paths'
import type { PagedResult } from 'types/pagination'
import type { ReviewQueueDocumentsQueryParams, ReviewQueueItem, ReviewQueueSortField } from 'types/reviewQueue'

interface ReviewQueueTableProps {
  initialData?: PagedResult<ReviewQueueItem>
}

type ReviewQueueBooleanFilter = 'all' | 'true' | 'false'

const DEFAULT_PAGE_SIZE = 25
const DEFAULT_SORTING: MRT_SortingState = [{ id: 'name', desc: false }]

function parseBooleanFilter(value: ReviewQueueBooleanFilter): boolean | undefined {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}

function getStatusBadgeVariant(status: string | null): BadgeVariant {
  switch ((status ?? '').toUpperCase()) {
    case 'NEEDS_REVISION':
      return 'danger'
    case 'IN_PROGRESS':
      return 'info'
    case 'APPROVED':
      return 'success'
    default:
      return 'neutral'
  }
}

function getBooleanBadgeVariant(value: boolean): BadgeVariant {
  return value ? 'danger' : 'neutral'
}

function getPrimarySort(sorting: MRT_SortingState): { sortBy: ReviewQueueSortField; sortDirection: 'asc' | 'desc' } {
  const [primarySort] = sorting

  if (!primarySort) {
    return { sortBy: 'name', sortDirection: 'asc' }
  }

  return {
    sortBy: primarySort.id as ReviewQueueSortField,
    sortDirection: primarySort.desc ? 'desc' : 'asc',
  }
}

export function ReviewQueueTable({ initialData }: ReviewQueueTableProps) {
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })
  const [sorting, setSorting] = useState<MRT_SortingState>(DEFAULT_SORTING)
  const [search, setSearch] = useState('')
  const [validationStatus, setValidationStatus] = useState('')
  const [needsReviewFilter, setNeedsReviewFilter] = useState<ReviewQueueBooleanFilter>('all')
  const [sensitiveFilter, setSensitiveFilter] = useState<ReviewQueueBooleanFilter>('all')
  const [rowCount, setRowCount] = useState(initialData?.total ?? 0)
  const [data, setData] = useState<ReviewQueueItem[]>(initialData?.items ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const deferredSearch = useDeferredValue(search)
  const deferredValidationStatus = useDeferredValue(validationStatus)

  const queryParams = useMemo<ReviewQueueDocumentsQueryParams>(() => {
    const { sortBy, sortDirection } = getPrimarySort(sorting)

    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: deferredSearch.trim() || undefined,
      sortBy,
      sortDirection,
      validationStatus: deferredValidationStatus.trim() || undefined,
      needsReview: parseBooleanFilter(needsReviewFilter),
      sensitive: parseBooleanFilter(sensitiveFilter),
    }
  }, [deferredSearch, deferredValidationStatus, needsReviewFilter, pagination, sensitiveFilter, sorting])

  const shouldUseInitialData =
    !!initialData &&
    pagination.pageIndex === 0 &&
    pagination.pageSize === DEFAULT_PAGE_SIZE &&
    deferredSearch.trim() === '' &&
    deferredValidationStatus.trim() === '' &&
    needsReviewFilter === 'all' &&
    sensitiveFilter === 'all' &&
    sorting.length === 1 &&
    sorting[0]?.id === 'name' &&
    sorting[0]?.desc === false

  const columns = useMemo<MRT_ColumnDef<ReviewQueueItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 140,
        Cell: ({ renderedCellValue }) => {
          const value = String((renderedCellValue as string | null) ?? '')
          return <span title={value}>{value.length > 12 ? `${value.slice(0, 12)}...` : value}</span>
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => {
          const value = row.original.name
          if (!value) {
            return <span className={'txt-muted'}>--</span>
          }

          return (
            <Link href={`${DOCUMENTS_PATH}/${row.original.id}`} className={'lnk-review-queue'}>
              {value}
            </Link>
          )
        },
      },
      {
        accessorKey: 'validation_status',
        header: 'Validation Status',
        size: 180,
        Cell: ({ row }) => {
          const value = row.original.validation_status
          if (!value) {
            return <span className={'txt-muted'}>--</span>
          }

          return <Badge variant={getStatusBadgeVariant(value)}>{value}</Badge>
        },
      },
      {
        accessorKey: 'needs_review',
        header: 'Needs Review',
        size: 140,
        Cell: ({ renderedCellValue }) => {
          const value = Boolean(renderedCellValue)
          return <Badge variant={getBooleanBadgeVariant(value)}>{value ? 'Yes' : 'No'}</Badge>
        },
      },
      {
        accessorKey: 'sensitive',
        header: 'Sensitive',
        size: 130,
        Cell: ({ renderedCellValue }) => {
          const value = Boolean(renderedCellValue)
          return <Badge variant={getBooleanBadgeVariant(value)}>{value ? 'Yes' : 'No'}</Badge>
        },
      },
      {
        accessorKey: 'queue_reasons',
        header: 'Queue Reasons',
        size: 280,
        enableSorting: false,
        Cell: ({ row }) => (
          <div className={'row-review-reasons'}>
            {row.original.queue_reasons.map((reason) => (
              <Badge key={`${row.original.id}-${reason}`} variant={'info'}>
                {reason}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'validator_name',
        header: 'Validator Name',
        size: 170,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '--'),
      },
      {
        accessorKey: 'validator_email',
        header: 'Validator Email',
        size: 210,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '--'),
      },
    ],
    [],
  )

  useEffect(() => {
    if (shouldUseInitialData && initialData) {
      setData(initialData.items)
      setRowCount(initialData.total)
      setIsLoading(false)
      setErrorMessage(null)
      return
    }

    let cancelled = false

    setIsLoading(true)
    setErrorMessage(null)

    getReviewQueueAction(queryParams)
      .then((result) => {
        if (cancelled) {
          return
        }

        setData(result.items)
        setRowCount(result.total)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error ? error.message : 'The review queue could not be loaded with the current filters.'
        setErrorMessage(message)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [initialData, queryParams, shouldUseInitialData])

  const table = useMaterialReactTable({
    columns,
    data,
    rowCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableGlobalFilter: false,
    enableColumnFilters: false,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
      isLoading,
      showProgressBars: isLoading,
    },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50, 100],
      variant: 'outlined',
    },
    muiTablePaperProps: {
      className: 'panel-review-queue panel-review-queue-table',
      elevation: 0,
    },
    muiTableContainerProps: {
      className: 'tbl-review-queue',
    },
    localization: {
      noRecordsToDisplay: 'No documents matched the current review queue filters.',
      of: 'of',
      rowsPerPage: 'Rows per page',
    },
    getRowId: (row) => row.id,
  })

  return (
    <div className={'sec-review-queue'}>
      <div className={'panel-review-queue panel-review-queue-filters'}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} className={'form-review-queue'}>
          <TextField
            label={'Search review queue'}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPagination((current) => ({ ...current, pageIndex: 0 }))
            }}
            placeholder={'Search by document, validator, status, or reason'}
            fullWidth
          />

          <TextField
            label={'Validation status'}
            value={validationStatus}
            onChange={(event) => {
              setValidationStatus(event.target.value)
              setPagination((current) => ({ ...current, pageIndex: 0 }))
            }}
            placeholder={'Example: IN_PROGRESS'}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id={'review-queue-needs-review-label'}>{'Needs review'}</InputLabel>
            <Select
              labelId={'review-queue-needs-review-label'}
              label={'Needs review'}
              value={needsReviewFilter}
              onChange={(event: SelectChangeEvent<ReviewQueueBooleanFilter>) => {
                setNeedsReviewFilter(event.target.value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
            >
              <MenuItem value={'all'}>{'All'}</MenuItem>
              <MenuItem value={'true'}>{'Yes'}</MenuItem>
              <MenuItem value={'false'}>{'No'}</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id={'review-queue-sensitive-label'}>{'Sensitive'}</InputLabel>
            <Select
              labelId={'review-queue-sensitive-label'}
              label={'Sensitive'}
              value={sensitiveFilter}
              onChange={(event: SelectChangeEvent<ReviewQueueBooleanFilter>) => {
                setSensitiveFilter(event.target.value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
            >
              <MenuItem value={'all'}>{'All'}</MenuItem>
              <MenuItem value={'true'}>{'Yes'}</MenuItem>
              <MenuItem value={'false'}>{'No'}</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Typography variant={'body2'} className={'txt-review-summary'}>
          {'Documents are queued when validation is in progress, needs revision, or metadata marks them for review.'}
        </Typography>
      </div>

      {errorMessage ? <Alert severity={'error'}>{errorMessage}</Alert> : null}

      <MaterialReactTable table={table} />
    </div>
  )
}
