import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { BatchCart } from '@molecules/BatchCart'

const meta = {
  title: 'Molecules/BatchCart',
  component: BatchCart,
  tags: ['autodocs'],
} satisfies Meta<typeof BatchCart>

export default meta
type Story = StoryObj<typeof meta>

export const WithDrafts: Story = {
  args: {
    drafts: [
      {
        id: 'draft-1',
        name: 'Initial preservation batch',
        collectionName: 'Collection',
        collectionNotes: null,
        restartStage: 'data_ingester',
        requestedStages: ['ocr_processor'],
        reason: 'Initial preservation batch',
        documentCount: 2,
        createdAt: '2026-09-18T12:00:00.000Z',
        updatedAt: '2026-09-18T12:05:00.000Z',
        sourceFolderIds: ['folder-1'],
        sourceDocumentIds: ['document-1', 'document-2'],
      },
    ],
  },
}

export const Empty: Story = { args: { drafts: [] } }
