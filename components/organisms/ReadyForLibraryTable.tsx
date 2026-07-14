'use client'

import { useEffect, useMemo, type ReactElement } from 'react'
import type { MRT_ColumnDef } from 'material-react-table'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { getReadyForLibraryAction } from '@actions/ready-for-library'
import { getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { DateAtom } from '@atoms/Date'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
import { useDocumentTableController } from '@organisms/document-table/useDocumentTableController'
import type { DocumentTableFetchResult, DocumentTableQuery } from '@organisms/document-table/types'
import type { ReadyForLibraryItem } from 'types/documents'

interface ReadyForLibraryTableProps {
  initialData?: DocumentTableFetchResult<ReadyForLibraryItem>
  initialQuery: DocumentTableQuery<Record<string, never>>
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

function getReadyForLibrarySortValue(item: ReadyForLibraryItem, orderBy: string): number | string {
  switch (orderBy) {
    case 'validation_timestamp':
      return Number(item.validation_timestamp ?? 0)
    case 'metadata_complete':
      return Number(item.metadata_complete)
    case 'access_level':
      return String(item.access_level ?? '').toLowerCase()
    case 'validation_status':
      return String(item.validation_status ?? '').toLowerCase()
    case 'name':
    default:
      return String(item.name ?? '').toLowerCase()
  }
}

export function sortReadyForLibraryItems(
  items: ReadyForLibraryItem[],
  orderBy?: string,
  sortDirection?: 'asc' | 'desc',
): ReadyForLibraryItem[] {
  if (!orderBy) {
    return items
  }

  const multiplier = sortDirection === 'desc' ? -1 : 1
  return [...items].sort((left, right) => {
    const leftValue = getReadyForLibrarySortValue(left, orderBy)
    const rightValue = getReadyForLibrarySortValue(right, orderBy)

    if (leftValue < rightValue) return -1 * multiplier
    if (leftValue > rightValue) return 1 * multiplier
    return String(left.id).localeCompare(String(right.id))
  })
}

export function ReadyForLibraryTable({ initialData, initialQuery }: ReadyForLibraryTableProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const controller = useDocumentTableController<Record<string, never>>({ initialQuery })

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString())

    nextParams.set('page', String(controller.query.page))
    nextParams.set('pageSize', String(controller.query.pageSize))
    syncReadyForLibrarySearchParam(nextParams, 'search', controller.query.search)
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
            <Link href={buildDocumentDetailHref(row.original.id, preservedOverviewHref)} style={{ color: '#355834' }}>
              {value}
            </Link>
          )
        },
      },
      {
        accessorKey: 'validation_status',
        header: 'Validation Status',
        size: 160,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—'),
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

  return (
    <DocumentDataTable<ReadyForLibraryItem, Record<string, never>>
      definition={{
        tableId: 'ready-for-library-documents',
        columns,
        fetcher: async (query) => {
          const result = await getReadyForLibraryAction()
          const normalizedSearch = normalizeReadyForLibrarySearch(query.search)
          const filteredItems = normalizedSearch
            ? result.items.filter((item) =>
                String(item.name ?? '')
                  .toLowerCase()
                  .includes(normalizedSearch),
              )
            : result.items
          const sortedItems = sortReadyForLibraryItems(filteredItems, query.orderBy, query.sortDirection)
          const offset = (query.page - 1) * query.pageSize
          const pagedItems = sortedItems.slice(offset, offset + query.pageSize)

          return {
            data: pagedItems,
            totalCount: sortedItems.length,
            pageInfo: {
              pageSize: query.pageSize,
              hasNextPage: offset + query.pageSize < sortedItems.length,
              hasPreviousPage: query.page > 1,
              startCursor: null,
              endCursor: null,
            },
          }
        },
      }}
      controller={controller}
      initialData={initialData}
      initialQuery={initialQuery}
      emptyMessage="No documents currently meet the dashboard-visible library eligibility criteria."
      searchPlaceholder="Search ready for library..."
    />
  )
}
