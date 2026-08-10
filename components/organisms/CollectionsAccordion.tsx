'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'

import { deleteCollectionAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { AccordionPanel } from '@molecules/AccordionPanel'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import { CollectionDocumentsTable } from '@organisms/CollectionDocumentsTable'
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
import { TagDeleteFlowDialog } from '@organisms/TagDeleteFlowDialog'
import type { CollectionWithMeta } from 'types/collections'

interface CollectionsAccordionProps {
  collections: CollectionWithMeta[]
  filterOptions: FilterOptions
}

interface CollectionManagerState {
  collectionId: string
  collectionName: string
  initialAction: 'add' | 'remove'
}

const COLLECTION_EXPANDED_PARAM = 'expanded'

function buildCollectionQueryParamKey(
  collectionId: string,
  key:
    | 'page'
    | 'pageSize'
    | 'search'
    | 'author'
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

function parseExpandedCollections(searchParams: URLSearchParams): Set<string> {
  const expanded = searchParams.get(COLLECTION_EXPANDED_PARAM)

  if (!expanded) {
    return new Set()
  }

  return new Set(
    expanded
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )
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
  const author = normalizeTextFilter(
    searchParams.get(buildCollectionQueryParamKey(collectionId, 'author')) ?? undefined,
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
      author,
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

function serializeCollectionsState(
  pathname: string,
  currentSearchParams: URLSearchParams,
  expandedCollections: Set<string>,
  collectionQueries: Record<string, DocumentTableQuery<AdvancedSearchFilters>>,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString())

  for (const key of Array.from(nextParams.keys())) {
    if (key === COLLECTION_EXPANDED_PARAM || key.startsWith('collection-')) {
      nextParams.delete(key)
    }
  }

  const expandedIds = Array.from(expandedCollections)
  if (expandedIds.length > 0) {
    nextParams.set(COLLECTION_EXPANDED_PARAM, expandedIds.join(','))
  }

  for (const collectionId of expandedIds) {
    const query = collectionQueries[collectionId]

    if (!query) {
      continue
    }

    nextParams.set(buildCollectionQueryParamKey(collectionId, 'page'), String(query.page))
    nextParams.set(buildCollectionQueryParamKey(collectionId, 'pageSize'), String(query.pageSize))

    if (query.search) {
      nextParams.set(buildCollectionQueryParamKey(collectionId, 'search'), query.search)
    }
    const filterParams: Array<[keyof AdvancedSearchFilters, string | undefined]> = [
      ['author', query.filters.author],
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
  }

  const nextSearch = nextParams.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}

export function CollectionsAccordion({ collections, filterOptions }: CollectionsAccordionProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [managerState, setManagerState] = useState<CollectionManagerState | null>(null)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(() =>
    parseExpandedCollections(searchParams),
  )
  const [collectionQueries, setCollectionQueries] = useState<Record<string, DocumentTableQuery<AdvancedSearchFilters>>>(
    {},
  )
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionWithMeta | null>(null)
  const [isDeletingCollection, setIsDeletingCollection] = useState(false)

  useEffect(() => {
    const nextHref = serializeCollectionsState(
      pathname,
      new URLSearchParams(searchParams.toString()),
      expandedCollections,
      collectionQueries,
    )
    const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false })
    }
  }, [collectionQueries, expandedCollections, pathname, router, searchParams])

  const handleAccordionChange = (collectionId: string) => (_event: React.SyntheticEvent, expanded: boolean) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (expanded) {
        next.add(collectionId)
      } else {
        next.delete(collectionId)
      }
      return next
    })
  }

  const handleCollectionQueryChange = (collectionId: string, query: DocumentTableQuery<AdvancedSearchFilters>) => {
    setCollectionQueries((prev) => {
      const currentQuery = prev[collectionId]

      if (currentQuery && JSON.stringify(currentQuery) === JSON.stringify(query)) {
        return prev
      }

      return {
        ...prev,
        [collectionId]: query,
      }
    })
  }

  async function handleDeleteCollection(deleteTagFromSystem: boolean): Promise<void> {
    if (!collectionToDelete || isDeletingCollection) {
      return
    }

    setIsDeletingCollection(true)

    try {
      await deleteCollectionAction(collectionToDelete.id, { deleteTagFromSystem })
      setCollectionToDelete(null)
      router.refresh()
    } catch (deleteCollectionError) {
      setIsDeletingCollection(false)
      throw deleteCollectionError
    }
  }

  if (collections.length === 0) {
    return (
      <Paper component={'section'} sx={{ border: 1, borderColor: 'divider', p: 4 }}>
        <Typography variant={'body2'} color={'text.secondary'}>
          {'No collections found.'}
        </Typography>
      </Paper>
    )
  }

  return (
    <>
      <Stack spacing={2}>
        {collections.map((collection) => {
          const isExpanded = expandedCollections.has(collection.id)
          const queryForCollection =
            collectionQueries[collection.id] ??
            parseCollectionTableInitialQuery(searchParams, collection.id, collection.collection_name)
          const originHref = serializeCollectionsState(
            pathname,
            new URLSearchParams(searchParams.toString()),
            expandedCollections,
            {
              ...collectionQueries,
              [collection.id]: queryForCollection,
            },
          )

          return (
            <AccordionPanel
              key={collection.id}
              expanded={isExpanded}
              onChange={handleAccordionChange(collection.id)}
              summary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography component={'span'} variant={'h6'} color={'text.primary'}>
                    {collection.collection_name}
                  </Typography>
                  <Chip
                    label={`${collection.document_count} document${collection.document_count === 1 ? '' : 's'}`}
                    sx={(theme: Theme) => {
                      const primaryColor = theme.palette.primary.main

                      return {
                        backgroundColor: alpha(primaryColor, 0.1),
                        color: primaryColor,
                        fontWeight: 600,
                      }
                    }}
                  />
                </Box>
              }
            >
              {collection.notes ? (
                <Typography variant={'body2'} color={'text.secondary'} sx={{ mb: 1.5 }}>
                  {collection.notes}
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                <Button
                  variant={'secondary'}
                  size={'sm'}
                  onClick={(event) => {
                    event.preventDefault()
                    setManagerState({
                      collectionId: collection.id,
                      collectionName: collection.collection_name,
                      initialAction: 'add',
                    })
                  }}
                >
                  {'Add documents'}
                </Button>
                {collection.document_count > 0 ? (
                  <Button
                    variant={'secondary'}
                    size={'sm'}
                    onClick={(event) => {
                      event.preventDefault()
                      setManagerState({
                        collectionId: collection.id,
                        collectionName: collection.collection_name,
                        initialAction: 'remove',
                      })
                    }}
                  >
                    {'Remove documents'}
                  </Button>
                ) : null}
                <Button
                  variant={'ghost'}
                  size={'sm'}
                  startIcon={<IconX size={14} />}
                  onClick={(event) => {
                    event.preventDefault()
                    setIsDeletingCollection(false)
                    setCollectionToDelete(collection)
                  }}
                >
                  Delete collection
                </Button>
              </Box>
              {!isExpanded && collection.document_count === 0 ? (
                <Typography variant={'body2'} color={'text.secondary'}>
                  {'No documents associated with this collection.'}
                </Typography>
              ) : !isExpanded ? null : collection.document_count === 0 ? (
                <Typography variant={'body2'} color={'text.secondary'}>
                  {'No documents associated with this collection.'}
                </Typography>
              ) : (
                <CollectionDocumentsTable
                  collectionId={collection.id}
                  collectionName={collection.collection_name}
                  documentCount={collection.document_count}
                  filterOptions={filterOptions}
                  initialQuery={queryForCollection}
                  originHref={originHref}
                  onQueryChange={(query) => {
                    handleCollectionQueryChange(collection.id, query)
                  }}
                />
              )}
            </AccordionPanel>
          )
        })}
      </Stack>
      {managerState ? (
        <CollectionDocumentManager
          collectionId={managerState.collectionId}
          collectionName={managerState.collectionName}
          initialAction={managerState.initialAction}
          open={true}
          onClose={() => setManagerState(null)}
        />
      ) : null}
      <TagDeleteFlowDialog
        open={Boolean(collectionToDelete)}
        title={'Remove collection?'}
        subjectName={'collection'}
        usageCount={collectionToDelete?.document_count ?? null}
        primaryMessage={`Remove "${collectionToDelete?.collection_name ?? 'this collection'}"?`}
        checkboxLabel={'Also delete tag and remove from all documents'}
        secondConfirmMessage={`This will remove the tag from ${collectionToDelete?.document_count ?? 0} ${(collectionToDelete?.document_count ?? 0) === 1 ? 'document' : 'documents'} and delete the tag. This cannot be undone.`}
        onConfirm={handleDeleteCollection}
        onClose={() => {
          if (isDeletingCollection) {
            return
          }

          setCollectionToDelete(null)
        }}
      />
    </>
  )
}
