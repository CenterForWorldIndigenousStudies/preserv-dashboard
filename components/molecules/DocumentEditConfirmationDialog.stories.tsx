import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentEditConfirmationDialog } from '@molecules/DocumentEditConfirmationDialog'

const changes = [
  { fieldName: 'dc_title', previousValue: 'Before', newValue: 'After', summary: 'Changed dc_title.' },
  { fieldName: 'dc_subject', previousValue: ['Old subject'], newValue: ['New subject'], summary: 'Changed dc_subject.' },
]

const meta = {
  title: 'Molecules/DocumentEditConfirmationDialog',
  component: DocumentEditConfirmationDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    mode: 'save',
    changes,
    onClose: () => undefined,
    onConfirm: () => undefined,
  },
} satisfies Meta<typeof DocumentEditConfirmationDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Save: Story = {}

export const Discard: Story = {
  args: { mode: 'discard', changes: [] },
}
