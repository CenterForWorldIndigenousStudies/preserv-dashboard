'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import type { MRT_ColumnDef, MRT_RowSelectionState } from 'material-react-table'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { getReadyForLibraryAction } from '@actions/ready-for-library'
import { getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { DateAtom } from '@atoms/Date'
import { StatusPill } from '@atoms/Badges/StatusPill'
import { DocumentReprocessingActions } from '@molecules/DocumentReprocessingActions'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import { useDocumentTableController } from '@organisms/DocumentTable/useDocumentTableController'
import type { DocumentTableConfig, DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { serializeStatusesParam, type AdvancedSearchFilters, type FilterOptions } from '@lib/search'
import type { ReadyForLibrarySortField } from '@lib/queries/readyForLibraryQueries'
import type { ReadyForLibraryItem } from 'types/documents'

interface ReadyForLibraryTableProps {
  initialData?: DocumentTableFetchResult<ReadyForLibraryItem>
  initialQuery: DocumentTableQuery<AdvancedSearchFilters>
  filterOptions: FilterOptions
}

export function normalizeReadyForLibrarySearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function syncReadyForLibrarySearchParam(nextParams: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    nextParams.set(key, value)
    return
  }

  nextParams.delete(key)
}

function buildDocumentDetailHref(documentId: string, returnHref: string): string {
  return getDocumentDetailPath(documentId, returnHref, PAGE_LABELS.readyForLibrary)
}

export function ReadyForLibraryTable({
  initialData,
  initialQuery,
  filterOptions,
}: ReadyForLibraryTableProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const controller = useDocumentTableController<AdvancedSearchFilters>({ initialQuery })
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({})
  const selectedDocumentIds = Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([documentId]) => documentId)

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString())

    nextParams.set('page', String(controller.query.page))
    nextParams.set('pageSize', String(controller.query.pageSize))
    syncReadyForLibrarySearchParam(nextParams, 'search', controller.query.search)
    syncReadyForLibrarySearchParam(
      nextParams,
      'contributor',
      controller.query.filters.contributor !== controller.query.search
        ? controller.query.filters.contributor
        : undefined,
    )
    syncReadyForLibrarySearchParam(nextParams, 'publisher', controller.query.filters.publisher)
    syncReadyForLibrarySearchParam(nextParams, 'tag', controller.query.filters.tag)
    syncReadyForLibrarySearchParam(nextParams, 'statuses', serializeStatusesParam(controller.query.filters.statuses))
    syncReadyForLibrarySearchParam(
      nextParams,
      'documentType',
      controller.query.filters.documentType === 'all' ? undefined : controller.query.filters.documentType,
    )
    syncReadyForLibrarySearchParam(nextParams, 'batch', controller.query.filters.batch)
    syncReadyForLibrarySearchParam(nextParams, 'createdFrom', controller.query.filters.createdFrom)
    syncReadyForLibrarySearchParam(nextParams, 'createdTo', controller.query.filters.createdTo)
    syncReadyForLibrarySearchParam(nextParams, 'collection', controller.query.filters.collection)
    syncReadyForLibrarySearchParam(nextParams, 'accessLevel', controller.query.filters.accessLevel)
    syncReadyForLibrarySearchParam(nextParams, 'orderBy', controller.query.orderBy)
    syncReadyForLibrarySearchParam(nextParams, 'sortDirection', controller.query.sortDirection)

    const nextSearch = nextParams.toString()
    const currentSearch = searchParams.toString()

    if (nextSearch !== currentSearch) {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false })
    }
  }, [controller.query, pathname, router, searchParams])

  const preservedOverviewHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])

  const columns = useMemo<MRT_ColumnDef<ReadyForLibraryItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => {
          const value = row.original.name
          if (!value) return '—'
          return (
            <Link
              href={buildDocumentDetailHref(row.original.id, preservedOverviewHref)}
              style={{ color: 'var(--cwis-action-primary)' }}
            >
              {value}
            </Link>
          )
        },
      },
      {
        accessorKey: 'validation_status',
        header: 'Validation Status',
        size: 160,
        Cell: ({ renderedCellValue }) => {
          const value = String((renderedCellValue as string | null) ?? '').trim()
          return value ? <StatusPill status={value} /> : '—'
        },
      },
      {
        accessorKey: 'validation_timestamp',
        header: 'Validation Timestamp',
        size: 180,
        Cell: ({ renderedCellValue }) => (
          <DateAtom value={renderedCellValue as ReadyForLibraryItem['validation_timestamp']} />
        ),
      },
      {
        accessorKey: 'access_level',
        header: 'Access Level',
        size: 140,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—'),
      },
      {
        accessorKey: 'metadata_complete',
        header: 'Metadata Complete',
        size: 160,
        Cell: ({ renderedCellValue }) => {
          const value = Boolean(renderedCellValue)
          return value ? 'Complete' : 'Incomplete'
        },
      },
    ],
    [preservedOverviewHref],
  )

  const tableConfig: DocumentTableConfig<ReadyForLibraryItem, AdvancedSearchFilters> = {
    definition: {
      tableId: 'ready-for-library-documents',
      columns,
      fetcher: async (query) => {
        const result = await getReadyForLibraryAction({
          ...query.filters,
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          orderBy: query.orderBy as ReadyForLibrarySortField,
          sortDirection: query.sortDirection,
        })
        const offset = (query.page - 1) * query.pageSize

        return {
          data: result.items,
          totalCount: result.total,
          pageInfo: {
            pageSize: query.pageSize,
            hasNextPage: offset + result.items.length < result.total,
            hasPreviousPage: query.page > 1,
            startCursor: null,
            endCursor: null,
          },
        }
      },
    },
    emptyMessage: 'No documents currently meet the dashboard-visible library eligibility criteria.',
    searchPlaceholder: 'Search ready for library...',
    searchDebounceMs: 300,
    advancedSearch: {
      filters: controller.filters,
      filterOptions,
      onApply: controller.setFilters,
    },
    trailingToolbarSlot: <DocumentReprocessingActions documentIds={selectedDocumentIds} />,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  }

  return (
    <DocumentTable config={tableConfig} controller={controller} initialData={initialData} initialQuery={initialQuery} />
  )
}
