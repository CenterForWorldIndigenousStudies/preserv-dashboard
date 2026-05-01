'use client'

import { useEffect, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import {
  addDocumentsToCollectionAction,
  getDocumentsForCollectionAction,
  getDocumentsNotInCollectionAction,
  removeDocumentsFromCollectionAction,
} from '@actions/collections'
import { Button } from '@atoms/Button'
import { SelectionTable, sortDocuments, DEFAULT_SELECTION_SORT, type SelectionSortField, type SelectionSortState } from '@molecules/SelectionTable'
import { ConfirmationDialog } from '@molecules/ConfirmationDialog'
import type { Document } from '@lib/types'

type CollectionManagerAction = 'add' | 'remove'

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

function sortDocumentsByName(documents: Document[]): Document[] {
  return sortDocuments(documents, DEFAULT_SELECTION_SORT)
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
  const [inSort, setInSort] = useState<SelectionSortState>(DEFAULT_SELECTION_SORT)
  const [outSort, setOutSort] = useState<SelectionSortState>(DEFAULT_SELECTION_SORT)

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
    setInSort(DEFAULT_SELECTION_SORT)
    setOutSort(DEFAULT_SELECTION_SORT)
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

  function handleSortChange(current: SelectionSortState, setSortState: (state: SelectionSortState) => void, field: SelectionSortField): void {
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
              <SelectionTable
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
              <SelectionTable
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