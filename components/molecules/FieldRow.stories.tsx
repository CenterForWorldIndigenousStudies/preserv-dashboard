import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FieldRow } from '@molecules/FieldRow'

const meta: Meta<typeof FieldRow> = {
  title: 'Molecules/FieldRow',
  component: FieldRow,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    children: { control: 'text' },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
}

export default meta
type Story = StoryObj<typeof FieldRow>

export const ShortValue: Story = {
  args: {
    label: 'Document ID',
    children: 'DOC-2024-0042',
  },
}

export const LongValue: Story = {
  args: {
    label: 'Original URL',
    children:
      'https://archive.cwis.org/repository/indigenous-knowledge/cherokee/oral-traditions/transcripts/2023/session-042-enriched.pdf',
  },
}

export const EmptyValue: Story = {
  args: {
    label: 'Parent Collection',
    children: '—',
  },
}

export const MetadataField: Story = {
  args: {
    label: 'File Type',
    children: 'application/pdf',
  },
}

export const MultipleFields: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <FieldRow label="Document ID">DOC-2024-0042</FieldRow>
      <FieldRow label="File Type">application/pdf</FieldRow>
      <FieldRow label="Original URL">https://archive.cwis.org/...</FieldRow>
      <FieldRow label="Parent Collection">—</FieldRow>
    </div>
  ),
}
