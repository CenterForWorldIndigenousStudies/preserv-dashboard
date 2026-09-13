import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ValuePillList } from '@molecules/ValuePillList'

const meta = {
  title: 'Molecules/ValuePillList',
  component: ValuePillList,
  tags: ['autodocs'],
  args: {
    values: ['Indigenous governance', 'Cultural archives', 'Oral history'],
  },
  argTypes: {
    values: { control: 'object' },
    emptyMessage: { control: 'text' },
    onRemove: { action: 'removed' },
    getTooltip: { control: false },
    getHref: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof ValuePillList>

export default meta
type Story = StoryObj<typeof meta>

export const MultipleValues: Story = {
  args: {
    onRemove: undefined,
  },
}

export const RemovableValues: Story = {}

export const Empty: Story = {
  args: {
    values: [],
    emptyMessage: 'No metadata values available.',
    onRemove: undefined,
  },
}

export const TooltippedValues: Story = {
  args: {
    onRemove: undefined,
    getTooltip: (value) => `Notes for ${value}`,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 520 }}>
      <ValuePillList {...args} />
    </Box>
  ),
}

export const LinkedValues: Story = {
  args: {
    onRemove: undefined,
    getHref: (value) => `/documents?search=${encodeURIComponent(value)}`,
  },
}
