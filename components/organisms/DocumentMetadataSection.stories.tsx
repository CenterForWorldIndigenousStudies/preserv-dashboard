import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentMetadataSection } from '@organisms/DocumentMetadataSection'
import type { MetadataField } from 'types/metadata'

const metadata: MetadataField[] = [
  {
    name: 'dc_title',
    value: JSON.stringify({ value: 'Community history collection' }),
    value_type: 'string',
    notes: 'Public title.',
  },
  {
    name: 'dc_subject',
    value: JSON.stringify({ value: ['History', 'Community'] }),
    value_type: 'json',
    notes: 'Subject terms.',
  },
  {
    name: 'source_id',
    value: JSON.stringify({ value: 'drive-file-123' }),
    value_type: 'string',
    notes: 'Source identifier.',
  },
  { name: 'document_splitter_pass', value: JSON.stringify({ value: 2 }), value_type: 'number', notes: null },
  { name: 'ocr_generated', value: JSON.stringify({ value: true }), value_type: 'boolean', notes: null },
]

const meta = {
  title: 'Organisms/DocumentMetadataSection',
  component: DocumentMetadataSection,
  tags: ['autodocs'],
  parameters: { layout: 'padded', a11y: { disable: true } },
  args: {
    metadata,
    contributors: [
      {
        id: 'relationship-1',
        document_id: 'document-1',
        contributor_id: 'contributor-1',
        contributor_name: 'Ada Example',
        role: 'author',
        type: 'PRIMARY',
        notes: 'Primary author.',
      },
    ],
    publishers: [
      {
        id: 'relationship-2',
        document_id: 'document-1',
        publisher_id: 'publisher-1',
        publisher_name: 'Example Press',
        notes: 'Original publisher.',
      },
    ],
  },
} satisfies Meta<typeof DocumentMetadataSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithStageAndSourceMetadata: Story = {}

export const BasicMetadata: Story = {
  args: {
    metadata: metadata.slice(0, 2),
    contributors: [],
    publishers: [],
  },
}
