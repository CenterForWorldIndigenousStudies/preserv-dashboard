'use client'

import { useEffect, useMemo, type ReactElement } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { MRT_ColumnDef } from 'material-react-table'

import { getLibraryDocumentsAction } from '@actions/library'
import { DateAtom } from '@atoms/Date'
import { getBatchDetailPath, getDocumentDetailPath, COLLECTIONS_PATH } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import type { DocumentTableConfig, DocumentTableFetchResult, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { useDocumentTableController } from '@organisms/DocumentTable/useDocumentTableController'
import { serializeStatusesParam, type AdvancedSearchFilters, type FilterOptions } from '@lib/search'
import type { DocumentsQueryParams } from '@lib/queries/queries'
import type { LibraryDocumentItem } from 'types/documents'

interface LibraryTableProps {
  filterOptions: FilterOptions
  initialQuery: DocumentTableQuery<AdvancedSearchFilters>
  initialData?: DocumentTableFetchResult<LibraryDocumentItem>
}

function syncSearchParam(nextParams: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    nextParams.set(key, value)
    return
  }

  nextParams.delete(key)
}

function buildLibraryPageInfo(result: {
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: { id: string; value: string } | null
  endCursor: { id: string; value: string } | null
}) {
  return {
    pageSize: result.pageSize,
    hasNextPage: result.hasNextPage,
    hasPreviousPage: result.hasPreviousPage,
    startCursor: result.startCursor,
    endCursor: result.endCursor,
  }
}

function buildDocumentDetailHref(documentId: string, returnHref: string): string {
  return getDocumentDetailPath(documentId, returnHref, PAGE_LABELS.library)
}

function buildCollectionHref(collectionId: string): string {
  return `${COLLECTIONS_PATH}?expanded=${encodeURIComponent(collectionId)}`
}

export function LibraryTable({ filterOptions, initialQuery, initialData }: LibraryTableProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const controller = useDocumentTableController<AdvancedSearchFilters>({ initialQuery })

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString())

    nextParams.set('page', String(controller.query.page))
    nextParams.set('pageSize', String(controller.query.pageSize))
    syncSearchParam(nextParams, 'search', controller.query.search)
    syncSearchParam(nextParams, 'author', controller.query.filters.author)
    syncSearchParam(nextParams, 'tag', controller.query.filters.tag)
    syncSearchParam(nextParams, 'statuses', serializeStatusesParam(controller.query.filters.statuses))
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

  const returnHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])

  const columns = useMemo<MRT_ColumnDef<LibraryDocumentItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Document',
        size: 360,
        Cell: ({ row }) => (
          <EntityNameBlock
            name={row.original.name}
            id={row.original.id}
            legacyId={row.original.legacyId}
            sourceId={row.original.sourceId}
            href={buildDocumentDetailHref(row.original.id, returnHref)}
          />
        ),
      },
      {
        accessorKey: 'fedoraUrl',
        header: 'Fedora URL',
        size: 280,
        enableSorting: false,
        Cell: ({ row }) =>
          row.original.fedoraUrl ? (
            <Link href={row.original.fedoraUrl} target={'_blank'} rel={'noreferrer'}>
              {row.original.fedoraUrl}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'uploadedAt',
        header: 'Uploaded',
        size: 180,
        enableSorting: false,
        Cell: ({ row }) => <DateAtom value={row.original.uploadedAt} />,
      },
      {
        id: 'collections',
        header: 'Collection(s)',
        size: 260,
        enableSorting: false,
        Cell: ({ row }) =>
          row.original.collections.length > 0 ? (
            <span>
              {row.original.collections.map((collection, index) => (
                <span key={collection.id}>
                  {index > 0 ? ', ' : ''}
                  <Link href={buildCollectionHref(collection.id)}>{collection.name}</Link>
                </span>
              ))}
            </span>
          ) : (
            '—'
          ),
      },
      {
        id: 'batch',
        header: 'Batch',
        size: 220,
        enableSorting: false,
        Cell: ({ row }) =>
          row.original.batch ? (
            <Link href={getBatchDetailPath(row.original.batch.id, returnHref, PAGE_LABELS.library)}>
              {row.original.batch.name ?? row.original.batch.id}
            </Link>
          ) : (
            '—'
          ),
      },
    ],
    [returnHref],
  )

  const tableConfig: DocumentTableConfig<LibraryDocumentItem, AdvancedSearchFilters> = {
    definition: {
      tableId: 'library-documents',
      columns,
      fetcher: async (query) => {
        const result = await getLibraryDocumentsAction({
          ...query.filters,
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          orderBy: query.orderBy as DocumentsQueryParams['orderBy'],
          sortDirection: query.sortDirection,
          cursorValue: query.cursorValue,
          cursorId: query.cursorId,
          cursorDirection: query.cursorDirection,
        })

        return {
          data: result.items,
          totalCount: result.total,
          pageInfo: buildLibraryPageInfo(result),
        }
      },
    },
    emptyMessage: 'No documents have been uploaded to the library.',
    searchPlaceholder: 'Search library documents...',
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
