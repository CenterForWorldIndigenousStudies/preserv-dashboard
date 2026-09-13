import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentEditActions } from '@molecules/DocumentEditActions'

const meta = {
  title: 'Molecules/DocumentEditActions',
  component: DocumentEditActions,
  tags: ['autodocs'],
  args: {
    isDirty: true,
    isSaving: false,
    onSave: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof DocumentEditActions>

export default meta
type Story = StoryObj<typeof meta>

export const Dirty: Story = {}

export const Saving: Story = {
  args: { isSaving: true },
}

export const Clean: Story = {
  args: { isDirty: false },
}
