import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { getBatchDraftInitialConfig, batchDraftPipelineConfigToRequestedStages } from '@lib/batchDraftPipeline'
import { BatchDraftWorkspace } from '@organisms/BatchDraftWorkspace'

const pipelineConfig = getBatchDraftInitialConfig()

const meta = {
  title: 'Organisms/BatchDraftWorkspace',
  component: BatchDraftWorkspace,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    a11y: { disable: true },
    nextjs: { appDirectory: true, navigation: { pathname: '/process-documents' } },
  },
  args: {
    initialDraft: {
      id: 'draft-1',
      name: 'Initial preservation batch',
      collectionName: 'CWIS collection',
      collectionNotes: 'Initial source import.',
      restartStage: 'data_ingester' as const,
      requestedStages: batchDraftPipelineConfigToRequestedStages(pipelineConfig),
      pipelineConfig,
      executionMode: 'normal' as const,
      sourceFolderIds: ['folder-1'],
      sourceDocumentIds: [],
      reason: 'Initial preservation batch.',
      documentCount: 0,
      createdAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z',
      documents: [],
    },
    rootFolders: [{ id: 'folder-1', name: 'Source folder' }],
    selectedFolders: { 'folder-1': { id: 'folder-1', name: 'Source folder' } },
    onToggleFolderSelection: fn(),
    onToggleFolderExpansion: fn(),
    onGoogleDriveExpandedChange: fn(),
  },
} satisfies Meta<typeof BatchDraftWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const FolderSource: Story = {}
export const DocumentSource: Story = {
  args: {
    initialDraft: {
      ...meta.args.initialDraft,
      sourceFolderIds: [],
      sourceDocumentIds: ['document-1'],
      documentCount: 1,
      documents: [
        {
          id: 'document-1',
          name: 'Source document.pdf',
          idLegacy: null,
          sourceBatchId: 'source-batch-1',
          sourceBatchLegacyId: null,
          sourceBatchName: 'Original batch',
          addedAt: '2026-09-18T10:01:00.000Z',
        },
      ],
    },
    selectedFolders: {},
  },
}
