import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'
import { TagPill } from '@atoms/TagPill'

const meta = {
  title: 'Atoms/TagPill',
  component: TagPill,
  tags: ['autodocs'],
  args: {
    tag: 'Cherokee Language',
    onRemove: () => {
      alert('Tag removed')
    },
  },
  argTypes: {
    tag: { control: 'text' },
    onRemove: { action: 'removed' },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof TagPill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const MultipleTags: Story = {
  render: (args) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <TagPill {...{ ...args, tag: 'Cherokee Language' }} />
      <TagPill {...{ ...args, tag: 'Cultural Archive' }} />
      <TagPill {...{ ...args, tag: 'Oral History' }} />
    </Box>
  ),
}
