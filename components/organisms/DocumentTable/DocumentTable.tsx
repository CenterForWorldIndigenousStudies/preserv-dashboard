'use client'

import { Fragment, useMemo, type ReactElement } from 'react'
import { Stack } from '@mui/material'
import type { MRT_RowData } from 'material-react-table'

import { AdvancedSearchModal } from '@components/organisms/AdvancedSearchModal'

import { DocumentDataTable } from './DocumentDataTable'
import type {
  DocumentTableConfig,
  DocumentTableController,
  DocumentTableDefinition,
  DocumentTableFetchResult,
  DocumentTableQuery,
} from './types'

export interface DocumentTableProps<TData extends MRT_RowData & { id: string }, TFilters> {
  config: DocumentTableConfig<TData, TFilters>
  controller?: DocumentTableController<TFilters>
  initialQuery: DocumentTableQuery<TFilters>
  initialData?: DocumentTableFetchResult<TData>
}

export function DocumentTable<TData extends MRT_RowData & { id: string }, TFilters>({
  config,
  controller,
  initialQuery,
  initialData,
}: DocumentTableProps<TData, TFilters>): ReactElement {
  const definition = useMemo<DocumentTableDefinition<TData, TFilters>>(() => {
    if (!config.rowActions?.length) {
      return config.definition
    }

    return {
      ...config.definition,
      rowActionsHeader: config.rowActionsHeader,
      rowActionsColumnSize: config.rowActionsColumnSize,
      renderRowActions: (row) =>
        config.rowActions?.map(({ id, render }) => <Fragment key={id}>{render({ row })}</Fragment>),
    }
  }, [config.definition, config.rowActions, config.rowActionsColumnSize, config.rowActionsHeader])

  const leadingToolbarSlot = useMemo(() => {
    if (!config.advancedSearch) {
      return config.leadingToolbarSlot
    }

    return (
      <Stack direction={'row'} spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <AdvancedSearchModal
          filters={config.advancedSearch.filters}
          filterOptions={config.advancedSearch.filterOptions}
          onApply={config.advancedSearch.onApply}
        />
        {config.leadingToolbarSlot}
      </Stack>
    )
  }, [config.advancedSearch, config.leadingToolbarSlot])

  return (
    <DocumentDataTable<TData, TFilters>
      definition={definition}
      controller={controller}
      initialData={initialData}
      initialQuery={initialQuery}
      emptyMessage={config.emptyMessage}
      searchPlaceholder={config.searchPlaceholder}
      leadingToolbarSlot={leadingToolbarSlot}
      trailingToolbarSlot={config.trailingToolbarSlot}
      rowSelection={config.rowSelection}
      onRowSelectionChange={config.onRowSelectionChange}
      enableRowSelection={config.enableRowSelection}
      enableSorting={config.enableSorting}
      getRowId={config.getRowId}
      getRowProps={config.getRowProps}
      getSelectCheckboxProps={config.getSelectCheckboxProps}
      excludedRowIds={config.excludedRowIds}
      showToolbar={config.showToolbar}
      showPager={config.showPager}
      styleVariant={config.styleVariant}
    />
  )
}
