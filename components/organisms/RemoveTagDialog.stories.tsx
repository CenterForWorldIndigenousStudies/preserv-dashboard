import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RemoveTagDialog } from '@organisms/RemoveTagDialog'

const meta = {
  title: 'Organisms/RemoveTagDialog',
  component: RemoveTagDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    tagName: 'Cherokee Language',
    usageCount: 1,
    onClose: () => undefined,
    onConfirm: () => Promise.resolve(),
  },
} satisfies Meta<typeof RemoveTagDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SharedAcrossDocuments: Story = {
  args: {
    usageCount: 3,
  },
}
