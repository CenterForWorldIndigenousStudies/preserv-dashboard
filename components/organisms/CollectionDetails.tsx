'use client'

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Box, Paper, Typography } from '@mui/material'

import { deleteCollectionAction, getCollectionDeletionPreviewAction } from '@actions/collections'
import { COLLECTION_LIBRARY_ID_LABEL } from '@constants/collections'
import { CollectionActionButton } from '@molecules/CollectionActionButton'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import { CollectionDocumentsTable } from '@organisms/CollectionDocumentsTable'
import { CollectionEditDialog } from '@organisms/CollectionEditDialog'
import { CollectionDeleteDialog } from '@organisms/CollectionDeleteDialog'
import { CollectionRenameDialog } from '@organisms/CollectionRenameDialog'
import type { DocumentTableQuery } from '@organisms/DocumentTable/types'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeTextFilter,
  parseStatusesParam,
  serializeStatusesParam,
  type AdvancedSearchFilters,
  type FilterOptions,
} from '@lib/search'
import type { CollectionDeletionPreview } from '@lib/queries/collectionQueries'
import type { CollectionWithMeta } from 'types/collections'

interface CollectionDetailsProps {
  collection: CollectionWithMeta
  filterOptions: FilterOptions
}

interface CollectionManagerState {
  collectionId: string
  collectionName: string
  initialAction: 'add' | 'remove'
}

type CollectionFilterKey =
  | 'contributor'
  | 'publisher'
  | 'tag'
  | 'statuses'
  | 'documentType'
  | 'batch'
  | 'createdFrom'
  | 'createdTo'
  | 'collection'
  | 'accessLevel'

function buildCollectionQueryParamKey(
  collectionId: string,
  key:
    | 'page'
    | 'pageSize'
    | 'search'
    | 'contributor'
    | 'publisher'
    | 'tag'
    | 'statuses'
    | 'documentType'
    | 'batch'
    | 'createdFrom'
    | 'createdTo'
    | 'collection'
    | 'accessLevel'
    | 'orderBy'
    | 'sortDirection',
) {
  return `collection-${collectionId}-${key}`
}

function parseCollectionTableInitialQuery(
  searchParams: URLSearchParams,
  collectionId: string,
  collectionName: string,
): DocumentTableQuery<AdvancedSearchFilters> {
  const page = Number(searchParams.get(buildCollectionQueryParamKey(collectionId, 'page')))
  const pageSize = Number(searchParams.get(buildCollectionQueryParamKey(collectionId, 'pageSize')))
  const sortDirection = searchParams.get(buildCollectionQueryParamKey(collectionId, 'sortDirection'))
  const search = normalizeTextFilter(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'search')) ?? undefined,
  )
  const contributor = normalizeTextFilter(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'contributor')) ?? undefined,
  )
  const publisher = normalizeTextFilter(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'publisher')) ?? undefined,
  )
  const tag = normalizeTextFilter(searchParams.get(buildCollectionQueryParamKey(collectionId, 'tag')) ?? undefined)
  const batch = normalizeTextFilter(searchParams.get(buildCollectionQueryParamKey(collectionId, 'batch')) ?? undefined)
  const createdFrom = normalizeDateFilter(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'createdFrom')) ?? undefined,
  )
  const createdTo = normalizeDateFilter(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'createdTo')) ?? undefined,
  )
  const accessLevel = normalizeAccessLevel(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'accessLevel')) ?? undefined,
  )
  const documentType = normalizeDocumentType(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'documentType')) ?? undefined,
  )
  const statuses = parseStatusesParam(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'statuses')) ?? undefined,
  )

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    search,
    orderBy: searchParams.get(buildCollectionQueryParamKey(collectionId, 'orderBy')) ?? undefined,
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    filters: {
      contributor,
      publisher,
      tag,
      statuses,
      documentType,
      batch,
      createdFrom,
      createdTo,
      collection: collectionName,
      accessLevel,
    },
  }
}

function serializeCollectionState(
  pathname: string,
  currentSearchParams: URLSearchParams,
  collectionId: string,
  query: DocumentTableQuery<AdvancedSearchFilters>,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString())

  for (const key of Array.from(nextParams.keys())) {
    if (key === 'expanded' || key.startsWith('collection-')) {
      nextParams.delete(key)
    }
  }

  nextParams.set(buildCollectionQueryParamKey(collectionId, 'page'), String(query.page))
  nextParams.set(buildCollectionQueryParamKey(collectionId, 'pageSize'), String(query.pageSize))

  if (query.search) {
    nextParams.set(buildCollectionQueryParamKey(collectionId, 'search'), query.search)
  }
  const filterParams: Array<[CollectionFilterKey, string | undefined]> = [
    ['contributor', query.filters.contributor !== query.search ? query.filters.contributor : undefined],
    ['publisher', query.filters.publisher],
    ['tag', query.filters.tag],
    ['statuses', serializeStatusesParam(query.filters.statuses)],
    ['documentType', query.filters.documentType === 'all' ? undefined : query.filters.documentType],
    ['batch', query.filters.batch],
    ['createdFrom', query.filters.createdFrom],
    ['createdTo', query.filters.createdTo],
    ['collection', query.filters.collection],
    ['accessLevel', query.filters.accessLevel],
  ]
  for (const [key, value] of filterParams) {
    if (value) {
      nextParams.set(buildCollectionQueryParamKey(collectionId, key), value)
    }
  }
  if (query.orderBy) {
    nextParams.set(buildCollectionQueryParamKey(collectionId, 'orderBy'), query.orderBy)
  }
  if (query.sortDirection) {
    nextParams.set(buildCollectionQueryParamKey(collectionId, 'sortDirection'), query.sortDirection)
  }

  const nextSearch = nextParams.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}

export function CollectionDetails({ collection, filterOptions }: CollectionDetailsProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [managerState, setManagerState] = useState<CollectionManagerState | null>(null)
  const [collectionQuery, setCollectionQuery] = useState<DocumentTableQuery<AdvancedSearchFilters> | null>(null)
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionWithMeta | null>(null)
  const [collectionDeletionPreview, setCollectionDeletionPreview] = useState<CollectionDeletionPreview | null>(null)
  const [isLoadingCollectionDeletionPreview, setIsLoadingCollectionDeletionPreview] = useState(false)
  const [collectionToEdit, setCollectionToEdit] = useState<CollectionWithMeta | null>(null)
  const [collectionToRename, setCollectionToRename] = useState<CollectionWithMeta | null>(null)
  const [isDeletingCollection, setIsDeletingCollection] = useState(false)

  const queryForCollection = useMemo(
    () => collectionQuery ?? parseCollectionTableInitialQuery(searchParams, collection.id, collection.collection_name),
    [collection.collection_name, collection.id, collectionQuery, searchParams],
  )
  const originHref = useMemo(
    () =>
      serializeCollectionState(
        pathname,
        new URLSearchParams(searchParams.toString()),
        collection.id,
        queryForCollection,
      ),
    [collection.id, pathname, queryForCollection, searchParams],
  )

  useEffect(() => {
    const nextHref = serializeCollectionState(
      pathname,
      new URLSearchParams(searchParams.toString()),
      collection.id,
      queryForCollection,
    )
    const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false })
    }
  }, [collection.id, pathname, queryForCollection, router, searchParams])

  const handleCollectionQueryChange = useCallback(
    (_collectionId: string, query: DocumentTableQuery<AdvancedSearchFilters>) => {
      setCollectionQuery((currentQuery) => {
        if (currentQuery && JSON.stringify(currentQuery) === JSON.stringify(query)) {
          return currentQuery
        }

        return query
      })
    },
    [],
  )

  const collectionActionButton = useMemo(
    () => (
      <CollectionActionButton
        selectedCount={1}
        disabled={isDeletingCollection}
        hasDocuments={collection.document_count > 0}
        onEdit={() => setCollectionToEdit(collection)}
        onRename={() => setCollectionToRename(collection)}
        onAddDocuments={() =>
          setManagerState({
            collectionId: collection.id,
            collectionName: collection.collection_name,
            initialAction: 'add',
          })
        }
        onRemoveDocuments={() => {
          if (collection.document_count > 0) {
            setManagerState({
              collectionId: collection.id,
              collectionName: collection.collection_name,
              initialAction: 'remove',
            })
          }
        }}
        onDelete={() => openCollectionDeletion(collection)}
      />
    ),
    [collection, isDeletingCollection],
  )

  async function handleDeleteCollection(deleteTagFromSystem: boolean): Promise<void> {
    if (!collectionToDelete || isDeletingCollection) {
      return
    }

    setIsDeletingCollection(true)

    try {
      await deleteCollectionAction(collectionToDelete.id, { deleteTagFromSystem })
      setCollectionToDelete(null)
      setCollectionDeletionPreview(null)
      router.refresh()
    } catch (deleteCollectionError) {
      setIsDeletingCollection(false)
      throw deleteCollectionError
    }
  }

  function openCollectionDeletion(collectionToDeleteCandidate: CollectionWithMeta): void {
    setCollectionToDelete(collectionToDeleteCandidate)
    setCollectionDeletionPreview(null)
    setIsDeletingCollection(false)
    setIsLoadingCollectionDeletionPreview(true)
    void getCollectionDeletionPreviewAction(collectionToDeleteCandidate.id)
      .then((preview) => setCollectionDeletionPreview(preview))
      .finally(() => setIsLoadingCollectionDeletionPreview(false))
  }

  return (
    <>
      <Paper component={'section'} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
        <Box sx={{ mt: 2 }}>
          {collection.notes ? (
            <Typography variant={'body2'} color={'text.secondary'} sx={{ mb: 1.5 }}>
              {collection.notes}
            </Typography>
          ) : null}
          <Typography variant={'body2'} color={'text.secondary'} sx={{ mb: 1.5 }}>
            {collection.fedora_node_id
              ? `${COLLECTION_LIBRARY_ID_LABEL}: ${collection.fedora_node_id}`
              : 'Not mapped to Fedora'}
          </Typography>
          <CollectionDocumentsTable
            collectionId={collection.id}
            collectionName={collection.collection_name}
            documentCount={collection.document_count}
            filterOptions={filterOptions}
            initialQuery={queryForCollection}
            originHref={originHref}
            onQueryChange={handleCollectionQueryChange}
            trailingToolbarSlot={collectionActionButton}
          />
        </Box>
      </Paper>
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
          if (isDeletingCollection) {
            return
          }

          setCollectionToDelete(null)
          setCollectionDeletionPreview(null)
        }}
      />
    </>
  )
}
