import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ConfirmationDialog } from '@molecules/ConfirmationDialog'

const meta = {
  title: 'Molecules/ConfirmationDialog',
  component: ConfirmationDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    title: 'Confirm removal',
    message: 'Are you sure you want to remove these documents from the collection?',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ConfirmationDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CustomLabels: Story = {
  args: {
    confirmLabel: 'Remove',
    cancelLabel: 'Keep editing',
  },
}
