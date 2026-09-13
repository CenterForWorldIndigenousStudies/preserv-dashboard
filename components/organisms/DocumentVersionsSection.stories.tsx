import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentVersionsSection } from '@organisms/DocumentVersionsSection'
import type { DocumentDetail } from 'types/documents'

const versions: DocumentDetail['versions'] = [
  {
    id: 'version-1',
    document_id: 'document-1',
    version_group_id: 'version-group-1',
    changes_summary: 'Metadata was normalized after review.',
    notes: 'Published source version.',
    similarity_score: 0.98,
    created_at: new Date('2026-06-03T08:00:00Z'),
    updated_at: new Date('2026-06-03T09:00:00Z'),
    analyzed_at: '2026-06-03T09:15:00Z',
  },
]

const meta = {
  title: 'Organisms/DocumentVersionsSection',
  component: DocumentVersionsSection,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    versionFamily: null,
    versions: [],
    returnHref: '/documents/document-1',
    documentName: 'Community history collection.pdf',
  },
} satisfies Meta<typeof DocumentVersionsSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithVersionDetails: Story = {
  args: {
    versionFamily: {
      version_group_id: 'version-group-1',
      canonical_document_id: 'document-1',
      documents: [],
    },
    versions,
  },
}

export const NoRelatedVersions: Story = {}
