import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Badge } from '@atoms/Badges/Badge'

import { ReviewQueueCommentsPopover } from './ReviewQueueCommentsPopover'

const meta = {
  title: 'Molecules/ReviewQueueCommentsPopover',
  component: ReviewQueueCommentsPopover,
  tags: ['autodocs'],
} satisfies Meta<typeof ReviewQueueCommentsPopover>

export default meta
type Story = StoryObj<typeof meta>

export const HumanReviewed: Story = {
  args: {
    documentId: 'document-123',
    comment: 'Review the source metadata before approving this document.',
    additionalComment: 'Confirm the collection assignment.',
    trigger: <Badge variant={'neutral'}>{'Human reviewed'}</Badge>,
  },
}

export const CommentsOnly: Story = {
  args: {
    documentId: 'document-456',
    comment: 'The document name needs confirmation.',
    trigger: <Badge variant={'neutral'}>{'Comments'}</Badge>,
  },
}
