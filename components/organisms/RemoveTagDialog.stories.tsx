import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RemoveTagDialog } from '@organisms/RemoveTagDialog'

const usageCountMap = {
  singleUse: 1,
  shared: 3,
} as const

const meta = {
  title: 'Organisms/RemoveTagDialog',
  component: RemoveTagDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    tagName: 'Cherokee Language',
    usageCount: usageCountMap.singleUse,
    onClose: () => undefined,
    onConfirm: () => Promise.resolve(),
  },
} satisfies Meta<typeof RemoveTagDialog>

export default meta

type Story = StoryObj<typeof meta>

export const SingleUse: Story = {}

export const SharedAcrossDocuments: Story = {
  args: {
    usageCount: usageCountMap.shared,
  },
}
