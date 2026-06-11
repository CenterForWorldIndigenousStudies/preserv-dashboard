import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { AuditEntry } from 'types/documents'

import { AuditHistoryTable } from './AuditHistoryTable'

/**
 * Browser-safe UUIDs for Storybook stories.
 * Using real UUIDs from the production DB would pull Node-only Prisma
 * imports into the browser bundle.
 */
const UUIDS = {
  doc1: '00000001-0001-0001-0001-000000000001',
  doc2: '00000002-0002-0002-0002-000000000002',
  doc3: '00000003-0003-0003-0003-000000000003',
} as const

const sampleAudits: AuditEntry[] = [
  {
    document_id: UUIDS.doc1,
    field_name: 'dc_title',
    source_name: 'source_ingest',
    before_value: 'Original Title',
    after_value: 'Updated Title',
    changed_at: '2026-04-15T10:30:00Z',
  },
  {
    document_id: UUIDS.doc1,
    field_name: 'dc_rights',
    source_name: 'source_ingest',
    before_value: null,
    after_value: 'Public Domain',
    changed_at: '2026-04-16T14:22:00Z',
  },
  {
    document_id: UUIDS.doc2,
    field_name: 'dc_subject',
    source_name: 'manual_edit',
    before_value: 'Indigenous Peoples',
    after_value: 'Indigenous Peoples -- North America',
    changed_at: '2026-04-17T09:00:00Z',
  },
]

const meta = {
  component: AuditHistoryTable,
  tags: ['autodocs'],
  args: {
    audits: sampleAudits,
  },
} satisfies Meta<typeof AuditHistoryTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Empty: Story = {
  args: {
    audits: [],
  },
}

export const SingleEntry: Story = {
  args: {
    audits: [sampleAudits[0]],
  },
}
