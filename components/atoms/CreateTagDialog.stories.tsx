import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CreateTagDialog } from '@atoms/CreateTagDialog'

const meta = {
  title: 'Atoms/CreateTagDialog',
  component: CreateTagDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    initialName: 'Cherokee Language',
    initialNotes: 'Used for language preservation materials.',
    onClose: () => undefined,
    onCreate: () => Promise.resolve(),
  },
} satisfies Meta<typeof CreateTagDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    initialName: '',
    initialNotes: '',
  },
}
