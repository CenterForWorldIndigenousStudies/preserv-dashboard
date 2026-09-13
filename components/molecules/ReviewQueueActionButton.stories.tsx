import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { ReviewQueueActionButton } from '@molecules/ReviewQueueActionButton'

const meta = {
  title: 'Molecules/ReviewQueueActionButton',
  component: ReviewQueueActionButton,
  tags: ['autodocs'],
  args: {
    batchActionPending: false,
    selectedCount: 1,
    hasSelectedDraftDocuments: false,
    onApprove: fn(),
    onReject: fn(),
    onReprocess: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof ReviewQueueActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const SelectedDocument: Story = {}

export const SelectedDraftDocument: Story = {
  args: {
    selectedCount: 2,
    hasSelectedDraftDocuments: true,
  },
}
