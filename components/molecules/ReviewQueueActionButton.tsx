'use client'

import type { ReactElement } from 'react'

import { SelectionActionsButton } from '@molecules/SelectionActionsButton'

export interface ReviewQueueActionButtonProps {
  batchActionPending: boolean
  selectedCount: number
  hasSelectedDraftDocuments: boolean
  onApprove: () => void
  onReject: () => void
  onReprocess: () => void
  onRemove: () => void
}

export function ReviewQueueActionButton({
  batchActionPending,
  selectedCount,
  hasSelectedDraftDocuments,
  onApprove,
  onReject,
  onReprocess,
  onRemove,
}: ReviewQueueActionButtonProps): ReactElement {
  return (
    <SelectionActionsButton
      selectedCount={selectedCount}
      disabled={batchActionPending}
      actions={[
        { label: 'Approve', onClick: onApprove },
        { label: 'Reject', onClick: onReject },
        { label: 'Reprocess', onClick: onReprocess },
        ...(hasSelectedDraftDocuments ? [{ label: 'Remove from draft', onClick: onRemove }] : []),
      ]}
    />
  )
}
