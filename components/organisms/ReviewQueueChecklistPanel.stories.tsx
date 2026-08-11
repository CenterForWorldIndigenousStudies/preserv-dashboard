import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { buildDefaultReviewQueueChecklistState, ReviewQueueChecklistPanel } from './ReviewQueueChecklistPanel'

const meta = {
  title: 'Organisms/ReviewQueueChecklistPanel',
  component: ReviewQueueChecklistPanel,
  tags: ['autodocs'],
} satisfies Meta<typeof ReviewQueueChecklistPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    documentId: 'document-123',
    checklistState: buildDefaultReviewQueueChecklistState(),
    onToggle: () => undefined,
  },
}

export const PartiallyComplete: Story = {
  args: {
    documentId: 'document-456',
    checklistState: {
      ...buildDefaultReviewQueueChecklistState(),
      metadataReviewed: true,
      rightsReviewed: true,
    },
    onToggle: () => undefined,
  },
}
