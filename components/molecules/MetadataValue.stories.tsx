import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MetadataValue } from '@molecules/MetadataValue'

const meta = {
  title: 'Molecules/MetadataValue',
  component: MetadataValue,
  parameters: { a11y: { disable: true } },
} satisfies Meta<typeof MetadataValue>

export default meta
type Story = StoryObj<typeof meta>

export const OrdinaryValue: Story = {
  args: {
    field: {
      name: 'dc_title',
      value: JSON.stringify({ value: 'A document title' }),
      value_type: 'string',
      notes: null,
    },
  },
}

export const ListValue: Story = {
  args: {
    field: {
      name: 'dc_subject',
      value: JSON.stringify({ value: ['History', 'Archives'] }),
      value_type: 'json',
      notes: null,
    },
  },
}

export const Timestamp: Story = {
  args: {
    field: {
      name: 'discrepancy_correction_timestamp',
      value: JSON.stringify({ value: 1720000000 }),
      value_type: 'unix_timestamp',
      notes: null,
    },
  },
}

export const Cost: Story = {
  args: {
    field: {
      name: 'cost_saved',
      value: JSON.stringify({ value: 0.25 }),
      value_type: 'number',
      notes: null,
    },
  },
}

export const NeedsReview: Story = {
  args: {
    field: {
      name: 'needs_review',
      value: JSON.stringify({ value: { ocr_processor: ['OCR failed.'] } }),
      value_type: 'json',
      notes: null,
    },
  },
}
