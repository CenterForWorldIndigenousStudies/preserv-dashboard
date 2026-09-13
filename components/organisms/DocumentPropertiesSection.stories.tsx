import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentPropertiesSection } from '@organisms/DocumentPropertiesSection'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

const document: DocumentDetail['document'] = {
  id: 'document-1',
  name: 'Community history collection.pdf',
  filesize: 2_450_000,
  hash_binary: 'binary-hash-123',
  hash_content: 'content-hash-456',
  id_legacy: 'legacy-2026-001',
  created_at: '2026-06-03T08:00:00Z',
  updated_at: '2026-06-03T09:30:00Z',
}

const metadata: MetadataField[] = [
  { name: 'content_hash_algorithm', value: JSON.stringify({ value: 'sha256' }), value_type: 'string', notes: null },
  { name: 'character_count', value: JSON.stringify({ value: 12840 }), value_type: 'number', notes: null },
  { name: 'legacy_file_size_origin', value: JSON.stringify({ value: 2_500_000 }), value_type: 'number', notes: null },
  { name: 'legacy_format_origin', value: JSON.stringify({ value: 'PDF' }), value_type: 'string', notes: null },
]

const meta = {
  title: 'Organisms/DocumentPropertiesSection',
  component: DocumentPropertiesSection,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { document, metadata },
} satisfies Meta<typeof DocumentPropertiesSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithLegacyProperties: Story = {}

export const ModernDocument: Story = {
  args: {
    document: { ...document, id_legacy: null },
    metadata: metadata.slice(0, 2),
  },
}
