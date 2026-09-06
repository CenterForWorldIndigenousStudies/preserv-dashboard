import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MetadataTable } from '@molecules/MetadataTable'

const meta = {
  title: 'Molecules/MetadataTable',
  component: MetadataTable,
  tags: ['autodocs'],
  args: {
    fields: [
      {
        name: 'title',
        value: 'Document title',
        value_type: 'string',
        notes: 'The human-readable title from the source record.',
      },
      {
        name: 'source_created_at',
        value: '2026-07-01T12:00:00Z',
        value_type: 'datetime',
        notes: 'The source timestamp for the record.',
      },
    ],
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(100%, 80rem)', mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof MetadataTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Empty: Story = {
  args: {
    fields: [],
  },
}
