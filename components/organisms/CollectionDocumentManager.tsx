'use client'

import { type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import { Button } from '@atoms/Button'
import { SelectionTable, type SelectionSortField, type SelectionSortState } from '@molecules/SelectionTable'
import { ConfirmationDialog } from '@molecules/ConfirmationDialog'
import { useCollectionManager, type UseCollectionManagerOptions, type CollectionManagerAction } from '@hooks/useCollectionManager'

interface CollectionDocumentManagerProps extends UseCollectionManagerOptions {
  collectionId: string
  collectionName: string
  open: boolean
  onClose: () => void
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

export function CollectionDocumentManager({
  collectionId,
  collectionName,
  open,
  onClose,
  initialAction,
  loadInCollection,
  loadOutOfCollection,
  addDocuments,
  removeDocuments,
}: CollectionDocumentManagerProps): ReactElement {
  const {
    inCollection,
    outOfCollection,
    selectedIn,
    selectedOut,
    activeAction,
    isLoading,
    isSubmitting,
    error,
    inSearch,
    outSearch,
    inSort,
    outSort,
    setInSearch,
    setOutSearch,
    setInSort,
    setOutSort,
    toggleIn,
    toggleOut,
    handleConfirm,
    pendingAction,
    setPendingAction,
    showConfirm,
    setShowConfirm,
  } = useCollectionManager(collectionId, collectionName, {
    initialAction,
    loadInCollection,
    loadOutOfCollection,
    addDocuments,
    removeDocuments,
    open,
  })

  const selectedCount = activeAction === 'add' ? selectedOut.size : selectedIn.size

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

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="xl"
        sx={{ '& .MuiDialog-paper': { borderRadius: '1rem', height: '90vh' } }}
      >
        <DialogTitle>{buildDialogTitle(activeAction, collectionName)}</DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {isLoading ? (
            <div aria-live="polite" className="flex justify-center">
              <Button loading variant="secondary">
                Loading documents
              </Button>
            </div>
          ) : activeAction === 'add' ? (
            <SelectionTable
              title="Available Documents"
              searchLabel="Search available documents"
              documents={outOfCollection}
              searchValue={outSearch}
              onSearchChange={setOutSearch}
              isChecked={(id) => selectedOut.has(id)}
              onToggle={toggleOut}
              sortState={outSort}
              onSortChange={(field) => handleSortChange(outSort, setOutSort, field)}
              emptyMessage="No other documents available."
            />
          ) : (
            <SelectionTable
              title="Documents in Collection"
              searchLabel="Search documents in collection"
              documents={inCollection}
              searchValue={inSearch}
              onSearchChange={setInSearch}
              isChecked={(id) => !selectedIn.has(id)}
              onToggle={toggleIn}
              sortState={inSort}
              onSortChange={(field) => handleSortChange(inSort, setInSort, field)}
              emptyMessage="No documents associated with this collection."
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={isLoading || isSubmitting || selectedCount === 0}
            onClick={() => {
              setPendingAction(activeAction)
              setShowConfirm(true)
            }}
          >
            {buildActionLabel(activeAction, selectedCount)}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmationDialog
        open={showConfirm}
        title={pendingAction ? buildDialogTitle(pendingAction, collectionName) : 'Confirm action'}
        message={buildConfirmationMessage(pendingAction ?? activeAction, collectionName, selectedCount)}
        confirmLabel={pendingAction === 'add' ? 'Yes, add' : 'Yes, remove'}
        cancelLabel="No"
        onConfirm={() => { void handleConfirm() }}
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
