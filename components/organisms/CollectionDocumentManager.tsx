'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  addDocumentsToCollectionAction,
  getDocumentsForCollectionAction,
  getDocumentsNotInCollectionAction,
  removeDocumentsFromCollectionAction,
} from '@actions/collections'
import { Button } from '@atoms/Button'
import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { ConfirmationDialog } from '@molecules/ConfirmationDialog'
import type { Document } from '@lib/types'

type CollectionManagerAction = 'add' | 'remove'
type SortField = 'name' | 'id_legacy' | 'filesize' | 'created_at'
type SortDirection = 'asc' | 'desc'

interface CollectionDocumentManagerProps {
  collectionId: string
  collectionName: string
  open: boolean
  onClose: () => void
  initialAction?: CollectionManagerAction
  loadInCollection?: (collectionId: string) => Promise<Document[]>
  loadOutOfCollection?: (collectionId: string) => Promise<Document[]>
  addDocuments?: (collectionId: string, documentIds: string[]) => Promise<void>
  removeDocuments?: (collectionId: string, documentIds: string[]) => Promise<void>
}

interface SortState {
  field: SortField
  direction: SortDirection
}

interface DocumentSelectionTableProps {
  title: string
  searchLabel: string
  documents: Document[]
  searchValue: string
  onSearchChange: (value: string) => void
  isChecked: (documentId: string) => boolean
  onToggle: (documentId: string, checked: boolean) => void
  sortState: SortState
  onSortChange: (field: SortField) => void
  emptyMessage: string
}

const DEFAULT_SORT: SortState = {
  field: 'name',
  direction: 'asc',
}

function normalizeSearchValue(value: string | null | undefined): string {
  return value?.toLowerCase().trim() ?? ''
}

function getComparableValue(document: Document, field: SortField): number | string {
  if (field === 'filesize') {
    return document.filesize ?? -1
  }

  if (field === 'created_at') {
    const rawValue = document.created_at
    return rawValue ? new Date(rawValue).getTime() : 0
  }

  if (field === 'id_legacy') {
    return document.id_legacy?.toLowerCase() ?? ''
  }

  return document.name?.toLowerCase() ?? ''
}

function sortDocuments(documents: Document[], sortState: SortState): Document[] {
  return [...documents].sort((left, right) => {
    const leftValue = getComparableValue(left, sortState.field)
    const rightValue = getComparableValue(right, sortState.field)

    if (leftValue < rightValue) {
      return sortState.direction === 'asc' ? -1 : 1
    }

    if (leftValue > rightValue) {
      return sortState.direction === 'asc' ? 1 : -1
    }

    return (left.name ?? '').localeCompare(right.name ?? '') || left.id.localeCompare(right.id)
  })
}

function sortDocumentsByName(documents: Document[]): Document[] {
  return sortDocuments(documents, DEFAULT_SORT)
}

function filterDocuments(documents: Document[], query: string): Document[] {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return documents
  }

  return documents.filter((document) => {
    const name = normalizeSearchValue(document.name)
    const legacyId = normalizeSearchValue(document.id_legacy)
    return name.includes(normalizedQuery) || legacyId.includes(normalizedQuery)
  })
}

function buildActionLabel(action: CollectionManagerAction, count: number): string {
  const baseLabel = action === 'add' ? 'Add Documents' : 'Remove Documents'
  return count > 0 ? `${baseLabel} (${count})` : baseLabel
}

function buildDialogTitle(action: CollectionManagerAction, collectionName: string): string {
  return `${action === 'add' ? 'Add' : 'Remove'} Documents ${action === 'add' ? 'to' : 'from'} "${collectionName}"`
}

function buildConfirmationMessage(action: CollectionManagerAction, collectionName: string, count: number): string {
  const noun = count === 1 ? 'document' : 'documents'
  if (action === 'add') {
    return `Add ${count} ${noun} to ${collectionName}?`
  }

  return `Remove ${count} ${noun} from ${collectionName}?`
}

function DocumentSelectionTable({
  title,
  searchLabel,
  documents,
  searchValue,
  onSearchChange,
  isChecked,
  onToggle,
  sortState,
  onSortChange,
  emptyMessage,
}: DocumentSelectionTableProps): ReactElement {
  const filteredDocuments = useMemo(
    () => sortDocuments(filterDocuments(documents, searchValue), sortState),
    [documents, searchValue, sortState],
  )

  const headers: Array<{ field: SortField; label: string; align?: 'left' | 'right' }> = [
    { field: 'name', label: 'Name' },
    { field: 'id_legacy', label: 'Legacy ID' },
    { field: 'filesize', label: 'File Size', align: 'right' },
    { field: 'created_at', label: 'Created' },
  ]

  return (
    <Paper sx={{ borderRadius: '1rem', border: '1px solid rgba(53,88,52,0.125)', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: '1px solid rgba(53,88,52,0.125)', p: 2 }}>
        <Typography sx={{ color: '#231f20', fontSize: '1rem', fontWeight: 600 }}>{title}</Typography>
        <TextField
          fullWidth
          size="small"
          label={searchLabel}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          sx={{ mt: 2 }}
        />
      </Box>
      <TableContainer sx={{ maxHeight: 420 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ backgroundColor: '#f4f1f0' }}>
                Select
              </TableCell>
              {headers.map((header) => (
                <TableCell
                  key={header.field}
                  align={header.align}
                  sx={{
                    backgroundColor: '#f4f1f0',
                    color: '#231f20',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  <TableSortLabel
                    active={sortState.field === header.field}
                    direction={sortState.field === header.field ? sortState.direction : 'asc'}
                    onClick={() => onSortChange(header.field)}
                  >
                    {header.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'rgba(35,31,32,0.7)', py: 3, textAlign: 'center' }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((document, index) => {
                const checked = isChecked(document.id)

                return (
                  <TableRow
                    key={document.id}
                    hover
                    sx={{
                      '& td': {
                        backgroundColor: index % 2 === 1 ? 'rgba(244,241,240,0.3)' : 'transparent',
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <span data-id={document.id}>
                        <Checkbox
                          checked={checked}
                          onChange={(event) => onToggle(document.id, event.target.checked)}
                        />
                      </span>
                    </TableCell>
                    <TableCell>{document.name ?? 'Untitled document'}</TableCell>
                    <TableCell>{document.id_legacy ?? '—'}</TableCell>
                    <TableCell align="right">
                      <FileSize value={document.filesize} />
                    </TableCell>
                    <TableCell>
                      <DateAtom value={document.created_at} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export function CollectionDocumentManager({
  collectionId,
  collectionName,
  open,
  onClose,
  initialAction = 'add',
  loadInCollection = getDocumentsForCollectionAction,
  loadOutOfCollection = getDocumentsNotInCollectionAction,
  addDocuments = addDocumentsToCollectionAction,
  removeDocuments = removeDocumentsFromCollectionAction,
}: CollectionDocumentManagerProps): ReactElement {
  const [inCollection, setInCollection] = useState<Document[]>([])
  const [outOfCollection, setOutOfCollection] = useState<Document[]>([])
  const [selectedIn, setSelectedIn] = useState<Set<string>>(new Set())
  const [selectedOut, setSelectedOut] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingAction, setPendingAction] = useState<CollectionManagerAction | null>(null)
  const [activeAction, setActiveAction] = useState<CollectionManagerAction>(initialAction)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inSearch, setInSearch] = useState('')
  const [outSearch, setOutSearch] = useState('')
  const [inSort, setInSort] = useState<SortState>(DEFAULT_SORT)
  const [outSort, setOutSort] = useState<SortState>(DEFAULT_SORT)

  const selectedCount = activeAction === 'add' ? selectedOut.size : selectedIn.size

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    setActiveAction(initialAction)
    setSelectedIn(new Set())
    setSelectedOut(new Set())
    setInSearch('')
    setOutSearch('')
    setInSort(DEFAULT_SORT)
    setOutSort(DEFAULT_SORT)
    setShowConfirm(false)
    setPendingAction(null)
    setError(null)
    setIsLoading(true)

    Promise.all([loadInCollection(collectionId), loadOutOfCollection(collectionId)])
      .then(([nextInCollection, nextOutOfCollection]) => {
        if (cancelled) {
          return
        }

        setInCollection(sortDocumentsByName(nextInCollection))
        setOutOfCollection(sortDocumentsByName(nextOutOfCollection))
        setIsLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load collection documents.')
        setInCollection([])
        setOutOfCollection([])
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [collectionId, initialAction, loadInCollection, loadOutOfCollection, open])

  function handleSortChange(current: SortState, setSortState: (state: SortState) => void, field: SortField): void {
    if (current.field === field) {
      setSortState({
        field,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      })
      return
    }

    setSortState({ field, direction: 'asc' })
  }

  function handleClose(): void {
    if (isSubmitting) {
      return
    }

    setShowConfirm(false)
    setPendingAction(null)
    onClose()
  }

  async function handleConfirm(): Promise<void> {
    if (!pendingAction || isSubmitting) {
      return
    }

    const selectedIds = pendingAction === 'add' ? [...selectedOut] : [...selectedIn]

    if (selectedIds.length === 0) {
      setShowConfirm(false)
      setPendingAction(null)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (pendingAction === 'add') {
        await addDocuments(collectionId, selectedIds)
        const movedDocuments = outOfCollection.filter((document) => selectedOut.has(document.id))

        setInCollection((current) => sortDocumentsByName([...current, ...movedDocuments]))
        setOutOfCollection((current) => current.filter((document) => !selectedOut.has(document.id)))
        setSelectedOut(new Set())
      } else {
        await removeDocuments(collectionId, selectedIds)
        const movedDocuments = inCollection.filter((document) => selectedIn.has(document.id))

        setOutOfCollection((current) => sortDocumentsByName([...current, ...movedDocuments]))
        setInCollection((current) => current.filter((document) => !selectedIn.has(document.id)))
        setSelectedIn(new Set())
      }

      setShowConfirm(false)
      setPendingAction(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to update this collection right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="xl"
        sx={{ '& .MuiDialog-paper': { borderRadius: '1rem' } }}
      >
        <DialogTitle>{buildDialogTitle(activeAction, collectionName)}</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 3, px: 3, py: 3 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {isLoading ? (
            <div aria-live="polite" className="flex justify-center">
              <Button loading variant="secondary">
                Loading documents
              </Button>
            </div>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: '1fr 1fr',
                },
              }}
            >
              <DocumentSelectionTable
                title="Documents in Collection"
                searchLabel="Search documents in collection"
                documents={inCollection}
                searchValue={inSearch}
                onSearchChange={setInSearch}
                isChecked={(documentId) => !selectedIn.has(documentId)}
                onToggle={(documentId, checked) => {
                  setSelectedIn((current) => {
                    const next = new Set(current)
                    if (checked) {
                      next.delete(documentId)
                    } else {
                      next.add(documentId)
                    }
                    return next
                  })
                }}
                sortState={inSort}
                onSortChange={(field) => handleSortChange(inSort, setInSort, field)}
                emptyMessage="No documents associated with this collection."
              />
              <DocumentSelectionTable
                title="Other Documents"
                searchLabel="Search other documents"
                documents={outOfCollection}
                searchValue={outSearch}
                onSearchChange={setOutSearch}
                isChecked={(documentId) => selectedOut.has(documentId)}
                onToggle={(documentId, checked) => {
                  setSelectedOut((current) => {
                    const next = new Set(current)
                    if (checked) {
                      next.add(documentId)
                    } else {
                      next.delete(documentId)
                    }
                    return next
                  })
                }}
                sortState={outSort}
                onSortChange={(field) => handleSortChange(outSort, setOutSort, field)}
                emptyMessage="No other documents available."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={isLoading || isSubmitting || selectedOut.size === 0}
            onClick={() => {
              setActiveAction('add')
              setPendingAction('add')
              setShowConfirm(true)
            }}
          >
            {buildActionLabel('add', selectedOut.size)}
          </Button>
          <Button
            variant="secondary"
            disabled={isLoading || isSubmitting || selectedIn.size === 0}
            onClick={() => {
              setActiveAction('remove')
              setPendingAction('remove')
              setShowConfirm(true)
            }}
          >
            {buildActionLabel('remove', selectedIn.size)}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmationDialog
        open={showConfirm}
        title={pendingAction ? buildDialogTitle(pendingAction, collectionName) : 'Confirm action'}
        message={buildConfirmationMessage(pendingAction ?? activeAction, collectionName, selectedCount)}
        confirmLabel={pendingAction === 'add' ? 'Yes, add' : 'Yes, remove'}
        cancelLabel="No"
        onConfirm={() => {
          void handleConfirm()
        }}
        onCancel={() => {
          if (isSubmitting) {
            return
          }

          setShowConfirm(false)
          setPendingAction(null)
        }}
      />
    </>
  )
}
