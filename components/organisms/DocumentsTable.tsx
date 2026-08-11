'use client'

import { useMemo, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { MRT_ColumnDef } from 'material-react-table'

import { DateAtom } from '@atoms/Date'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { FileSize } from '@atoms/FileSize'
import { getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import { useOverviewTableState } from '@hooks/useOverviewTableState'
import { type AdvancedSearchFilters, type FilterOptions } from '@lib/search'
import type { DocumentsQueryParams } from '@lib/queries/queries'
import { truncateString } from '@lib/strings'
import type { Document } from 'types/documents'
import type { DocumentsPageResult } from 'types/pagination'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import type { DocumentTableConfig } from '@organisms/DocumentTable/types'

interface DocumentsTableProps {
  initialData?: DocumentsPageResult
  initialQuery?: DocumentsQueryParams
  filterOptions: FilterOptions
}

function buildOverviewColumns(preservedOverviewHref: string): MRT_ColumnDef<Document>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Document',
      size: 420,
      Cell: ({ row: { original } }) => (
        <EntityNameBlock
          name={original.name}
          id={original.id}
          legacyId={original.id_legacy}
          sourceId={original.source_id}
          href={getDocumentDetailPath(original.id, preservedOverviewHref, PAGE_LABELS.documents)}
        />
      ),
    },
    {
      accessorKey: 'filesize',
      header: 'Size',
      size: 110,
      Cell: ({ renderedCellValue }) => <FileSize value={renderedCellValue as bigint | number | null | undefined} />,
    },
    {
      accessorKey: 'hash_binary',
      header: 'Binary Hash',
      size: 180,
      Cell: ({ renderedCellValue }) => {
        const value = String((renderedCellValue as string | null) ?? '')
        if (!value) {
          return '-'
        }

        return (
          <Typography component={'span'} variant={'caption'} sx={{ fontFamily: 'monospace' }} title={value}>
            {truncateString(value, 12)}
          </Typography>
        )
      },
    },
    {
      accessorKey: 'hash_content',
      header: 'Content Hash',
      size: 180,
      Cell: ({ renderedCellValue }) => {
        const value = String((renderedCellValue as string | null) ?? '')
        if (!value) {
          return '--'
        }

        return (
          <Typography component={'span'} variant={'caption'} sx={{ fontFamily: 'monospace' }} title={value}>
            {truncateString(value, 12)}
          </Typography>
        )
      },
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
    {
      accessorKey: 'is_duplicate',
      header: 'Is Duplicate',
      size: 120,
      Cell: ({ row: { original } }) => (original.is_duplicate ? 'True' : 'False'),
    },
  ]
}

async function fetchDocumentsTablePage(params: DocumentsQueryParams): Promise<DocumentsPageResult> {
  const { getDocumentsAction } = await import('@actions/documents')
  return getDocumentsAction(params)
}

export function DocumentsTable({ initialData, initialQuery, filterOptions }: DocumentsTableProps): ReactElement {
  const {
    accessLevel,
    batch,
    collection,
    createdFrom,
    createdTo,
    documentType,
    globalFilter,
    pathname,
    page,
    pageSize,
    queryParams,
    searchParams,
    statuses,
    tag,
    setGlobalFilter,
    setOverviewFilters,
    setPageSize,
    setSorting,
    sorting,
    goToNextPage,
    goToPreviousPage,
  } = useOverviewTableState(initialQuery)
  const preservedOverviewHref = useMemo(() => {
    const currentSearch = searchParams.toString()
    return currentSearch ? `${pathname}?${currentSearch}` : pathname
  }, [pathname, searchParams])
  const currentFilters: AdvancedSearchFilters = useMemo(
    () => ({
      author: globalFilter || undefined,
      tag: tag || undefined,
      statuses: statuses ?? [],
      documentType,
      batch: batch || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      collection: collection || undefined,
      accessLevel,
    }),
    [accessLevel, batch, collection, createdFrom, createdTo, documentType, globalFilter, statuses, tag],
  )
  const columns = useMemo(() => buildOverviewColumns(preservedOverviewHref), [preservedOverviewHref])
  const tableConfig: DocumentTableConfig<Document, AdvancedSearchFilters> = {
    definition: {
      tableId: 'overview-documents',
      columns,
      fetcher: async (query) =>
        fetchDocumentsTablePage({
          page: query.page,
          pageSize: query.pageSize,
          orderBy: query.orderBy as DocumentsQueryParams['orderBy'],
          sortDirection: query.sortDirection,
          search: query.search,
          author: query.filters.author ?? query.search,
          tag: query.filters.tag,
          statuses: query.filters.statuses,
          documentType: query.filters.documentType,
          batch: query.filters.batch,
          createdFrom: query.filters.createdFrom,
          createdTo: query.filters.createdTo,
          collection: query.filters.collection,
          accessLevel: query.filters.accessLevel,
          cursorValue: query.cursorValue,
          cursorId: query.cursorId,
          cursorDirection: query.cursorDirection,
        }),
    },
    emptyMessage: 'No documents found.',
    searchPlaceholder: 'Search by name, legacy ID, batch...',
    advancedSearch: {
      filters: currentFilters,
      filterOptions,
      onApply: setOverviewFilters,
    },
  }

  return (
    <Box>
      <DocumentTable
        config={tableConfig}
        controller={{
          currentQueryKey: JSON.stringify(queryParams),
          filters: currentFilters,
          page,
          pageSize,
          query: {
            page,
            pageSize,
            orderBy: queryParams.orderBy,
            sortDirection: queryParams.sortDirection,
            search: globalFilter || undefined,
            cursorValue: queryParams.cursorValue,
            cursorId: queryParams.cursorId,
            cursorDirection: queryParams.cursorDirection,
            filters: currentFilters,
          },
          search: globalFilter,
          sorting,
          setFilters: setOverviewFilters,
          setPageSize,
          setSearch: setGlobalFilter,
          setSorting,
          goToNextPage: (cursor) => {
            goToNextPage(cursor ?? null)
          },
          goToPreviousPage: (cursor) => {
            goToPreviousPage(cursor ?? null)
          },
        }}
        initialData={initialData}
        initialQuery={{
          page: queryParams.page ?? 1,
          pageSize: queryParams.pageSize ?? 25,
          orderBy: queryParams.orderBy,
          sortDirection: queryParams.sortDirection,
          search: queryParams.search,
          cursorValue: queryParams.cursorValue,
          cursorId: queryParams.cursorId,
          cursorDirection: queryParams.cursorDirection,
          filters: currentFilters,
        }}
      />
    </Box>
  )
}
