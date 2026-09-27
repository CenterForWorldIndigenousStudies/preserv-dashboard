'use client'

import { memo, useEffect, useMemo, type ReactElement, type ReactNode } from 'react'
import type { MRT_ColumnDef } from 'material-react-table'

import { getDocumentsForCollectionAction } from '@actions/collections'
import { DateAtom } from '@atoms/Date'
import { getDocumentDetailPath } from '@constants/paths'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import type { DocumentTableConfig, DocumentTableQuery } from '@organisms/DocumentTable/types'
import { useDocumentTableController } from '@organisms/DocumentTable/useDocumentTableController'
import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'
import type { Document } from 'types/documents'

export interface CollectionDocumentsTableProps {
  collectionId: string
  collectionName: string
  documentCount: number
  filterOptions: FilterOptions
  initialQuery: DocumentTableQuery<AdvancedSearchFilters>
  originHref: string
  onQueryChange: (collectionId: string, query: DocumentTableQuery<AdvancedSearchFilters>) => void
  trailingToolbarSlot?: ReactNode
}

function buildCollectionDocumentHref(documentId: string, returnHref: string, collectionName: string): string {
  return getDocumentDetailPath(documentId, returnHref, collectionName)
}

function buildCollectionDocumentsPageInfo(page: number, pageSize: number, total: number) {
  const hasNextPage = page * pageSize < total

  return {
    pageSize,
    hasNextPage,
    hasPreviousPage: page > 1,
    startCursor: page > 1 ? { id: `page-${page - 1}`, value: String(page - 1) } : null,
    endCursor: hasNextPage ? { id: `page-${page + 1}`, value: String(page + 1) } : null,
  }
}

export const CollectionDocumentsTable = memo(function CollectionDocumentsTable({
  collectionId,
  collectionName,
  documentCount,
  filterOptions,
  initialQuery,
  originHref,
  onQueryChange,
  trailingToolbarSlot,
}: CollectionDocumentsTableProps): ReactElement {
  const controller = useDocumentTableController<AdvancedSearchFilters>({ initialQuery })

  useEffect(() => {
    onQueryChange(collectionId, controller.query)
  }, [collectionId, controller.currentQueryKey, controller.query, onQueryChange])

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Document',
        size: 420,
        Cell: ({
          row: {
            original: { id, id_legacy, name, source_id },
          },
        }) => (
          <EntityNameBlock
            name={name}
            id={id}
            additionalId={id_legacy}
            sourceId={source_id}
            href={buildCollectionDocumentHref(id, originHref, collectionName)}
          />
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 160,
        Cell: ({ renderedCellValue }) => <DateAtom value={renderedCellValue as Document['created_at']} />,
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        size: 160,
        Cell: ({ renderedCellValue }) => <DateAtom value={renderedCellValue as Document['updated_at']} />,
      },
    ],
    [originHref],
  )

  const tableConfig: DocumentTableConfig<Document, AdvancedSearchFilters> = {
    definition: {
      tableId: `collection-documents-${collectionId}`,
      columns,
      fetcher: async (query) => {
        const result = await getDocumentsForCollectionAction(collectionId, {
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          ...query.filters,
          sortField: query.orderBy as 'name' | 'id_legacy' | 'filesize' | 'created_at' | undefined,
          sortDirection: query.sortDirection,
        })

        return {
          data: result.documents,
          totalCount: result.total,
          pageInfo: buildCollectionDocumentsPageInfo(query.page, query.pageSize, result.total),
        }
      },
    },
    emptyMessage: 'No documents associated with this collection.',
    searchPlaceholder: 'Search collection documents',
    advancedSearch: {
      filters: controller.filters,
      filterOptions,
      showActiveFilterCount: false,
      onApply: (filters) => {
        controller.setFilters({ ...filters, collection: collectionName })
      },
    },
    trailingToolbarSlot,
  }

  return (
    <DocumentTable
      config={tableConfig}
      controller={controller}
      initialData={
        documentCount === 0
          ? {
              data: [],
              totalCount: 0,
              pageInfo: {
                pageSize: 25,
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            }
          : undefined
      }
      initialQuery={initialQuery}
    />
  )
})
