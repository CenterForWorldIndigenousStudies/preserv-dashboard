import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { DEFAULT_REPROCESSING_START_STAGE } from '@lib/reprocessingDrafts'
import { ReviewQueueReprocessDialog } from '@organisms/ReviewQueueReprocessDialog'

const existingDraft = {
  id: 'draft-1',
  name: 'Metadata correction batch',
  collectionName: 'Review collection',
  collectionNotes: 'Metadata review set.',
  restartStage: 'metadata_extractor' as const,
  reason: 'Correct extracted metadata.',
  documentCount: 6,
  createdAt: '2026-09-03T16:00:00.000Z',
  updatedAt: '2026-09-03T16:00:00.000Z',
  createdBy: 'archivist@example.org',
  updatedBy: 'archivist@example.org',
}

const meta = {
  title: 'Organisms/ReviewQueueReprocessDialog',
  component: ReviewQueueReprocessDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    documentName: 'document-to-review.pdf',
    mode: 'create' as const,
    name: 'Retry metadata batch',
    collectionName: '',
    collectionNotes: '',
    restartStage: DEFAULT_REPROCESSING_START_STAGE,
    reason: 'Correct extracted metadata.',
    drafts: [existingDraft],
    selectedDraftId: null,
    pending: false,
    canCreate: true,
    onClose: fn(),
    onModeChange: fn(),
    onNameChange: fn(),
    onCollectionNameChange: fn(),
    onCollectionNotesChange: fn(),
    onRestartStageChange: fn(),
    onReasonChange: fn(),
    onSelectedDraftChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof ReviewQueueReprocessDialog>

export default meta
type Story = StoryObj<typeof meta>

export const CreateDraft: Story = {}

export const NoExistingDrafts: Story = {
  args: {
    drafts: [],
  },
}

export const AddToExistingDraft: Story = {
  args: {
    mode: 'existing',
    selectedDraftId: existingDraft.id,
  },
}

export const Submitting: Story = {
  args: {
    pending: true,
    canCreate: false,
  },
}
