'use client'

import { useEffect, useMemo, type ReactElement } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { MRT_ColumnDef } from 'material-react-table'

import { getBatchesAction } from '@actions/batches'
import { Cost } from '@atoms/Cost'
import { DateAtom } from '@atoms/Date'
import { Badge } from '@atoms/Badges/Badge'
import { getBatchDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import type { DocumentTableConfig, DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { useDocumentTableController } from '@organisms/DocumentTable/useDocumentTableController'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { serializeStatusesParam, type FilterOptions } from '@lib/search'
import type { BatchListItem, BatchQueryFilters, BatchTableQuery } from 'types/batches'

interface BatchesTableProps {
  initialData?: DocumentTableFetchResult<BatchListItem>
  initialQuery: BatchTableQuery
  filterOptions: FilterOptions
}

function syncSearchParam(nextParams: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    nextParams.set(key, value)
    return
  }

  nextParams.delete(key)
}

function getCurrentBatchListHref(pathname: string, searchParams: URLSearchParams): string {
  const currentSearch = searchParams.toString()
  return currentSearch ? `${pathname}?${currentSearch}` : pathname
}

export function BatchesTable({ initialData, initialQuery, filterOptions }: BatchesTableProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const controller = useDocumentTableController<BatchQueryFilters>({ initialQuery })

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString())

    nextParams.set('page', String(controller.query.page))
    nextParams.set('pageSize', String(controller.query.pageSize))
    syncSearchParam(nextParams, 'search', controller.query.search)
    syncSearchParam(nextParams, 'author', controller.query.filters.author)
    syncSearchParam(nextParams, 'tag', controller.query.filters.tag)
    syncSearchParam(nextParams, 'statuses', serializeStatusesParam(controller.query.filters.statuses))
    syncSearchParam(nextParams, 'lifecycleStatuses', serializeStatusesParam(controller.query.filters.lifecycleStatuses))
    syncSearchParam(
      nextParams,
      'publicationStatuses',
      serializeStatusesParam(controller.query.filters.publicationStatuses),
    )
    syncSearchParam(
      nextParams,
      'documentType',
      controller.query.filters.documentType === 'all' ? undefined : controller.query.filters.documentType,
    )
    syncSearchParam(nextParams, 'batch', controller.query.filters.batch)
    syncSearchParam(nextParams, 'createdFrom', controller.query.filters.createdFrom)
    syncSearchParam(nextParams, 'createdTo', controller.query.filters.createdTo)
    syncSearchParam(nextParams, 'collection', controller.query.filters.collection)
    syncSearchParam(nextParams, 'accessLevel', controller.query.filters.accessLevel)
    syncSearchParam(nextParams, 'orderBy', controller.query.orderBy)
    syncSearchParam(nextParams, 'sortDirection', controller.query.sortDirection)
    syncSearchParam(nextParams, 'cursorValue', controller.query.cursorValue)
    syncSearchParam(nextParams, 'cursorId', controller.query.cursorId)
    syncSearchParam(nextParams, 'cursorDirection', controller.query.cursorDirection)

    const nextSearch = nextParams.toString()
    const currentSearch = searchParams.toString()
    if (nextSearch !== currentSearch) {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false })
    }
  }, [controller.query, pathname, router, searchParams])

  const currentBatchListHref = useMemo(() => getCurrentBatchListHref(pathname, searchParams), [pathname, searchParams])

  const columns = useMemo<MRT_ColumnDef<BatchListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Batch',
        size: 360,
        Cell: ({ row }) => (
          <EntityNameBlock
            name={row.original.name}
            id={row.original.id}
            legacyId={row.original.idLegacy}
            fallbackName={'Untitled batch'}
            href={getBatchDetailPath(row.original.id, currentBatchListHref, PAGE_LABELS.batches)}
          />
        ),
      },
      {
        accessorKey: 'lifecycleStatus',
        header: 'Status',
        size: 170,
        enableSorting: false,
        Cell: ({ row }) => (
          <Badge
            variant={
              row.original.lifecycleStatus === 'failed'
                ? 'danger'
                : row.original.lifecycleStatus === 'complete'
                  ? 'success'
                  : 'neutral'
            }
          >
            {row.original.lifecycleStatus ?? 'Unknown'}
          </Badge>
        ),
      },
      {
        accessorKey: 'startedAt',
        header: 'Started',
        size: 180,
        Cell: ({ row }) => <DateAtom value={row.original.startedAt} />,
      },
      {
        accessorKey: 'documentCount',
        header: 'Documents',
        size: 130,
      },
      {
        accessorKey: 'totalCost',
        header: 'Total Cost',
        size: 140,
        Cell: ({ row }) => <Cost value={row.original.totalCost} />,
      },
      {
        accessorKey: 'processingTime',
        header: 'Processing Time',
        size: 180,
      },
    ],
    [currentBatchListHref],
  )

  const tableConfig: DocumentTableConfig<BatchListItem, BatchQueryFilters> = {
    definition: {
      tableId: 'batches',
      columns,
      fetcher: async (query: DocumentTableQuery<BatchQueryFilters>) => getBatchesAction(query),
    },
    emptyMessage: 'No batches are available.',
    searchPlaceholder: 'Search batches...',
    advancedSearch: {
      filters: controller.filters,
      filterOptions,
      onApply: controller.setFilters,
    },
  }

  return (
    <DocumentTable config={tableConfig} controller={controller} initialData={initialData} initialQuery={initialQuery} />
  )
}
