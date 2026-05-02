'use client'

import { useMemo, useState, type ReactElement } from 'react'
import Link from 'next/link'
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, CircularProgress, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table'

import { DateAtom } from '@atoms/Date'
import { getDocumentsForCollectionAction } from '@actions/collections'
import type { CollectionWithMeta, Document } from '@lib/types'

interface CollectionsAccordionProps {
  collections: CollectionWithMeta[]
}

interface CollectionManagerState {
  collectionId: string
  collectionName: string
  initialAction: 'add' | 'remove'
}

function CollectionDocumentsTable({ documents }: { documents: Document[] }): ReactElement {
  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 120,
        Cell: ({ renderedCellValue }) => {
          const value = String((renderedCellValue as string | null) ?? '')
          return <span title={value}>{value.length > 8 ? `${value.slice(0, 8)}...` : value}</span>
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => {
          const value = row.original.name

          if (!value) {
            return '—'
          }

          return (
            <Link href={`/documents/${row.original.id}`} style={{ color: '#355834' }}>
              {value}
            </Link>
          )
        },
      },
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 180,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—') || '—',
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

  const table = useMaterialReactTable({
    columns,
    data: documents,
    enablePagination: false,
    enableSorting: false,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableGlobalFilter: false,
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#f4f1f0',
        color: '#231f20',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '2px solid #355834',
      },
    },
    muiTableBodyCellProps: {
      sx: { color: '#231f20', fontSize: '0.875rem' },
    },
    muiTableBodyProps: {
      sx: {
        '& tr:nth-of-type(even)': { backgroundColor: 'rgba(244,241,240,0.3)' },
        '& tr:hover': { backgroundColor: 'rgba(53,88,52,0.06)' },
      },
    },
    muiTableContainerProps: {
      sx: { borderRadius: '0.75rem', border: '1px solid rgba(53,88,52,0.125)' },
    },
    localization: {
      noRecordsToDisplay: 'No documents associated with this collection.',
    },
    getRowId: (row) => row.id,
  })

  return <MaterialReactTable table={table} />
}

export function CollectionsAccordion({ collections }: CollectionsAccordionProps): ReactElement {
  const [managerState, setManagerState] = useState<CollectionManagerState | null>(null)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [collectionDocuments, setCollectionDocuments] = useState<Map<string, Document[]>>(new Map())
  const [loadingCollections, setLoadingCollections] = useState<Set<string>>(new Set())
  const [errorCollections, setErrorCollections] = useState<Map<string, string>>(new Map())

  const loadCollectionDocuments = useMemo(
    () =>
      async (collectionId: string) => {
        if (collectionDocuments.has(collectionId) || loadingCollections.has(collectionId)) {
          return
        }

        setLoadingCollections((prev) => new Set(prev).add(collectionId))
        setErrorCollections((prev) => {
          const next = new Map(prev)
          next.delete(collectionId)
          return next
        })

        try {
          const docs = await getDocumentsForCollectionAction(collectionId)
          setCollectionDocuments((prev) => new Map(prev).set(collectionId, docs))
        } catch {
          setErrorCollections((prev) => new Map(prev).set(collectionId, 'Unable to load documents.'))
        } finally {
          setLoadingCollections((prev) => {
            const next = new Set(prev)
            next.delete(collectionId)
            return next
          })
        }
      },
    [collectionDocuments, loadingCollections],
  )

  const handleAccordionChange = (collectionId: string) => (_event: React.SyntheticEvent, expanded: boolean) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (expanded) {
        next.add(collectionId)
        loadCollectionDocuments(collectionId)
      } else {
        next.delete(collectionId)
      }
      return next
    })
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
          const isLoading = loadingCollections.has(collection.id)
          const docs = collectionDocuments.get(collection.id)
          const error = errorCollections.get(collection.id)

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
                </Box>
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                    <CircularProgress size={16} sx={{ color: '#355834' }} />
                    <Typography sx={{ color: 'rgba(35,31,32,0.6)', fontSize: '0.875rem' }}>
                      Loading documents…
                    </Typography>
                  </Box>
                ) : error ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    <Typography sx={{ color: '#b71c1c', fontSize: '0.875rem' }}>{error}</Typography>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setErrorCollections((prev) => {
                          const next = new Map(prev)
                          next.delete(collection.id)
                          return next
                        })
                        loadCollectionDocuments(collection.id)
                      }}
                    >
                      Retry
                    </Button>
                  </Box>
                ) : !isExpanded && collection.document_count === 0 ? (
                  <Typography sx={{ color: 'rgba(35,31,32,0.7)', fontSize: '0.95rem' }}>
                    No documents associated with this collection.
                  </Typography>
                ) : !isExpanded ? null : docs == null || docs.length === 0 ? (
                  <Typography sx={{ color: 'rgba(35,31,32,0.7)', fontSize: '0.95rem' }}>
                    No documents associated with this collection.
                  </Typography>
                ) : (
                  <CollectionDocumentsTable documents={docs} />
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
          open
          onClose={() => setManagerState(null)}
        />
      ) : null}
    </>
  )
}
