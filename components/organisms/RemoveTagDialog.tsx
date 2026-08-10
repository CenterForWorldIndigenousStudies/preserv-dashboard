'use client'

import type { ReactElement } from 'react'
import { isProtectedTagName } from '@lib/tagUtils'
import { TagDeleteFlowDialog } from './TagDeleteFlowDialog'

interface RemoveTagDialogProps {
  open: boolean
  tagName: string
  usageCount: number | null
  onClose: () => void
  onConfirm: (options: { deleteTagFromSystem: boolean }) => Promise<void>
}

export function RemoveTagDialog({ open, tagName, usageCount, onClose, onConfirm }: RemoveTagDialogProps): ReactElement {
  const safeUsageCount = usageCount ?? 0
  const canDeleteFromSystem = !isProtectedTagName(tagName)
  const secondConfirmMessage = `This will remove the tag from ${safeUsageCount} ${safeUsageCount === 1 ? 'document' : 'documents'} and delete the tag. This cannot be undone.`

  return (
    <TagDeleteFlowDialog
      open={open}
      title={'Remove tag?'}
      subjectName={'tag'}
      usageCount={usageCount}
      primaryMessage={`Remove "${tagName}"?`}
      checkboxLabel={canDeleteFromSystem ? 'Also delete tag and remove from all documents' : undefined}
      secondConfirmMessage={secondConfirmMessage}
      onClose={onClose}
      onConfirm={(deleteTagFromSystem) => onConfirm({ deleteTagFromSystem })}
    />
  )
}
