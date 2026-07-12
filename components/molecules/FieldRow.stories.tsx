import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box } from '@mui/material'
import { FieldRow } from '@molecules/FieldRow'

const meta = {
  title: 'Molecules/FieldRow',
  component: FieldRow,
  tags: ['autodocs'],
  args: {
    label: 'Document ID',
    children: 'DOC-2024-0042',
  },
  argTypes: {
    label: { control: 'text' },
    children: { control: 'text' },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof FieldRow>

export default meta
type Story = StoryObj<typeof meta>

export const ShortValue: Story = {
  args: {
    label: 'Document ID',
    children: 'DOC-2024-0042',
  },
  render: (args) => (
    <Box component="dl" sx={{ m: 0 }}>
      <FieldRow {...args} />
    </Box>
  ),
}

export const LongValue: Story = {
  args: {
    label: 'Original URL',
    children:
      'https://archive.cwis.org/repository/indigenous-knowledge/cherokee/oral-traditions/transcripts/2023/session-042-enriched.pdf',
  },
  render: (args) => (
    <Box component="dl" sx={{ m: 0 }}>
      <FieldRow {...args} />
    </Box>
  ),
}

export const EmptyValue: Story = {
  args: {
    label: 'Parent Collection',
    children: '—',
  },
  render: (args) => (
    <Box component="dl" sx={{ m: 0 }}>
      <FieldRow {...args} />
    </Box>
  ),
}

export const MetadataField: Story = {
  args: {
    label: 'File Type',
    children: 'application/pdf',
  },
  render: (args) => (
    <Box component="dl" sx={{ m: 0 }}>
      <FieldRow {...args} />
    </Box>
  ),
}

export const MultipleFields: Story = {
  render: () => (
    <Box component="dl" sx={{ display: 'grid', gap: 1.5, m: 0 }}>
      <FieldRow label="Document ID">DOC-2024-0042</FieldRow>
      <FieldRow label="File Type">application/pdf</FieldRow>
      <FieldRow label="Original URL">https://archive.cwis.org/...</FieldRow>
      <FieldRow label="Parent Collection">—</FieldRow>
    </Box>
  ),
}
