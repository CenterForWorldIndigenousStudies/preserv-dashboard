import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { DateAtom } from '@atoms/Date'
import { KeyValueRow } from './KeyValueRow'

const meta = {
  title: 'Molecules/KeyValueRow',
  component: KeyValueRow,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof KeyValueRow>

export default meta
type Story = StoryObj<typeof meta>

export const StringValue: Story = {
  args: {
    label: 'batch_name',
    value: 'Nicaragua Conflict Analysis Batch 2026',
  },
}

export const NullValue: Story = {
  args: {
    label: 'batch_id_legacy',
    value: null,
  },
}

export const NumberValue: Story = {
  args: {
    label: 'file_count',
    value: 47,
  },
}

export const BooleanValue: Story = {
  args: {
    label: 'metadata_complete',
    value: true,
  },
}

export const ReactElementValue: Story = {
  args: {
    label: 'started_at',
    value: <DateAtom value={'2026-05-19T14:30:00Z'} />,
  },
}

export const LongStringValue: Story = {
  args: {
    label: 'hash_binary',
    value: 'a1b2c3d4e5f678901234567890123456789012345678901234567890',
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Story />
      </Box>
    ),
  ],
}

export const NestedJsonValue: Story = {
  args: {
    label: 'config',
    value: { timeout: 30, retryCount: 3, endpoint: 'https://api.example.com' },
  },
}

export const DeepNesting: Story = {
  args: {
    label: 'nested_config',
    value: {
      outer: {
        middle: {
          inner: {
            deep: 'value',
          },
        },
      },
    },
  },
}

export const WithLevelIndent: Story = {
  args: {
    label: 'document.metadata',
    value: {
      title: 'Miskito-Sumo-Rama Conflict Analysis',
      language: 'en',
      region: 'Nicaragua',
    },
    level: 2,
  },
}
