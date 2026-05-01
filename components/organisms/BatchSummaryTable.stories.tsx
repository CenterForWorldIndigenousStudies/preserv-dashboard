import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { BatchSummary } from '@lib/types'

import { BatchSummaryTable } from './BatchSummaryTable'

const meta = {
  component: BatchSummaryTable,
  tags: ['autodocs'],
} satisfies Meta<typeof BatchSummaryTable>

export default meta
type Story = StoryObj<typeof meta>

const sampleData: BatchSummary[] = [
  {
    batch_id: 'batch-001-uuid',
    batch_name: 'Ingest Batch 2026-04-01',
    batch_id_legacy: 'B001',
    property_key: 'dc_title',
    property_value: 'Miskito-Sumo-Rama Conflict Analysis',
  },
  {
    batch_id: 'batch-001-uuid',
    batch_name: 'Ingest Batch 2026-04-01',
    batch_id_legacy: 'B001',
    property_key: 'dc_subject',
    property_value: 'Indigenous peoples -- Nicaragua -- History',
  },
  {
    batch_id: 'batch-001-uuid',
    batch_name: 'Ingest Batch 2026-04-01',
    batch_id_legacy: 'B001',
    property_key: 'validation_status',
    property_value: 'APPROVED',
  },
  {
    batch_id: 'batch-001-uuid',
    batch_name: 'Ingest Batch 2026-04-01',
    batch_id_legacy: 'B001',
    property_key: 'ingest_timestamp',
    property_value: '2026-04-01T09:00:00Z',
  },
  {
    batch_id: 'batch-001-uuid',
    batch_name: 'Ingest Batch 2026-04-01',
    batch_id_legacy: 'B001',
    property_key: 'dc_rights',
    property_value: 'Public Domain',
  },
  {
    batch_id: 'batch-002-uuid',
    batch_name: 'Ingest Batch 2026-04-15',
    batch_id_legacy: 'B002',
    property_key: 'dc_title',
    property_value: 'First Nations in Canada Regional Overview',
  },
  {
    batch_id: 'batch-002-uuid',
    batch_name: 'Ingest Batch 2026-04-15',
    batch_id_legacy: 'B002',
    property_key: 'document_count',
    property_value: 47,
  },
  {
    batch_id: 'batch-002-uuid',
    batch_name: 'Ingest Batch 2026-04-15',
    batch_id_legacy: 'B002',
    property_key: 'complex_metadata',
    property_value: '{"source":"marc","format":"marc21","character_set":"UTF-8"}',
  },
]

export const Default: Story = {
  args: {
    data: sampleData,
  },
}

export const Empty: Story = {
  args: {
    data: [],
  },
}

export const SingleBatch: Story = {
  args: {
    data: sampleData.filter((row) => row.batch_id === 'batch-001-uuid'),
  },
}

export const ComplexMetadata: Story = {
  args: {
    data: [
      ...sampleData,
      {
        batch_id: 'batch-003-uuid',
        batch_name: 'Complex Batch',
        batch_id_legacy: 'B003',
        property_key: 'nested_data',
        property_value: JSON.stringify({
          source: 'marc',
          format: 'marc21',
          character_set: 'UTF-8',
          subjects: ['Indigenous peoples', 'North America', 'History'],
          languages: ['en', 'es'],
        }),
      },
    ],
  },
}