import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentEditAccessDialog } from '@molecules/DocumentEditAccessDialog'

const meta = {
  title: 'Molecules/DocumentEditAccessDialog',
  component: DocumentEditAccessDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    warning: 'approved',
    reason: '',
    onReasonChange: () => undefined,
    onClose: () => undefined,
    onConfirm: () => undefined,
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DocumentEditAccessDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Approved: Story = {}

export const Published: Story = {
  args: { warning: 'published' },
}

export const ReadyToConfirm: Story = {
  args: { reason: 'Correct the final title and description.' },
}
