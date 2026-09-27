'use client'

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Stack, Typography } from '@mui/material'
import type { MRT_ColumnDef, MRT_RowSelectionState, MRT_Updater } from 'material-react-table'

import { deleteCollectionAction, getCollectionDeletionPreviewAction, getCollectionsAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { IconPlus } from '@atoms/icons/IconPlus'
import { COLLECTION_LIBRARY_ID_LABEL } from '@constants/collections'
import { getCollectionDetailPath } from '@constants/paths'
import { serializeStatusesParam, type FilterOptions } from '@lib/search'
import { CollectionActionButton } from '@molecules/CollectionActionButton'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { AddCollectionDialog } from '@organisms/AddCollectionDialog'
import { CollectionDeleteDialog } from '@organisms/CollectionDeleteDialog'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import { CollectionEditDialog } from '@organisms/CollectionEditDialog'
import { CollectionRenameDialog } from '@organisms/CollectionRenameDialog'
import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'
import type { DocumentTableConfig } from '@organisms/DocumentTable/types'
import { useDocumentTableController } from '@organisms/DocumentTable/useDocumentTableController'
import type {
  CollectionListPageResult,
  CollectionQueryFilters,
  CollectionTableQuery,
  CollectionWithMeta,
} from 'types/collections'
import type { CollectionDeletionPreview } from '@lib/queries/collectionQueries'

interface CollectionsTableProps {
  initialData: CollectionListPageResult
  initialQuery: CollectionTableQuery
  filterOptions: FilterOptions
}

interface CollectionManagerState {
  collectionId: string
  collectionName: string
  initialAction: 'add' | 'remove'
}

function syncSearchParam(nextParams: URLSearchParams, key: string, value: string | undefined): void {
  if (value) {
    nextParams.set(key, value)
    return
  }

  nextParams.delete(key)
}

function getSelectedRowId(rowSelection: MRT_RowSelectionState): string | undefined {
  return Object.entries(rowSelection)
    .filter(([, isSelected]) => isSelected)
    .map(([rowId]) => rowId)
    .at(-1)
}

export function CollectionsTable({ initialData, initialQuery, filterOptions }: CollectionsTableProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const controller = useDocumentTableController<CollectionQueryFilters>({ initialQuery })
  const initialQueryKey = useRef(controller.currentQueryKey)
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [managerState, setManagerState] = useState<CollectionManagerState | null>(null)
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionWithMeta | null>(null)
  const [collectionDeletionPreview, setCollectionDeletionPreview] = useState<CollectionDeletionPreview | null>(null)
  const [isLoadingCollectionDeletionPreview, setIsLoadingCollectionDeletionPreview] = useState(false)
  const [collectionToEdit, setCollectionToEdit] = useState<CollectionWithMeta | null>(null)
  const [collectionToRename, setCollectionToRename] = useState<CollectionWithMeta | null>(null)
  const [isDeletingCollection, setIsDeletingCollection] = useState(false)

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString())

    nextParams.set('page', String(controller.query.page))
    nextParams.set('pageSize', String(controller.query.pageSize))
    syncSearchParam(nextParams, 'search', controller.query.search)
    syncSearchParam(nextParams, 'contributor', controller.query.filters.contributor)
    syncSearchParam(nextParams, 'publisher', controller.query.filters.publisher)
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
      window.history.replaceState(window.history.state, '', nextSearch ? `${pathname}?${nextSearch}` : pathname)
    }
  }, [controller.query, pathname, searchParams])

  useEffect(() => {
    if (controller.currentQueryKey === initialQueryKey.current) {
      return
    }

    initialQueryKey.current = controller.currentQueryKey
    setRowSelection({})
  }, [controller.currentQueryKey])

  useEffect(() => {
    const selectedRowId = getSelectedRowId(rowSelection)
    if (!selectedRowId || initialData.data.some((collection) => collection.id === selectedRowId)) {
      return
    }

    setRowSelection({})
  }, [initialData.data, rowSelection])

  const selectedCollection = useMemo(() => {
    const selectedRowId = getSelectedRowId(rowSelection)
    return selectedRowId ? (initialData.data.find((collection) => collection.id === selectedRowId) ?? null) : null
  }, [initialData.data, rowSelection])

  function handleRowSelectionChange(updater: MRT_Updater<MRT_RowSelectionState>): void {
    setRowSelection((currentSelection) => {
      const nextSelection = typeof updater === 'function' ? updater(currentSelection) : updater
      const selectedRowId = getSelectedRowId(nextSelection)
      return selectedRowId ? { [selectedRowId]: true } : {}
    })
  }

  function openCollectionDeletion(collection: CollectionWithMeta): void {
    setCollectionToDelete(collection)
    setCollectionDeletionPreview(null)
    setIsDeletingCollection(false)
    setIsLoadingCollectionDeletionPreview(true)
    void getCollectionDeletionPreviewAction(collection.id)
      .then((preview) => setCollectionDeletionPreview(preview))
      .finally(() => setIsLoadingCollectionDeletionPreview(false))
  }

  async function handleDeleteCollection(deleteTagFromSystem: boolean): Promise<void> {
    if (!collectionToDelete || isDeletingCollection) {
      return
    }

    setIsDeletingCollection(true)

    try {
      await deleteCollectionAction(collectionToDelete.id, { deleteTagFromSystem })
      setRowSelection({})
      setCollectionToDelete(null)
      setCollectionDeletionPreview(null)
      router.refresh()
    } catch (deleteCollectionError) {
      setIsDeletingCollection(false)
      throw deleteCollectionError
    }
  }

  const columns = useMemo<MRT_ColumnDef<CollectionWithMeta>[]>(
    () => [
      {
        accessorKey: 'collection_name',
        header: 'Name',
        size: 420,
        Cell: ({ row }) => (
          <EntityNameBlock
            name={row.original.collection_name}
            id={row.original.id}
            additionalId={row.original.fedora_node_id}
            additionalIdLabel={COLLECTION_LIBRARY_ID_LABEL}
            href={getCollectionDetailPath(row.original.id)}
          />
        ),
      },
      {
        accessorKey: 'document_count',
        header: 'Document Count',
        size: 180,
        Cell: ({ row }) => <Typography variant={'body2'}>{row.original.document_count}</Typography>,
      },
    ],
    [],
  )

  const tableConfig = useMemo<DocumentTableConfig<CollectionWithMeta, CollectionQueryFilters>>(
    () => ({
      definition: {
        tableId: 'collections',
        columns,
        fetcher: (query) => getCollectionsAction(query),
      },
      emptyMessage: 'No collections found.',
      searchPlaceholder: 'Search Name or IDs...',
      advancedSearch: {
        filters: controller.filters,
        filterOptions,
        onApply: controller.setFilters,
        showActiveFilterCount: false,
      },
      rowSelection,
      onRowSelectionChange: handleRowSelectionChange,
      enableRowSelection: true,
      enableMultiRowSelection: false,
      getRowId: (collection) => collection.id,
      trailingToolbarSlot: (
        <Stack direction={'row'} spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <CollectionActionButton
            selectedCount={selectedCollection ? 1 : 0}
            disabled={isDeletingCollection || !selectedCollection}
            hasDocuments={Boolean(selectedCollection?.document_count)}
            onEdit={() => {
              if (selectedCollection) setCollectionToEdit(selectedCollection)
            }}
            onRename={() => {
              if (selectedCollection) setCollectionToRename(selectedCollection)
            }}
            onAddDocuments={() => {
              if (selectedCollection) {
                setManagerState({
                  collectionId: selectedCollection.id,
                  collectionName: selectedCollection.collection_name,
                  initialAction: 'add',
                })
              }
            }}
            onRemoveDocuments={() => {
              if (selectedCollection?.document_count) {
                setManagerState({
                  collectionId: selectedCollection.id,
                  collectionName: selectedCollection.collection_name,
                  initialAction: 'remove',
                })
              }
            }}
            onDelete={() => {
              if (selectedCollection) openCollectionDeletion(selectedCollection)
            }}
          />
          <Button
            variant={'primary'}
            size={'sm'}
            startIcon={<IconPlus size={16} />}
            onClick={() => setIsAddDialogOpen(true)}
          >
            {'Add Collection'}
          </Button>
        </Stack>
      ),
    }),
    [columns, controller.filters, filterOptions, isDeletingCollection, rowSelection, selectedCollection],
  )

  return (
    <>
      <DocumentTable
        config={tableConfig}
        controller={controller}
        initialData={initialData}
        initialQuery={initialQuery}
      />
      <AddCollectionDialog
        open={isAddDialogOpen}
        collections={initialData.data}
        onClose={() => setIsAddDialogOpen(false)}
      />
      {managerState ? (
        <CollectionDocumentManager
          collectionId={managerState.collectionId}
          collectionName={managerState.collectionName}
          initialAction={managerState.initialAction}
          open={true}
          onClose={() => setManagerState(null)}
        />
      ) : null}
      <CollectionEditDialog
        collection={collectionToEdit}
        open={Boolean(collectionToEdit)}
        onClose={() => setCollectionToEdit(null)}
      />
      <CollectionRenameDialog
        collection={collectionToRename}
        open={Boolean(collectionToRename)}
        onClose={() => setCollectionToRename(null)}
      />
      <CollectionDeleteDialog
        open={Boolean(collectionToDelete)}
        collection={collectionToDelete}
        preview={collectionDeletionPreview}
        isLoadingPreview={isLoadingCollectionDeletionPreview}
        onConfirm={handleDeleteCollection}
        onClose={() => {
          if (isDeletingCollection) return
          setCollectionToDelete(null)
          setCollectionDeletionPreview(null)
        }}
      />
    </>
  )
}
