import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MetadataNameWithNotes } from '@molecules/MetadataNameWithNotes'

const meta = {
  title: 'Molecules/MetadataNameWithNotes',
  component: MetadataNameWithNotes,
  tags: ['autodocs'],
} satisfies Meta<typeof MetadataNameWithNotes>

export default meta
type Story = StoryObj<typeof meta>

export const WithNotes: Story = {
  args: {
    name: 'dc_title',
    notes: 'The title assigned to the document.',
  },
}

export const WithoutNotes: Story = {
  args: {
    name: 'source_id',
    notes: null,
  },
}
