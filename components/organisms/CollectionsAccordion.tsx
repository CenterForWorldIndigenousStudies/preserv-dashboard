'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import type { MRT_ColumnDef } from 'material-react-table'

import { deleteCollectionAction, getDocumentsForCollectionAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { DateAtom } from '@atoms/Date'
import { DOCUMENTS_PATH } from '@constants/paths'
import { DocumentNameBlock } from '@molecules/DocumentNameBlock'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
import type { DocumentTableQuery } from '@organisms/document-table/types'
import { useDocumentTableController } from '@organisms/document-table/useDocumentTableController'
import { TagDeleteFlowDialog } from '@organisms/TagDeleteFlowDialog'
import type { CollectionWithMeta } from 'types/collections'
import type { Document } from 'types/documents'

interface CollectionsAccordionProps {
  collections: CollectionWithMeta[]
}

interface CollectionManagerState {
  collectionId: string
  collectionName: string
  initialAction: 'add' | 'remove'
}

const COLLECTION_EXPANDED_PARAM = 'expanded'

function buildCollectionQueryParamKey(collectionId: string, key: 'page' | 'pageSize' | 'search' | 'orderBy' | 'sortDirection') {
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
): DocumentTableQuery<Record<string, never>> {
  const page = Number(searchParams.get(buildCollectionQueryParamKey(collectionId, 'page')))
  const pageSize = Number(searchParams.get(buildCollectionQueryParamKey(collectionId, 'pageSize')))
  const sortDirection = searchParams.get(buildCollectionQueryParamKey(collectionId, 'sortDirection'))
  const search = searchParams.get(buildCollectionQueryParamKey(collectionId, 'search'))?.trim()

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    search: search || undefined,
    orderBy: searchParams.get(buildCollectionQueryParamKey(collectionId, 'orderBy')) ?? undefined,
    sortDirection: sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : undefined,
    filters: {},
  }
}

function serializeCollectionsState(
  pathname: string,
  currentSearchParams: URLSearchParams,
  expandedCollections: Set<string>,
  collectionQueries: Record<string, DocumentTableQuery<Record<string, never>>>,
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

function buildCollectionDocumentHref(documentId: string, overviewHref: string): string {
  return `${DOCUMENTS_PATH}/${documentId}?${new URLSearchParams({ from: overviewHref }).toString()}`
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

function CollectionDocumentsTable({
  collectionId,
  documentCount,
  initialQuery,
  originHref,
  onQueryChange,
}: {
  collectionId: string
  documentCount: number
  initialQuery: DocumentTableQuery<Record<string, never>>
  originHref: string
  onQueryChange: (query: DocumentTableQuery<Record<string, never>>) => void
}): ReactElement {
  const controller = useDocumentTableController<Record<string, never>>({ initialQuery })

  useEffect(() => {
    onQueryChange(controller.query)
  }, [controller.currentQueryKey, controller.query, onQueryChange])

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
        }) => {
          return (
            <DocumentNameBlock
              name={name}
              id={id}
              legacyId={id_legacy}
              sourceId={source_id}
              href={buildCollectionDocumentHref(id, originHref)}
            />
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
    ],
    [originHref],
  )

  return (
    <DocumentDataTable<Document, Record<string, never>>
      definition={{
        tableId: `collection-documents-${collectionId}`,
        columns,
        fetcher: async (query) => {
          const result = await getDocumentsForCollectionAction(collectionId, {
            page: query.page,
            pageSize: query.pageSize,
            search: query.search,
            sortField: query.orderBy as 'name' | 'id_legacy' | 'filesize' | 'created_at' | undefined,
            sortDirection: query.sortDirection,
          })

          return {
            data: result.documents,
            totalCount: result.total,
            pageInfo: buildCollectionDocumentsPageInfo(query.page, query.pageSize, result.total),
          }
        },
      }}
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
      initialQuery={{
        ...initialQuery,
      }}
      emptyMessage="No documents associated with this collection."
      searchPlaceholder="Search collection documents"
    />
  )
}

export function CollectionsAccordion({ collections }: CollectionsAccordionProps): ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [managerState, setManagerState] = useState<CollectionManagerState | null>(null)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(() => parseExpandedCollections(searchParams))
  const [collectionQueries, setCollectionQueries] = useState<Record<string, DocumentTableQuery<Record<string, never>>>>({})
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

  const handleCollectionQueryChange = (collectionId: string, query: DocumentTableQuery<Record<string, never>>) => {
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
      <Paper component="section" sx={{ border: 1, borderColor: 'divider', p: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No collections found.
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
            collectionQueries[collection.id] ?? parseCollectionTableInitialQuery(searchParams, collection.id)
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
            <Accordion
              key={collection.id}
              disableGutters
              expanded={isExpanded}
              onChange={handleAccordionChange(collection.id)}
              slots={{ heading: 'h2' }}
              sx={(theme: Theme) => ({
                border: 1,
                borderColor: alpha(theme.palette.moss?.main ?? theme.palette.primary.main, 0.15),
                borderRadius: 2,
                boxShadow: 3,
                '&::before': { display: 'none' },
                overflow: 'hidden',
              })}
            >
              <AccordionSummary
                expandIcon={<span aria-hidden="true">▾</span>}
                sx={{
                  backgroundColor: 'background.paper',
                  px: 3,
                  py: 1,
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    marginY: 1,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography component="span" variant="h6" color="text.primary">
                    {collection.collection_name}
                  </Typography>
                  <Chip
                    label={`${collection.document_count} document${collection.document_count === 1 ? '' : 's'}`}
                    sx={(theme: Theme) => {
                      const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main

                      return {
                        backgroundColor: alpha(mossColor, 0.1),
                        color: mossColor,
                        fontWeight: 600,
                      }
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={(theme: Theme) => ({
                  backgroundColor: alpha(theme.palette.sand?.main ?? theme.palette.secondary.main, 0.25),
                  px: 3,
                  py: 2,
                })}
              >
                {collection.notes ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {collection.notes}
                  </Typography>
                ) : null}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault()
                      setManagerState({
                        collectionId: collection.id,
                        collectionName: collection.collection_name,
                        initialAction: 'add',
                      })
                    }}
                  >
                    Add documents
                  </Button>
                  {collection.document_count > 0 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(event) => {
                        event.preventDefault()
                        setManagerState({
                          collectionId: collection.id,
                          collectionName: collection.collection_name,
                          initialAction: 'remove',
                        })
                      }}
                    >
                      Remove documents
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
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
                  <Typography variant="body2" color="text.secondary">
                    No documents associated with this collection.
                  </Typography>
                ) : !isExpanded ? null : collection.document_count === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No documents associated with this collection.
                  </Typography>
                ) : (
                  <CollectionDocumentsTable
                    collectionId={collection.id}
                    documentCount={collection.document_count}
                    initialQuery={queryForCollection}
                    originHref={originHref}
                    onQueryChange={(query) => {
                      handleCollectionQueryChange(collection.id, query)
                    }}
                  />
                )}
              </AccordionDetails>
            </Accordion>
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
        title="Remove collection?"
        subjectName="collection"
        usageCount={collectionToDelete?.document_count ?? null}
        primaryMessage={`Remove "${collectionToDelete?.collection_name ?? 'this collection'}"?`}
        checkboxLabel="Also delete tag and remove from all documents"
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
