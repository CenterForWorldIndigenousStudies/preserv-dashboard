import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ReprocessingDraftWorkspace } from '@organisms/ReprocessingDraftWorkspace'

const meta = {
  title: 'Organisms/ReprocessingDraftWorkspace',
  component: ReprocessingDraftWorkspace,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    a11y: { disable: true },
    nextjs: { appDirectory: true, navigation: { pathname: '/process-documents' } },
  },
  args: {
    initialDraft: {
      id: 'draft-1',
      name: 'Needs review corrections',
      collectionName: 'CWIS collection',
      collectionNotes: 'Metadata correction run.',
      restartStage: 'metadata_extractor',
      reason: 'Correct metadata after review.',
      documentCount: 1,
      createdAt: '2026-09-03T10:00:00.000Z',
      updatedAt: '2026-09-03T10:00:00.000Z',
      createdBy: null,
      updatedBy: null,
      documents: [
        { id: 'document-1', name: 'Interview.pdf', idLegacy: 'legacy-1', sourceBatchName: 'Original ingest', addedAt: null },
      ],
    },
  },
} satisfies Meta<typeof ReprocessingDraftWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const WithDocument: Story = {}
export const EmptyDraft: Story = { args: { initialDraft: { ...meta.args.initialDraft, documentCount: 0, documents: [] } } }
