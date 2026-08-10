import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProcessBatchCreationWorkspace } from './ProcessBatchCreationWorkspace'
import type { DriveFolderOption } from '@lib/googleDrive'
import { createDefaultDraft } from '@lib/pipelineConfig'

const folders: DriveFolderOption[] = [
  { id: 'folder-1', name: 'Folder 1' },
  { id: 'folder-2', name: 'Folder 2' },
]

const meta = {
  title: 'Organisms/ProcessBatchCreationWorkspace',
  component: ProcessBatchCreationWorkspace,
  tags: ['autodocs'],
  args: {
    batchName: 'Test Batch',
    collectionName: 'Collection',
    collectionNotes: 'Sample notes',
    isSubmitting: false,
    isRefreshing: false,
    canSubmit: true,
    submitError: null,
    acceptedBatchName: null,
    batchNameSearchError: null,
    batchNameExists: false,
    pipelineDraft: createDefaultDraft(),
    isPipelineStepsModalOpen: false,
    rootFolders: folders,
    childFoldersByParent: {},
    expandedFolderIds: {},
    selectedFolders: {
      'folder-1': folders[0],
    },
    foldersError: null,
    onBatchNameChange: () => {},
    onCollectionNameChange: () => {},
    onCollectionNotesChange: () => {},
    onSubmit: () => {},
    onRefresh: () => {},
    onProfileChange: () => {},
    onConvertToCustom: () => {},
    onProfileDraftChange: () => {},
    onOpenStepsModal: () => {},
    onCloseStepsModal: () => {},
    onToggleFolderSelection: () => {},
    onToggleFolderExpansion: () => {},
  },
} satisfies Meta<typeof ProcessBatchCreationWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
