import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { ReprocessingCart } from '@molecules/ReprocessingCart'

const meta = {
  title: 'Molecules/ReprocessingCart',
  component: ReprocessingCart,
  tags: ['autodocs'],
  args: { drafts: [], onRefresh: fn() },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ReprocessingCart>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const WithDrafts: Story = {
  args: {
    drafts: [
      {
        id: 'draft-1',
        name: 'Needs review corrections',
        collectionName: null,
        collectionNotes: null,
        restartStage: 'metadata_extractor',
        reason: 'Correct metadata after review.',
        documentCount: 3,
        createdAt: '2026-09-03T10:00:00.000Z',
        updatedAt: '2026-09-03T10:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      },
    ],
  },
}
