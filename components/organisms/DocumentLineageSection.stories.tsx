import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { DocumentDetail } from 'types/documents'

import { DocumentLineageSection } from './DocumentLineageSection'

const detailWithLineage: DocumentDetail = {
  document: {
    id: 'doc-1',
    filesize: 1024,
    hash_binary: 'binary-1',
    hash_content: 'content-1',
    id_legacy: 'LEG-1',
    source_id: null,
    name: 'Document One',
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-02T12:00:00Z',
    is_duplicate: true,
  },
  quality: null,
  access_levels: ['restricted'],
  versions: [],
  version_family: {
    version_group_id: 'vg-1',
    canonical_document_id: 'doc-canonical',
    documents: [
      {
        id: 'doc-canonical',
        filesize: 1024,
        hash_binary: 'binary-canonical',
        hash_content: 'content-canonical',
        id_legacy: 'LEG-CAN',
        source_id: null,
        name: 'Canonical Document',
        created_at: '2026-05-20T12:00:00Z',
        updated_at: '2026-05-21T12:00:00Z',
        is_duplicate: false,
        is_canonical: true,
      },
      {
        id: 'doc-1',
        filesize: 1024,
        hash_binary: 'binary-1',
        hash_content: 'content-1',
        id_legacy: 'LEG-1',
        source_id: null,
        name: 'Document One',
        created_at: '2026-06-01T12:00:00Z',
        updated_at: '2026-06-02T12:00:00Z',
        is_duplicate: true,
        is_canonical: false,
      },
    ],
  },
  metadata: [
    { name: 'source_id', value: 'drive-file-123', value_type: 'string', notes: null },
    { name: 'origin_source_id', value: 'drive-file-origin', value_type: 'string', notes: null },
    { name: 'origin_parent_source_id', value: 'drive-folder-456', value_type: 'string', notes: null },
    { name: 'source_updated_at', value: '2026-05-31T09:15:00Z', value_type: 'datetime', notes: null },
  ],
  document_to_batches: [
    {
      id: 'link-1',
      document_id: 'doc-1',
      batch_id: 'batch-1',
      added_at: '2026-06-03T08:00:00Z',
      batch_origin: 'Drive ingest folder A',
      cost: '$0.00',
      processing_time_seconds: 42,
      ocr_quality_low: false,
      ocr_quality_medium: true,
      batch_legacy_id: 'legacy-batch-1',
      batch_name: 'June 3 Ingest',
      batch_status: 'complete',
    },
  ],
  document_to_authors: [],
  document_to_tags: [],
  audits: [],
  reviews: [],
}

const sparseDetail: DocumentDetail = {
  document: {
    id: 'doc-2',
    filesize: 2048,
    hash_binary: 'binary-2',
    hash_content: 'content-2',
    id_legacy: null,
    source_id: null,
    name: 'Document Two',
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-02T12:00:00Z',
    is_duplicate: false,
  },
  quality: null,
  access_levels: [],
  versions: [],
  version_family: null,
  metadata: [],
  document_to_batches: [],
  document_to_authors: [],
  document_to_tags: [],
  audits: [],
  reviews: [],
}

const meta = {
  title: 'Organisms/DocumentLineageSection',
  component: DocumentLineageSection,
  tags: ['autodocs'],
  args: {
    detail: detailWithLineage,
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(100%, 80rem)', mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DocumentLineageSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const SparseData: Story = {
  args: {
    detail: sparseDetail,
  },
}
