'use client'

import { useState, type ReactElement } from 'react'

import { buildSelectionBatch } from '@molecules/DocumentReprocessingActions'
import { PipelineExecutionDialog } from '@molecules/PipelineExecutionDialog'
import { SelectionActionsButton } from '@molecules/SelectionActionsButton'
import { LibraryRemovalActions } from '@organisms/LibraryRemovalActions'

interface LibraryActionsProps {
  documentIds: readonly string[]
  onRemoved: () => void
}

export function LibraryActions({ documentIds, onRemoved }: LibraryActionsProps): ReactElement {
  const [reprocessIds, setReprocessIds] = useState<string[] | null>(null)
  const [removeIds, setRemoveIds] = useState<string[] | null>(null)

  return (
    <>
      <SelectionActionsButton
        selectedCount={documentIds.length}
        actions={[
          { label: 'Reprocess', onClick: () => setReprocessIds([...documentIds]) },
          { label: 'Remove', onClick: () => setRemoveIds([...documentIds]) },
        ]}
      />
      {reprocessIds ? (
        <PipelineExecutionDialog
          batch={buildSelectionBatch()}
          mode={'reprocess'}
          open
          onClose={() => setReprocessIds(null)}
          documentIds={reprocessIds}
        />
      ) : null}
      <LibraryRemovalActions
        documentIds={removeIds ?? []}
        open={removeIds !== null}
        onClose={() => setRemoveIds(null)}
        onSubmitted={() => {
          setRemoveIds(null)
          onRemoved()
        }}
      />
    </>
  )
}
