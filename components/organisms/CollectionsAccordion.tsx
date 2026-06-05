'use client'

import { useMemo, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Typography } from '@mui/material'
import type { MRT_ColumnDef } from 'material-react-table'

import { deleteCollectionAction, getDocumentsForCollectionAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { DateAtom } from '@atoms/Date'
import { DOCUMENTS_PATH } from '@constants/paths'
import { DocumentNameBlock } from '@molecules/DocumentNameBlock'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import { DocumentDataTable } from '@organisms/document-table/DocumentDataTable'
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
}: {
  collectionId: string
  documentCount: number
}): ReactElement {
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
              href={`${DOCUMENTS_PATH}/${id}`}
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
    [],
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
        page: 1,
        pageSize: 25,
        filters: {},
      }}
      emptyMessage="No documents associated with this collection."
      searchPlaceholder="Search collection documents"
    />
  )
}

export function CollectionsAccordion({ collections }: CollectionsAccordionProps): ReactElement {
  const router = useRouter()
  const [managerState, setManagerState] = useState<CollectionManagerState | null>(null)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionWithMeta | null>(null)
  const [isDeletingCollection, setIsDeletingCollection] = useState(false)

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
      <section className="rounded-2xl border border-moss/15 bg-white p-8 shadow-panel">
        <p className="text-sm text-ink/70">No collections found.</p>
      </section>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {collections.map((collection) => {
          const isExpanded = expandedCollections.has(collection.id)

          return (
            <Accordion
              key={collection.id}
              disableGutters
              expanded={isExpanded}
              onChange={handleAccordionChange(collection.id)}
              sx={{
                border: '1px solid rgba(53,88,52,0.125)',
                borderRadius: '1rem',
                boxShadow: '0 12px 32px rgba(35,31,32,0.08)',
                '&::before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<span aria-hidden="true">▾</span>}
                sx={{
                  backgroundColor: 'white',
                  px: 3,
                  py: 1,
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    marginY: 1,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: '#231f20', fontSize: '1rem', fontWeight: 600 }}>
                    {collection.collection_name}
                  </Typography>
                  <Chip
                    label={`${collection.document_count} document${collection.document_count === 1 ? '' : 's'}`}
                    sx={{
                      backgroundColor: 'rgba(53,88,52,0.1)',
                      color: '#355834',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: 'rgba(244,241,240,0.25)', px: 3, py: 2 }}>
                {collection.notes ? (
                  <Typography sx={{ color: 'rgba(35,31,32,0.7)', fontSize: '0.875rem', mb: 1.5 }}>
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
                  <Typography sx={{ color: 'rgba(35,31,32,0.7)', fontSize: '0.95rem' }}>
                    No documents associated with this collection.
                  </Typography>
                ) : !isExpanded ? null : collection.document_count === 0 ? (
                  <Typography sx={{ color: 'rgba(35,31,32,0.7)', fontSize: '0.95rem' }}>
                    No documents associated with this collection.
                  </Typography>
                ) : (
                  <CollectionDocumentsTable collectionId={collection.id} documentCount={collection.document_count} />
                )}
              </AccordionDetails>
            </Accordion>
          )
        })}
      </div>
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
