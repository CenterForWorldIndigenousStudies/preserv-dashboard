import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { TagDeleteFlowDialog } from './TagDeleteFlowDialog'

const meta = {
  title: 'Organisms/TagDeleteFlowDialog',
  component: TagDeleteFlowDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    title: 'Remove collection?',
    subjectName: 'collection',
    usageCount: 3,
    primaryMessage: 'Remove "Nicaragua Conflict Documentation"?',
    checkboxLabel: 'Also delete tag and remove from all documents',
    secondConfirmMessage: 'This will remove the tag from 3 documents and delete the tag. This cannot be undone.',
    onClose: () => undefined,
    onConfirm: () => Promise.resolve(),
  },
} satisfies Meta<typeof TagDeleteFlowDialog>

export default meta
type Story = StoryObj<typeof meta>

export const CollectionUnchecked: Story = {}

export const CollectionCheckedSecondConfirm: Story = {
  args: {
    primaryMessage: 'Remove "Nicaragua Conflict Documentation"?',
  },
}

export const TagUnchecked: Story = {
  args: {
    title: 'Remove tag?',
    subjectName: 'tag',
    usageCount: 2,
    primaryMessage: 'Remove "Cherokee Language"?',
    secondConfirmMessage: 'This will remove the tag from 2 documents and delete the tag. This cannot be undone.',
  },
}

export const TagCheckedSecondConfirm: Story = {
  args: {
    title: 'Remove tag?',
    subjectName: 'tag',
    usageCount: 2,
    primaryMessage: 'Remove "Cherokee Language"?',
    secondConfirmMessage: 'This will remove the tag from 2 documents and delete the tag. This cannot be undone.',
  },
}
