'use client'

import { useState, type ReactElement } from 'react'

import { buildSelectionBatch } from '@molecules/DocumentReprocessingActions'
import { PipelineExecutionDialog } from '@molecules/PipelineExecutionDialog'
import { SelectionActionsButton } from '@molecules/SelectionActionsButton'
import { ReadyForLibraryPublishDialog } from '@organisms/ReadyForLibraryPublishDialog'

interface ReadyForLibraryActionsProps {
  documentIds: readonly string[]
  onPublished: () => void
}

export function ReadyForLibraryActions({ documentIds, onPublished }: ReadyForLibraryActionsProps): ReactElement {
  const [reprocessIds, setReprocessIds] = useState<string[] | null>(null)
  const [publication, setPublication] = useState<{ documentIds: string[]; operationId: string } | null>(null)
  const selectedCount = documentIds.length

  return (
    <>
      <SelectionActionsButton
        selectedCount={selectedCount}
        actions={[
          { label: 'Reprocess', onClick: () => setReprocessIds([...documentIds]) },
          { label: 'Publish', onClick: () => setPublication({ documentIds: [...new Set(documentIds)].sort(), operationId: crypto.randomUUID() }) },
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
      {publication ? (
        <ReadyForLibraryPublishDialog
          documentIds={publication.documentIds}
          operationId={publication.operationId}
          onClose={() => setPublication(null)}
          onPublished={onPublished}
        />
      ) : null}
    </>
  )
}
