import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { ReprocessingDraftDocumentsTable } from '@organisms/ReprocessingDraftDocumentsTable'

const meta = {
  title: 'Organisms/ReprocessingDraftDocumentsTable',
  component: ReprocessingDraftDocumentsTable,
  tags: ['autodocs'],
  args: {
    documents: [
      { id: 'document-1', name: 'Interview.pdf', idLegacy: 'legacy-1', sourceBatchName: 'Original ingest', addedAt: null },
    ],
    onRemove: fn(),
  },
} satisfies Meta<typeof ReprocessingDraftDocumentsTable>

export default meta
type Story = StoryObj<typeof meta>

export const WithDocuments: Story = {}
export const Empty: Story = { args: { documents: [] } }
