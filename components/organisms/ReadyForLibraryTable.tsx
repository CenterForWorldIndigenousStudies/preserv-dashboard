'use client'

import { useMemo, type ReactElement } from 'react'
import type { MRT_ColumnDef } from 'material-react-table'
import Link from 'next/link'

import { getReadyForLibraryAction } from '@actions/ready-for-library'
import { DateAtom } from '@atoms/Date'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
import type { ReadyForLibraryItem } from 'types/documents'

interface ReadyForLibraryTableProps {
  initialData?: { items: ReadyForLibraryItem[]; total: number }
}

function normalizeReadyForLibrarySearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
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

function sortReadyForLibraryItems(
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

export function ReadyForLibraryTable({ initialData }: ReadyForLibraryTableProps): ReactElement {
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
            <Link href={`/documents/${row.original.id}`} style={{ color: '#355834' }}>
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
    [],
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
      initialData={
        initialData
          ? {
              data: initialData.items.slice(0, 25),
              totalCount: initialData.total,
              pageInfo: {
                pageSize: 25,
                hasNextPage: initialData.total > 25,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            }
          : undefined
      }
      initialQuery={{
        page: 1,
        pageSize: 25,
        filters: {},
      }}
      emptyMessage="No documents ready for library ingest."
      searchPlaceholder="Search ready for library..."
    />
  )
}
